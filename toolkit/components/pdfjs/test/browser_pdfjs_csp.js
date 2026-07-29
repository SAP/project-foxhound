/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Regression test for bug 1960363. Verifies that the pdf.js viewer document
// ships with a Content-Security-Policy that locks down scripts (no inline,
// no eval, only resource:), and that real violations are routed through the
// shared internal-page CSP telemetry in nsCSPContext::HandleInternalPageViolation.

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;
const VIEWER_URL = "resource://pdf.js/web/viewer.html";

add_task(async function test_csp_is_present_and_enforced() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.csp.testing.allow_internal_csp_violation", true]],
  });

  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await waitForPdfJS(browser, TESTROOT + "file_pdfjs_test.pdf");

      const { cspContent, documentURL } = await SpecialPowers.spawn(
        browser,
        [],
        async function () {
          const metas = content.document.querySelectorAll(
            "meta[http-equiv='Content-Security-Policy']"
          );
          Assert.equal(
            metas.length,
            1,
            "viewer document has exactly one CSP meta tag"
          );
          Assert.ok(
            !!content.document.querySelector("#viewer .page"),
            "viewer rendered at least one page with the CSP active"
          );
          return {
            cspContent: metas[0].getAttribute("content"),
            documentURL: content.document.documentURI,
          };
        }
      );

      const csp = ChromeUtils.createCSPFromHeader(
        cspContent,
        Services.io.newURI(documentURL),
        Services.scriptSecurityManager.createNullPrincipal({})
      );
      Assert.equal(csp.policyCount, 1, "exactly one parsed CSP policy");

      const D = Ci.nsIContentSecurityPolicy;
      // Non-pdf.js URIs go through the real CSP checks. resource://pdf.js/*
      // is short-circuited inside nsCSPContext::Permits (see hotfix there),
      // so it can't be used to probe the policy.
      const httpsURI = Services.io.newURI("https://example.com/x.js");
      const resourceURI = Services.io.newURI("resource://gre/modules/x.js");

      Assert.ok(
        !csp.permits(
          null,
          null,
          httpsURI,
          D.SCRIPT_SRC_DIRECTIVE,
          false,
          false
        ),
        "script-src blocks https:"
      );
      Assert.ok(
        csp.permits(
          null,
          null,
          resourceURI,
          D.SCRIPT_SRC_DIRECTIVE,
          false,
          false
        ),
        "script-src allows resource:"
      );
      Assert.ok(
        csp.permits(
          null,
          null,
          resourceURI,
          D.WORKER_SRC_DIRECTIVE,
          false,
          false
        ),
        "worker-src allows resource:"
      );
      Assert.ok(
        !csp.permits(null, null, httpsURI, D.BASE_URI_DIRECTIVE, true, false),
        "base-uri is locked down"
      );
      Assert.ok(
        !csp.permits(
          null,
          null,
          httpsURI,
          D.FORM_ACTION_DIRECTIVE,
          true,
          false
        ),
        "form-action is locked down"
      );

      const shouldReport = {};
      Assert.ok(!csp.getAllowsEval(shouldReport), "eval is disallowed");
      Assert.ok(
        !csp.getAllowsInline(
          D.SCRIPT_SRC_ELEM_DIRECTIVE,
          false,
          "",
          false,
          null,
          null,
          "",
          1,
          1
        ),
        "inline <script> is disallowed"
      );
      Assert.ok(
        !csp.getAllowsInline(
          D.STYLE_SRC_ATTR_DIRECTIVE,
          false,
          "",
          false,
          null,
          null,
          "",
          1,
          1
        ),
        "inline style attributes are disallowed"
      );

      // Trigger a real violation in the viewer document. With the loading
      // principal's URI now considered by HandleInternalPageViolation, the
      // event must land in Glean.security.cspViolationInternalPage.
      await SpecialPowers.spawn(browser, [], async function () {
        const violation = ContentTaskUtils.waitForEvent(
          content.document,
          "securitypolicyviolation"
        );
        content.document.documentElement.setAttribute("onclick", "foobar()");
        await violation;
      });

      // Flush before closing the viewer: closing tears down the content
      // process and discards any not-yet-flushed Glean events.
      await Services.fog.testFlushAllChildren();

      await waitForPdfJSClose(browser);
    }
  );

  const events = Glean.security.cspViolationInternalPage.testGetValue();
  Assert.ok(
    Array.isArray(events) && events.length >= 1,
    "internal-page CSP violation telemetry recorded"
  );
  const viewerEvent = events.find(e => e.extra.selfdetails === VIEWER_URL);
  Assert.ok(viewerEvent, "a violation was recorded for the pdf.js viewer");
  Assert.equal(
    viewerEvent.extra.selftype,
    "resourceuri",
    "selftype is resourceuri"
  );

  Services.fog.testResetFOG();
  await SpecialPowers.popPrefEnv();
});

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const SVG_URL = "chrome://global/skin/icons/defaultFavicon.svg";

add_task(async function test_baseline_blocks() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["security.csp.testing.allow_internal_csp_violation", true],
      ["security.chrome_baseline_csp.enabled", true],
    ],
  });
  Services.fog.testResetFOG();

  // Ensure SVG without an explicit CSP still automatically enforces the baseline CSP.
  await BrowserTestUtils.withNewTab(SVG_URL, async function (browser) {
    let { contentWindow, contentDocument } = browser;

    let ran = false;
    contentWindow.on_click = function () {
      ran = true;
    };

    let violationPromise = BrowserTestUtils.waitForEvent(
      contentDocument,
      "securitypolicyviolation"
    );

    contentDocument.documentElement.setAttribute("onclick", "on_click()");
    // The document is not meant to be clicked.
    AccessibilityUtils.setEnv({
      mustHaveAccessibleRule: false,
    });
    contentDocument.documentElement.dispatchEvent(new MouseEvent("click"));
    AccessibilityUtils.resetEnv();

    is(ran, false, "Event handler should not run");

    info("Waiting for securitypolicyviolation");
    let violation = await violationPromise;
    is(
      violation.effectiveDirective,
      "script-src-attr",
      "effectiveDirective matches"
    );
    ok(
      violation.sourceFile.endsWith("browser_csp_baseline.js"),
      "sourceFile matches"
    );
    is(violation.disposition, "enforce", "disposition matches");
    is(
      violation.originalPolicy,
      "script-src chrome: resource: moz-src:",
      "baseline policy was used"
    );
  });

  let testValue = Glean.security.cspViolationInternalPage.testGetValue();
  is(testValue.length, 1, "Should have telemetry for one violation");
  let extra = testValue[0].extra;
  is(extra.baseline, "true", "violation from baseline CSP");
  is(extra.directive, "script-src-attr", "violation's `directive` is correct");
  is(extra.selftype, "chromeuri", "violation's `selftype` is correct");
  is(extra.selfdetails, SVG_URL, "violation's `selfdetails` is correct");
  is(extra.sourcetype, "chromeuri", "violation's `sourcetype` is correct");
  ok(
    extra.sourcedetails.endsWith("browser_csp_baseline.js"),
    "violation's `sourcedetails` is correct"
  );
  is(extra.blockeduritype, "inline", "violation's `blockeduritype` is correct");
  is(extra.sample, "on_click()", "violation's sample is correct");
});

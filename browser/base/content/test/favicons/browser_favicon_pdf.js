/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests that when a PDF is opened through PDF.js, the /favicon.ico request
// uses a content principal matching the PDF's https:// origin rather than the
// resource:// principal of the PDF viewer (bug 2015285). This ensures HTTP auth
// credentials cached for the PDF's origin are forwarded correctly.

const PDF_URL =
  "https://example.com/browser/browser/base/content/test/favicons/blank.pdf";
const FAVICON_URL = "https://example.com/favicon.ico";

add_task(async function test_pdf_favicon_uses_page_principal() {
  let faviconLoadingPrincipal;
  const { promise: observerDone, resolve: observerResolve } =
    Promise.withResolvers();

  const observer = {
    observe(subject, topic) {
      if (topic !== "http-on-modify-request") {
        return;
      }
      const channel = subject.QueryInterface(Ci.nsIChannel);
      if (channel.URI.spec !== FAVICON_URL) {
        return;
      }
      faviconLoadingPrincipal = channel.loadInfo?.loadingPrincipal;
      observerResolve();
    },
  };
  Services.obs.addObserver(observer, "http-on-modify-request");

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PDF_URL);

  // The favicon request fires during page load.
  await observerDone;

  Services.obs.removeObserver(observer, "http-on-modify-request");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const viewer = content.wrappedJSObject.PDFViewerApplication;
    await viewer.testingClose();
  });
  BrowserTestUtils.removeTab(tab);

  Assert.ok(
    faviconLoadingPrincipal,
    "Should have seen a /favicon.ico request for the PDF's domain"
  );
  is(
    faviconLoadingPrincipal.URI?.scheme,
    "https",
    "Favicon channel loadingPrincipal should use https://, not resource://"
  );
});

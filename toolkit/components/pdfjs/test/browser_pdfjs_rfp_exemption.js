/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;

// Verify that PDF.js documents are exempted from resist fingerprinting when
// privacy.resistFingerprinting is enabled.
add_task(async function test_direct_pdf_rfp_exemption() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await waitForPdfJS(browser, TESTROOT + "file_pdfjs_test.pdf");

      let shouldRFP =
        browser.browsingContext.currentWindowContext.shouldResistFingerprinting;
      is(shouldRFP, false, "PDF.js document should be exempted from RFP");

      await waitForPdfJSClose(browser);
    }
  );

  await SpecialPowers.popPrefEnv();
});

// Verify that a normal web page is NOT exempted from RFP.
add_task(async function test_normal_page_not_exempted() {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.resistFingerprinting", true]],
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async function (browser) {
      let shouldRFP =
        browser.browsingContext.currentWindowContext.shouldResistFingerprinting;
      is(shouldRFP, true, "Normal web page should have RFP enabled");
    }
  );

  await SpecialPowers.popPrefEnv();
});

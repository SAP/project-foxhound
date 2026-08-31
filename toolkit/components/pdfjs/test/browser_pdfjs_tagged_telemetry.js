/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { PdfJsTelemetry } = ChromeUtils.importESModule(
  "resource://pdf.js/PdfJsTelemetry.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;

const sandbox = sinon.createSandbox();
registerCleanupFunction(() => {
  sandbox.restore();
});

const original = PdfJsTelemetry.report.bind(PdfJsTelemetry);
const { promise: telemetryPromise, resolve } = Promise.withResolvers();
sandbox.stub(PdfJsTelemetry, "report").callsFake(aData => {
  const { type } = aData;
  if (type === "taggedPDF") {
    resolve();
  }
  original(aData);
});

// Test telemetry.
add_task(async function test_telemetry_for_tagged_pdf() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      Services.fog.testResetFOG();

      await Services.fog.testFlushAllChildren();
      Assert.equal(Glean.pdfjs.tagged.testGetValue() || 0, 0);

      // check that PDF is opened with internal viewer
      await waitForPdfJS(browser, TESTROOT + "file_pdfjs_tagged.pdf");

      await telemetryPromise;

      await Services.fog.testFlushAllChildren();
      Assert.equal(Glean.pdfjs.tagged.testGetValue(), 1);

      await waitForPdfJSClose(browser);
    }
  );
});

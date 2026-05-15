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

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/content/tests/browser/common/mockTransfer.js",
  this
);

const commentPref = "pdfjs.enableComment";
const highlightPref = "pdfjs.enableHighlight";
const sandbox = sinon.createSandbox();
registerCleanupFunction(() => {
  sandbox.restore();
});

const original = PdfJsTelemetry.report.bind(PdfJsTelemetry);
const resolvers = new Map();
sandbox.stub(PdfJsTelemetry, "report").callsFake(aData => {
  const { type, data } = aData;
  if (!type.includes("comment") || !data) {
    return;
  }
  resolvers.get(type)?.resolve();
  original(aData);
});
const getPromise = name => {
  const resolver = Promise.withResolvers();
  resolvers.set(name, resolver);
  return resolver.promise;
};
let telemetryPromise;

async function enableComment(browser) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["pdfjs.annotationEditorMode", 0],
      [commentPref, true],
      [highlightPref, true],
    ],
  });

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  await waitForPdfJSAllLayers(browser, TESTROOT + "file_pdfjs_test.pdf", [
    ["annotationEditorLayer", "annotationLayer", "textLayer", "canvasWrapper"],
  ]);
}

// Test telemetry for comment flow.

add_task(async function test_telemetry_no_comment() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await enableComment(browser);

      Services.fog.testResetFOG();

      telemetryPromise = getPromise("commentSidebar");
      await clickOn(browser, "#editorCommentButton");
      await waitForSelector(browser, "#editorCommentsSidebar");

      await telemetryPromise;
      await testTelemetryEventExtra(
        Glean.pdfjsComment.sidebar,
        [
          {
            comments_count: "0",
          },
        ],
        false
      );

      await waitForPdfJSClose(browser);
      await SpecialPowers.popPrefEnv();
    }
  );
});

add_task(async function test_telemetry_one_comment() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await enableComment(browser);
      await enableEditor(browser, "Highlight", 1);

      const spanBox = await getSpanBox(browser, "In production");
      await clickAt(
        browser,
        spanBox.x + 0.75 * spanBox.width,
        spanBox.y + 0.5 * spanBox.height,
        2
      );
      await waitForEditors(browser, ".highlightEditor", 1);
      await Services.fog.testFlushAllChildren();
      await clickOn(browser, "button.comment");
      await waitForSelector(browser, "#commentManagerDialog");

      await clickOn(browser, "#commentManagerTextInput");
      await write(browser, "Hello Pdf.js World");

      Services.fog.testResetFOG();

      telemetryPromise = getPromise("comment");
      await clickOn(browser, "#commentManagerSaveButton");
      await telemetryPromise;
      let value = Glean.pdfjsComment.edit.edited.testGetValue();
      Assert.equal(value, 1, "Should have a comment");

      Services.fog.testResetFOG();

      telemetryPromise = getPromise("commentSidebar");
      await clickOn(browser, "#editorCommentButton");
      await waitForSelector(browser, "#editorCommentsSidebar");

      await telemetryPromise;
      await testTelemetryEventExtra(
        Glean.pdfjsComment.sidebar,
        [
          {
            comments_count: "1",
          },
        ],
        false
      );

      Services.fog.testResetFOG();

      await clickOn(browser, "#editorCommentsSidebarList li:first-child");
      telemetryPromise = getPromise("comment");
      await clickOn(browser, "button.commentPopupDelete");
      await telemetryPromise;
      value = Glean.pdfjsComment.edit.deleted.testGetValue();
      Assert.equal(value, 1, "Should have a deleted comment");

      await waitForPdfJSClose(browser);
      await SpecialPowers.popPrefEnv();
    }
  );
});

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { PdfJsTelemetry } = ChromeUtils.importESModule(
  "resource://pdf.js/PdfJsTelemetry.sys.mjs"
);
const { PdfjsParent } = ChromeUtils.importESModule(
  "resource://pdf.js/PdfjsParent.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;

const sandbox = sinon.createSandbox();
registerCleanupFunction(() => sandbox.restore());

const original = PdfJsTelemetry.report.bind(PdfJsTelemetry);
const resolvers = new Map();
sandbox.stub(PdfJsTelemetry, "report").callsFake(aData => {
  if (aData.type === "pageOrganization") {
    resolvers.get(aData.data?.action)?.resolve();
  }
  original(aData);
});
sandbox.stub(PdfjsParent.prototype, "_saveURL");

function getPromise(action) {
  const resolver = Promise.withResolvers();
  resolvers.set(action, resolver);
  return resolver.promise;
}

async function selectPage(browser, index) {
  await SpecialPowers.spawn(browser, [index], async function (idx) {
    const { ContentTaskUtils } = ChromeUtils.importESModule(
      "resource://testing-common/ContentTaskUtils.sys.mjs"
    );
    const { document } = content;
    await ContentTaskUtils.waitForCondition(
      () =>
        !!document.querySelectorAll(
          "#thumbnailsView .thumbnail input[type=checkbox]"
        )[idx],
      "Checkbox must be present"
    );
    const checkbox = document.querySelectorAll(
      "#thumbnailsView .thumbnail input[type=checkbox]"
    )[idx];
    if (!checkbox.checked) {
      checkbox.click();
    }
    await ContentTaskUtils.waitForCondition(
      () => checkbox.checked,
      "Checkbox must be checked"
    );
  });
}

async function organizerKey(browser, key, ctrlKey = false) {
  await SpecialPowers.spawn(browser, [key, ctrlKey], function (k, ctrl) {
    const container = content.document.querySelector("#thumbnailsView");
    container.dispatchEvent(
      new content.KeyboardEvent("keydown", {
        key: k,
        ctrlKey: ctrl,
        bubbles: true,
        cancelable: true,
      })
    );
  });
  await TestUtils.waitForTick();
}

async function organizerAction(browser, selector) {
  await SpecialPowers.spawn(browser, [selector], function (sel) {
    content.document.querySelector(sel).click();
  });
  await TestUtils.waitForTick();
}

async function openOrganizePdf(browser) {
  await SpecialPowers.pushPrefEnv({
    set: [["pdfjs.enableSplitMerge", true]],
  });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
  await waitForPdfJSAllLayers(
    browser,
    TESTROOT + "file_pdfjs_numbered_pages.pdf",
    [
      [
        "annotationEditorLayer",
        "annotationLayer",
        "textLayer",
        "canvasWrapper",
      ],
      [
        "annotationEditorLayer",
        "annotationLayer",
        "textLayer",
        "canvasWrapper",
      ],
    ]
  );
  await click(browser, "#viewsManagerToggleButton");
  await waitForSelector(
    browser,
    "#thumbnailsView .thumbnail input[type=checkbox]"
  );
}

// Test page organization telemetry. The actions are performed in an order that
// avoids any undo, keeping the state machine simple:
//   export_selected (2 pages) → copy (paste mode) → paste (3 pages)
//   → delete (2 pages) → save → cut (1 page)
add_task(async function test_page_organization_telemetry() {
  makePDFJSHandler();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await openOrganizePdf(browser);

      // Test export_selected: select page 0 and click the export button.
      await selectPage(browser, 0);
      let telemetryPromise = getPromise("exportSelected");
      const saveExtractedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "saveextractedpages",
        false,
        null,
        true
      );
      await organizerAction(browser, "#viewsManagerStatusActionExport");
      await saveExtractedPromise;
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.export_selected.testGetValue(),
        1,
        "export_selected counter should be 1"
      );

      // Test copy: Ctrl+C on the thumbnail container with page 0 selected.
      await selectPage(browser, 0);
      telemetryPromise = getPromise("copy");
      let pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await organizerKey(browser, "c", true);
      await pagesEditedPromise;
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.copy.testGetValue(),
        1,
        "copy counter should be 1"
      );

      // Test paste: click the paste button that appeared after copy.
      await waitForSelector(browser, ".thumbnailPasteButton");
      telemetryPromise = getPromise("paste");
      pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await organizerAction(browser, ".thumbnailPasteButton");
      await pagesEditedPromise;
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.paste.testGetValue(),
        1,
        "paste counter should be 1"
      );

      // There are now 3 pages. Test delete: Delete key with page 0 selected.
      await selectPage(browser, 0);
      telemetryPromise = getPromise("delete");
      pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await organizerKey(browser, "Delete");
      await pagesEditedPromise;
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.delete.testGetValue(),
        1,
        "delete counter should be 1"
      );

      // Test save: the PDF now has structural changes (paste + delete) so
      // downloadOrSave takes the page-organization save path.
      telemetryPromise = getPromise("save");
      await SpecialPowers.spawn(browser, [], function () {
        content.wrappedJSObject.PDFViewerApplication.downloadOrSave();
      });
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.save.testGetValue(),
        1,
        "save counter should be 1"
      );

      // There are now 2 pages. Test cut: Ctrl+X with page 0 selected.
      await selectPage(browser, 0);
      telemetryPromise = getPromise("cut");
      pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await organizerKey(browser, "x", true);
      await pagesEditedPromise;
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.cut.testGetValue(),
        1,
        "cut counter should be 1"
      );

      await waitForPdfJSClose(browser);
      await SpecialPowers.popPrefEnv();
    }
  );
});

add_task(async function test_page_organization_merge_telemetry() {
  makePDFJSHandler();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await SpecialPowers.pushPrefEnv({
        set: [
          ["pdfjs.enableMerge", true],
          ["pdfjs.enableSplitMerge", true],
        ],
      });
      await Services.fog.testFlushAllChildren();
      Services.fog.testResetFOG();
      await waitForPdfJSAllLayers(
        browser,
        TESTROOT + "file_pdfjs_numbered_pages.pdf",
        [
          [
            "annotationEditorLayer",
            "annotationLayer",
            "textLayer",
            "canvasWrapper",
          ],
          [
            "annotationEditorLayer",
            "annotationLayer",
            "textLayer",
            "canvasWrapper",
          ],
        ]
      );
      await click(browser, "#viewsManagerToggleButton");
      await waitForSelector(
        browser,
        "#thumbnailsView .thumbnail input[type=checkbox]"
      );

      const telemetryPromise = getPromise("merge");
      await SpecialPowers.spawn(browser, [], function () {
        const obj = Cu.cloneInto(
          {
            source: null,
            details: {
              type: "pageOrganization",
              data: { action: "merge" },
            },
          },
          content.wrappedJSObject
        );
        content.wrappedJSObject.PDFViewerApplication.eventBus.dispatch(
          "reporttelemetry",
          obj
        );
      });
      await telemetryPromise;
      await Services.fog.testFlushAllChildren();
      Assert.equal(
        Glean.pdfjsOrganize.action.merge.testGetValue(),
        1,
        "merge counter should be 1"
      );

      await waitForPdfJSClose(browser);
      await SpecialPowers.popPrefEnv();
    }
  );
});

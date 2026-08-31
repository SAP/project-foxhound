/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const RELATIVE_DIR = "toolkit/components/pdfjs/test/";
const TESTROOT = "https://example.com/browser/" + RELATIVE_DIR;

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/toolkit/content/tests/browser/common/mockTransfer.js",
  this
);

const MockFilePicker = SpecialPowers.MockFilePicker;
const { promise: filePickerPromise, resolve: resolveFilePicker } =
  Promise.withResolvers();
add_setup(async function () {
  MockFilePicker.init();
  MockFilePicker.showCallback = function (fp) {
    resolveFilePicker(fp.defaultString);
    return MockFilePicker.returnCancel;
  };
  registerCleanupFunction(function () {
    MockFilePicker.cleanup();
  });
});

async function openContextMenuAt(browser, x, y) {
  const contextMenu = document.getElementById("contentAreaContextMenu");
  const contextMenuShownPromise = BrowserTestUtils.waitForEvent(
    contextMenu,
    "popupshown"
  );
  info("Opening context menu at coordinates: " + x + ", " + y);
  await BrowserTestUtils.synthesizeMouseAtPoint(
    x,
    y,
    { type: "contextmenu", button: 2 },
    browser
  );
  await contextMenuShownPromise;
  return contextMenu;
}

async function getPagesContextMenuItems(
  browser,
  box,
  waitForStatesChanged = false
) {
  info(`Opening context menu at the center of box: ${JSON.stringify(box)}`);
  return new Promise(resolve => {
    setTimeout(async () => {
      const { x, y, width, height } = box;
      const ids = [
        "context-pdfjs-copy-page",
        "context-pdfjs-cut-page",
        "context-pdfjs-delete-page",
        "context-pdfjs-save-page",
        "context-sep-pdfjs-save-page",
      ];
      let statesChangedPromise;
      if (waitForStatesChanged) {
        statesChangedPromise = BrowserTestUtils.waitForContentEvent(
          browser,
          "editingstateschanged",
          false,
          null,
          true
        );
      }

      await openContextMenuAt(browser, x + width / 2, y + height / 2);
      if (waitForStatesChanged) {
        await statesChangedPromise;
      }
      const doc = browser.ownerDocument;
      const results = new Map();
      for (const id of ids) {
        results.set(id, doc.getElementById(id) || null);
      }
      resolve(results);
    }, 0);
  });
}

async function hideContextMenu(browser) {
  info("Hiding context menu");
  await new Promise(resolve =>
    setTimeout(async () => {
      const doc = browser.ownerDocument;
      const contextMenu = doc.getElementById("contentAreaContextMenu");
      const popupHiddenPromise = BrowserTestUtils.waitForEvent(
        contextMenu,
        "popuphidden"
      );
      contextMenu.hidePopup();
      await popupHiddenPromise;
      resolve();
    }, 0)
  );
}

function assertMenuitems(menuitems, expected) {
  Assert.deepEqual(
    [...menuitems.values()]
      .filter(
        elmt =>
          !elmt.id.includes("-sep-") &&
          !elmt.hidden &&
          [null, "false"].includes(elmt.getAttribute("disabled"))
      )
      .map(elmt => elmt.id),
    expected
  );
}

async function clickOnItem(browser, items, entry) {
  info(`Clicking on menu item ${entry}`);
  const editingPromise = BrowserTestUtils.waitForContentEvent(
    browser,
    "editingaction",
    false,
    null,
    true
  );
  const contextMenu = document.getElementById("contentAreaContextMenu");
  contextMenu.activateItem(items.get(entry));
  await editingPromise;
}

async function getThumbnailBox(browser, index) {
  info(`Getting thumbnail box for page index ${index}`);
  return SpecialPowers.spawn(browser, [index], async function (idx) {
    const { ContentTaskUtils } = ChromeUtils.importESModule(
      "resource://testing-common/ContentTaskUtils.sys.mjs"
    );
    await ContentTaskUtils.waitForCondition(
      () =>
        !!content.document.querySelectorAll("#thumbnailsView .thumbnail")[idx],
      "Thumbnail must be present"
    );
    const el = content.document.querySelectorAll("#thumbnailsView .thumbnail")[
      idx
    ];
    const { x, y, width, height } = el.getBoundingClientRect();
    return { x, y, width, height };
  });
}

async function selectPage(browser, index) {
  info(`Selecting page index ${index}`);
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

add_task(async function test_pages_context_menu() {
  makePDFJSHandler();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async function (browser) {
      await SpecialPowers.pushPrefEnv({
        set: [["pdfjs.enableSplitMerge", true]],
      });

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

      await waitForSelector(
        browser,
        "#viewerContainer",
        "Viewer container must be present"
      );
      // Without any pages selected, no pages context menu items should be visible.
      const viewerBox = await SpecialPowers.spawn(browser, [], async () => {
        const el = content.document.querySelector("#viewerContainer");
        const { x, y, width, height } = el.getBoundingClientRect();
        return { x, y, width, height };
      });

      let menuitems = await getPagesContextMenuItems(browser, viewerBox);
      Assert.ok(
        [...menuitems.values()].every(elmt => elmt.hidden),
        "No visible pages menuitem when no pages are selected"
      );
      await hideContextMenu(browser);

      // Open the sidebar (thumbnails view).
      await click(browser, "#viewsManagerToggleButton");
      await waitForSelector(
        browser,
        "#thumbnailsView .thumbnail input[type=checkbox]",
        "Thumbnails with checkboxes must be visible"
      );

      // Select the first page.
      await selectPage(browser, 0);

      // Pages context menu items must be visible when a page is selected.
      let thumbnailBox = await getThumbnailBox(browser, 0);
      menuitems = await getPagesContextMenuItems(browser, thumbnailBox, true);
      assertMenuitems(menuitems, [
        "context-pdfjs-copy-page",
        "context-pdfjs-cut-page",
        "context-pdfjs-delete-page",
        "context-pdfjs-save-page",
      ]);

      // Copy the page: paste buttons must appear in the thumbnails view.
      let pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await clickOnItem(browser, menuitems, "context-pdfjs-copy-page");
      await pagesEditedPromise;

      Assert.greater(
        await countElements(browser, ".thumbnailPasteButton"),
        0,
        "Paste buttons must appear after copy"
      );

      await clickOn(browser, "#viewsManagerStatusUndoButton");

      // Select the first page again (checkboxes were cleared by the copy).
      await selectPage(browser, 0);

      // Delete the page: the thumbnail count must decrease.
      const thumbnailCount = await countElements(
        browser,
        "#thumbnailsView .thumbnail"
      );
      thumbnailBox = await getThumbnailBox(browser, 0);
      menuitems = await getPagesContextMenuItems(browser, thumbnailBox, true);

      pagesEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await clickOnItem(browser, menuitems, "context-pdfjs-delete-page");
      await pagesEditedPromise;

      await BrowserTestUtils.waitForCondition(
        async () =>
          (await countElements(browser, "#thumbnailsView .thumbnail")) ===
          thumbnailCount - 1,
        "One thumbnail must have been removed after delete"
      );

      // Select the first page and cut it: count must decrease and paste buttons appear.
      await selectPage(browser, 0);

      const countAfterDelete = await countElements(
        browser,
        "#thumbnailsView .thumbnail"
      );
      thumbnailBox = await getThumbnailBox(browser, 0);
      menuitems = await getPagesContextMenuItems(browser, thumbnailBox, true);

      const cutEditedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "pagesedited",
        false,
        null,
        true
      );
      await clickOnItem(browser, menuitems, "context-pdfjs-cut-page");
      await cutEditedPromise;

      await BrowserTestUtils.waitForCondition(
        async () =>
          (await countElements(browser, "#thumbnailsView .thumbnail")) ===
          countAfterDelete - 1,
        "One thumbnail must have been removed after cut"
      );
      Assert.greater(
        await countElements(browser, ".thumbnailPasteButton"),
        0,
        "Paste buttons must appear after cut"
      );

      // Select the first page and save: saveextractedpages event must fire.
      await selectPage(browser, 0);

      thumbnailBox = await getThumbnailBox(browser, 0);
      menuitems = await getPagesContextMenuItems(browser, thumbnailBox, true);

      const savePromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "saveextractedpages",
        false,
        null,
        true
      );
      await clickOnItem(browser, menuitems, "context-pdfjs-save-page");
      await savePromise;

      await filePickerPromise;

      await waitForPdfJSClose(browser);
      await SpecialPowers.popPrefEnv();
    }
  );
});

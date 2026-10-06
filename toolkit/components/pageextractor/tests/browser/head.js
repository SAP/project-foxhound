/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

const BLANK_PAGE =
  "data:text/html;charset=utf-8,<!DOCTYPE html><title>Blank</title>Blank page";

/** @type {import("../../../ml/tests/MLTestUtils.sys.mjs")} */
const { MLTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/MLTestUtils.sys.mjs"
);

/**
 * Click the reader-mode button if the reader-mode button is available.
 * Fails if the reader-mode button is hidden.
 */
async function toggleReaderMode() {
  const readerButton = document.getElementById("reader-mode-button");
  await BrowserTestUtils.waitForMutationCondition(
    readerButton,
    { attributes: true, attributeFilter: ["hidden"] },
    () => readerButton.hidden === false
  );

  readerButton.getAttribute("readeractive")
    ? info("Exiting reader mode")
    : info("Entering reader mode");

  const readyPromise = readerButton.getAttribute("readeractive")
    ? BrowserTestUtils.waitForMutationCondition(
        readerButton,
        { attributes: true, attributeFilter: ["readeractive"] },
        () => !readerButton.getAttribute("readeractive")
      )
    : BrowserTestUtils.waitForContentEvent(
        gBrowser.selectedBrowser,
        "AboutReaderContentReady"
      );

  click(readerButton, "Clicking the reader-mode button");
  await readyPromise;
}

function click(button, message) {
  info(message);
  if (button.hidden) {
    throw new Error("The button was hidden when trying to click it.");
  }
  button.click();
}

/**
 * @param {string} file
 */
async function openSupportFile(file) {
  // Support files can be served up from example.com
  const url_prefix = "https://example.com/browser/";
  const path_prefix = "toolkit/components/pageextractor/tests/browser/";
  const url = url_prefix + path_prefix + file;

  // Start the tab at a blank page.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BLANK_PAGE,
    true // waitForLoad
  );

  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, url);
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /* includeSubFrames */ false,
    url
  );

  async function cleanup() {
    if (url.endsWith(".pdf")) {
      // Wait for the PDFViewerApplication to be closed before removing the
      // tab to avoid spurious errors and potential intermittents.
      await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
        const viewer = content.wrappedJSObject.PDFViewerApplication;
        await viewer.testingClose();
      });
    }
    BrowserTestUtils.removeTab(tab);
  }

  return {
    cleanup,
    /**
     * @returns {PageExtractorParent}
     */
    getPageExtractor() {
      return tab.linkedBrowser.browsingContext.currentWindowGlobal.getActor(
        "PageExtractor"
      );
    },
  };
}

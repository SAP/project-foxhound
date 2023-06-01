/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "http://example.com"
);

add_task(async function test_readerModeURLDrag() {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PATH + "readerModeArticle.html",
    },

    async browser => {
      let readerButton = document.getElementById("reader-mode-button");
      await TestUtils.waitForCondition(
        () => !readerButton.hidden,
        "Reader mode button should become visible"
      );

      is_element_visible(
        readerButton,
        "Reader mode button is present on a reader-able page"
      );

      // Switch page into reader mode.
      let promiseTabLoad = BrowserTestUtils.browserLoaded(browser);
      readerButton.click();
      await promiseTabLoad;
      let urlbar = document.getElementById("urlbar-input");
      let readerUrl = gBrowser.selectedBrowser.currentURI.spec;
      ok(
        readerUrl.startsWith("about:reader"),
        "about:reader loaded after clicking reader mode button"
      );

      let dataTran = new DataTransfer();
      let urlEvent = new DragEvent("dragstart", { dataTransfer: dataTran });
      let oldUrl = TEST_PATH + "readerModeArticle.html";
      let urlBarContainer = document.getElementById("urlbar-input-container");
      urlBarContainer.click();
      urlbar.dispatchEvent(urlEvent);

      let newUrl = urlEvent.dataTransfer.getData("text/plain");
      ok(!newUrl.includes("about:reader"), "URL does not contain about:reader");

      Assert.equal(newUrl, oldUrl, "URL is the same");
    }
  );
});

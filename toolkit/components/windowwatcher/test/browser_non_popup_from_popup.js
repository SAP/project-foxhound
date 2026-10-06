"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

// Opening non-popup from a popup should open a new tab in the most recent
// non-popup window.
add_task(async function test_non_popup_from_popup() {
  const OPEN_PAGE = TEST_PATH + "file_open_page.html";

  await SpecialPowers.pushPrefEnv({
    set: [["browser.link.open_newwindow", 3]],
  });

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:blank",
    },
    async function () {
      // Wait for a popup opened by file_popup_opener.html.
      const newPopupPromise = BrowserTestUtils.waitForNewWindow();

      // Wait for a new tab opened by file_non_popup_opener.html.
      const newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser, OPEN_PAGE);

      // Open a page that opens a popup, which in turn opens a non-popup.
      BrowserTestUtils.startLoadingURIString(
        gBrowser,
        TEST_PATH + "file_popup_opener.html"
      );

      let win = await newPopupPromise;
      Assert.ok(true, "popup is opened");

      let tab = await newTabPromise;
      Assert.ok(true, "new tab is opened in the recent window");

      BrowserTestUtils.removeTab(tab);
      await BrowserTestUtils.closeWindow(win);
    }
  );

  await SpecialPowers.popPrefEnv();
});

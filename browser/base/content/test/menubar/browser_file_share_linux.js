/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://example.com"
);
const TEST_URL = BASE + "file_shareurl.html";

/**
 * Test the "Share" submenu in the File menu.
 * Verifies Copy Link works.
 */
add_task(async function test_file_menu_share() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let menu = document.getElementById("menu_FilePopup");
    await simulateMenuOpen(menu);

    await BrowserTestUtils.waitForMutationCondition(
      menu,
      { childList: true },
      () => menu.querySelector(".share-tab-url-item")
    );
    ok(true, "Got Share item");

    let popup = menu.querySelector(".share-tab-url-item").menupopup;
    await simulateMenuOpen(popup);

    let copyLinkItem = popup.querySelector(".share-copy-link");
    ok(copyLinkItem, "Copy Link item exists");
    await SimpleTest.promiseClipboardChange(TEST_URL, () =>
      copyLinkItem.doCommand()
    );

    await simulateMenuClosed(popup);
    await simulateMenuClosed(menu);
  });
});

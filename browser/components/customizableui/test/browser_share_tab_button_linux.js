/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL = BASE + "browser_shareurl.html";

async function openShareTabPopup() {
  await waitForOverflowButtonShown();
  await document.getElementById("nav-bar").overflowable.show();

  let shareTabButton = document.getElementById("share-tab-button");
  ok(shareTabButton, "Share tab button appears in Panel Menu");

  shareTabButton.click();

  let popupElement = document.getElementById("share-tab-popup");
  await BrowserTestUtils.waitForPopupEvent(popupElement, "shown");

  return { shareTabButton, popupElement };
}

add_setup(async function () {
  CustomizableUI.addWidgetToArea(
    "share-tab-button",
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );
  registerCleanupFunction(() => CustomizableUI.reset());
});

add_task(async function test_button() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let { popupElement } = await openShareTabPopup();

    let copyLinkItem = popupElement.querySelector(".share-copy-link");
    ok(copyLinkItem, "Copy Link item exists in submenu");

    let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
      popupElement,
      "hidden"
    );
    await SimpleTest.promiseClipboardChange(TEST_URL, () =>
      popupElement.activateItem(copyLinkItem)
    );
    await menuPopupClosedPromise;

    ok(true, "Copy works on linux");

    if (isOverflowOpen()) {
      await hideOverflow();
    }
  });
});

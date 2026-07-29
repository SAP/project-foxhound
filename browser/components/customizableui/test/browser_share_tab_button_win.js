/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL = BASE + "browser_shareurl.html";

let shareUrlSpy = sinon.spy();

SharingUtils.testOnlyMockUIUtils({
  shareUrl(url, title) {
    shareUrlSpy(url, title);
  },
  QueryInterface: ChromeUtils.generateQI([Ci.nsIWindowsUIUtils]),
});

registerCleanupFunction(function () {
  SharingUtils.testOnlyMockUIUtils(null);
});

async function openShareTabPopup() {
  await waitForOverflowButtonShown();
  await document.getElementById("nav-bar").overflowable.show();

  let shareTabButton = document.getElementById("share-tab-button");
  shareTabButton.click();

  let popupElement = document.getElementById("share-tab-popup");
  await BrowserTestUtils.waitForPopupEvent(popupElement, "shown");

  return { shareTabButton, popupElement };
}

async function closePopup(popupElement) {
  let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
    popupElement,
    "hidden"
  );
  popupElement.hidePopup();
  await menuPopupClosedPromise;
  ok(true, "Menu popup closed");

  if (isOverflowOpen()) {
    await hideOverflow();
  }
}

add_setup(async function () {
  CustomizableUI.addWidgetToArea(
    "share-tab-button",
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );
  registerCleanupFunction(() => CustomizableUI.reset());
});

add_task(async function test_button_exists() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let shareTabButton = await openShareTabPopup().then(r => r.shareTabButton);
    Assert.ok(shareTabButton, "Share tab button appears in Panel Menu");
    let popupElement = document.getElementById("share-tab-popup");
    await closePopup(popupElement);
  });
});

add_task(async function test_share_button_click() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    shareUrlSpy.resetHistory();

    let { popupElement } = await openShareTabPopup();

    let winShareItem = popupElement.querySelector(".share-windows-item");
    ok(winShareItem, "Share with Windows item exists in submenu");

    let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
      popupElement,
      "hidden"
    );
    popupElement.activateItem(winShareItem);
    await menuPopupClosedPromise;

    ok(shareUrlSpy.calledOnce, "shareUrl was called");

    let [url, title] = shareUrlSpy.getCall(0).args;
    is(url, TEST_URL, "Shared correct URL");
    is(title, "Sharing URL", "Shared correct title");

    if (isOverflowOpen()) {
      await hideOverflow();
    }
  });
});

add_task(async function test_copy_link() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    shareUrlSpy.resetHistory();

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

    ok(!shareUrlSpy.called, "native Windows share dialog was not invoked");

    if (isOverflowOpen()) {
      await hideOverflow();
    }
  });
});

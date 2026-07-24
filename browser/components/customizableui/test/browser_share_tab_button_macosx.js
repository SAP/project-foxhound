/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL = BASE + "browser_shareurl.html";
const mockShareData = [
  {
    name: "Test",
    menuItemTitle: "Sharing Service Test",
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKE" +
      "lEQVR42u3NQQ0AAAgEoNP+nTWFDzcoQE1udQQCgUAgEAgEAsGTYAGjxAE/G/Q2tQAAAABJRU5ErkJggg==",
  },
];

let shareUrlSpy = sinon.spy();
let openSharingPreferencesSpy = sinon.spy();
let getSharingProvidersSpy = sinon.spy();

const mockMacSharingService = MockRegistrar.register(
  "@mozilla.org/widget/macsharingservice;1",
  {
    getSharingProviders(url) {
      getSharingProvidersSpy(url);
      return mockShareData;
    },
    shareUrl(name, url, title) {
      shareUrlSpy(name, url, title);
    },
    openSharingPreferences() {
      openSharingPreferencesSpy();
    },
    QueryInterface: ChromeUtils.generateQI([Ci.nsIMacSharingService]),
  }
);

registerCleanupFunction(function () {
  MockRegistrar.unregister(mockMacSharingService);
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
    await waitForOverflowButtonShown();
    await document.getElementById("nav-bar").overflowable.show();

    let shareTabButton = document.getElementById("share-tab-button");
    Assert.ok(shareTabButton, "Share tab button appears in Panel Menu");
    await hideOverflow();
  });
});

add_task(async function test_popup_opens_with_share_services() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    getSharingProvidersSpy.resetHistory();

    let { popupElement } = await openShareTabPopup();
    Assert.ok(popupElement, "Popup element is open");

    ok(getSharingProvidersSpy.calledOnce, "getSharingProviders was called");

    let items = Array.from(popupElement.querySelectorAll("menuitem"));
    is(
      items.length,
      3,
      "There should be 3 menu items (copy link, share service, more)"
    );

    let shareButton = items.find(
      item => item.getAttribute("label") == mockShareData[0].menuItemTitle
    );
    ok(
      shareButton,
      "Share button's label should match the service's menu item title"
    );
    is(
      shareButton?.getAttribute("data-share-name"),
      mockShareData[0].name,
      "Share button's share-name value should match the service's name"
    );

    await closePopup(popupElement);
  });
});

add_task(async function test_share_service_click() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    shareUrlSpy.resetHistory();

    let { popupElement } = await openShareTabPopup();

    let items = Array.from(popupElement.querySelectorAll("menuitem"));
    let shareButton = items.find(
      item => item.getAttribute("label") == mockShareData[0].menuItemTitle
    );

    let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
      popupElement,
      "hidden"
    );
    popupElement.activateItem(shareButton);
    await menuPopupClosedPromise;

    ok(shareUrlSpy.calledOnce, "shareUrl was called");

    let [name, url, title] = shareUrlSpy.getCall(0).args;
    is(name, mockShareData[0].name, "Shared correct service name");
    is(url, TEST_URL, "Shared correct URL");
    is(title, "Sharing URL", "Shared the correct title");
  });
});

add_task(async function test_copy_link() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    let { popupElement } = await openShareTabPopup();

    let items = Array.from(popupElement.querySelectorAll("menuitem"));
    let copyLinkItem = items.find(
      item => item.getAttribute("data-l10n-id") == "menu-share-copy-link"
    );
    ok(copyLinkItem, "Copy link item exists");

    let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
      popupElement,
      "hidden"
    );
    await SimpleTest.promiseClipboardChange(TEST_URL, () =>
      popupElement.activateItem(copyLinkItem)
    );
    await menuPopupClosedPromise;
    ok(true, "Menu popup closed after button click");
  });
});

add_task(async function test_more_button() {
  await BrowserTestUtils.withNewTab(TEST_URL, async () => {
    openSharingPreferencesSpy.resetHistory();

    let { popupElement } = await openShareTabPopup();

    let items = Array.from(popupElement.querySelectorAll("menuitem"));
    let moreItem = items.find(
      item => item.getAttribute("data-l10n-id") == "menu-share-more"
    );
    ok(moreItem, "More item exists");

    let menuPopupClosedPromise = BrowserTestUtils.waitForPopupEvent(
      popupElement,
      "hidden"
    );
    popupElement.activateItem(moreItem);
    await menuPopupClosedPromise;

    ok(
      openSharingPreferencesSpy.calledOnce,
      "openSharingPreferences was called"
    );
  });
});

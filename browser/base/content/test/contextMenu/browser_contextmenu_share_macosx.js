/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://example.com"
);
const TEST_URL_1 = BASE + "browser_contextmenu_shareurl.html";
const TEST_URL_2 = "https://example.org/";

let mockShareData = [
  {
    name: "Test",
    menuItemTitle: "Sharing Service Test",
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKE" +
      "lEQVR42u3NQQ0AAAgEoNP+nTWFDzcoQE1udQQCgUAgEAgEAsGTYAGjxAE/G/Q2tQAAAABJRU5ErkJggg==",
  },
];

// Setup spies for observing function calls from MacSharingService
let shareUrlSpy = sinon.spy();
let openSharingPreferencesSpy = sinon.spy();
let getSharingProvidersSpy = sinon.spy();

let { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);
let mockMacSharingService = MockRegistrar.register(
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

const qrCodeEnabled = Services.prefs.getBoolPref(
  "browser.shareqrcode.enabled",
  false
);
// copy link + service + More, plus QR code if enabled.
const expectedItemCount = qrCodeEnabled ? 4 : 3;

/**
 * Test the "Share" item menus in the tab contextmenu on MacOSX.
 */
add_task(async function test_contextmenu_share_macosx() {
  await BrowserTestUtils.withNewTab(TEST_URL_1, async () => {
    let contextMenu = await openTabContextMenu(gBrowser.selectedTab);
    await BrowserTestUtils.waitForMutationCondition(
      contextMenu,
      { childList: true },
      () => contextMenu.querySelector(".share-tab-url-item")
    );
    ok(true, "Got Share item");

    await openShareMenuPopup(contextMenu);
    ok(getSharingProvidersSpy.calledOnce, "getSharingProviders called");

    info(
      "Check we have copy link, a service and one extra menu item for the More... button"
    );
    let popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
    let items = Array.from(popup.querySelectorAll("menuitem"));
    is(
      items.length,
      expectedItemCount,
      `There should be ${expectedItemCount} menu items.`
    );

    info("Click on the sharing service");
    let menuPopupClosedPromised = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    let shareButton = items.find(
      t => t.label == mockShareData[0].menuItemTitle
    );
    ok(
      shareButton,
      "Share button's label should match the service's menu item title. "
    );
    is(
      shareButton?.getAttribute("data-share-name"),
      mockShareData[0].name,
      "Share button's share-name value should match the service's name. "
    );

    popup.activateItem(shareButton);
    await menuPopupClosedPromised;

    ok(shareUrlSpy.calledOnce, "shareUrl called");

    info("Check the correct data was shared.");
    let [name, url, title] = shareUrlSpy.getCall(0).args;
    is(name, mockShareData[0].name, "Shared correct service name");
    is(url, TEST_URL_1, "Shared correct URL");
    is(title, "Sharing URL", "Shared the correct title.");

    info("Test the copy link button");
    contextMenu = await openTabContextMenu(gBrowser.selectedTab);
    await openShareMenuPopup(contextMenu);
    // Since the tab context menu was collapsed previously, the popup needs to get the
    // providers again.
    ok(getSharingProvidersSpy.calledTwice, "getSharingProviders called again");
    popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
    items = Array.from(popup.querySelectorAll("menuitem"));
    is(
      items.length,
      expectedItemCount,
      `There should be ${expectedItemCount} menu items.`
    );
    info("Click on the Copy Link item");
    let copyLinkItem = items.find(item =>
      item.classList.contains("share-copy-link")
    );
    menuPopupClosedPromised = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    await SimpleTest.promiseClipboardChange(TEST_URL_1, () =>
      popup.activateItem(copyLinkItem)
    );
    await menuPopupClosedPromised;

    info("Test the More... item");
    contextMenu = await openTabContextMenu(gBrowser.selectedTab);
    await openShareMenuPopup(contextMenu);
    // Since the tab context menu was collapsed previously, the popup needs to get the
    // providers again.
    is(getSharingProvidersSpy.callCount, 3, "getSharingProviders called again");
    popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
    items = popup.querySelectorAll("menuitem");
    is(
      items.length,
      expectedItemCount,
      `There should be ${expectedItemCount} menu items.`
    );

    info("Click on the More item");
    let moreMenuitem = popup.querySelector(".share-more-button");
    menuPopupClosedPromised = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    popup.activateItem(moreMenuitem);
    await menuPopupClosedPromised;
    ok(openSharingPreferencesSpy.calledOnce, "openSharingPreferences called");

    shareUrlSpy.resetHistory();
  });
});

/**
 * Test that for multiple selected tabs on macOS:
 *  - Native sharing services are enabled and share the context tab's URL
 *  - "Copy links" copies all shareable URLs to the clipboard
 */
add_task(async function test_contextmenu_share_multiselect_macosx() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL_1);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL_2);

  await triggerClickOn(tab1, { ctrlKey: true });
  ok(tab1.multiselected, "tab1 is multiselected");
  ok(tab2.multiselected, "tab2 is multiselected");

  let contextMenu = await openTabContextMenu(tab2);
  await BrowserTestUtils.waitForMutationCondition(
    contextMenu,
    { childList: true },
    () => contextMenu.querySelector(".share-tab-url-item")
  );

  await openShareMenuPopup(contextMenu);

  let popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
  let items = Array.from(popup.querySelectorAll("menuitem"));

  info("Native sharing service should be enabled for multi-tab");
  let nativeServiceItem = items.find(
    item => item.label == mockShareData[0].menuItemTitle
  );
  ok(nativeServiceItem, "native service item exists");
  ok(
    !nativeServiceItem.hasAttribute("disabled"),
    "native service is enabled for multi-tab (shares context tab URL)"
  );

  info("Clicking native service shares the context tab's URL");
  let menuPopupClosed = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "hidden"
  );
  popup.activateItem(nativeServiceItem);
  await menuPopupClosed;

  ok(shareUrlSpy.calledOnce, "shareUrl was called once");
  is(
    shareUrlSpy.firstCall.args[1],
    TEST_URL_2,
    "shareUrl was called with the context tab's URL"
  );

  info("Verify that tab multiselect is enabled");
  contextMenu = await openTabContextMenu(tab2);
  await openShareMenuPopup(contextMenu);
  popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
  items = Array.from(popup.querySelectorAll("menuitem"));

  let copyLinkItem = items.find(item =>
    item.classList.contains("share-copy-link")
  );
  ok(copyLinkItem, "copy link item exists");
  ok(
    !copyLinkItem.hasAttribute("disabled"),
    "copy link is enabled for multi-tab"
  );

  menuPopupClosed = BrowserTestUtils.waitForPopupEvent(contextMenu, "hidden");
  await SimpleTest.promiseClipboardChange(TEST_URL_1 + "\n" + TEST_URL_2, () =>
    popup.activateItem(copyLinkItem)
  );
  await menuPopupClosed;

  info("Verify HTML clipboard contains linked anchors for both tabs");
  let htmlContent = getHTMLClipboard();
  let htmlDoc = new DOMParser().parseFromString(htmlContent, "text/html");
  let anchors = Array.from(htmlDoc.querySelectorAll("a"));
  is(anchors.length, 2, "HTML clipboard has 2 anchor elements");
  is(
    anchors[0].getAttribute("href"),
    TEST_URL_1,
    "First anchor href matches URL 1"
  );
  ok(anchors[0].textContent, "First anchor has non-empty title");
  is(
    anchors[1].getAttribute("href"),
    TEST_URL_2,
    "Second anchor href matches URL 2"
  );
  ok(anchors[1].textContent, "Second anchor has non-empty title");

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  shareUrlSpy.resetHistory();
});

/**
 * Test that Copy Links is enabled when the first selected tab is about:blank
 * but another selected tab has a real URL.
 */
add_task(
  async function test_contextmenu_share_multiselect_blank_first_macosx() {
    let tab1 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:blank"
    );
    let tab2 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_URL_1
    );

    await triggerClickOn(tab1, { ctrlKey: true });
    ok(tab1.multiselected, "tab1 (blank) is multiselected");
    ok(tab2.multiselected, "tab2 (real URL) is multiselected");

    let contextMenu = await openTabContextMenu(tab1);
    await BrowserTestUtils.waitForMutationCondition(
      contextMenu,
      { childList: true },
      () => contextMenu.querySelector(".share-tab-url-item")
    );

    await openShareMenuPopup(contextMenu);

    let popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
    let copyLinkItem = Array.from(popup.querySelectorAll("menuitem")).find(
      item => item.classList.contains("share-copy-link")
    );
    ok(copyLinkItem, "copy links item exists");
    ok(
      !copyLinkItem.hasAttribute("disabled"),
      "copy links is enabled when at least one tab has a shareable URL"
    );

    let menuPopupClosed = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    contextMenu.hidePopup();
    await menuPopupClosed;

    BrowserTestUtils.removeTab(tab1);
    BrowserTestUtils.removeTab(tab2);
  }
);

/**
 * Test that Copy Links is disabled when all selected tabs have non-shareable URLs.
 */
add_task(async function test_contextmenu_share_multiselect_all_blank_macosx() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  let tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  await triggerClickOn(tab1, { ctrlKey: true });
  ok(tab1.multiselected, "tab1 is multiselected");
  ok(tab2.multiselected, "tab2 is multiselected");

  let contextMenu = await openTabContextMenu(tab2);
  await BrowserTestUtils.waitForMutationCondition(
    contextMenu,
    { childList: true },
    () => contextMenu.querySelector(".share-tab-url-item")
  );

  await openShareMenuPopup(contextMenu);

  let popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
  let copyLinkItem = Array.from(popup.querySelectorAll("menuitem")).find(item =>
    item.classList.contains("share-copy-link")
  );
  ok(copyLinkItem, "copy links item exists");
  is(
    copyLinkItem.getAttribute("disabled"),
    "true",
    "copy links is disabled when all selected tabs have non-shareable URLs"
  );

  let menuPopupClosed = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "hidden"
  );
  contextMenu.hidePopup();
  await menuPopupClosed;

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

/* Any copyright is dedicated to the Public Domain.
  http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const BASE = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const TEST_URL_1 = BASE + "browser_contextmenu_shareurl.html";
const TEST_URL_2 = "https://example.org/";

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

/**
 * Test the "Share" submenu in the tab contextmenu on Windows.
 */
add_task(async function test_contextmenu_share_win() {
  await BrowserTestUtils.withNewTab(TEST_URL_1, async () => {
    let contextMenu = await openTabContextMenu(gBrowser.selectedTab);
    let shareMenu = contextMenu.querySelector(".share-tab-url-item");

    ok(shareMenu, "Got Share menu on Windows");
    is(shareMenu.tagName, "menu", "Share item is a submenu");

    await openShareMenuPopup(contextMenu);

    let popup = shareMenu.menupopup;
    let winShareItem = popup.querySelector(".share-windows-item");
    ok(winShareItem, "Share with Windows item exists");

    info("Test the correct URL is shared when Share with Windows is selected.");
    let contextMenuClosedPromise = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    popup.activateItem(winShareItem);
    await contextMenuClosedPromise;

    ok(shareUrlSpy.calledOnce, "shareUrl called");
    let [url, title] = shareUrlSpy.getCall(0).args;
    is(url, TEST_URL_1, "Shared correct URL");
    is(title, "Sharing URL", "Shared correct title");
    shareUrlSpy.resetHistory();
  });
});

/**
 * Test that the "Copy Link" item in the share submenu copies the URL.
 */
add_task(async function test_contextmenu_share_copy_link_win() {
  await BrowserTestUtils.withNewTab(TEST_URL_1, async () => {
    let contextMenu = await openTabContextMenu(gBrowser.selectedTab);
    await openShareMenuPopup(contextMenu);

    let popup = contextMenu.querySelector(".share-tab-url-item").menupopup;
    let copyLinkItem = popup.querySelector(".share-copy-link");
    ok(copyLinkItem, "Copy Link item exists in submenu");

    let contextMenuClosedPromise = BrowserTestUtils.waitForPopupEvent(
      contextMenu,
      "hidden"
    );
    await SimpleTest.promiseClipboardChange(TEST_URL_1, () =>
      popup.activateItem(copyLinkItem)
    );
    await contextMenuClosedPromise;

    ok(!shareUrlSpy.called, "native Windows share dialog was not invoked");
    shareUrlSpy.resetHistory();
  });
});

/**
 * Test that for multiple selected tabs on Windows, "Copy Links" copies all URLs.
 */
add_task(async function test_contextmenu_share_multiselect_win() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL_1);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL_2);

  await triggerClickOn(tab1, { ctrlKey: true });
  ok(tab1.multiselected, "tab1 is multiselected");
  ok(tab2.multiselected, "tab2 is multiselected");

  let contextMenu = await openTabContextMenu(tab2);
  let shareMenu = contextMenu.querySelector(".share-tab-url-item");
  ok(shareMenu, "share menu exists");
  is(shareMenu.tagName, "menu", "share item is a submenu for multi-tab too");

  await openShareMenuPopup(contextMenu);

  let popup = shareMenu.menupopup;
  let copyLinkItem = popup.querySelector(".share-copy-link");
  ok(copyLinkItem, "Copy Link item exists");

  let contextMenuClosed = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "hidden"
  );
  await SimpleTest.promiseClipboardChange(TEST_URL_1 + "\n" + TEST_URL_2, () =>
    popup.activateItem(copyLinkItem)
  );
  await contextMenuClosed;

  ok(!shareUrlSpy.called, "native Windows share dialog was not invoked");

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
});

/**
 * Test that the share menu is visible when the first selected tab is about:blank
 * but another selected tab has a real URL.
 */
add_task(async function test_contextmenu_share_multiselect_blank_first_win() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL_1);

  await triggerClickOn(tab1, { ctrlKey: true });
  ok(tab1.multiselected, "tab1 (blank) is multiselected");
  ok(tab2.multiselected, "tab2 (real URL) is multiselected");

  let contextMenu = await openTabContextMenu(tab1);
  let shareMenu = contextMenu.querySelector(".share-tab-url-item");
  ok(shareMenu, "share menu exists");
  ok(
    !shareMenu.hidden,
    "share menu is visible when at least one tab has a shareable URL"
  );

  let contextMenuClosed = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "hidden"
  );
  contextMenu.hidePopup();
  await contextMenuClosed;

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

/**
 * Test that the share menu is hidden when all selected tabs have non-shareable URLs.
 */
add_task(async function test_contextmenu_share_multiselect_all_blank_win() {
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
  let shareMenu = contextMenu.querySelector(".share-tab-url-item");
  ok(shareMenu, "share menu exists");
  ok(
    shareMenu.hidden,
    "share menu is hidden when all selected tabs have non-shareable URLs"
  );

  let contextMenuClosed = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "hidden"
  );
  contextMenu.hidePopup();
  await contextMenuClosed;

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

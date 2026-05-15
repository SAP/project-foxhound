/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
requestLongerTimeout(4);

const ORIGIN_URL = "https://example.org";
const ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.org"
);
const TEST_URL = ROOT + "file_chat-webrtc.html";

async function openSidebar(win) {
  const sidebar = win.SidebarController;

  if (sidebar.isOpen) {
    await sidebar.hide();
    await BrowserTestUtils.waitForCondition(
      () => !sidebar.isOpen,
      "Waiting for sidebar to fully close"
    );
  }

  await sidebar.show("viewGenaiChatSidebar");

  const sidebarBrowser = sidebar.browser;
  const innerBrowser = sidebarBrowser.contentDocument.querySelector("browser");

  await BrowserTestUtils.browserLoaded(
    innerBrowser,
    false,
    url => url !== "about:blank"
  );

  await TestUtils.waitForCondition(
    () => innerBrowser.contentPrincipal?.origin,
    "Waiting for contentPrincipal"
  );

  return innerBrowser;
}

async function loadTestPageInTab(tabBrowser) {
  BrowserTestUtils.startLoadingURIString(tabBrowser, TEST_URL);
  await BrowserTestUtils.browserLoaded(tabBrowser);
}

async function clickRequestMic(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    content.document.getElementById("request-mic").click();
  });
}

function resetPermissions() {
  const principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(ORIGIN_URL);
  SitePermissions.removeFromPrincipal(principal, "microphone");
}

function getSidebarPermissions(win) {
  Assert.ok(win, "getSidebarPermissions requires explicit window");
  return win.SidebarController._permissions;
}

async function dismissPopupNotification(win) {
  const panel = win.document.getElementById("notification-popup");
  const sidebarPopupHidden = BrowserTestUtils.waitForEvent(
    panel,
    "popuphidden"
  );
  const blockButton = panel.querySelector(
    ".popup-notification-secondary-button"
  );
  blockButton.click();
  await sidebarPopupHidden;
  info("Notification is dismissed before closing sidebar");
}

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["media.navigator.permission.disabled", false],
      ["media.navigator.streams.fake", true],
      ["browser.ml.chat.provider", TEST_URL],
      ["sidebar.revamp", true],
    ],
  });
});

registerCleanupFunction(async () => {
  const windows = [...Services.wm.getEnumerator("navigator:browser")];

  for (const win of windows) {
    const sidebar = win.SidebarController;

    if (sidebar?.isOpen) {
      await sidebar.hide();
    }

    const panel = win.document?.getElementById("notification-popup");
    if (panel?.state === "open") {
      panel.hidePopup();
    }

    resetPermissions();
  }

  Services.fog.testResetFOG();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_sidebar_granted_perm_skip_popup() {
  const win = window;
  const inner = await openSidebar(win);
  const panel = win.document.getElementById("notification-popup");

  let popupShown = false;
  panel.addEventListener("popupshown", () => (popupShown = true), {
    once: true,
  });

  // Set persistent ALLOW
  const principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(TEST_URL);
  SitePermissions.setForPrincipal(
    principal,
    "microphone",
    SitePermissions.ALLOW
  );

  await clickRequestMic(inner);

  // Wait briefly to allow popup to appear if it were going to
  await TestUtils.waitForTick();

  Assert.ok(
    !popupShown,
    "Popup should not appear when permission is persistent ALLOW"
  );

  await win.SidebarController.hide();
  resetPermissions();
});

add_task(async function test_sidebar_shows_popup_and_blocked_permission_ui() {
  const win = window;
  const panel = win.document.getElementById("notification-popup");
  const inner = await openSidebar(win);

  // Request mic - popup shows
  const popupShown = BrowserTestUtils.waitForEvent(panel, "popupshown");
  await clickRequestMic(inner);
  await popupShown;
  Assert.equal(panel.state, "open", "Sidebar popup is open");

  // Click the block button
  const popupHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  const blockButton = panel.querySelector(
    ".popup-notification-secondary-button"
  );

  blockButton.click();
  await popupHidden;

  await BrowserTestUtils.waitForCondition(async () => {
    return SpecialPowers.spawn(
      SidebarController.browser,
      [],
      () => !!content.document.querySelector(".blocked-permission-icon")
    );
  }, "Waiting for blocked icon");

  await win.SidebarController.hide();
  resetPermissions();
});

/**
 * If tab permission popup is open, sidebar requests permission
 * Expected behavior: Tab PopupNotification canceled, sidebar PopupNotification shown
 */
add_task(async function test_tab_open_sidebar_requests() {
  const win = window;
  const inner = await openSidebar(win);
  const panel = win.document.getElementById("notification-popup");
  const tabBrowser = win.gBrowser.selectedBrowser;

  // Load test page and show tab popup notification
  await loadTestPageInTab(tabBrowser);
  const tabPopupShown = BrowserTestUtils.waitForEvent(panel, "popupshown");
  await clickRequestMic(tabBrowser);
  await tabPopupShown;
  Assert.equal(panel.state, "open", "Tab PopupNotification is open");

  // Sidebar requests - should cancel tab
  const popupHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  await clickRequestMic(inner);
  await popupHidden;

  info("Tab PopupNotification is hidden");

  await BrowserTestUtils.waitForCondition(
    () => panel.state === "open",
    "SidebarPopupNotification should open"
  );

  const tabNotification = win.PopupNotifications.getNotification(
    "webRTC-shareDevices",
    tabBrowser
  );
  Assert.ok(!tabNotification, "Tab notification canceled");

  // Dismiss sidebar popup before closing
  await dismissPopupNotification(win);

  await win.SidebarController.hide();
  resetPermissions();
});

/**
 * SidebarPopupNotification is open, tab requests permission
 * Expected behavior: sidebar PopupNotification canceled, Tab PopupNotification shown
 */
add_task(async function test_sidebar_open_tab_requests() {
  const win = window;
  const inner = await openSidebar(win);
  const panel = win.document.getElementById("notification-popup");
  const tabBrowser = win.gBrowser.selectedBrowser;

  await loadTestPageInTab(tabBrowser);

  // Show sidebar popup
  const sidebarPopupShown = BrowserTestUtils.waitForEvent(panel, "popupshown");
  await clickRequestMic(inner);
  await sidebarPopupShown;
  Assert.equal(panel.state, "open", "SidebarPopupNotification is open");

  // Tab request permission - should cancel sidebar PopupNotification
  const popupHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  await clickRequestMic(tabBrowser);
  await popupHidden;

  await BrowserTestUtils.waitForEvent(panel, "popupshown");
  Assert.ok(
    panel.state === "open" || panel.state === "showing",
    "Tab PopupNotification is appeared"
  );

  const sidebarNotification = win.SidebarPopupNotifications?.getNotification(
    "webRTC-shareDevices",
    inner
  );
  Assert.ok(!sidebarNotification, "Sidebar notification canceled");

  // Cleanup
  const tabNotification = win.PopupNotifications.getNotification(
    "webRTC-shareDevices",
    tabBrowser
  );
  if (tabNotification) {
    win.PopupNotifications.remove(tabNotification);
  }

  await win.SidebarController.hide();
  resetPermissions();
});

/**
 * SidebarPopupNotification in Window A, sidebar requests in Window B
 * Expected behavior: Window A SidebarPopupNotification shows,
 * Window B shows SidebarPopupNotification
 */
add_task(async function test_cross_window_between_sidebar_and_sidebar_popup() {
  const innerA = await openSidebar(window);
  const winA = innerA.browsingContext.topChromeWindow;
  const panelA = winA.document.getElementById("notification-popup");

  // Show SidebarPopupNotification in window 1
  const popupAShown = BrowserTestUtils.waitForEvent(panelA, "popupshown");
  await clickRequestMic(innerA);
  await popupAShown;

  // Open window B with sidebar
  const winB = await BrowserTestUtils.openNewBrowserWindow();
  const innerB = await openSidebar(winB);
  const panelB = winB.document.getElementById("notification-popup");

  // Window B sidebar requests
  const popupBShown = BrowserTestUtils.waitForEvent(panelB, "popupshown");
  await clickRequestMic(innerB);
  await popupBShown;

  Assert.equal(panelA.state, "open", "Window A PopupNotification still show");

  await winB.SidebarController.hide();
  if ("SidebarPopupNotifications" in winB) {
    delete winB.SidebarPopupNotifications;
  }
  await BrowserTestUtils.closeWindow(winB);
  await TestUtils.waitForCondition(
    () => winB.closed,
    "Waiting for winB to fully close"
  );

  await winA.SidebarController.hide();
  resetPermissions();
});

/**
 * Tab SidebarPopupNotification in Window A, sidebar requests in Window B
 * Expected behavior: Window A tab PopupNotification canceled,
 * Window B sidebar shows SidebarPopupNotification
 */
add_task(async function test_cross_window_between_tab_and_sidebar_popup() {
  const winA = window;
  const panelA = winA.document.getElementById("notification-popup");
  const tabBrowserA = winA.gBrowser.selectedBrowser;

  // Load test page and show tab PopupNotification in window A
  await loadTestPageInTab(tabBrowserA);

  const tabPopupShown = BrowserTestUtils.waitForEvent(panelA, "popupshown");
  await clickRequestMic(tabBrowserA);
  await tabPopupShown;

  // Open window B with sidebar
  const winB = await BrowserTestUtils.openNewBrowserWindow();
  const innerB = await openSidebar(winB);
  const panelB = winB.document.getElementById("notification-popup");

  // Sidebar in window B requests - should cancel window A and show in window B
  const popupAHidden = BrowserTestUtils.waitForEvent(panelA, "popuphidden");
  const popupBShown = BrowserTestUtils.waitForEvent(panelB, "popupshown");

  await clickRequestMic(innerB);

  await popupAHidden;
  Assert.ok(true, "Window A tab notification canceled");

  await popupBShown;
  Assert.equal(panelB.state, "open", "Window B sidebar notification shown");

  // Dismiss the popup in window B before closing
  if (panelB.state === "open") {
    const popupBHidden = BrowserTestUtils.waitForEvent(panelB, "popuphidden");
    panelB.hidePopup();
    await popupBHidden;
  }

  await winB.SidebarController.hide();

  await TestUtils.waitForCondition(
    () => !winB.SidebarPopupNotifications,
    "Waiting for SidebarPopupNotifications cleanup"
  );

  await BrowserTestUtils.closeWindow(winB);

  // Cancel any remaining tab notification for cleaning up for test
  const tabNotification = winA.PopupNotifications.getNotification(
    "webRTC-shareDevices",
    tabBrowserA
  );
  if (tabNotification) {
    winA.PopupNotifications.remove(tabNotification);
  }
  resetPermissions();
});

/**
 * Provider change cancels active notification
 */
add_task(async function test_provider_change_cancels_notification() {
  const win = window;
  const inner = await openSidebar(win);
  const panel = win.document.getElementById("notification-popup");
  const permissions = getSidebarPermissions(win);

  const popupShown = BrowserTestUtils.waitForEvent(panel, "popupshown");
  await clickRequestMic(inner);
  await popupShown;

  const popupHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");

  // Call the handler directly
  permissions.onContentBrowserChanged();

  await popupHidden;

  Assert.notEqual(
    panel.state,
    "open",
    "PopupNotification cancels on provider change"
  );
  await win.SidebarController.hide();
  resetPermissions();
});

/**
 * Hiding sidebar cancels active notification
 */
add_task(async function test_hide_sidebar_cancels_notification() {
  const win = window;
  const inner = await openSidebar(win);
  const panel = win.document.getElementById("notification-popup");

  const popupShown = BrowserTestUtils.waitForEvent(panel, "popupshown");
  await clickRequestMic(inner);
  await popupShown;

  const popupHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  await win.SidebarController.hide();
  await popupHidden;

  Assert.notEqual(
    panel.state,
    "open",
    "PopupNotification cancels when sidebar hidden"
  );
  resetPermissions();
});

/**
 * Active sharing state updates UI
 */
add_task(async function test_sharing_state_updates_ui() {
  const win = window;
  await openSidebar(win);

  const fakeState = {
    webRTC: {
      sharing: "microphone",
      microphone: Ci.nsIMediaManagerService.STATE_CAPTURE_ENABLED,
      camera: 0,
      paused: false,
      showMicrophoneIndicator: true,
    },
  };

  win.SidebarController._permissions.updateFromBrowserState(fakeState);

  const { document } = win.SidebarController.browser.contentWindow;
  const sharingIcon = document.getElementById("webrtc-sharing-icon");

  Assert.ok(sharingIcon, "Sharing icon exists");
  Assert.equal(
    sharingIcon.getAttribute("sharing"),
    "microphone",
    "Sharing attribute set to microphone"
  );

  // Clean up the fake state before closing
  win.SidebarController._permissions.updateFromBrowserState({});

  // Wait for identity box to not be showing
  const identityBox = document.getElementById("identity-permission-box");
  await TestUtils.waitForCondition(
    () => !identityBox.classList.contains("showing"),
    "Waiting for showing class to be removed"
  );

  await TestUtils.waitForTick();

  await win.SidebarController.hide();
  await TestUtils.waitForCondition(
    () => !win.SidebarController.isOpen,
    "Waiting for sidebar to fully close"
  );
});

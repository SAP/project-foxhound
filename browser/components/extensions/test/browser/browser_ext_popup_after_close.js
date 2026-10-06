"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { PermissionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PermissionTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

// Default value of security.notification_enable_delay is 500.
// To avoid unnecessary delays in the test, we choose a short (non-zero) delay.
const delayBeforeEnablingButtons = 10;
const MSG_NO_CLICK = "Ignored click shortly after extension popup was closed";

let gPopupExtension;

add_setup(async () => {
  registerCleanupFunction(() => gPopupExtension.unload());
  gPopupExtension = ExtensionTestUtils.loadExtension({
    manifest: {
      page_action: {
        default_popup: "popup.html",
        show_matches: ["<all_urls>"],
      },
      browser_action: {
        default_popup: "popup.html",
      },
    },
    files: {
      "popup.html": "Extension popup here",
    },
  });
  await gPopupExtension.startup();
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/",
    true,
    true
  );
  gBrowser.selectedTab = tab;

  registerCleanupFunction(async () => {
    // Clean up anything left behind by showNotificationPanel().
    await PermissionTestUtils.remove(
      tab.linkedBrowser.currentURI,
      "desktop-notification"
    );
    BrowserTestUtils.removeTab(tab);
  });

  await SpecialPowers.pushPrefEnv({
    set: [["security.notification_enable_delay", delayBeforeEnablingButtons]],
  });
});

async function waitForDelayElapsed() {
  info(`Waiting for delay ${delayBeforeEnablingButtons}ms to be elapsed`);
  // Waiting for an "arbitrary" time is unavoidable because we need to verify
  // the effectiveness of a time-based delay. The timeout is chosen to be small
  // (so the test does not take too long) and the actions around the delay are
  // deterministic (to minimize the odds of intermittent failures).
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(r => setTimeout(r, delayBeforeEnablingButtons));
}

async function showNotificationPanel() {
  const shownPromise = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  // Remove previously stored perm if any, to make sure that the
  // Notification.requestPermission call does not resolve immediately.
  await PermissionTestUtils.remove(
    gBrowser.selectedBrowser.currentURI,
    "desktop-notification"
  );

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    // Notification.requestPermission() requires user activation.
    content.document.notifyUserGestureActivation();
    content.Notification.requestPermission(); // Fire and forget.
  });
  info("Waiting for Notification panel to appear");
  await shownPromise;

  const panel = PopupNotifications.panel;
  const button = panel.querySelector(".popup-notification-primary-button");
  // Resolve the button's Lit render cycle while the panel is in a stable,
  // fully-shown state. clickNotificationPanel is later called inside a tight
  // synchronous window (immediately after a browser action popup closes),
  // where the panel may be mid-transition and querySelector would return null.
  // Pre-fetching here avoids that race entirely.
  await button.updateComplete;
  return { panel, button };
}

function clickNotificationPanel({ panel, button }) {
  is(panel.state, "open", "Sanity check: notification panel is open");
  ok(button, "Found button to click in notification panel");
  EventUtils.synthesizeMouseAtCenter(button, {}, window);
}

function clickNotificationInToolbar(notifInToolbar) {
  ok(
    notifInToolbar.closest("#notifications-toolbar"),
    "Sanity check: notification is inside toolbar"
  );
  const but = notifInToolbar.closeButton;
  ok(but, "Found button to click in notification in toolbar");
  EventUtils.synthesizeMouseAtCenter(but, {}, window);
}

// Verify that clicks are temporarily ignored.
// triggerRealClick should try to click on a button.
async function verifyClickImmediatelyAfterPopupClose({
  triggerRealClick,
  promiseFinalClickResult,
}) {
  let { messages: m1 } = await AddonTestUtils.promiseConsoleOutput(() => {
    // NOTE: This is the very first thing that runs immediately after the popup
    // is closed. The lack of other async delay ensures that we can pick a
    // short delayBeforeEnablingButtons (security.notification_enable_delay)
    // value for fast yet deterministic tests.
    triggerRealClick();
    triggerRealClick();
    triggerRealClick();
  });

  is(
    m1.filter(m => m.message.includes(MSG_NO_CLICK)).length,
    3,
    "Click should be ignored while the delay is in effect"
  );

  await waitForDelayElapsed();
  let finalClickResult = promiseFinalClickResult();
  let { messages: m2 } = await AddonTestUtils.promiseConsoleOutput(() => {
    triggerRealClick();
  });
  is(
    m2.filter(m => m.message.includes(MSG_NO_CLICK)).length,
    0,
    "Click should be processed as usual after delay"
  );
  await finalClickResult;
  info("Final click was effective");
}

add_task(async function test_panel_click_after_browserAction_close() {
  let notification = await showNotificationPanel();

  let popupOpened = awaitExtensionPanel(gPopupExtension);
  await clickBrowserAction(gPopupExtension);
  await popupOpened;
  info("Browser action panel opened");
  await closeBrowserAction(gPopupExtension);
  info("Browser action panel closed");

  await verifyClickImmediatelyAfterPopupClose({
    triggerRealClick: () => clickNotificationPanel(notification),
    promiseFinalClickResult() {
      return BrowserTestUtils.waitForEvent(notification.panel, "popuphidden");
    },
  });
});

// Verify that the common logic also works for page actions. We do not need to
// enumerate every case, but as a sanity check do it at least once.
add_task(async function test_panel_click_after_pageAction_close() {
  let notification = await showNotificationPanel();

  let popupOpened = awaitExtensionPanel(gPopupExtension);
  await clickPageAction(gPopupExtension);
  await popupOpened;
  info("pageAction panel opened");
  await closePageAction(gPopupExtension);
  info("pageAction panel closed");

  await verifyClickImmediatelyAfterPopupClose({
    triggerRealClick: () => clickNotificationPanel(notification),
    promiseFinalClickResult() {
      return BrowserTestUtils.waitForEvent(notification.panel, "popuphidden");
    },
  });
});

// Verify that we temporarily ignore clicks inside the notification toolbar
// (#notifications-toolbar) when needed. There are many ways to trigger this,
// we test it via the popup blocker.
add_task(async function test_toolbar_click_after_browserAction_close() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.disable_open_during_load", true]],
  });

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    // We want window.open() to be rejected.
    content.document.clearUserGestureActivation();
    let win = content.wrappedJSObject.window.open();
    Assert.ok(!win, "window.open() should be blocked by popup blocker");
  });
  let notifInToolbar = await TestUtils.waitForCondition(() => {
    let notificationBox = gBrowser.getNotificationBox();
    return notificationBox.getNotificationWithValue("popup-blocked");
  });

  let popupOpened = awaitExtensionPanel(gPopupExtension);
  await clickBrowserAction(gPopupExtension);
  await popupOpened;
  info("Browser action panel opened");
  await closeBrowserAction(gPopupExtension);
  info("Browser action panel closed");

  await verifyClickImmediatelyAfterPopupClose({
    triggerRealClick: () => clickNotificationInToolbar(notifInToolbar),
    promiseFinalClickResult() {
      return TestUtils.waitForCondition(() => !notifInToolbar.isConnected);
    },
  });
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_click_inside_extensions_panel_is_unaffected() {
  await SpecialPowers.pushPrefEnv({
    // Use the default delay instead of a short delay, to make sure that even
    // if the extensions panel initialization is slow, that we'd catch
    // unexpectedly ignored clicks, if any.
    set: [["security.notification_enable_delay", 500]],
  });

  let popupOpened = awaitExtensionPanel(gPopupExtension);
  await clickBrowserAction(gPopupExtension);
  await popupOpened;
  info("Browser action panel opened");
  await closeBrowserAction(gPopupExtension);
  info("Browser action panel closed");

  let { messages } = await AddonTestUtils.promiseConsoleOutput(async () => {
    const viewShown = BrowserTestUtils.waitForEvent(
      gUnifiedExtensions.panel.querySelector("#unified-extensions-view"),
      "ViewShown"
    );
    EventUtils.synthesizeMouseAtCenter(gUnifiedExtensions.button, {}, window);
    await viewShown;
    info("Extensions panel is shown, now clicking on extension button");
    const { node } = getBrowserActionWidget(gPopupExtension).forWindow(window);
    const but = node.querySelector(".unified-extensions-item-action-button");

    let popupOpenedAgain = awaitExtensionPanel(gPopupExtension);
    EventUtils.synthesizeMouseAtCenter(but, {}, window);
    let popupBrowser = await popupOpenedAgain;

    // Since we have an open panel anyway, let's check what happens when we try
    // to click inside. Although our implementation does not special-case
    // extension popups, it appears that the click is not intercepted.
    info("Extension popup was opened, now clicking inside");
    await BrowserTestUtils.synthesizeMouseAtCenter("body", {}, popupBrowser);

    await closeBrowserAction(gPopupExtension);
  });
  is(
    messages.filter(m => m.message.includes(MSG_NO_CLICK)).length,
    0,
    "None of the clicks in the extensions panel should be ignored"
  );

  await SpecialPowers.popPrefEnv();
});

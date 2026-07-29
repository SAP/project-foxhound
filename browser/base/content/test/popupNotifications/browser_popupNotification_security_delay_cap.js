/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_SECURITY_DELAY = 5000;

SimpleTest.requestCompleteLog();

/**
 * Shows a test PopupNotification.
 */
function showNotification() {
  PopupNotifications.show(
    gBrowser.selectedBrowser,
    "foo",
    "Hello, World!",
    "default-notification-icon",
    {
      label: "ok",
      accessKey: "o",
      callback: () => {},
    },
    [
      {
        label: "cancel",
        accessKey: "c",
        callback: () => {},
      },
    ],
    {
      // Make test notifications persistent to ensure they are only closed
      // explicitly by test actions and survive tab switches.
      persistent: true,
    }
  );
}

add_setup(async function () {
  // Set a longer security delay for PopupNotification actions so we can test
  // the delay even if the test runs slowly.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.wait300msAfterTabSwitch", true],
      ["security.notification_enable_delay", TEST_SECURITY_DELAY],
    ],
  });
});

/**
 * Tests that continuous rapid clicking during the security delay can never
 * extend the wait beyond SECURITY_DELAY_EXTENSION_CAP_MULTIPLIER (20) times
 * the configured delay. Without the cap (bug 2035581) every rejected click
 * resets the deadline and the user can never dismiss the popup.
 *
 * Deterministic: we assert directly on the difference between timeShown and
 * timeShownWithoutClickExtensions after a tight sync-click loop, then backdate
 * timeShown past the cap and verify the next click fires. No wall-clock
 * dependency, so this is robust on slow/debug builds.
 */
add_task(async function test_securityDelayHasHardCap() {
  const SHORT_DELAY = 250;
  const CAP_MULTIPLIER = 20;
  const N_CLICKS = 30; // strictly greater than CAP_MULTIPLIER

  await SpecialPowers.pushPrefEnv({
    set: [["security.notification_enable_delay", SHORT_DELAY]],
  });
  await ensureSecurityDelayReady();

  let popupShownPromise = waitForNotificationPanel();
  showNotification();
  await popupShownPromise;

  let notification = PopupNotifications.getNotification(
    "foo",
    gBrowser.selectedBrowser
  );
  ok(notification, "Notification should be shown.");
  ok(
    notification.timeShownWithoutClickExtensions,
    "timeShownWithoutClickExtensions anchor should be set on show."
  );

  // triggerSecondaryCommand -> synthesizeMouseAtCenter -> command event ->
  // _onButtonEvent is all synchronous on the rejected-click path, so a tight
  // loop saturates timeShown at the cap.
  for (let i = 0; i < N_CLICKS; i++) {
    triggerSecondaryCommand(PopupNotifications.panel, 0);
  }

  ok(
    PopupNotifications.getNotification("foo", gBrowser.selectedBrowser),
    "All clicks fell inside the delay; notification stays open."
  );

  let extension =
    notification.timeShown - notification.timeShownWithoutClickExtensions;
  Assert.lessOrEqual(
    extension,
    CAP_MULTIPLIER * SHORT_DELAY,
    `timeShown extension (${extension}ms) is bounded by ` +
      `${CAP_MULTIPLIER} * ${SHORT_DELAY}ms.`
  );

  // Backdate past the cap; the next click must fire and close the panel.
  notification.timeShown = performance.now() - SHORT_DELAY * 2;
  notification.timeShownWithoutClickExtensions = notification.timeShown;

  let notificationHiddenPromise = waitForNotificationPanelHidden();
  triggerSecondaryCommand(PopupNotifications.panel, 0);
  await notificationHiddenPromise;

  ok(
    !PopupNotifications.getNotification("foo", gBrowser.selectedBrowser),
    "Notification closes once timeShown is past the cap."
  );

  await SpecialPowers.popPrefEnv();
});

/**
 * Tests that an action with disableSecurityDelay: true fires immediately,
 * skipping the security delay entirely.
 */
add_task(async function test_disableSecurityDelayAction_immediate() {
  await ensureSecurityDelayReady();

  let popupShownPromise = waitForNotificationPanel();
  PopupNotifications.show(
    gBrowser.selectedBrowser,
    "foo",
    "Hello, World!",
    "default-notification-icon",
    {
      label: "ok",
      accessKey: "o",
      callback: () => {},
    },
    [
      {
        label: "cancel",
        accessKey: "c",
        disableSecurityDelay: true,
        callback: () => {},
      },
    ],
    { persistent: true }
  );
  await popupShownPromise;

  ok(
    PopupNotifications.isPanelOpen,
    "PopupNotification should be open after show call."
  );

  let notificationHiddenPromise = waitForNotificationPanelHidden();
  // Click immediately, well before security.notification_enable_delay
  // (set to TEST_SECURITY_DELAY = 5000 ms in add_setup).
  triggerSecondaryCommand(PopupNotifications.panel, 0);
  await notificationHiddenPromise;

  ok(
    !PopupNotifications.getNotification("foo", gBrowser.selectedBrowser),
    "Action with disableSecurityDelay should fire immediately."
  );
});

/**
 * Regression guard: a secondary action without disableSecurityDelay still
 * respects the security delay.
 */
add_task(async function test_unflaggedSecondaryActionStillRespectsDelay() {
  await ensureSecurityDelayReady();

  let popupShownPromise = waitForNotificationPanel();
  showNotification();
  await popupShownPromise;

  info("Click secondary action immediately; should be blocked by delay.");
  triggerSecondaryCommand(PopupNotifications.panel, 0);
  await new Promise(resolve => setTimeout(resolve, 0));

  let notification = PopupNotifications.getNotification(
    "foo",
    gBrowser.selectedBrowser
  );
  ok(
    notification,
    "Unflagged secondary action should still be blocked by the delay."
  );

  // Backdate timeShown / timeShownWithoutClickExtensions past the delay and
  // click again.
  let fakeTimeShown = TEST_SECURITY_DELAY + 500;
  notification.timeShown = performance.now() - fakeTimeShown;
  notification.timeShownWithoutClickExtensions = notification.timeShown;

  let notificationHiddenPromise = waitForNotificationPanelHidden();
  triggerSecondaryCommand(PopupNotifications.panel, 0);
  await notificationHiddenPromise;

  ok(
    !PopupNotifications.getNotification("foo", gBrowser.selectedBrowser),
    "Should dismiss once outside the delay."
  );
});

/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_check_fullscreen_notification_visibility() {
  info("Showing notification\n");
  let notification = await gNotificationBox.appendNotification(
    "test-fullscreen-notification",
    {
      label: "Test Fullscreen Notification",
      priority: gNotificationBox.PRIORITY_INFO_HIGH,
    }
  );

  Assert.ok(
    BrowserTestUtils.isVisible(notification),
    "Notification should be visible before fullscreen."
  );

  const fullScreenEntered = BrowserTestUtils.waitForEvent(window, "fullscreen");

  EventUtils.synthesizeKey("KEY_F11", {});

  info(`Waiting for entering fullscreen mode...`);
  await fullScreenEntered;

  Assert.ok(
    BrowserTestUtils.isVisible(notification),
    "Notification should be visible after entering fullscreen."
  );

  const fullScreenExited = BrowserTestUtils.waitForEvent(window, "fullscreen");

  EventUtils.synthesizeKey("KEY_F11", {});

  info(`Waiting for exiting fullscreen mode...`);
  await fullScreenExited;

  Assert.ok(
    BrowserTestUtils.isVisible(notification),
    "Notification should be visible after exiting fullscreen."
  );
});

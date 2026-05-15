/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPProtectionInfobarManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionInfobarManager.sys.mjs"
);
const { BANDWIDTH } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);

function dispatchUsageEvent(remainingPercent) {
  // Use realistic byte values: 50 GB max bandwidth
  const maxBytes = BigInt(BANDWIDTH.MAX_IN_GB) * BigInt(BANDWIDTH.BYTES_IN_GB);
  const remainingBytes = BigInt(
    Math.floor(Number(maxBytes) * remainingPercent)
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(maxBytes, remainingBytes, Temporal.Now.instant()),
      },
    })
  );
}

DEFAULT_EXPERIMENT = null;

add_task(async function test_75_percent_notification() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.2);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-75"
      ),
    "Wait for 75% notification to appear"
  );

  const notification = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-75"
  );

  Assert.ok(notification, "75% notification exists");
  Assert.equal(
    notification.priority,
    window.gNotificationBox.PRIORITY_WARNING_HIGH,
    "Notification has high warning priority"
  );

  window.gNotificationBox.removeNotification(notification);
  IPProtectionInfobarManager.uninit();
});

add_task(async function test_90_percent_notification() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.08);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-90"
      ),
    "Wait for 90% notification to appear"
  );

  const notification = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-90"
  );

  Assert.ok(notification, "90% notification exists");
  Assert.equal(
    notification.priority,
    window.gNotificationBox.PRIORITY_WARNING_HIGH,
    "Notification has high warning priority"
  );

  window.gNotificationBox.removeNotification(notification);
  IPProtectionInfobarManager.uninit();
});

add_task(async function test_no_notification_above_25_percent() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.5);

  await TestUtils.waitForTick();

  const notification75 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-75"
  );
  const notification90 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-90"
  );

  Assert.equal(notification75, null, "No 75% notification when above 25%");
  Assert.equal(notification90, null, "No 90% notification when above 25%");

  IPProtectionInfobarManager.uninit();
});

add_task(async function test_no_duplicate_notifications() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.15);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-75"
      ),
    "Wait for first 75% notification to appear"
  );

  const firstNotification = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-75"
  );
  Assert.ok(firstNotification, "First 75% notification exists");

  dispatchUsageEvent(0.15);
  await TestUtils.waitForTick();

  const allNotifications = window.gNotificationBox.allNotifications;
  const warningNotifications = allNotifications.filter(n =>
    n.getAttribute("value").startsWith("ip-protection-bandwidth-warning")
  );

  Assert.equal(
    warningNotifications.length,
    1,
    "Only one notification exists after multiple events"
  );

  window.gNotificationBox.removeNotification(firstNotification);
  IPProtectionInfobarManager.uninit();
});

add_task(async function test_90_percent_overrides_75_percent() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.05);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-90"
      ),
    "Wait for 90% notification to appear"
  );

  const notification90 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-90"
  );
  const notification75 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-75"
  );

  Assert.ok(notification90, "90% notification exists");
  Assert.equal(notification75, null, "75% notification does not exist");

  window.gNotificationBox.removeNotification(notification90);
  IPProtectionInfobarManager.uninit();
});

add_task(async function test_remove_infobar_after_sign_out() {
  setupService({ isSignedIn: true, isEnrolledAndEntitled: true });
  IPProtectionService.updateState();

  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.2);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-75"
      ),
    "Wait for 75% notification to appear"
  );

  Assert.ok(
    window.gNotificationBox.getNotificationWithValue(
      "ip-protection-bandwidth-warning-75"
    ),
    "75% notification should be present before sign out"
  );

  setupService({ isSignedIn: false });
  IPProtectionService.updateState();

  await TestUtils.waitForCondition(
    () =>
      !window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-75"
      ),
    "Wait for 75% notification to be removed after sign out"
  );

  Assert.ok(
    !window.gNotificationBox.getNotificationWithValue(
      "ip-protection-bandwidth-warning-75"
    ),
    "75% notification should be removed after sign out"
  );

  IPProtectionInfobarManager.uninit();
  cleanupService();
});

add_task(async function test_hide_infobars_at_zero_remaining() {
  IPProtectionInfobarManager.init();

  dispatchUsageEvent(0.08);

  await TestUtils.waitForCondition(
    () =>
      window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-90"
      ),
    "Wait for 90% notification to appear"
  );

  Assert.ok(
    window.gNotificationBox.getNotificationWithValue(
      "ip-protection-bandwidth-warning-90"
    ),
    "90% notification should be present before bandwidth is exhausted"
  );

  dispatchUsageEvent(0);

  await TestUtils.waitForCondition(
    () =>
      !window.gNotificationBox.getNotificationWithValue(
        "ip-protection-bandwidth-warning-90"
      ),
    "Wait for 90% notification to be removed when bandwidth is exhausted"
  );

  Assert.equal(
    window.gNotificationBox.getNotificationWithValue(
      "ip-protection-bandwidth-warning-90"
    ),
    null,
    "90% notification should be removed when bandwidth is exhausted"
  );
  Assert.equal(
    window.gNotificationBox.getNotificationWithValue(
      "ip-protection-bandwidth-warning-75"
    ),
    null,
    "75% notification should not be present when bandwidth is exhausted"
  );

  IPProtectionInfobarManager.uninit();
});

add_task(async function test_handles_missing_usage_data() {
  IPProtectionInfobarManager.init();

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: null,
      },
    })
  );

  await TestUtils.waitForTick();

  const notification75 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-75"
  );
  const notification90 = window.gNotificationBox.getNotificationWithValue(
    "ip-protection-bandwidth-warning-90"
  );

  Assert.equal(
    notification75,
    null,
    "No 75% notification with missing usage data"
  );
  Assert.equal(
    notification90,
    null,
    "No 90% notification with missing usage data"
  );

  IPProtectionInfobarManager.uninit();
});

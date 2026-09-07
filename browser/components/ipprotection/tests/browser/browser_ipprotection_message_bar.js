/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BANDWIDTH } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);

const { IPPUsageHelper } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPUsageHelper.sys.mjs"
);

const mockBandwidthUsage = {
  remaining: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
  max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
};

function dispatchUsageAtThreshold(maxBytes, threshold) {
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes * threshold),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
}

async function dismissPanelWarning(content) {
  const messageBar = content.shadowRoot.querySelector(
    "ipprotection-message-bar"
  );
  await messageBar.updateComplete;
  await messageBar.mozMessageBarEl.updateComplete;
  const closeButton = messageBar.mozMessageBarEl.closeButton;
  const dismissedPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:DismissBandwidthWarning"
  );
  const unloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  closeButton.click();
  await dismissedPromise;
  await unloadedPromise;
}

async function resetUsageState(maxBytes) {
  const stateChangedPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  dispatchUsageAtThreshold(maxBytes, 1);
  await stateChangedPromise;
}

/**
 * Tests the warning message bar triggered by UsageChanged event
 */
add_task(async function test_warning_message() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  // Start with no bandwidth warning (values in bytes)
  let content = await openPanel({
    unauthenticated: false,
    error: "",
    bandwidthWarning: false,
    bandwidthUsage: mockBandwidthUsage,
  });

  let messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(!messageBar, "Message bar should not be present initially");

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  // Simulate bandwidth usage at second threshold
  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remainingFirstWarning = maxBytes * BANDWIDTH.SECOND_THRESHOLD;
  const thresholdFirstWarning = (1 - BANDWIDTH.SECOND_THRESHOLD) * 100;
  const usageFirstWarning = new ProxyUsage(
    String(maxBytes),
    String(remainingFirstWarning),
    "2026-03-01T00:00:00.000Z"
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: { usage: usageFirstWarning },
    })
  );

  await messageBarLoadedPromise;

  // Wait for content to update with new state
  await content.updateComplete;
  // Verify that the bandwidthThreshold pref is updated
  Assert.equal(
    Services.prefs.getIntPref("browser.ipProtection.bandwidthThreshold", 0),
    thresholdFirstWarning,
    `Bandwidth threshold pref should be set to ${thresholdFirstWarning}`
  );

  messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(messageBar, "Message bar should be present after threshold change");
  Assert.ok(
    messageBar.mozMessageBarEl,
    "Wrapped moz-message-bar should be present"
  );
  Assert.equal(messageBar.type, "warning", "Message bar should be warning");
  Assert.equal(
    messageBar.messageId,
    "ipprotection-message-bandwidth-warning",
    "Warning message id should match"
  );

  // Verify bandwidth data is passed to the message bar
  Assert.ok(
    messageBar.bandwidthUsage,
    "Bandwidth usage data should be passed to message bar"
  );

  // Dismiss the second threshold warning
  let closeButton = messageBar.mozMessageBarEl.closeButton;
  Assert.ok(closeButton, "Message bar should have close button");

  let dismissBandwidthWarningEvent = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:DismissBandwidthWarning"
  );
  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  closeButton.click();

  let dismissEventSecond = await dismissBandwidthWarningEvent;
  Assert.equal(
    dismissEventSecond.detail.threshold,
    thresholdFirstWarning,
    `Dismiss event should include threshold of ${thresholdFirstWarning}`
  );
  await messageBarUnloadedPromise;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be dismissed after clicking close button"
  );

  await closePanel();

  // Reopen panel - the second threshold warning should stay dismissed
  content = await openPanel({
    unauthenticated: false,
    error: "",
  });

  await content.updateComplete;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should stay dismissed after reopening panel"
  );

  // Now increase usage to third threshold - the warning should appear again
  messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  // Dispatch UsageChanged event at third threshold
  const remainingSecondWarning = maxBytes * BANDWIDTH.THIRD_THRESHOLD;
  const thresholdSecondWarning = (1 - BANDWIDTH.THIRD_THRESHOLD) * 100;
  const usageSecondWarning = new ProxyUsage(
    String(maxBytes),
    String(remainingSecondWarning),
    "2026-03-01T00:00:00.000Z"
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: { usage: usageSecondWarning },
    })
  );

  // The third threshold warning should appear
  await messageBarLoadedPromise;

  // Wait for content to update with new state
  await content.updateComplete;

  // Verify that the bandwidthThreshold pref is updated
  Assert.equal(
    Services.prefs.getIntPref("browser.ipProtection.bandwidthThreshold", 0),
    thresholdSecondWarning,
    `Bandwidth threshold pref should be set to ${thresholdSecondWarning}`
  );

  messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");
  await messageBar.updateComplete;

  Assert.ok(
    messageBar,
    "Message bar should reappear at third threshold after medium was dismissed"
  );
  Assert.equal(messageBar.type, "warning", "Message bar should be warning");
  Assert.equal(
    messageBar.messageId,
    "ipprotection-message-bandwidth-warning",
    "Warning message id should match"
  );

  // Verify updated bandwidth data
  Assert.equal(
    messageBar.bandwidthUsage.remaining,
    remainingSecondWarning,
    "Current bandwidth usage should be updated at third threshold"
  );
  Assert.equal(
    messageBar.bandwidthUsage.max,
    maxBytes,
    "Max bandwidth should match configured limit"
  );

  // Wait for the inner moz-message-bar to finish rendering
  await messageBar.mozMessageBarEl.updateComplete;

  closeButton = messageBar.mozMessageBarEl.closeButton;
  Assert.ok(
    closeButton,
    "Message bar should have close button at third threshold"
  );

  dismissBandwidthWarningEvent = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:DismissBandwidthWarning"
  );
  messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  closeButton.click();

  let dismissEventThird = await dismissBandwidthWarningEvent;
  Assert.equal(
    dismissEventThird.detail.threshold,
    thresholdSecondWarning,
    `Dismiss event should include threshold of ${thresholdSecondWarning}`
  );
  await messageBarUnloadedPromise;

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");

  // Reset IPPUsageHelper state to NONE
  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

/**
 * Tests that the bandwidth warning is dismissed when bandwidth resets to NONE state.
 */
add_task(async function test_warning_dismissed_when_bandwidth_resets() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });
  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({
    unauthenticated: false,
    error: "",
    bandwidthWarning: false,
  });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes * BANDWIDTH.THIRD_THRESHOLD),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await messageBarLoadedPromise;
  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present after warning threshold is reached"
  );

  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  // Fire a full-remaining event to reset IPPUsageHelper to NONE
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await messageBarUnloadedPromise;
  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be dismissed when bandwidth resets"
  );
  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
});

/**
 * Tests that the bandwidth warning message bar passes the correct values
 * through to messageLinkL10nArgs.
 */
add_task(async function test_warning_message_decimal_precision() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remainingBytes = maxBytes * BANDWIDTH.SECOND_THRESHOLD;

  let content = await openPanel({ unauthenticated: false });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(remainingBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );

  await messageBarLoadedPromise;
  await content.updateComplete;

  const messageBar = content.shadowRoot.querySelector(
    "ipprotection-message-bar"
  );
  Assert.ok(messageBar, "Message bar should be present");
  Assert.ok(messageBar.messageId, "Should use GB message ID");

  const l10nArgs = JSON.parse(messageBar.messageLinkL10nArgs);
  Assert.equal(
    l10nArgs.usageLeft,
    remainingBytes / BANDWIDTH.BYTES_IN_GB,
    "usageLeft should be decimal precise GB value"
  );
  Assert.equal(
    l10nArgs.maxUsage,
    BANDWIDTH.MAX_IN_GB,
    "maxUsage should match the configured bandwidth limit"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");

  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

add_task(async function test_warning_message_l10n_args_at_80_percent_used() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remaining = Math.floor(maxBytes * 0.2);

  let content = await openPanel({ unauthenticated: false });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(remaining),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );

  await messageBarLoadedPromise;
  await content.updateComplete;

  const messageBar = content.shadowRoot.querySelector(
    "ipprotection-message-bar"
  );
  Assert.ok(messageBar, "Message bar should be present");
  Assert.equal(
    messageBar.messageId,
    "ipprotection-message-bandwidth-warning",
    "Should use GB message ID"
  );

  const l10nArgs = JSON.parse(messageBar.messageLinkL10nArgs);
  Assert.equal(
    l10nArgs.usageLeft,
    parseFloat((remaining / BANDWIDTH.BYTES_IN_GB).toFixed(1)),
    "usageLeft should be the GB value rounded to nearest 0.1"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();

  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

add_task(async function test_warning_message_l10n_args_mb_below_1gb() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remaining = Math.floor(0.9 * BANDWIDTH.BYTES_IN_GB);

  let content = await openPanel({ unauthenticated: false });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(remaining),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );

  await messageBarLoadedPromise;
  await content.updateComplete;

  const messageBar = content.shadowRoot.querySelector(
    "ipprotection-message-bar"
  );
  Assert.ok(messageBar, "Message bar should be present");
  Assert.equal(
    messageBar.messageId,
    "ipprotection-message-bandwidth-warning-mb",
    "Should use MB message ID"
  );

  const l10nArgs = JSON.parse(messageBar.messageLinkL10nArgs);
  Assert.equal(
    l10nArgs.usageLeft,
    Math.floor(remaining / BANDWIDTH.BYTES_IN_MB),
    "usageLeft should be the floored MB value when remaining < 1 GB"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();

  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

/**
 * Tests that dismissing the message bar dispatches the expected events and
 * removes it from the DOM.
 */
add_task(async function test_dismiss() {
  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({
    unauthenticated: false,
    error: "",
  });

  let messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(!messageBar, "Message bar should not be present");

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  // Use bandwidth warning to test message bar dismiss functionality
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes * BANDWIDTH.SECOND_THRESHOLD),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await messageBarLoadedPromise;

  messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(messageBar, "Message bar should be present");
  Assert.ok(
    messageBar.mozMessageBarEl,
    "Wrapped moz-message-bar should be present"
  );

  await messageBar.updateComplete;
  await messageBar.mozMessageBarEl.updateComplete;

  let closeButton = messageBar.mozMessageBarEl.closeButton;

  Assert.ok(closeButton, "Message bar should have close button");

  let dismissEvent = BrowserTestUtils.waitForEvent(
    document,
    messageBar.DISMISS_EVENT
  );
  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  closeButton.click();

  await dismissEvent;
  Assert.ok(true, "Dismiss event was dispatched");

  await messageBarUnloadedPromise;
  Assert.ok(true, "Message bar should be not be present");

  await closePanel();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");

  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

/**
 * Tests that signing out removes the bandwidth warning from the panel.
 */
add_task(async function test_remove_warning_after_sign_out() {
  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  setupService({
    isReady: true,
    usageInfo: makeUsage(
      String(maxBytes),
      String(maxBytes * BANDWIDTH.SECOND_THRESHOLD)
    ),
  });

  IPProtectionService.updateState();

  let content = await openPanel();

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes * BANDWIDTH.SECOND_THRESHOLD),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );

  await BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  let messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");
  Assert.ok(messageBar, "Message bar should be present");

  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  setupService({ isReady: false });
  IPProtectionService.updateState();

  await content.updateComplete;
  await messageBarUnloadedPromise;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be removed after sign out"
  );

  await closePanel();
  cleanupService();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
});

/**
 * Tests that no message bar is shown when the panel is opened while signed out
 * with a stale bandwidth warning in state (bandwidthUsage is null).
 */
add_task(async function test_no_message_bar_when_signed_out_with_warning() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  let content = await openPanel({
    unauthenticated: true,
    bandwidthWarning: true,
    bandwidthUsage: null,
    error: "",
  });

  await content.updateComplete;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should not be shown when signed out with a stale bandwidth warning"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
});

/**
 * Tests that the bandwidth warning message bar is dismissed when the panel
 * transitions to the paused state.
 */
add_task(async function test_no_message_bar_when_paused() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({
    unauthenticated: false,
    error: "",
    bandwidthWarning: false,
  });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes * BANDWIDTH.SECOND_THRESHOLD),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );

  await messageBarLoadedPromise;
  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present after bandwidth warning threshold is reached"
  );

  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  await setPanelState({
    unauthenticated: false,
    paused: true,
    bandwidthWarning: true,
    bandwidthUsage: {
      remaining: maxBytes * BANDWIDTH.SECOND_THRESHOLD,
      max: maxBytes,
    },
    error: "",
  });

  await messageBarUnloadedPromise;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be dismissed when VPN transitions to paused state"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");

  let resetPromise = BrowserTestUtils.waitForEvent(
    IPPUsageHelper,
    "IPPUsageHelper:StateChanged"
  );
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          String(maxBytes),
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await resetPromise;
});

/**
 * Tests that dismissing a panel warning stores the threshold in the pref and
 * that it stays dismissed when the panel is reopened.
 */
add_task(async function test_dismissed_panel_warning_stays_dismissed() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  let content = await openPanel({ unauthenticated: false, error: "" });

  const messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present at 75% threshold"
  );

  await dismissPanelWarning(content);

  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    75,
    "Panel dismissed threshold should be set to 75 after dismissal"
  );

  await closePanel();
  content = await openPanel({ unauthenticated: false, error: "" });
  await content.updateComplete;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should stay dismissed after reopening panel"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
});

/**
 * Tests that after dismissing the 75% panel warning the 90% panel warning
 * still appears.
 */
add_task(async function test_dismissed_75_panel_still_allows_90_panel() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  let content = await openPanel({ unauthenticated: false, error: "" });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  await dismissPanelWarning(content);

  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    75,
    "Panel dismissed threshold should be 75 after dismissing 75% warning"
  );

  messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.THIRD_THRESHOLD);
  await messageBarLoadedPromise;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "90% panel warning should appear even after 75% was dismissed"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
});

/**
 * Tests that the panel dismissed state persists through sign out and back in.
 */
add_task(async function test_panel_dismissed_state_persists_through_sign_out() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const warningUsage = makeUsage(
    String(maxBytes),
    String(maxBytes * BANDWIDTH.SECOND_THRESHOLD)
  );

  setupService({ isReady: true, usageInfo: warningUsage });
  IPProtectionService.updateState();

  let content = await openPanel({ unauthenticated: false, error: "" });

  const messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  await dismissPanelWarning(content);

  setupService({ isReady: false });
  IPProtectionService.updateState();
  await content.updateComplete;

  setupService({ isReady: true, usageInfo: warningUsage });
  IPProtectionService.updateState();

  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await content.updateComplete;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Panel warning should stay dismissed after sign out and back in"
  );
  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    75,
    "Panel dismissed threshold should persist through sign out"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
  cleanupService();
});

/**
 * Tests that bandwidth reset clears the panel dismissed state, allowing the
 * warning to reappear.
 */
add_task(async function test_bandwidth_reset_clears_panel_dismissed_state() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  let content = await openPanel({ unauthenticated: false, error: "" });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  await dismissPanelWarning(content);

  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    75,
    "Panel dismissed threshold should be 75 after dismissal"
  );

  await resetUsageState(maxBytes);

  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    0,
    "Panel dismissed threshold should be reset to 0 after bandwidth resets"
  );

  messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Panel warning should reappear after bandwidth resets"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
});

/**
 * Tests that dismissing a panel warning in one window removes it from all
 * other windows with the panel open.
 */
add_task(async function test_dismiss_panel_warning_removes_from_all_windows() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({ unauthenticated: false, error: "" });

  // Trigger the warning and verify it appears in the original window.
  const messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present in original window"
  );

  // Close the original panel before opening the new window. In headless mode
  // focus shifts do not automatically close popups, so without this the panel
  // stays open and the subsequent openPanel call hangs. The bandwidth warning
  // state in IPPUsageHelper is shared and unaffected by closing the panel.
  // Here we're closing the panel and maintaining the state by setting the
  // second parameter (resetState) to false:
  await closePanel(window, false);

  // Open a new window and verify the warning is also shown there.
  const newWin = await BrowserTestUtils.openNewBrowserWindow();
  const contentNewWin = await openPanel(
    { unauthenticated: false, error: "" },
    newWin
  );

  await BrowserTestUtils.waitForMutationCondition(
    contentNewWin.shadowRoot,
    { childList: true, subtree: true },
    () => contentNewWin.shadowRoot.querySelector("ipprotection-message-bar")
  );

  Assert.ok(
    contentNewWin.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present in new window"
  );

  // Dismiss the warning in the new window.
  const messageBarNewWin = contentNewWin.shadowRoot.querySelector(
    "ipprotection-message-bar"
  );
  await messageBarNewWin.updateComplete;
  await messageBarNewWin.mozMessageBarEl.updateComplete;

  const messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    contentNewWin.shadowRoot,
    { childList: true, subtree: true },
    () => !contentNewWin.shadowRoot.querySelector("ipprotection-message-bar")
  );
  messageBarNewWin.mozMessageBarEl.closeButton.click();
  await messageBarUnloadedPromise;

  Assert.equal(
    IPPUsageHelper.getDismissedThresholds().panel,
    75,
    "Panel dismissed threshold should be 75 after dismissal in new window"
  );

  // Close the new window and verify the warning is gone in the original window.
  await closePanel(newWin);
  await BrowserTestUtils.closeWindow(newWin);

  content = await openPanel({ unauthenticated: false, error: "" });
  await content.updateComplete;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should not appear in original window after dismissal in new window"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
});

/**
 * Tests that dismissing an infobar warning does not clear the in-panel warning.
 */
add_task(async function test_infobar_dismiss_does_not_clear_panel_warning() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({ unauthenticated: false, error: "" });

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );
  dispatchUsageAtThreshold(maxBytes, BANDWIDTH.SECOND_THRESHOLD);
  await messageBarLoadedPromise;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present before infobar dismissal"
  );

  // Simulate infobar dismissed in another window: only the infobar key changes
  IPPUsageHelper.setDismissedThresholds({ infobar: 75, panel: 0 });
  await content.updateComplete;

  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Panel warning should remain when only the infobar is dismissed"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  await resetUsageState(maxBytes);
});

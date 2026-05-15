/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BANDWIDTH } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);

const mockBandwidthUsage = {
  remaining: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
  max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
};

/**
 * Tests the warning message bar triggered by UsageChanged event
 */
add_task(async function test_warning_message() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  // Start with no bandwidth warning (values in bytes)
  let content = await openPanel({
    isSignedOut: false,
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

  // Call handleEvent directly on the test panel to avoid affecting defaultState
  let panel = IPProtection.getPanel(window);
  const usageChangedEventFirstWarning = new CustomEvent(
    "IPPProxyManager:UsageChanged",
    {
      bubbles: true,
      composed: true,
      detail: { usage: usageFirstWarning },
    }
  );
  panel.handleEvent(usageChangedEventFirstWarning);

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
    isSignedOut: false,
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

  // Call handleEvent directly on the test panel to avoid affecting defaultState
  panel = IPProtection.getPanel(window);
  const usageChangedEventSecondWarning = new CustomEvent(
    "IPPProxyManager:UsageChanged",
    {
      bubbles: true,
      composed: true,
      detail: { usage: usageSecondWarning },
    }
  );
  panel.handleEvent(usageChangedEventSecondWarning);

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
});

/**
 * Tests that the bandwidth warning is dismissed when bandwidth is fully exhausted.
 */
add_task(async function test_warning_dismissed_at_zero_remaining() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });
  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;

  let content = await openPanel({
    isSignedOut: false,
    error: "",
    bandwidthWarning: true,
    bandwidthUsage: {
      remaining: maxBytes * BANDWIDTH.THIRD_THRESHOLD,
      max: maxBytes,
    },
  });
  await content.updateComplete;
  Assert.ok(
    content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be present initially"
  );

  let messageBarUnloadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => !content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  let panel = IPProtection.getPanel(window);
  panel.handleEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(maxBytes),
          "0",
          "2026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
  await messageBarUnloadedPromise;
  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be dismissed when bandwidth is fully exhausted"
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

  let content = await openPanel({
    bandwidthWarning: true,
    bandwidthUsage: { remaining: remainingBytes, max: maxBytes },
  });

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
});

add_task(async function test_warning_message_l10n_args_at_80_percent_used() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remaining = Math.floor(maxBytes * 0.2);

  let content = await openPanel({
    bandwidthWarning: true,
    bandwidthUsage: { remaining, max: maxBytes },
  });

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
    (remaining / BANDWIDTH.BYTES_IN_GB).toFixed(1),
    "usageLeft should be a decimal GB value when 75% <= pctUsed < 90%"
  );

  await closePanel();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_warning_message_l10n_args_mb_below_1gb() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", true]],
  });

  const maxBytes = BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB;
  const remaining = Math.floor(0.9 * BANDWIDTH.BYTES_IN_GB);

  let content = await openPanel({
    bandwidthWarning: true,
    bandwidthUsage: { remaining, max: maxBytes },
  });

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
});

/**
 * Tests that dismissing the message bar dispatches the expected events and
 * removes it from the DOM.
 */
add_task(async function test_dismiss() {
  let content = await openPanel({
    isSignedOut: false,
    error: "",
    bandwidthWarning: false,
    bandwidthUsage: mockBandwidthUsage,
  });

  let messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(!messageBar, "Message bar should not be present");

  let messageBarLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-message-bar")
  );

  // Use bandwidth warning to test message bar dismiss functionality
  await setPanelState({
    isSignedOut: false,
    error: "",
    bandwidthWarning: true,
    bandwidthUsage: mockBandwidthUsage,
  });
  await messageBarLoadedPromise;

  messageBar = content.shadowRoot.querySelector("ipprotection-message-bar");

  Assert.ok(messageBar, "Message bar should be present");
  Assert.ok(
    messageBar.mozMessageBarEl,
    "Wrapped moz-message-bar should be present"
  );

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
});

/**
 * Tests that signing out removes the bandwidth warning from the panel.
 */
add_task(async function test_remove_warning_after_sign_out() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });

  IPProtectionService.updateState();

  let content = await openPanel();
  await setPanelState({
    bandwidthWarning: true,
    bandwidthUsage: mockBandwidthUsage,
  });

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

  setupService({ isSignedIn: false });
  IPProtectionService.updateState();

  await content.updateComplete;
  await messageBarUnloadedPromise;

  Assert.ok(
    !content.shadowRoot.querySelector("ipprotection-message-bar"),
    "Message bar should be removed after sign out"
  );

  await closePanel();
  cleanupService();
});

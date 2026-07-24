/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { LINKS, BANDWIDTH } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);
const { IPPExceptionsManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs"
);

const mockLocation = {
  name: "United States",
  code: "us",
};

const mockBandwidthUsage = {
  remaining: 30 * BANDWIDTH.BYTES_IN_GB,
  remainingMB: 30 * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB),
  remainingGB: 30,
  max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
  maxGB: BANDWIDTH.MAX_IN_GB,
  used: 20 * BANDWIDTH.BYTES_IN_GB,
  usedGB: 20,
  percent: "40",
  remainingRounded: 30,
  gbCount: 2,
  mbCount: 0,
};

async function setupStatusCardTest(
  opts = { bandwidthEnabled: true, egressEnabled: true }
) {
  const { bandwidthEnabled, egressEnabled } = opts;
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
    canEnroll: true,
    proxyPass: {
      status: 200,
      error: undefined,
      pass: makePass(),
      usage: makeUsage(),
    },
    usageInfo: null,
  });
  await IPPEnrollAndEntitleManager.refetchEntitlement();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ipProtection.bandwidth.enabled", bandwidthEnabled],
      ["browser.ipProtection.egressLocationEnabled", egressEnabled],
    ],
  });
}

async function cleanupStatusCardTest() {
  await SpecialPowers.popPrefEnv();
  cleanupService();
}

function checkLocationAndBandwidth(statusBoxEl, location, bandwidthUsage) {
  const locationEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="location"]`)
    .assignedElements()[0];
  Assert.ok(
    BrowserTestUtils.isVisible(locationEl),
    "Location element should be present and visible"
  );
  Assert.equal(
    locationEl.textContent.trim(),
    location.name,
    "Location element should be showing correct location"
  );

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];

  checkBandwidth(bandwidthEl, bandwidthUsage);
}

/**
 * Tests the disconnected state UI.
 */
add_task(async function test_status_card_disconnected() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: false,
    bandwidthUsage: mockBandwidthUsage,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  checkLocationAndBandwidth(statusBoxEl, mockLocation, mockBandwidthUsage);

  const turnOnButtonEl = statusCard.actionButtonEl;
  Assert.ok(turnOnButtonEl, "Button to turn on VPN should be present");

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests the connected state UI.
 */
add_task(async function test_status_card_connected() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  checkLocationAndBandwidth(statusBoxEl, mockLocation, mockBandwidthUsage);

  const turnOffVPNButtonEl = statusCard.actionButtonEl;
  Assert.ok(turnOffVPNButtonEl, "Button to turn off VPN should be present");

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the correct IPProtection events are dispatched when
 * we enable or disable VPN protection.
 */
add_task(async function test_ipprotection_events_on_toggle() {
  // These events are different from the ones sent by
  // ipprotection-status-card. The prefixed "IPProtection:" events
  // actually change the connection state in the service when dispatched.
  // If the IPProtection events are sent, then we know that the status-card
  // events worked.
  const userEnableEventName = "IPProtection:UserEnable";
  const userDisableEventName = "IPProtection:UserDisable";

  // Reset service state.
  cleanupService();
  IPProtectionService.updateState();

  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: false,
    bandwidthUsage: mockBandwidthUsage,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  // Now click "Turn on"
  let turnOnVPNButtonEl = statusCard.actionButtonEl;
  Assert.ok(turnOnVPNButtonEl, "Button to turn on VPN should be present");

  let startedProxyPromise = BrowserTestUtils.waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  let enableEventPromise = BrowserTestUtils.waitForEvent(
    window,
    userEnableEventName
  );

  turnOnVPNButtonEl.click();

  await Promise.all([startedProxyPromise, enableEventPromise]);

  Assert.ok(
    true,
    "Enable event and proxy started event were found after clicking the toggle"
  );

  let userEnabledPref = Services.prefs.getBoolPref(
    "browser.ipProtection.userEnabled",
    false
  );
  Assert.equal(userEnabledPref, true, "userEnabled pref should be set to true");

  // Now click "Turn off"
  let turnOffVPNButtonEl = statusCard.actionButtonEl;
  Assert.ok(turnOffVPNButtonEl, "Button to turn off VPN should be present");

  let stoppedProxyPromise = BrowserTestUtils.waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !IPPProxyManager.activatedAt
  );
  let disableEventPromise = BrowserTestUtils.waitForEvent(
    window,
    userDisableEventName
  );

  turnOffVPNButtonEl.click();

  await Promise.all([stoppedProxyPromise, disableEventPromise]);
  Assert.ok(
    true,
    "Disable event and stopped proxy event were found after clicking the toggle"
  );

  userEnabledPref = Services.prefs.getBoolPref(
    "browser.ipProtection.userEnabled",
    true
  );
  Assert.equal(
    userEnabledPref,
    false,
    "userEnabled pref should be set to false"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests the excluded site state UI.
 */
add_task(async function test_status_card_excluded() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPExceptionsManager, "hasExclusion").returns(true);

  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  Assert.equal(
    statusBoxEl.type,
    "excluded",
    "Status box should have excluded type"
  );

  checkLocationAndBandwidth(statusBoxEl, mockLocation, mockBandwidthUsage);

  const turnOffVPNButtonEl = statusCard.actionButtonEl;
  Assert.ok(turnOffVPNButtonEl, "Button to turn off VPN should be present");

  await closePanel();
  await cleanupStatusCardTest();
  sandbox.restore();
});

/**
 * Tests the connecting state UI.
 */
add_task(async function test_status_card_connecting() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
    isActivating: true,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  Assert.equal(
    statusBoxEl.type,
    "connecting",
    "Status box should have connecting type"
  );

  checkLocationAndBandwidth(statusBoxEl, mockLocation, mockBandwidthUsage);

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that location is not displayed when the pref is disabled.
 */
add_task(async function test_status_card_location_disabled() {
  // Reset service state.
  cleanupService();
  IPProtectionService.updateState();

  await setupStatusCardTest({ egressEnabled: false });

  let content = await openPanel({
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let statusCard = content.statusCardEl;
  Assert.ok(content.statusCardEl, "ipprotection-status-card should be present");

  let statusBoxEl = statusCard.statusBoxEl;
  Assert.ok(statusBoxEl, "Status box should be present");

  const locationElements = statusBoxEl.shadowRoot
    .querySelector(`slot[name="location"]`)
    .assignedElements();
  Assert.ok(
    !locationElements.length,
    "Location element should not be present when pref is disabled"
  );

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];
  Assert.ok(
    BrowserTestUtils.isVisible(bandwidthEl),
    "bandwidth-usage should still be present and visible"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests the connected state UI.
 */
add_task(async function test_bandwidth_states() {
  const mockUsages = [
    {
      remaining: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
      remainingMB:
        BANDWIDTH.MAX_IN_GB * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB),
      remainingGB: BANDWIDTH.MAX_IN_GB,
      max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
      maxGB: BANDWIDTH.MAX_IN_GB,
      used: 0,
      usedGB: 0,
      percent: "0",
      remainingRounded: BANDWIDTH.MAX_IN_GB,
      gbCount: 2,
      mbCount: 0,
    },
    {
      remaining: 12.1 * BANDWIDTH.BYTES_IN_GB,
      remainingMB: 12.1 * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB),
      remainingGB: 12.1,
      max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
      maxGB: BANDWIDTH.MAX_IN_GB,
      used: 37.9 * BANDWIDTH.BYTES_IN_GB,
      usedGB: 37.9,
      percent: "75",
      remainingRounded: 12.1,
      gbCount: 2,
      mbCount: 0,
    },
    {
      remaining: 4.9 * BANDWIDTH.BYTES_IN_GB,
      remainingMB: 4.9 * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB),
      remainingGB: 4.9,
      max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
      maxGB: BANDWIDTH.MAX_IN_GB,
      used: 45.1 * BANDWIDTH.BYTES_IN_GB,
      usedGB: 45.1,
      percent: "90",
      remainingRounded: 5, // 4.9 is rounded up
      gbCount: 2,
      mbCount: 0,
    },
    {
      remaining: 0.9 * BANDWIDTH.BYTES_IN_GB,
      remainingMB: 0.9 * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB),
      remainingGB: 0.9,
      max: BANDWIDTH.MAX_IN_GB * BANDWIDTH.BYTES_IN_GB,
      maxGB: BANDWIDTH.MAX_IN_GB,
      used: 49.1 * BANDWIDTH.BYTES_IN_GB,
      usedGB: 49.1,
      percent: "90",
      remainingRounded: Math.floor(
        0.9 * (BANDWIDTH.BYTES_IN_GB / BANDWIDTH.BYTES_IN_MB)
      ), // in MB
      gbCount: 1,
      mbCount: 1,
    },
  ];

  for (let mockUsage of mockUsages) {
    await setupStatusCardTest();

    let content = await openPanel({
      location: mockLocation,
      isProtectionEnabled: true,
      bandwidthUsage: mockUsage,
    });

    Assert.ok(
      BrowserTestUtils.isVisible(content),
      "ipprotection content component should be present"
    );

    let statusCard = content.statusCardEl;
    Assert.ok(
      content.statusCardEl,
      "ipprotection-status-card should be present"
    );

    let statusBoxEl = statusCard.statusBoxEl;
    Assert.ok(statusBoxEl, "Status box should be present");

    checkLocationAndBandwidth(statusBoxEl, mockLocation, mockUsage);

    const turnOffVPNButtonEl = statusCard.actionButtonEl;
    Assert.ok(turnOffVPNButtonEl, "Button to turn off VPN should be present");

    await closePanel();
    await cleanupStatusCardTest();
  }
});

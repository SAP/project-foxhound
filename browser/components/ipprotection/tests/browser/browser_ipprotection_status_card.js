/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { LINKS, BANDWIDTH } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);
const { IPPExceptionsManager } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPExceptionsManager.sys.mjs"
);
const { countryName } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-utils.mjs"
);

const mockLocation = "US";

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

async function setupStatusCardTest(opts = { bandwidthEnabled: true }) {
  const { bandwidthEnabled } = opts;
  setupService({
    isReady: true,
    canEnroll: true,
    proxyPass: {
      status: 200,
      error: undefined,
      pass: makePass(),
      usage: makeUsage(),
    },
    usageInfo: null,
  });
  IPProtectionService.updateState();
  await waitForProxyState(IPPProxyStates.READY);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.bandwidth.enabled", bandwidthEnabled]],
  });
}

async function cleanupStatusCardTest() {
  await SpecialPowers.popPrefEnv();
  cleanupService();
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
  await checkStatusBoxAriaLabel(statusBoxEl);

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];
  checkBandwidth(bandwidthEl, mockBandwidthUsage);

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
  await checkStatusBoxAriaLabel(statusBoxEl);

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];
  checkBandwidth(bandwidthEl, mockBandwidthUsage);

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
  await checkStatusBoxAriaLabel(statusBoxEl);

  Assert.equal(
    statusBoxEl.type,
    "excluded",
    "Status box should have excluded type"
  );

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];
  checkBandwidth(bandwidthEl, mockBandwidthUsage);

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
  await checkStatusBoxAriaLabel(statusBoxEl);

  Assert.equal(
    statusBoxEl.type,
    "connecting",
    "Status box should have connecting type"
  );

  const bandwidthEl = statusBoxEl.shadowRoot
    .querySelector(`slot[name="bandwidth"]`)
    .assignedElements()[0];
  checkBandwidth(bandwidthEl, mockBandwidthUsage);

  const button = statusCard.actionButtonEl;
  Assert.ok(
    button?.disabled,
    "Button in connecting state should be present and disabled"
  );

  const locationButton = statusCard.locationButtonEl;
  Assert.ok(
    locationButton?.disabled,
    "Location button in connecting state should be present and disabled"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Ensure the action and location buttons stay vertically stable
 * across the transition through each state (disconnected -> connecting -> connected).
 */
add_task(async function test_buttons_stable_across_state_transitions() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: false,
    bandwidthUsage: mockBandwidthUsage,
  });

  let statusCard = content.statusCardEl;
  let disconnectedActionTop = Math.round(
    statusCard.actionButtonEl.getBoundingClientRect().top
  );
  let disconnectedLocationTop = Math.round(
    statusCard.locationButtonEl.getBoundingClientRect().top
  );

  await setPanelState({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
    isActivating: true,
  });
  await statusCard.updateComplete;

  Assert.equal(
    Math.round(statusCard.actionButtonEl.getBoundingClientRect().top),
    disconnectedActionTop,
    "Action button should not shift when transitioning to connecting"
  );
  Assert.equal(
    Math.round(statusCard.locationButtonEl.getBoundingClientRect().top),
    disconnectedLocationTop,
    "Location button should not shift when transitioning to connecting"
  );

  await setPanelState({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
    isActivating: false,
  });
  await statusCard.updateComplete;

  Assert.equal(
    Math.round(statusCard.actionButtonEl.getBoundingClientRect().top),
    disconnectedActionTop,
    "Action button should not shift when transitioning to connected"
  );
  Assert.equal(
    Math.round(statusCard.locationButtonEl.getBoundingClientRect().top),
    disconnectedLocationTop,
    "Location button should not shift when transitioning to connected"
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
      remainingRounded: 4.9,
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

    const bandwidthEl = statusBoxEl.shadowRoot
      .querySelector(`slot[name="bandwidth"]`)
      .assignedElements()[0];
    checkBandwidth(bandwidthEl, mockUsage);

    const turnOffVPNButtonEl = statusCard.actionButtonEl;
    Assert.ok(turnOffVPNButtonEl, "Button to turn off VPN should be present");

    await closePanel();
    await cleanupStatusCardTest();
  }
});

/**
 * Tests that the "new" badge is visible when showLocationButtonBadge is true.
 */
add_task(async function test_location_button_badge_visible() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
    showLocationButtonBadge: true,
  });

  let statusCard = content.statusCardEl;
  Assert.ok(statusCard, "ipprotection-status-card should be present");

  let locationButton = statusCard.locationButtonEl;
  Assert.ok(locationButton, "Location selection button should be present");

  let badge = locationButton.querySelector("moz-badge[type='new']");
  Assert.ok(
    badge,
    "Badge should be present when showLocationButtonBadge is true"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(badge),
    "Badge should be visible when showLocationButtonBadge is true"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the "new" badge is absent when showLocationButtonBadge is false.
 */
add_task(async function test_location_button_badge_hidden() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
    showLocationButtonBadge: false,
  });

  let statusCard = content.statusCardEl;
  Assert.ok(statusCard, "ipprotection-status-card should be present");

  let locationButton = statusCard.locationButtonEl;
  Assert.ok(locationButton, "Location selection button should be present");

  let badge = locationButton.querySelector("moz-badge[type='new']");
  Assert.ok(
    !badge,
    "Badge should not be present when showLocationButtonBadge is false"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that clicking the location selection button dispatches the
 * IPProtection:UserShowLocations event.
 */
add_task(async function test_location_button_click_dispatches_event() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: mockLocation,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let statusCard = content.statusCardEl;
  Assert.ok(statusCard, "ipprotection-status-card should be present");

  let locationButton = statusCard.locationButtonEl;
  Assert.ok(locationButton, "Location selection button should be present");

  let showLocationsEventPromise = BrowserTestUtils.waitForEvent(
    window,
    "IPProtection:UserShowLocations"
  );

  locationButton.click();

  await showLocationsEventPromise;
  Assert.ok(true, "IPProtection:UserShowLocations event was dispatched");

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the location button label shows the chosen country.
 */
add_task(async function test_location_button_label_shows_country() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: "CA",
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let locationButton = content.statusCardEl.locationButtonEl;
  let label = locationButton.querySelector("[data-l10n-id]");

  Assert.equal(
    label.getAttribute("data-l10n-id"),
    "ipprotection-location-country-button",
    "Country code should select the country l10n id"
  );

  const args = JSON.parse(label.getAttribute("data-l10n-args"));
  const expectedName = countryName("CA");

  Assert.equal(
    args.country,
    expectedName,
    `data-l10n-args.country should be the localized name for CA (got ${args.country})`
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the location button falls back to recommended when
 * "REC" is selected.
 */
add_task(async function test_location_button_label_recommended_fallback() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: "REC",
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let locationButton = content.statusCardEl.locationButtonEl;
  let label = locationButton.querySelector("[data-l10n-id]");

  Assert.equal(
    label.getAttribute("data-l10n-id"),
    "ipprotection-recommended-location-button",
    "REC should keep the recommended l10n id"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the recommended location description is shown when location is "REC".
 */
add_task(async function test_recommended_location_message_for_REC_location() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: "REC",
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let statusCard = content.statusCardEl;
  let descEl = statusCard.shadowRoot.querySelector(
    '[slot="content"].location-message'
  );

  Assert.ok(
    descEl,
    "Location message element should be present when location is REC"
  );
  Assert.equal(
    descEl.getAttribute("data-l10n-id"),
    "ipprotection-recommended-location-description",
    "Location message should have the correct l10n id"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the recommended location description is shown when location is null.
 */
add_task(async function test_recommended_location_message_for_null_location() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: null,
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let statusCard = content.statusCardEl;
  let descEl = statusCard.shadowRoot.querySelector(
    '[slot="content"].location-message'
  );

  Assert.ok(
    descEl,
    "Location message element should be present when location is null"
  );
  Assert.equal(
    descEl.getAttribute("data-l10n-id"),
    "ipprotection-recommended-location-description",
    "Location message should have the correct l10n id"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

/**
 * Tests that the recommended location description is absent when a specific
 * country is selected.
 */
add_task(async function test_location_message_hidden_for_country() {
  await setupStatusCardTest();

  let content = await openPanel({
    location: "CA",
    isProtectionEnabled: true,
    bandwidthUsage: mockBandwidthUsage,
  });

  let statusCard = content.statusCardEl;
  let descEl = statusCard.shadowRoot.querySelector(
    '[slot="content"].location-message'
  );

  Assert.ok(
    !descEl,
    "Location message element should not be present for a country code"
  );

  await closePanel();
  await cleanupStatusCardTest();
});

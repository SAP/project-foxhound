/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPProtectionPanel } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs"
);
const { IPPEnrollAndEntitleManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPEnrollAndEntitleManager.sys.mjs"
);

/**
 * A class that mocks the IP Protection panel.
 */
class FakeIPProtectionPanelElement {
  constructor() {
    this.state = {
      isSignedOut: true,
      isProtectionEnabled: false,
    };
    this.isConnected = false;
    this.ownerDocument = {
      removeEventListener() {
        /* NOOP */
      },
    };
  }

  requestUpdate() {
    /* NOOP */
  }

  remove() {
    /* NOOP */
  }

  closest() {
    return {
      state: "open",
    };
  }
}

add_setup(async function () {
  // FxAccountsStorage.sys.mjs requires a profile directory.
  do_get_profile();
  await putServerInRemoteSettings();

  await IPProtectionService.init();

  registerCleanupFunction(async () => {
    IPProtectionService.uninit();
  });
});

/**
 * Tests that we can set a state and pass it to a fake element.
 */
add_task(async function test_setState() {
  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;

  ipProtectionPanel.state = {};
  fakeElement.state = {};

  ipProtectionPanel.setState({
    foo: "bar",
  });

  Assert.deepEqual(
    ipProtectionPanel.state,
    { foo: "bar" },
    "The state should be set on the IPProtectionPanel instance"
  );

  Assert.deepEqual(
    fakeElement.state,
    {},
    "The state should not be set on the fake element, as it is not connected"
  );

  fakeElement.isConnected = true;

  ipProtectionPanel.setState({
    isFoo: true,
  });

  Assert.deepEqual(
    ipProtectionPanel.state,
    { foo: "bar", isFoo: true },
    "The state should be set on the IPProtectionPanel instance"
  );

  Assert.deepEqual(
    fakeElement.state,
    { foo: "bar", isFoo: true },
    "The state should be set on the fake element"
  );
});

/**
 * Tests that the whole state will be updated when calling updateState directly.
 */
add_task(async function test_updateState() {
  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;

  ipProtectionPanel.state = {};
  fakeElement.state = {};

  ipProtectionPanel.setState({
    foo: "bar",
  });

  Assert.deepEqual(
    fakeElement.state,
    {},
    "The state should not be set on the fake element, as it is not connected"
  );

  fakeElement.isConnected = true;
  ipProtectionPanel.updateState();

  Assert.deepEqual(
    fakeElement.state,
    { foo: "bar" },
    "The state should be set on the fake element"
  );
});

/**
 * Tests that IPProtectionService ready state event updates the state.
 */
add_task(async function test_IPProtectionPanel_signedIn() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => true);
  sandbox
    .stub(IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(true);
  sandbox.stub(IPProtectionService.guardian, "fetchUserInfo").resolves({
    status: 200,
    error: null,
    entitlement: createTestEntitlement({ subscribed: true }),
  });

  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  let signedInEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );
  IPProtectionService.updateState();

  await signedInEventPromise;

  Assert.equal(
    ipProtectionPanel.state.isSignedOut,
    false,
    "isSignedOut should be false in the IPProtectionPanel state"
  );

  Assert.equal(
    fakeElement.state.isSignedOut,
    false,
    "isSignedOut should be false in the fake elements state"
  );

  sandbox.restore();
});

/**
 * Tests that IPProtectionService unauthenticated state event updates the state.
 */
add_task(async function test_IPProtectionPanel_signedOut() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => false);

  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  IPProtectionService.setState(IPProtectionStates.READY);
  let signedOutEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.UNAUTHENTICATED
  );
  IPProtectionService.updateState();

  await signedOutEventPromise;

  Assert.equal(
    ipProtectionPanel.state.isSignedOut,
    true,
    "isSignedOut should be true in the IPProtectionPanel state"
  );

  Assert.equal(
    fakeElement.state.isSignedOut,
    true,
    "isSignedOut should be true in the fake elements state"
  );

  sandbox.restore();
});

/**
 * Tests that start and stopping the IPProtectionService updates the state.
 */
add_task(async function test_IPProtectionPanel_started_stopped() {
  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => true);
  sandbox
    .stub(IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(true);
  sandbox.stub(IPProtectionService.guardian, "fetchUserInfo").resolves({
    status: 200,
    error: null,
    entitlement: createTestEntitlement({ subscribed: true }),
  });
  sandbox.stub(IPProtectionService.guardian, "fetchProxyPass").resolves({
    status: 200,
    error: undefined,
    pass: new ProxyPass(createProxyPassToken()),
    usage: new ProxyUsage(
      "5368709120",
      "4294967296",
      "2026-02-01T00:00:00.000Z"
    ),
  });
  sandbox.stub(IPProtectionService.guardian, "enroll").resolves({ ok: true });

  IPProtectionService.updateState();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should be in READY state before starting"
  );

  let startedEventPromise = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );

  IPPProxyManager.start();

  await startedEventPromise;

  Assert.equal(
    ipProtectionPanel.state.isProtectionEnabled,
    true,
    "isProtectionEnabled should be true in the IPProtectionPanel state"
  );

  Assert.equal(
    fakeElement.state.isProtectionEnabled,
    true,
    "isProtectionEnabled should be true in the fake elements state"
  );

  let stoppedEventPromise = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state !== IPPProxyStates.ACTIVE
  );

  await IPPProxyManager.stop();

  await stoppedEventPromise;

  Assert.equal(
    ipProtectionPanel.state.isProtectionEnabled,
    false,
    "isProtectionEnabled should be false in the IPProtectionPanel state"
  );

  Assert.equal(
    fakeElement.state.isProtectionEnabled,
    false,
    "isProtectionEnabled should be false in the fake elements state"
  );
  sandbox.restore();
});

/**
 * Tests that IPProtectionPanel state isAlpha property is correct
 * when IPPEnrollAndEntitleManager.isAlpha is true.
 */
add_task(async function test_IPProtectionPanel_isAlpha_true() {
  let sandbox = sinon.createSandbox();

  sandbox
    .stub(IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);
  sandbox.stub(IPPEnrollAndEntitleManager, "isAlpha").get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(true);

  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  IPProtectionService.updateState();

  Assert.equal(
    ipProtectionPanel.state.isAlpha,
    true,
    "isAlpha should be true in the IPProtectionPanel state"
  );

  sandbox.restore();
});

/**
 * Tests that IPProtectionPanel state isAlpha property is correct
 * when IPPEnrollAndEntitleManager.isAlpha is false.
 */
add_task(async function test_IPProtectionPanel_isAlpha_false() {
  let sandbox = sinon.createSandbox();

  sandbox
    .stub(IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);
  sandbox.stub(IPPEnrollAndEntitleManager, "isAlpha").get(() => false);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(true);

  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  IPProtectionService.updateState();

  Assert.equal(
    ipProtectionPanel.state.isAlpha,
    false,
    "isAlpha should be false in the IPProtectionPanel state"
  );

  sandbox.restore();
});

/**
 * Tests that egress location preference changes update the state.
 */
add_task(async function test_IPProtectionPanel_egressLocation_pref() {
  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  const expectedLocation = {
    name: "United States",
    code: "us",
  };

  Services.prefs.setBoolPref(
    "browser.ipProtection.egressLocationEnabled",
    true
  );

  Assert.deepEqual(
    ipProtectionPanel.state.location,
    expectedLocation,
    "location should be set when preference is true"
  );

  Assert.deepEqual(
    fakeElement.state.location,
    expectedLocation,
    "location should be set on the fake element when preference is true"
  );

  Services.prefs.setBoolPref(
    "browser.ipProtection.egressLocationEnabled",
    false
  );

  Assert.ok(
    !ipProtectionPanel.state.location,
    "location should be null when preference is false"
  );

  Assert.ok(
    !fakeElement.state.location,
    "location should be null on the fake element when preference is false"
  );

  ipProtectionPanel.uninit();

  Services.prefs.clearUserPref("browser.ipProtection.egressLocationEnabled");
});

/**
 * Tests that UsageChanged events with BigInt(0) remaining bandwidth
 * are processed correctly (not treated as falsy and skipped).
 *
 * Regression test: BigInt(0) is falsy in JavaScript, so a guard like
 * `!usage.remaining` would incorrectly bail out when remaining is exactly 0.
 */
add_task(async function test_IPProtectionPanel_usage_zero_remaining() {
  let sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  let ipProtectionPanel = new IPProtectionPanel();
  let fakeElement = new FakeIPProtectionPanelElement();
  ipProtectionPanel.panel = fakeElement;
  fakeElement.isConnected = true;

  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");

  // Create a usage object with remaining = 0 (BigInt)
  const usage = new ProxyUsage("5368709120", "0", "3026-02-01T00:00:00.000Z");
  Assert.equal(usage.remaining, BigInt(0), "remaining should be BigInt(0)");

  // Dispatch a UsageChanged event with zero remaining bandwidth
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: { usage },
    })
  );

  // With 0 bytes remaining out of 5GB, remainingPercent = 0.
  // This is <= THIRD_THRESHOLD (0.1), so threshold should be set to 90.
  const threshold = Services.prefs.getIntPref(
    "browser.ipProtection.bandwidthThreshold",
    0
  );
  Assert.equal(
    threshold,
    100,
    "bandwidthThreshold pref should be 100 when remaining bandwidth is zero"
  );

  ipProtectionPanel.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  sandbox.restore();
});

function dispatchUsageEvent(max, remaining) {
  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: {
        usage: new ProxyUsage(
          String(max),
          String(remaining),
          "3026-03-01T00:00:00.000Z"
        ),
      },
    })
  );
}

/**
 * Tests that bandwidth threshold telemetry events fire at 50%, 75%, and 90%.
 */
add_task(async function test_bandwidth_used_threshold_events() {
  Services.fog.initializeFOG();
  Services.fog.testResetFOG();

  let ipProtectionPanel = new IPProtectionPanel();

  // 40% used (60% remaining) - no thresholds crossed
  dispatchUsageEvent(1000000, 600000);
  Assert.equal(
    Glean.ipprotection.bandwidthUsedThreshold.testGetValue(),
    null,
    "No threshold event should fire at 40% used"
  );

  // 55% used (45% remaining) - crosses 50%
  dispatchUsageEvent(1000000, 450000);
  let events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 1, "One threshold event should fire at 55% used");
  Assert.equal(events[0].extra.percentage, "50", "Should report 50% threshold");

  // 80% used (20% remaining) - crosses 75%
  dispatchUsageEvent(1000000, 200000);
  events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 2, "Two threshold events total at 80% used");
  Assert.equal(events[1].extra.percentage, "75", "Should report 75% threshold");

  // 95% used (5% remaining) - crosses 90%
  dispatchUsageEvent(1000000, 50000);
  events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 3, "Three threshold events total at 95% used");
  Assert.equal(events[2].extra.percentage, "90", "Should report 90% threshold");

  ipProtectionPanel.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  Services.fog.testResetFOG();
});

/**
 * Tests that threshold events are not re-fired within the same usage period.
 */
add_task(async function test_bandwidth_thresholds_not_repeated_same_period() {
  Services.fog.testResetFOG();

  let ipProtectionPanel = new IPProtectionPanel();

  // Cross 50% threshold
  dispatchUsageEvent(1000000, 400000);
  let events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 1, "One event after first call at 60% used");

  // Same usage dispatched again - should not re-fire
  dispatchUsageEvent(1000000, 400000);
  events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(
    events.length,
    1,
    "No additional event when threshold already reported"
  );

  ipProtectionPanel.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  Services.fog.testResetFOG();
});

/**
 * Tests that thresholds reset when a new usage period begins.
 */
add_task(async function test_bandwidth_thresholds_reset_on_new_period() {
  Services.fog.testResetFOG();

  let ipProtectionPanel = new IPProtectionPanel();

  // Cross 50% in the current period
  dispatchUsageEvent(1000000, 400000);
  let events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 1, "One event in current period");
  Assert.equal(events[0].extra.percentage, "50");

  // Simulate a period reset by returning to full bandwidth (threshold drops to 0)
  dispatchUsageEvent(1000000, 1000000);
  Services.fog.testResetFOG();

  // 50% should fire again since the threshold pref was reset to 0
  dispatchUsageEvent(1000000, 400000);
  events = Glean.ipprotection.bandwidthUsedThreshold.testGetValue();
  Assert.equal(events.length, 1, "50% fires again after period reset");
  Assert.equal(events[0].extra.percentage, "50");

  ipProtectionPanel.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.bandwidthThreshold");
  Services.fog.testResetFOG();
});

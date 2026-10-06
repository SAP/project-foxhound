/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPAlwaysOnSingleton } = ChromeUtils.importESModule(
  "resource://testing-common/ipprotection/IPPAlwaysOn.sys.mjs"
);
const { IPPEarlyStartupFilter } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPEarlyStartupFilter.sys.mjs"
);
const { IPProtectionServerlist, PrefServerList } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

const TEST_SERVER = {
  hostname: "proxy.example.com",
  port: 443,
  quarantined: false,
};
const TEST_COUNTRY = {
  name: "United States",
  code: "US",
  cities: [{ name: "Test City", code: "TC", servers: [TEST_SERVER] }],
};

add_setup(async function () {
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify([TEST_COUNTRY])
  );
  await IPProtectionServerlist.maybeFetchList();

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  });
});

/**
 * Creates a fresh IPPAlwaysOnSingleton with alwaysOnEnabled stubbed.
 *
 * @param {object} sandbox - Sinon sandbox
 * @param {object} [opts]
 * @param {boolean} [opts.enabled=true] - Value for the alwaysOnEnabled getter
 */
function makeAlwaysOn(sandbox, { enabled = true } = {}) {
  const alwaysOn = new IPPAlwaysOnSingleton();
  sandbox.stub(alwaysOn, "alwaysOnEnabled").get(() => enabled);
  return alwaysOn;
}

/**
 * Registers `alwaysOn` as a helper so IPProtectionService initializes it after
 * IPPProxyManager, ensuring IPPProxyManager is READY when alwaysOn first reacts
 * to a service state change.
 *
 * @param {IPPAlwaysOnSingleton} alwaysOn
 */
function registerAsHelper(alwaysOn) {
  IPProtectionActivator.addHelpers([alwaysOn]);
  IPProtectionActivator.setupHelpers();
}

/**
 * Restores the helper list to the state established in head_enterprise.js.
 */
function restoreHelpers() {
  IPProtectionActivator.removeHelpers();
  IPProtectionActivator.setupHelpers();
}

add_task(async function test_init_skipped_without_policy() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  // init() returns immediately when policy is absent, so ordering doesn't matter.
  const alwaysOn = makeAlwaysOn(sandbox, { enabled: false });
  alwaysOn.init();

  const waitForReady = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );
  IPProtectionService.init();
  await waitForReady;

  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy should not start when the AccessConnector policy is absent"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

add_task(async function test_proxy_starts_on_service_ready() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "Proxy should become active once the service is ready"
  );

  alwaysOn.uninit();
  await IPPProxyManager.stop(false);
  IPProtectionService.uninit();
  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_proxy_starts_when_early_filter_marked_active() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  // Regression: IPPEarlyStartupFilter registering the channel filter causes
  // IPPProxyManager to report ACTIVE before start() is called. #tryStart() must
  // not bail in this case — it checks channelFilter()?.proxyInfo to distinguish
  // a registered-but-uninitialised filter from a truly established connection.
  const alwaysOn = makeAlwaysOn(sandbox);
  const earlyFilter = new IPPEarlyStartupFilter(() => alwaysOn.alwaysOnEnabled);
  IPProtectionActivator.addHelpers([alwaysOn, earlyFilter]);
  IPProtectionActivator.setupHelpers();

  // The premature ACTIVE fires first (filter registered, proxyInfo null).
  // Wait for the second ACTIVE where proxyInfo is set.
  const waitForTrulyActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () =>
      IPPProxyManager.state === IPPProxyStates.ACTIVE &&
      !!IPPProxyManager.channelFilter()?.proxyInfo
  );
  IPProtectionService.init();
  await waitForTrulyActive;

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "Proxy should be ACTIVE"
  );
  Assert.ok(
    IPPProxyManager.channelFilter()?.proxyInfo,
    "proxyInfo should be set, not just the filter registered"
  );

  alwaysOn.uninit();
  earlyFilter.uninit();
  await IPPProxyManager.stop(false);
  IPProtectionService.uninit();
  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_proxy_restarts_on_unexpected_stop() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  // The proxy may advance past ACTIVATING to ACTIVE before the assertion runs
  // since stubs are synchronous, so accept both.
  const waitForRestart = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () =>
      IPPProxyManager.state === IPPProxyStates.ACTIVATING ||
      IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  await IPPProxyManager.stop(false);
  await waitForRestart;

  Assert.ok(
    IPPProxyManager.state === IPPProxyStates.ACTIVATING ||
      IPPProxyManager.state === IPPProxyStates.ACTIVE,
    "Proxy should restart immediately after an unexpected stop"
  );

  // Uninit before stopping: with #pass cached, the restart path resolves faster
  // and can race uninit(), causing a missing-activation-promise rejection.
  alwaysOn.uninit();
  await IPPProxyManager.stop(false);
  IPProtectionService.uninit();
  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_proxy_restarts_after_error() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  // Force an error — alwaysOn stops the proxy and restarts immediately.
  const waitForRestart = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () =>
      IPPProxyManager.state === IPPProxyStates.ACTIVATING ||
      IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPPProxyManager.setErrorState(ERRORS.TIMEOUT);
  await waitForRestart;

  Assert.ok(
    IPPProxyManager.state === IPPProxyStates.ACTIVATING ||
      IPPProxyManager.state === IPPProxyStates.ACTIVE,
    "Proxy should restart after entering an error state"
  );

  alwaysOn.uninit();
  await IPPProxyManager.stop(false);
  IPProtectionService.uninit();
  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_proxy_not_restarted_during_policy_removal() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  // When the policy is removed, alwaysOnEnabled flips to false before uninit()
  // runs. The subsequent ACTIVE->READY transition from teardown must not trigger
  // a restart.
  const alwaysOn = new IPPAlwaysOnSingleton();
  let policyActive = true;
  sandbox.stub(alwaysOn, "alwaysOnEnabled").get(() => policyActive);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  policyActive = false;
  IPProtectionService.uninit();

  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy must not restart during the policy-removal uninit cascade"
  );

  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_proxy_not_restarted_when_service_unavailable() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  // The proxy may transiently re-enter ACTIVATING during uninit due to helper
  // ordering; stop() drains it before we assert.
  IPProtectionService.uninit();
  await IPPProxyManager.stop(false);

  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy should not restart once the service becomes unavailable"
  );

  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_serverlist_change_calls_switch_when_active() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);
  sandbox.stub(IPPProxyManager, "switch").returns({ error: null });

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  // The pref observer registered in initOnStartupCompleted fires synchronously.
  const updatedServer = {
    hostname: "proxy2.example.com",
    port: 443,
    quarantined: false,
  };
  const updatedCountry = {
    ...TEST_COUNTRY,
    cities: [{ name: "Test City", code: "TC", servers: [updatedServer] }],
  };
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify([updatedCountry])
  );

  Assert.ok(
    IPPProxyManager.switch.calledOnce,
    "switch() should be called when the serverlist changes while the proxy is active"
  );

  alwaysOn.uninit();
  await IPPProxyManager.stop(false);
  IPProtectionService.uninit();
  restoreHelpers();
  sandbox.restore();
});

add_task(async function test_serverlist_cleared_stops_proxy() {
  const sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const alwaysOn = makeAlwaysOn(sandbox);
  registerAsHelper(alwaysOn);

  const waitForActive = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  IPProtectionService.init();
  await waitForActive;

  const waitForReady = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.READY
  );
  Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  await waitForReady;

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.READY,
    "Proxy should stop when the serverlist is cleared"
  );
  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy should not attempt to restart with an empty serverlist"
  );

  IPProtectionService.uninit();
  restoreHelpers();

  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify([TEST_COUNTRY])
  );
  await IPProtectionServerlist.maybeFetchList(true);

  sandbox.restore();
});

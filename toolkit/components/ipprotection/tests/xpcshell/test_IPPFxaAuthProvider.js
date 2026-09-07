/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPFxaAuthProvider, IPPFxaAuthProviderSingleton } =
  ChromeUtils.importESModule(
    "moz-src:///toolkit/components/ipprotection/fxa/IPPFxaAuthProvider.sys.mjs"
  );
const { IPPSignInWatcher } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/fxa/IPPSignInWatcher.sys.mjs"
);

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);

do_get_profile();

AddonTestUtils.init(this);
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "1"
);

ExtensionTestUtils.init(this);

add_setup(async function () {
  IPProtectionActivator.setAuthProvider(IPPFxaAuthProvider);
  await putServerInRemoteSettings();
  IPProtectionService.uninit();

  registerCleanupFunction(async () => {
    IPProtectionActivator.setAuthProvider(IPPDummyAuthProvider);
    await IPProtectionService.init();
  });
});

/**
 * Opt-in for tests that need the real IPPFxaAuthProvider as the registered
 * provider (e.g. tests exercising enrollment, entitlement update via Guardian,
 * or FxA-specific state transitions). Mirrors `setupStubs` but targets the
 * FxA singleton instead of the dummy.
 *
 * @param {object} sandbox - sinon sandbox used to install (and later restore)
 *   the stubs.
 * @param {object} [aOptions] - same shape as defaultStubOptions.
 */
function useFxaAuthProvider(
  sandbox,
  aOptions = {
    ...defaultStubOptions,
  }
) {
  IPProtectionActivator.setAuthProvider(IPPFxaAuthProvider);
  const options = { ...defaultStubOptions, ...aOptions };
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => options.signedIn);
  sandbox
    .stub(IPPFxaAuthProvider, "getEntitlement")
    .resolves({ entitlement: options.entitlement });
  sandbox.stub(IPPFxaAuthProvider, "enrollAndEntitle").resolves({
    isEnrolledAndEntitled: true,
    entitlement: options.entitlement,
  });
  sandbox.stub(IPPFxaAuthProvider, "fetchProxyPass").resolves({
    status: 200,
    error: undefined,
    pass: new ProxyPass(
      options.validProxyPass
        ? createProxyPassToken()
        : createExpiredProxyPassToken()
    ),
    usage: options.proxyUsage,
  });
  sandbox
    .stub(IPPFxaAuthProvider, "fetchProxyUsage")
    .resolves(options.proxyUsage);
}

function makeProvider(sandbox) {
  const provider = new IPPFxaAuthProviderSingleton();
  const removeToken = sandbox.spy();
  sandbox.stub(provider, "getToken").resolves({
    token: "fake-token",
    [Symbol.dispose]: removeToken,
  });
  return { provider, removeToken };
}

// Bug 2036792
for (const method of ["fetchProxyPass", "fetchProxyUsage"]) {
  add_task(async function test_removes_token_after_guardian_resolves() {
    const sandbox = sinon.createSandbox();
    const { provider, removeToken } = makeProvider(sandbox);

    let resolveGuardian;
    sandbox
      .stub(provider.guardian, method)
      .returns(new Promise(r => (resolveGuardian = r)));

    const fetchPromise = provider[method]();
    await Promise.resolve();
    await Promise.resolve();

    Assert.ok(
      !removeToken.called,
      `${method}: token not removed while guardian is pending`
    );

    resolveGuardian({ status: 200 });
    await fetchPromise;

    Assert.ok(
      removeToken.calledOnce,
      `${method}: token removed after guardian resolves`
    );

    sandbox.restore();
  });
}

/**
 * Tests that updateEntitlement refreshes usage when an entitlement is found.
 */
add_task(
  async function test_IPProtectionService_updateEntitlement_refreshes_usage() {
    const sandbox = sinon.createSandbox();
    useFxaAuthProvider(sandbox);

    IPProtectionService.init();
    IPPFxaAuthProvider.resetEntitlement();

    const refreshUsageStub = sandbox.stub(IPPProxyManager, "refreshUsage");

    await IPPFxaAuthProvider.updateEntitlement();

    Assert.ok(
      IPPFxaAuthProvider.entitlement,
      "Should be entitled after updateEntitlement"
    );

    Assert.ok(
      refreshUsageStub.calledOnce,
      "refreshUsage should be called when entitlement is found"
    );

    IPProtectionService.uninit();
    sandbox.restore();
  }
);

/**
 * Tests that updateEntitlement preserves a cached entitlement on failures.
 */
add_task(
  async function test_updateEntitlement_preserves_entitlement_on_error() {
    const sandbox = sinon.createSandbox();
    useFxaAuthProvider(sandbox);

    await IPProtectionService.init();

    const cachedEntitlement = createTestEntitlement({ subscribed: true });
    IPPFxaAuthProvider.getEntitlement.resolves({
      entitlement: cachedEntitlement,
    });
    IPPFxaAuthProvider.resetEntitlement();
    await IPPFxaAuthProvider.updateEntitlement(true);

    Assert.equal(
      IPPFxaAuthProvider.entitlement,
      cachedEntitlement,
      "Cached entitlement should be set before the failing refresh"
    );

    IPPFxaAuthProvider.getEntitlement.resolves({ error: "network_error" });

    const result = await IPPFxaAuthProvider.updateEntitlement(true);

    Assert.equal(
      IPPFxaAuthProvider.entitlement,
      cachedEntitlement,
      "Cached entitlement should be preserved when refresh fails"
    );
    Assert.ok(
      result.isEntitled,
      "Result should still report isEntitled because the cache is valid"
    );
    Assert.equal(
      result.error,
      "network_error",
      "Result should report the transient error"
    );

    IPProtectionService.uninit();
    sandbox.restore();
  }
);

/**
 * Tests that updateEntitlement clears the cached entitlement when Guardian
 * sends no entitlement.
 */
add_task(async function test_updateEntitlement_clears_cached_entitlement() {
  const sandbox = sinon.createSandbox();
  useFxaAuthProvider(sandbox);

  await IPProtectionService.init();

  const cachedEntitlement = createTestEntitlement({ subscribed: true });
  IPPFxaAuthProvider.getEntitlement.resolves({
    entitlement: cachedEntitlement,
  });
  IPPFxaAuthProvider.resetEntitlement();
  await IPPFxaAuthProvider.updateEntitlement(true);

  Assert.ok(
    IPPFxaAuthProvider.entitlement,
    "Cached entitlement should be set before the no-entitlement refresh"
  );

  IPPFxaAuthProvider.getEntitlement.resolves({ entitlement: null });

  await IPPFxaAuthProvider.updateEntitlement(true);

  Assert.equal(
    IPPFxaAuthProvider.entitlement,
    null,
    "Cached entitlement should be cleared when the server confirms no entitlement"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests that checkForUpgrade works as expected if a linked VPN is found and sends an event.
 */
add_task(
  async function test_IPProtectionService_checkForUpgrade_has_vpn_linked() {
    const sandbox = sinon.createSandbox();
    useFxaAuthProvider(sandbox);

    const waitForReady = waitForEvent(
      IPProtectionService,
      "IPProtectionService:StateChanged",
      () => IPProtectionService.state === IPProtectionStates.READY
    );

    IPProtectionService.init();
    await IPPFxaAuthProvider.enroll();
    IPProtectionService.updateState();

    await waitForReady;

    IPPFxaAuthProvider.getEntitlement.resolves({
      entitlement: createTestEntitlement({ subscribed: true }),
    });

    let hasUpgradedEventPromise = waitForEvent(
      IPProtectionService.authProvider,
      "IPPAuthProvider:StateChanged",
      () => IPProtectionService.authProvider.hasUpgraded
    );

    await IPProtectionService.authProvider.checkForUpgrade();

    await hasUpgradedEventPromise;

    Assert.ok(
      IPProtectionService.authProvider.hasUpgraded,
      "hasUpgraded should be true"
    );

    IPProtectionService.uninit();
    sandbox.restore();
  }
);

/**
 * Tests that checkForUpgrade returns errors if no linked VPN is found and
 * sends an event.
 */
add_task(
  async function test_IPProtectionService_checkForUpgrade_no_vpn_linked() {
    const sandbox = sinon.createSandbox();
    useFxaAuthProvider(sandbox);
    IPPFxaAuthProvider.resetEntitlement();

    await IPProtectionService.init();
    await IPPFxaAuthProvider.enroll();
    IPProtectionService.updateState();

    IPPFxaAuthProvider.getEntitlement.resolves({ error: "invalid_response" });

    let hasUpgradedEventPromise = waitForEvent(
      IPProtectionService.authProvider,
      "IPPAuthProvider:StateChanged"
    );

    await IPProtectionService.authProvider.checkForUpgrade();

    await hasUpgradedEventPromise;

    Assert.ok(
      !IPProtectionService.authProvider.hasUpgraded,
      "hasUpgraded should be false"
    );

    IPProtectionService.uninit();
    sandbox.restore();
  }
);

/**
 * Tests that changing the guardian endpoint preference and reinitializing
 * the service correctly updates the guardian's endpoint configuration.
 */
add_task(async function test_guardian_endpoint_updates_on_reinit() {
  await IPProtectionService.init();

  Assert.equal(
    IPPFxaAuthProvider.guardian.guardianEndpoint,
    "https://vpn.mozilla.org/",
    "Guardian should have default endpoint"
  );

  Services.prefs.setCharPref(
    "browser.ipProtection.guardian.endpoint",
    "https://test.example.com/"
  );

  Assert.equal(
    IPPFxaAuthProvider.guardian.guardianEndpoint,
    "https://test.example.com/",
    "Guardian should reflect updated endpoint after pref change"
  );

  IPProtectionService.uninit();
  Services.prefs.clearUserPref("browser.ipProtection.guardian.endpoint");
});

/**
 * Tests that isEnrolling is true while updateEntitlement is in
 * progress and false once it completes.
 */
add_task(async function test_isEnrolling_during_updateEntitlement() {
  const sandbox = sinon.createSandbox();
  useFxaAuthProvider(sandbox);

  await IPProtectionService.init();

  let resolveEntitlement;
  // Slow down fetching entitlement info so that we can properly test
  // isEnrolling. The promise only resolves when we call resolveEntitlement().
  IPPFxaAuthProvider.getEntitlement.returns(
    new Promise(resolve => {
      resolveEntitlement = resolve;
    })
  );

  Assert.ok(
    !IPProtectionService.authProvider.isEnrolling,
    "isEnrolling should be false before updateEntitlement"
  );

  let updatePromise = IPPFxaAuthProvider.updateEntitlement(true);

  Assert.ok(
    IPProtectionService.authProvider.isEnrolling,
    "isEnrolling should be true while updateEntitlement is in progress"
  );

  resolveEntitlement({ entitlement: createTestEntitlement() });
  await updatePromise;

  Assert.ok(
    !IPProtectionService.authProvider.isEnrolling,
    "isEnrolling should be false after updateEntitlement completes"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests that StateChanged fires after updateEntitlement even when entitlement
 * is already cached.
 */
add_task(
  async function test_updateEntitlement_fires_StateChanged_when_cached() {
    const sandbox = sinon.createSandbox();
    useFxaAuthProvider(sandbox);

    await IPProtectionService.init();
    await IPPFxaAuthProvider.updateEntitlement();

    let stateChangedFired = false;
    IPProtectionService.authProvider.addEventListener(
      "IPPAuthProvider:StateChanged",
      () => {
        stateChangedFired = true;
      },
      { once: true }
    );

    await IPPFxaAuthProvider.updateEntitlement();

    Assert.ok(
      stateChangedFired,
      "StateChanged should fire even when entitlement is already cached"
    );

    IPProtectionService.uninit();
    sandbox.restore();
  }
);

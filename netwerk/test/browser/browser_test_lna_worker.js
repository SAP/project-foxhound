"use strict";

// Tests that Local Network Access (LNA) checks are enforced for requests
// made from dedicated and shared workers.

Services.scriptloader.loadSubScript(
  new URL("head_local_network_access.js", gTestPath).href,
  this
);

add_setup(async function () {
  await setupLnaPrefs();
  await SpecialPowers.pushPrefEnv({
    set: [["dom.serviceWorkers.testing.enabled", true]],
  });
  await setupLnaServer();
});

requestLongerTimeout(5);

const sharedWorkerTestCases = [
  {
    type: "shared-worker-fetch",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "shared-worker-xhr",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
];

// Shared worker: denied without persistent permission (no prompt shown)
add_task(async function test_lna_shared_worker_denied_without_permission() {
  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    "127.0.0.1:4443"
  );
  for (const test of sharedWorkerTestCases) {
    const rand = Math.random();
    await runSingleTestCase(
      test,
      rand,
      test.denyStatus,
      `Shared worker ${test.type} denied without persistent permission`
    );
  }
  Services.prefs.clearUserPref("network.lna.address_space.public.override");
});

// Shared worker: allowed with persistent permission (no prompt shown)
add_task(async function test_lna_shared_worker_allowed_with_permission() {
  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    "127.0.0.1:4443"
  );

  // Add persistent loopback-network permission for example.com
  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );
  Services.perms.addFromPrincipal(
    principal,
    "loopback-network",
    Services.perms.ALLOW_ACTION,
    Services.perms.EXPIRE_NEVER
  );

  for (const test of sharedWorkerTestCases) {
    const rand = Math.random();
    await runSingleTestCase(
      test,
      rand,
      test.allowStatus,
      `Shared worker ${test.type} allowed with persistent permission`
    );
  }

  Services.perms.removeFromPrincipal(principal, "loopback-network");
  Services.prefs.clearUserPref("network.lna.address_space.public.override");
});

const serviceWorkerTestCases = [
  {
    type: "service-worker-fetch",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
];

// Service worker: denied without persistent permission (no prompt shown)
add_task(async function test_lna_service_worker_denied_without_permission() {
  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    "127.0.0.1:4443"
  );
  for (const test of serviceWorkerTestCases) {
    const rand = Math.random();
    await runSingleTestCase(
      test,
      rand,
      test.denyStatus,
      `Service worker ${test.type} denied without persistent permission`
    );
  }
  Services.prefs.clearUserPref("network.lna.address_space.public.override");
});

// Service worker: allowed with persistent permission (no prompt shown)
add_task(async function test_lna_service_worker_allowed_with_permission() {
  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    "127.0.0.1:4443"
  );

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );
  Services.perms.addFromPrincipal(
    principal,
    "loopback-network",
    Services.perms.ALLOW_ACTION,
    Services.perms.EXPIRE_NEVER
  );

  for (const test of serviceWorkerTestCases) {
    const rand = Math.random();
    await runSingleTestCase(
      test,
      rand,
      test.allowStatus,
      `Service worker ${test.type} allowed with persistent permission`
    );
  }

  Services.perms.removeFromPrincipal(principal, "loopback-network");
  Services.prefs.clearUserPref("network.lna.address_space.public.override");
});

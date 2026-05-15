/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPAutoRestoreSingleton } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPAutoRestore.sys.mjs"
);
const { IPProtectionServerlist } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

add_setup(async function () {
  await putServerInRemoteSettings();
  await IPProtectionServerlist.maybeFetchList();
  await IPProtectionServerlist.initOnStartupCompleted();

  IPProtectionService.uninit();
  Services.prefs.setBoolPref("browser.ipProtection.autoRestoreEnabled", true);

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("browser.ipProtection.userEnabled");
    Services.prefs.clearUserPref("browser.ipProtection.autoRestoreEnabled");
    await IPProtectionService.init();
  });
});

/**
 * Tests that the VPN auto-restores when if the user had previously enabled it.
 */
add_task(async function test_IPPAutoRestore_if_userEnabled() {
  // Simulate user having previously enabled the VPN
  Services.prefs.setBoolPref("browser.ipProtection.userEnabled", true);

  let sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const waitForReady = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );

  IPProtectionService.init();

  await waitForReady;

  let autoRestore = new IPPAutoRestoreSingleton();
  autoRestore.init();
  Services.obs.notifyObservers(null, "sessionstore-restoring-on-startup");

  Assert.ok(
    autoRestore.willRestore,
    "Will auto-restore when userEnabled is true"
  );

  autoRestore.initOnStartupCompleted();

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy is activating"
  );

  await IPPProxyManager.stop(false);

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests that the VPN does not auto-restore if the user had previously disabled it.
 */
add_task(async function test_IPPAutoRestore_restore_if_userDisabled() {
  // Simulate user having previously disabled the VPN
  Services.prefs.setBoolPref("browser.ipProtection.userEnabled", false);

  let sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  const waitForReady = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );

  IPProtectionService.init();

  await waitForReady;

  let autoRestore = new IPPAutoRestoreSingleton();
  autoRestore.init();
  Services.obs.notifyObservers(null, "sessionstore-restoring-on-startup");

  Assert.ok(
    !autoRestore.willRestore,
    "Will not auto-restore when userEnabled is false"
  );

  autoRestore.initOnStartupCompleted();

  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy is not activating"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests that the VPN does not auto-restore if the state is not READY.
 */
add_task(async function test_IPPAutoRestore_if_notReady() {
  // Simulate user having previously enabled the VPN
  Services.prefs.setBoolPref("browser.ipProtection.userEnabled", true);

  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => false);

  IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "State is UNAUTHENTICATED when user is not signed in"
  );

  let autoRestore = new IPPAutoRestoreSingleton();
  autoRestore.init();
  Services.obs.notifyObservers(null, "sessionstore-restoring-on-startup");

  Assert.ok(
    !autoRestore.willRestore,
    "Will not auto-restore when state has changed"
  );

  autoRestore.initOnStartupCompleted();

  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy is not activating"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

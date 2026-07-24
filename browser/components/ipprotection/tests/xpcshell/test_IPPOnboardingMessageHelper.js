/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPOnboardingMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPOnboardingMessageHelper.sys.mjs"
);
const { ONBOARDING_PREF_FLAGS } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);
const AUTOSTART_PREF = "browser.ipProtection.autoStartEnabled";
const PERM_NAME = "ipp-vpn";

add_setup(async function () {
  await putServerInRemoteSettings();
});

/**
 * Tests that onboarding message flags are set for VPN start, autostart, and site exceptions
 */
add_task(async function test_IPPOnboardingMessage() {
  let sandbox = sinon.createSandbox();
  setupStubs(sandbox);

  let readyEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );

  IPProtectionService.init();

  await readyEventPromise;

  Assert.ok(
    !IPPProxyManager.activatedAt,
    "IP Protection service should not be active initially"
  );

  let startedEventPromise = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );

  IPPProxyManager.start();

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVATING,
    "Proxy activation"
  );

  await startedEventPromise;
  info("after startedEventPromise");
  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "IP Protection service should be active after starting"
  );

  let maskAfterVpn = IPPOnboardingMessage.readPrefMask();
  Assert.notStrictEqual(
    maskAfterVpn & ONBOARDING_PREF_FLAGS.EVER_TURNED_ON_VPN,
    0,
    "Ever turned on VPN flag should be set"
  );

  // Turn on autostart
  Services.prefs.setBoolPref(AUTOSTART_PREF, true);
  let maskAfterAutostart = IPPOnboardingMessage.readPrefMask();
  Assert.strictEqual(
    maskAfterAutostart,
    maskAfterVpn | ONBOARDING_PREF_FLAGS.EVER_TURNED_ON_AUTOSTART,
    "Autostart flag should be added to the mask"
  );

  // Add site exception
  const site = "https://www.example.com";
  const principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site);
  const capability = Ci.nsIPermissionManager.DENY_ACTION;
  Services.perms.addFromPrincipal(principal, PERM_NAME, capability);

  let maskAfterSiteException = IPPOnboardingMessage.readPrefMask();
  Assert.strictEqual(
    maskAfterSiteException,
    maskAfterAutostart | ONBOARDING_PREF_FLAGS.EVER_USED_SITE_EXCEPTIONS,
    "Site exceptions flag should be added to the mask"
  );

  // Cleanup
  Services.perms.removeByType(PERM_NAME);
  IPProtectionService.uninit();
  IPPOnboardingMessage.uninit();
  sandbox.restore();
});

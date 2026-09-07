/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { AddonManagerPrivate } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const ADDON_ID = "policytest@mozilla.com";
const BASE_URL =
  "http://mochi.test:8888/browser/browser/components/enterprisepolicies/tests/browser";

function isExtensionLocked(addonCard) {
  let disableBtn = addonCard.querySelector('[action="toggle-disabled"]');
  let removeBtn = addonCard.querySelector('panel-item[action="remove"]');
  ok(removeBtn.disabled, "Remove button should be disabled");
  ok(disableBtn.hidden, "Disable button should be hidden");
}

async function isExtensionLockedAndUpdateDisabled(win, addonID) {
  let addonCard = await BrowserTestUtils.waitForCondition(() => {
    return win.document.querySelector(`addon-card[addon-id="${addonID}"]`);
  }, `Get addon-card for "${addonID}"`);
  isExtensionLocked(addonCard);

  let updateRow = addonCard.querySelector(".addon-detail-row-updates");
  is(updateRow.hidden, true, "Update row should be hidden");

  const { addon } = addonCard;
  is(
    addon.permissions & AddonManager.PERM_CAN_UPGRADE,
    0,
    "addon should not have AddonManager upgrade permission"
  );
  is(
    addon.isApplyBackgroundUpdatesControlledByPolicies,
    true,
    "addon auto-updates should be controlled by policies"
  );
  is(
    addon.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_DISABLE,
    "addon auto-updates should be disabled"
  );

  // Verify that setting it would be ignored.
  addon.applyBackgroundUpdates = AddonManager.AUTOUPDATE_ENABLE;
  is(
    addon.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_DISABLE,
    "addon auto-updates should still be disabled"
  );
  is(
    addon.__AddonInternal__.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_DEFAULT,
    "addon auto-updates value stored in the add-on DB should stay set to the AUTOUPDATE_DEFAULT"
  );
}

async function isExtensionLockedAndUpdateEnabled(win, addonID) {
  let addonCard = await BrowserTestUtils.waitForCondition(() => {
    return win.document.querySelector(`addon-card[addon-id="${addonID}"]`);
  }, `Get addon-card for "${addonID}"`);
  isExtensionLocked(addonCard);

  let updateRow = addonCard.querySelector(".addon-detail-row-updates");
  is(updateRow.hidden, true, "Update row should be hidden");

  const { addon } = addonCard;
  is(
    addon.permissions & AddonManager.PERM_CAN_UPGRADE,
    AddonManager.PERM_CAN_UPGRADE,
    "addon should have AddonManager upgrade permission"
  );
  is(
    addon.isApplyBackgroundUpdatesControlledByPolicies,
    true,
    "addon auto-updates should be controlled by policies"
  );
  is(
    addon.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_ENABLE,
    "addon auto-updates should be enabled"
  );

  // Verify that setting it would be ignored.
  addon.applyBackgroundUpdates = AddonManager.AUTOUPDATE_DISABLE;
  is(
    addon.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_ENABLE,
    "addon auto-updates should still be enabled"
  );
  is(
    addon.__AddonInternal__.applyBackgroundUpdates,
    AddonManager.AUTOUPDATE_DEFAULT,
    "addon auto-updates value stored in the add-on DB should stay set to the AUTOUPDATE_DEFAULT"
  );
}

add_task(async function test_addon_private_browser_access_locked() {
  async function installWithExtensionSettings(extensionSettings = {}) {
    let installPromise = waitForAddonInstall(ADDON_ID);
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "policytest@mozilla.com": {
            install_url: `${BASE_URL}/policytest_v0.1.xpi`,
            installation_mode: "force_installed",
            updates_disabled: true,
            ...extensionSettings,
          },
        },
      },
    });
    await installPromise;
    let addon = await AddonManager.getAddonByID(ADDON_ID);
    isnot(addon, null, "Addon not installed.");
    is(addon.version, "0.1", "Addon version is correct");
    return addon;
  }

  let addon = await installWithExtensionSettings();
  is(
    Boolean(
      addon.permissions & AddonManager.PERM_CAN_CHANGE_PRIVATEBROWSING_ACCESS
    ),
    true,
    "Addon should be able to change private browsing setting (not set in policy)."
  );
  await addon.uninstall();

  addon = await installWithExtensionSettings({ private_browsing: true });
  is(
    Boolean(
      addon.permissions & AddonManager.PERM_CAN_CHANGE_PRIVATEBROWSING_ACCESS
    ),
    false,
    "Addon should NOT be able to change private browsing setting (set to true in policy)."
  );
  await addon.uninstall();

  addon = await installWithExtensionSettings({ private_browsing: false });
  is(
    Boolean(
      addon.permissions & AddonManager.PERM_CAN_CHANGE_PRIVATEBROWSING_ACCESS
    ),
    false,
    "Addon should NOT be able to change private browsing setting (set to false in policy)."
  );
  await addon.uninstall();
});

add_task(async function test_addon_install() {
  let installPromise = waitForAddonInstall(ADDON_ID);
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "policytest@mozilla.com": {
          install_url: `${BASE_URL}/policytest_v0.1.xpi`,
          installation_mode: "force_installed",
          updates_disabled: true,
        },
      },
    },
  });
  await installPromise;
  let addon = await AddonManager.getAddonByID(ADDON_ID);
  isnot(addon, null, "Addon not installed.");
  is(addon.version, "0.1", "Addon version is correct");

  Assert.deepEqual(
    addon.installTelemetryInfo,
    { source: "enterprise-policy" },
    "Got the expected addon.installTelemetryInfo"
  );
});

add_task(async function test_addon_locked_update_disabled() {
  await SpecialPowers.pushPrefEnv({
    // Make sure the global default behavior is to auto update add-ons,
    // to explicitly verify that it can overridden on a per-extension basis
    // through enterprise policies.
    set: [["extensions.update.autoUpdateDefault", true]],
  });
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  const win = await BrowserAddonUI.openAddonsMgr(
    "addons://detail/" + encodeURIComponent(ADDON_ID)
  );

  await isExtensionLockedAndUpdateDisabled(win, ADDON_ID);

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_addon_locked_updates_force_enabled() {
  await SpecialPowers.pushPrefEnv({
    // Disable the add-on auto-update behavior globally to
    // confirm that the test add-on is going to be auto-updated
    // when explicitly configured accordingly through enterprise
    // policies.
    set: [["extensions.update.autoUpdateDefault", false]],
  });
  // Setting updates_disabled to false locks the add-on auto-update behavior
  // and forces it to stay enabled.
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "policytest@mozilla.com": {
          install_url: `${BASE_URL}/policytest_v0.1.xpi`,
          installation_mode: "force_installed",
          updates_disabled: false,
        },
      },
    },
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  const win = await BrowserAddonUI.openAddonsMgr(
    "addons://detail/" + encodeURIComponent(ADDON_ID)
  );

  await isExtensionLockedAndUpdateEnabled(win, ADDON_ID);

  let addon = await AddonManager.getAddonByID(ADDON_ID);

  await SpecialPowers.pushPrefEnv({
    set: [["extensions.update.enabled", true]],
  });

  const sandbox = sinon.createSandbox();
  registerCleanupFunction(() => sandbox.restore());

  const mockAddonInstall = {
    install() {},
  };
  sandbox.stub(mockAddonInstall, "install");
  sandbox.stub(addon, "findUpdates").callsFake(updateListener => {
    updateListener.onUpdateAvailable(addon, mockAddonInstall);
    updateListener.onUpdateFinished(addon);
  });

  await AddonManagerPrivate.backgroundUpdateCheck();
  await SpecialPowers.popPrefEnv();

  is(
    addon.findUpdates.calledOnce,
    true,
    "Expect addon.findUpdates to have been called"
  );
  is(
    mockAddonInstall.install.calledOnce,
    true,
    "mockAddonInstall.install should have been called once"
  );

  sandbox.restore();
  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_addon_uninstall() {
  let uninstallPromise = waitForAddonUninstall(ADDON_ID);
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "policytest@mozilla.com": {
          installation_mode: "blocked",
        },
      },
    },
  });
  await uninstallPromise;
  let addon = await AddonManager.getAddonByID(ADDON_ID);
  is(addon, null, "Addon should be uninstalled.");
});

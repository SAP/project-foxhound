/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.appInfo = getAppInfo();

const server = AddonTestUtils.createHttpServer({ hosts: ["example.com"] });
const BASE_URL = `http://example.com/data`;

let addonID = "policytest2@mozilla.com";
let themeID = "policytheme@mozilla.com";

let fileURL;

add_setup(async function setup() {
  await AddonTestUtils.promiseStartupManager();

  let webExtensionFile = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: addonID,
        },
      },
    },
  });

  server.registerFile(
    "/data/amosigned-sha1only.xpi",
    do_get_file("amosigned-sha1only.xpi")
  );
  server.registerFile("/data/policy_test.xpi", webExtensionFile);
  fileURL = Services.io
    .newFileURI(webExtensionFile)
    .QueryInterface(Ci.nsIFileURL);
});

add_task(async function test_extensionsettings() {
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "extension1@mozilla.com": {
          blocked_install_message: "Extension1 error message.",
        },
        "*": {
          blocked_install_message: "Generic error message.",
        },
      },
    },
  });

  let extensionSettings = Services.policies.getExtensionSettings(
    "extension1@mozilla.com"
  );
  equal(
    extensionSettings.blocked_install_message,
    "Extension1 error message.",
    "Should have extension specific message."
  );
  extensionSettings = Services.policies.getExtensionSettings(
    "extension2@mozilla.com"
  );
  equal(
    extensionSettings.blocked_install_message,
    "Generic error message.",
    "Should have generic message."
  );
});

add_task(async function test_addon_blocked() {
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "policytest2@mozilla.com": {
          installation_mode: "blocked",
        },
      },
    },
  });

  let install = await AddonManager.getInstallForURL(
    BASE_URL + "/policy_test.xpi"
  );
  await install.install();
  notEqual(install.addon, null, "Addon should not be null");
  equal(install.addon.appDisabled, true, "Addon should be disabled");
  await install.addon.uninstall();
});

add_task(async function test_addon_allowed() {
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "policytest2@mozilla.com": {
          installation_mode: "allowed",
        },
        "*": {
          installation_mode: "blocked",
        },
      },
    },
  });

  let install = await AddonManager.getInstallForURL(
    BASE_URL + "/policy_test.xpi"
  );
  await install.install();
  notEqual(install.addon, null, "Addon should not be null");
  equal(install.addon.appDisabled, false, "Addon should not be disabled");
  await install.addon.uninstall();
});

add_task(async function test_addon_uninstalled() {
  let install = await AddonManager.getInstallForURL(
    BASE_URL + "/policy_test.xpi"
  );
  await install.install();
  notEqual(install.addon, null, "Addon should not be null");

  await Promise.all([
    AddonTestUtils.promiseAddonEvent("onUninstalled"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": {
            installation_mode: "blocked",
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(addonID);
  equal(addon, null, "Addon should be null");
});

add_task(async function test_addon_forceinstalled() {
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "policytest2@mozilla.com": {
            installation_mode: "force_installed",
            install_url: BASE_URL + "/policy_test.xpi",
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(addonID);
  notEqual(addon, null, "Addon should not be null");
  equal(addon.appDisabled, false, "Addon should not be disabled");
  equal(
    addon.permissions & AddonManager.PERM_CAN_UNINSTALL,
    0,
    "Addon should not be able to be uninstalled."
  );
  equal(
    addon.permissions & AddonManager.PERM_CAN_DISABLE,
    0,
    "Addon should not be able to be disabled."
  );
  await addon.uninstall();
});

add_task(async function test_addon_normalinstalled() {
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "policytest2@mozilla.com": {
            installation_mode: "normal_installed",
            install_url: BASE_URL + "/policy_test.xpi",
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(addonID);
  notEqual(addon, null, "Addon should not be null");
  equal(addon.appDisabled, false, "Addon should not be disabled");
  equal(
    addon.permissions & AddonManager.PERM_CAN_UNINSTALL,
    0,
    "Addon should not be able to be uninstalled."
  );
  notEqual(
    addon.permissions & AddonManager.PERM_CAN_DISABLE,
    0,
    "Addon should be able to be disabled."
  );
  await addon.uninstall();
});

add_task(async function test_extensionsettings_string() {
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: '{"*": {"installation_mode": "blocked"}}',
    },
  });

  let extensionSettings = Services.policies.getExtensionSettings("*");
  equal(extensionSettings.installation_mode, "blocked");
});

add_task(async function test_extensionsettings_string() {
  let restrictedDomains = Services.prefs.getCharPref(
    "extensions.webextensions.restrictedDomains"
  );
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings:
        '{"*": {"restricted_domains": ["example.com","example.org"]}}',
    },
  });

  let newRestrictedDomains = Services.prefs.getCharPref(
    "extensions.webextensions.restrictedDomains"
  );
  equal(newRestrictedDomains, restrictedDomains + ",example.com,example.org");
});

add_task(async function test_theme() {
  let themeFile = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      browser_specific_settings: {
        gecko: {
          id: themeID,
        },
      },
      theme: {},
    },
  });

  server.registerFile("/data/policy_theme.xpi", themeFile);

  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "policytheme@mozilla.com": {
            installation_mode: "normal_installed",
            install_url: BASE_URL + "/policy_theme.xpi",
          },
        },
      },
    }),
  ]);
  let currentTheme = Services.prefs.getCharPref("extensions.activeThemeID");
  equal(currentTheme, themeID, "Theme should be active");
  let addon = await AddonManager.getAddonByID(themeID);
  await addon.uninstall();
});

add_task(async function test_addon_normalinstalled_file() {
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "policytest2@mozilla.com": {
            installation_mode: "normal_installed",
            install_url: fileURL.spec,
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(addonID);
  notEqual(addon, null, "Addon should not be null");
  equal(addon.appDisabled, false, "Addon should not be disabled");
  equal(
    addon.permissions & AddonManager.PERM_CAN_UNINSTALL,
    0,
    "Addon should not be able to be uninstalled."
  );
  notEqual(
    addon.permissions & AddonManager.PERM_CAN_DISABLE,
    0,
    "Addon should be able to be disabled."
  );

  await addon.uninstall();
});

add_task(async function test_allow_weak_signatures() {
  // Make sure weak signatures are restricted.
  const resetWeakSignaturePref =
    AddonTestUtils.setWeakSignatureInstallAllowed(false);

  const id = "amosigned-xpi@tests.mozilla.org";
  const perAddonSettings = {
    installation_mode: "normal_installed",
    install_url: BASE_URL + "/amosigned-sha1only.xpi",
  };

  info(
    "Sanity check: expect install to fail if not allowed through enterprise policy settings"
  );
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onDownloadFailed"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [id]: { ...perAddonSettings },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(id);
  equal(addon, null, "Add-on not installed");

  info(
    "Expect install to be allowed through per-addon enterprise policy settings"
  );
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [id]: {
            ...perAddonSettings,
            temporarily_allow_weak_signatures: true,
          },
        },
      },
    }),
  ]);
  addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Add-on not installed");
  await addon.uninstall();

  info(
    "Expect install to be allowed through global enterprise policy settings"
  );
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { temporarily_allow_weak_signatures: true },
          [id]: { ...perAddonSettings },
        },
      },
    }),
  ]);
  addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Add-on installed");
  await addon.uninstall();

  info(
    "Expect install to fail if allowed globally but disallowed by per-addon settings"
  );
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onDownloadFailed"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { temporarily_allow_weak_signatures: true },
          [id]: {
            ...perAddonSettings,
            temporarily_allow_weak_signatures: false,
          },
        },
      },
    }),
  ]);
  addon = await AddonManager.getAddonByID(id);
  equal(addon, null, "Add-on not installed");

  info(
    "Expect install to be allowed through per addon setting when globally disallowed"
  );
  await Promise.all([
    AddonTestUtils.promiseInstallEvent("onInstallEnded"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { temporarily_allow_weak_signatures: false },
          [id]: {
            ...perAddonSettings,
            temporarily_allow_weak_signatures: true,
          },
        },
      },
    }),
  ]);
  addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Add-on installed");
  await addon.uninstall();

  resetWeakSignaturePref();
});

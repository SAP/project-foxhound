/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

AddonTestUtils.initMochitest(this);

const ADDON_ID = "mv3-policy-host-perms@mochi.test";

async function openPermissionsView(addonId) {
  let win = await BrowserAddonUI.openAddonsMgr(
    "addons://detail/" + encodeURIComponent(addonId) + "/permissions"
  );
  let card = await TestUtils.waitForCondition(
    () => win.document.querySelector(`addon-card[addon-id="${addonId}"]`),
    `Get addon-card for "${addonId}"`
  );
  return TestUtils.waitForCondition(
    () => card.querySelector("addon-permissions-list"),
    "Wait for permissions list"
  );
}

add_task(
  async function test_mv3_force_installed_remove_required_host_blocked() {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        host_permissions: ["*://*.example.com/*"],
        optional_host_permissions: ["*://*.mozilla.org/*"],
      },
      background() {
        /* global browser */
        browser.test.onMessage.addListener(async msg => {
          if (msg === "remove-required") {
            try {
              await browser.permissions.remove({
                origins: ["*://*.example.com/*"],
              });
              browser.test.sendMessage("result", { error: null });
            } catch (e) {
              browser.test.sendMessage("result", { error: e.message });
            }
          } else if (msg === "remove-optional") {
            try {
              await browser.permissions.remove({
                origins: ["*://*.mozilla.org/*"],
              });
              browser.test.sendMessage("result", { error: null });
            } catch (e) {
              browser.test.sendMessage("result", { error: e.message });
            }
          } else if (msg === "remove-subpattern-of-required") {
            // Sub-pattern of a required host_permissions entry. Chrome throws
            // (subsumption check), so we do too.
            try {
              await browser.permissions.remove({
                origins: ["https://www.example.com/*"],
              });
              browser.test.sendMessage("result", { error: null });
            } catch (e) {
              browser.test.sendMessage("result", { error: e.message });
            }
          }
        });
      },
      useAddonManager: "permanent",
    });
    await extension.startup();

    await setupPolicyEngineWithJson({
      policies: {
        Extensions: {
          Locked: [ADDON_ID],
        },
      },
    });

    extension.sendMessage("remove-required");
    let result = await extension.awaitMessage("result");
    is(
      result.error,
      "You cannot remove required permissions. " +
        "Host permissions are locked by enterprise policies.",
      "Removing required host perm should throw for force-installed extension"
    );

    extension.sendMessage("remove-optional");
    result = await extension.awaitMessage("result");
    is(
      result.error,
      null,
      "Removing optional host perm should succeed for force-installed extension"
    );

    extension.sendMessage("remove-subpattern-of-required");
    result = await extension.awaitMessage("result");
    is(
      result.error,
      "You cannot remove required permissions. " +
        "Host permissions are locked by enterprise policies.",
      "Removing a sub-pattern of a required host should throw (matches Chrome subsumption)"
    );

    await extension.unload();
    await setupPolicyEngineWithJson("");
  }
);

add_task(async function test_mv3_force_installed_all_sites_locked() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      name: "MV3 policy host perms",
      host_permissions: ["<all_urls>"],
    },
    useAddonManager: "permanent",
  });
  await extension.startup();

  await setupPolicyEngineWithJson({
    policies: {
      Extensions: {
        Locked: [ADDON_ID],
      },
    },
  });

  let addon = await AddonManager.getAddonByID(ADDON_ID);
  ok(
    Services.policies?.isAddonRequiredByPolicy(addon.id),
    "Addon reports as installed by enterprise policy"
  );

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let permsSection = await openPermissionsView(ADDON_ID);

  let toggle = await TestUtils.waitForCondition(
    () => permsSection.querySelector("moz-toggle[permission-all-sites]"),
    "Wait for all-sites toggle"
  );

  ok(
    toggle.hasAttribute("disabled"),
    "All-sites toggle should be disabled for a policy-installed extension"
  );

  let banner = permsSection.querySelector(".addon-permissions-policy-banner");
  ok(banner, "Policy banner is rendered above the permission list");
  is(
    banner.supportLinkEls[0]?.getAttribute("support-page"),
    "managed-browser-firefox#w_why-some-features-may-be-disabled",
    "Banner link points to the managed-browser SUMO page"
  );

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
  await setupPolicyEngineWithJson("");
});

add_task(async function test_mv3_force_installed_specific_hosts_locked() {
  // Include a path-containing pattern to verify the UI Set normalizes
  // manifest origins with ignorePath:true to match the toggle key format.
  const host_permissions = [
    "*://*.example.com/*",
    "https://example.org/path/*",
  ];
  const optional_host_permissions = ["*://*.mozilla.org/*"];
  // What the toggle "permission-key" values will be (path-stripped).
  const expected_required_keys = [
    "*://*.example.com/*",
    "https://example.org/*",
  ];
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      name: "MV3 policy host perms",
      host_permissions,
      optional_host_permissions,
      optional_permissions: ["history"],
    },
    useAddonManager: "permanent",
  });
  await extension.startup();

  await setupPolicyEngineWithJson({
    policies: {
      Extensions: {
        Locked: [ADDON_ID],
      },
    },
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let permsSection = await openPermissionsView(ADDON_ID);

  let hostToggles = permsSection.querySelectorAll(
    'moz-toggle[permission-type="origin"]'
  );
  Assert.equal(
    hostToggles.length,
    host_permissions.length + optional_host_permissions.length,
    "Host permission toggles are present"
  );
  for (let toggle of hostToggles) {
    const isRequiredHostPermission = expected_required_keys.includes(
      toggle.getAttribute("permission-key")
    );
    Assert.equal(
      toggle.hasAttribute("disabled"),
      isRequiredHostPermission,
      `Host toggle for ${toggle.getAttribute("permission-key")} should be ${
        isRequiredHostPermission ? "disabled" : "enabled"
      }`
    );
  }

  let apiToggle = permsSection.querySelector(
    'moz-toggle[permission-key="history"]'
  );
  ok(apiToggle, "Optional API permission toggle is present");
  ok(
    !apiToggle.hasAttribute("disabled"),
    "Optional API permission toggle should NOT be disabled"
  );

  let banner = permsSection.querySelector(".addon-permissions-policy-banner");
  ok(banner, "Policy banner is rendered");

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
  await setupPolicyEngineWithJson("");
});

add_task(
  async function test_mv3_force_installed_auto_grants_host_permissions() {
    await setupPolicyEngineWithJson({
      policies: {
        Extensions: {
          Locked: [ADDON_ID],
        },
      },
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        host_permissions: ["*://*.example.com/*", "https://example.org/*"],
      },
      useAddonManager: "permanent",
    });
    await extension.startup();

    let perms = await ExtensionPermissions.get(ADDON_ID);
    ok(
      perms.origins.includes("*://*.example.com/*"),
      "host_permission *://*.example.com/* auto-granted at policy install"
    );
    ok(
      perms.origins.includes("https://example.org/*"),
      "host_permission https://example.org/* auto-granted at policy install"
    );

    await extension.unload();
    await setupPolicyEngineWithJson("");
  }
);

add_task(
  async function test_mv3_force_installed_revokes_removed_host_permissions() {
    await setupPolicyEngineWithJson({
      policies: {
        Extensions: {
          Locked: [ADDON_ID],
        },
      },
    });

    let xpiV1 = AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        version: "1.0",
        host_permissions: ["<all_urls>"],
      },
    });
    let startupV1 = AddonTestUtils.promiseWebExtensionStartup(ADDON_ID);
    await AddonTestUtils.promiseInstallFile(xpiV1);
    await startupV1;

    let perms = await ExtensionPermissions.get(ADDON_ID);
    ok(
      perms.origins.includes("<all_urls>"),
      "all_urls auto-granted at v1 install"
    );

    let xpiV2 = AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        version: "2.0",
        host_permissions: ["*://*.example.com/*"],
      },
    });
    let startupV2 = AddonTestUtils.promiseWebExtensionStartup(ADDON_ID);
    await AddonTestUtils.promiseInstallFile(xpiV2);
    await startupV2;

    await TestUtils.waitForCondition(async () => {
      let p = await ExtensionPermissions.get(ADDON_ID);
      return !p.origins.includes("<all_urls>");
    }, "Wait for all_urls to be revoked after upgrade");

    perms = await ExtensionPermissions.get(ADDON_ID);
    ok(
      !perms.origins.includes("<all_urls>"),
      "all_urls revoked after upgrade removes it from manifest"
    );
    ok(
      perms.origins.includes("*://*.example.com/*"),
      "new host_permission granted after upgrade"
    );

    let addon = await AddonManager.getAddonByID(ADDON_ID);
    await addon.uninstall();
    await setupPolicyEngineWithJson("");
  }
);

add_task(async function test_mv3_force_installed_set_when_clicked_blocked() {
  await setupPolicyEngineWithJson({
    policies: {
      Extensions: {
        Locked: [ADDON_ID],
      },
    },
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      name: "MV3 policy host perms",
      // host_permissions pattern below includes a path component to verify
      // setWhenClicked ignores the path when determining if the call would
      // revoke an host permission required by a policy managed add-on.
      host_permissions: ["*://*.example.com/path/*"],
      optional_host_permissions: ["*://*.mozilla.org/*"],
    },
    useAddonManager: "permanent",
  });
  await extension.startup();

  // Stored origins have the path component stripped by ExtensionPermissions.
  let perms = await ExtensionPermissions.get(ADDON_ID);
  ok(
    perms.origins.includes("*://*.example.com/*"),
    "example.com auto-granted at install (stored with path stripped)"
  );

  let policy = WebExtensionPolicy.getByID(ADDON_ID);
  let exampleUri = Services.io.newURI("https://example.com/");
  await OriginControls.setWhenClicked(policy, exampleUri);

  perms = await ExtensionPermissions.get(ADDON_ID);
  ok(
    perms.origins.includes("*://*.example.com/*"),
    "setWhenClicked blocked for required host origin on force-installed extension"
  );

  // Grant optional host permission, then verify setWhenClicked can revoke it.
  await ExtensionPermissions.add(
    ADDON_ID,
    { permissions: [], origins: ["*://*.mozilla.org/*"] },
    policy.extension
  );
  let mozillaUri = Services.io.newURI("https://mozilla.org/");
  await OriginControls.setWhenClicked(policy, mozillaUri);

  perms = await ExtensionPermissions.get(ADDON_ID);
  ok(
    !perms.origins.includes("*://*.mozilla.org/*"),
    "setWhenClicked allowed for optional host origin on force-installed extension"
  );

  await extension.unload();
  await setupPolicyEngineWithJson("");
});

add_task(
  async function test_mv3_extensionsettings_remove_required_host_blocked() {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        host_permissions: ["*://*.example.com/*"],
        optional_host_permissions: ["*://*.mozilla.org/*"],
      },
      background() {
        browser.test.onMessage.addListener(async msg => {
          if (msg === "remove-required") {
            try {
              await browser.permissions.remove({
                origins: ["*://*.example.com/*"],
              });
              browser.test.sendMessage("result", { error: null });
            } catch (e) {
              browser.test.sendMessage("result", { error: e.message });
            }
          }
        });
      },
      useAddonManager: "permanent",
    });
    await extension.startup();

    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [ADDON_ID]: {
            installation_mode: "force_installed",
            // Fake install_url to pass schema validation; a download failed
            // error is expected to be logged in the console.
            install_url: "https://example.com/x.xpi",
          },
        },
      },
    });

    ok(
      Services.policies?.isAddonRequiredByPolicy(ADDON_ID),
      "Addon reports as installed by enterprise policy via ExtensionSettings"
    );

    extension.sendMessage("remove-required");
    let result = await extension.awaitMessage("result");
    is(
      result.error,
      "You cannot remove required permissions. " +
        "Host permissions are locked by enterprise policies.",
      "Removing required host perm throws under ExtensionSettings.installation_mode"
    );

    // Also verify the about:addons UI behavior under ExtensionSettings.
    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
    let permsSection = await openPermissionsView(ADDON_ID);
    let hostToggles = permsSection.querySelectorAll(
      'moz-toggle[permission-type="origin"]'
    );
    for (let toggle of hostToggles) {
      const isRequired =
        toggle.getAttribute("permission-key") === "*://*.example.com/*";
      Assert.equal(
        toggle.hasAttribute("disabled"),
        isRequired,
        `Under ExtensionSettings, host toggle for ${toggle.getAttribute(
          "permission-key"
        )} should be ${isRequired ? "disabled" : "enabled"}`
      );
    }
    let banner = permsSection.querySelector(".addon-permissions-policy-banner");
    ok(banner, "Policy banner is rendered under ExtensionSettings");

    BrowserTestUtils.removeTab(tab);
    await extension.unload();
    await setupPolicyEngineWithJson("");
  }
);

add_task(
  async function test_mv3_force_installed_content_script_origins_locked() {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        manifest_version: 3,
        browser_specific_settings: { gecko: { id: ADDON_ID } },
        name: "MV3 policy host perms",
        host_permissions: [],
        optional_host_permissions: ["*://*.mozilla.org/*"],
        content_scripts: [
          {
            matches: ["*://*.example.com/*"],
            js: ["cs.js"],
          },
        ],
      },
      files: { "cs.js": "" },
      background() {
        browser.test.onMessage.addListener(async msg => {
          if (msg === "remove-content-script-origin") {
            try {
              await browser.permissions.remove({
                origins: ["*://*.example.com/*"],
              });
              browser.test.sendMessage("result", { error: null });
            } catch (e) {
              browser.test.sendMessage("result", { error: e.message });
            }
          }
        });
      },
      useAddonManager: "permanent",
    });
    await extension.startup();

    await setupPolicyEngineWithJson({
      policies: {
        Extensions: {
          Locked: [ADDON_ID],
        },
      },
    });

    extension.sendMessage("remove-content-script-origin");
    let result = await extension.awaitMessage("result");
    is(
      result.error,
      "You cannot remove required permissions. " +
        "Host permissions are locked by enterprise policies.",
      "Removing content_scripts origin should throw for force-installed extension"
    );

    await extension.unload();
    await setupPolicyEngineWithJson("");
  }
);

// Smoke test: an enterprise policy managed privileged extension with a restricted scheme
// origin in host_permissions must not cause migratePermissions to throw NS_ERROR_ILLEGAL_VALUE.
add_task(async function test_migratePermissions_restrictSchemes_smoketest() {
  const { ExtensionData } = ChromeUtils.importESModule(
    "resource://gre/modules/Extension.sys.mjs"
  );
  const PRIVILEGED_POLICY_ADDON_ID =
    "privileged-policy-migrate-permissions-test@mozilla.com";

  await setupPolicyEngineWithJson({
    policies: { Extensions: { Locked: [PRIVILEGED_POLICY_ADDON_ID] } },
  });

  ok(
    Services.policies.isAddonRequiredByPolicy(PRIVILEGED_POLICY_ADDON_ID),
    "Extension is required by enterprise policy"
  );

  const oldAddonData = {
    permissions: {
      permissions: ["mozillaAddons"],
      origins: [],
      data_collection: [],
    },
    optionalPermissions: { permissions: [], origins: [], data_collection: [] },
  };
  const newAddonData = {
    permissions: {
      permissions: ["mozillaAddons"],
      origins: ["resource://x/*", "about:reader*"],
    },
    optionalPermissions: { permissions: [], origins: [], data_collection: [] },
  };

  await Assert.rejects(
    ExtensionData.migratePermissions(
      PRIVILEGED_POLICY_ADDON_ID,
      oldAddonData.permissions,
      oldAddonData.optionalPermissions,
      newAddonData.permissions,
      newAddonData.optionalPermissions,
      false // newIsPrivileged
    ),
    /NS_ERROR_ILLEGAL_VALUE/,
    "Expect migratePermissions to throw on unexpected unprivileged extension with restricted schemes in host_permissions"
  );

  await ExtensionData.migratePermissions(
    PRIVILEGED_POLICY_ADDON_ID,
    oldAddonData.permissions,
    oldAddonData.optionalPermissions,
    newAddonData.permissions,
    newAddonData.optionalPermissions,
    true // newIsPrivileged
  );

  ok(
    true,
    "migratePermissions resolve successfully on privileged extension with restricted schemes in host_permissions"
  );

  await setupPolicyEngineWithJson({});
});

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { AddonManager } = ChromeUtils.importESModule(
  "resource://gre/modules/AddonManager.sys.mjs"
);
const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.init(this);
AddonTestUtils.overrideCertDB();
AddonTestUtils.appInfo = getAppInfo();
AddonTestUtils.usePrivilegedSignatures = false;
ExtensionTestUtils.init(this);

add_setup(async function setup() {
  await AddonTestUtils.promiseStartupManager();
});

add_task(async function test_blocked_permissions_prevent_manual_install() {
  // 1. Apply enterprise policy (do not include install_url)
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": {
          blocked_permissions: ["history"],
        },
      },
    },
  });

  // 2. Create a local XPI file with a blocked permission
  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id: "blocked@tests.mozilla.org" } },
      name: "Blocked Permission Extension",
      version: "1.0",
      permissions: ["history"], // this is blocked by policy
    },
  });

  // 3. Try to install it manually
  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();

  notEqual(install.addon, null, "Addon should not be null");
  equal(install.addon.appDisabled, true, "Addon should be disabled");
  await install.addon.uninstall();
});

add_task(
  {
    pref_set: [
      ["extensions.webextOptionalPermissionPrompts", false],
      // Required for browser.test.withHandlingUserInput in xpcshell.
      [
        "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer",
        true,
      ],
    ],
  },
  async function test_blocked_permissions_request_rejects_entire_call() {
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": {
            blocked_permissions: ["cookies"],
          },
        },
      },
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: {
          gecko: { id: "blockedreq@tests.mozilla.org" },
        },
        optional_permissions: ["cookies", "notifications"],
      },
      useAddonManager: "temporary",
      async background() {
        let result;
        browser.test.withHandlingUserInput(() => {
          result = browser.permissions.request({
            permissions: ["cookies", "notifications"],
          });
        });
        await browser.test.assertRejects(
          result,
          /Permissions are blocked by enterprise policy/,
          "permissions.request throws when any requested perm is blocked"
        );
        let granted = await browser.permissions.getAll();
        browser.test.assertFalse(
          granted.permissions.includes("notifications"),
          "non-blocked perm was not granted when another was blocked"
        );
        browser.test.assertFalse(
          granted.permissions.includes("cookies"),
          "blocked perm was not granted"
        );
        browser.test.sendMessage("done");
      },
    });

    await extension.startup();
    await extension.awaitMessage("done");
    await extension.unload();
  }
);

add_task(
  {
    pref_set: [
      ["extensions.webextOptionalPermissionPrompts", false],
      [
        "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer",
        true,
      ],
    ],
  },
  async function test_per_id_blocked_permissions_request_rejects() {
    let id = "peridreq@tests.mozilla.org";
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [id]: { blocked_permissions: ["cookies"] },
        },
      },
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: { gecko: { id } },
        optional_permissions: ["cookies"],
      },
      useAddonManager: "temporary",
      async background() {
        let result;
        browser.test.withHandlingUserInput(() => {
          result = browser.permissions.request({ permissions: ["cookies"] });
        });
        await browser.test.assertRejects(
          result,
          /Permissions are blocked by enterprise policy/,
          "Per-id blocked_permissions rejects permissions.request"
        );
        browser.test.sendMessage("done");
      },
    });

    await extension.startup();
    await extension.awaitMessage("done");
    await extension.unload();
  }
);

add_task(
  async function test_per_id_entry_bypasses_global_blocked_permissions() {
    let id = "peridoverride@tests.mozilla.org";
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { blocked_permissions: ["history"] },
          [id]: {},
        },
      },
    });

    let xpi = AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        applications: { gecko: { id } },
        name: "Per-id override",
        version: "1.0",
        permissions: ["history"],
      },
    });

    let install = await AddonManager.getInstallForFile(xpi);
    await install.install();
    equal(
      install.addon.appDisabled,
      false,
      "Per-id entry should override global blocked_permissions"
    );
    await install.addon.uninstall();
  }
);

add_task(async function test_per_id_blocked_permissions_applies() {
  let id = "peridblocked@tests.mozilla.org";
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        [id]: { blocked_permissions: ["history"] },
      },
    },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id } },
      name: "Per-id blocked",
      version: "1.0",
      permissions: ["history"],
    },
  });

  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    true,
    "Per-id blocked_permissions should disable this addon"
  );
  await install.addon.uninstall();
});

add_task(async function test_per_id_blocked_permissions_overrides_global() {
  let id = "peridoverridesglobal@tests.mozilla.org";
  // Per-id has its own blocked_permissions; per Chrome, per-id shadows "*"
  // entirely, so the global blocked entry for "tabs" should not apply here.
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": { blocked_permissions: ["tabs"] },
        [id]: { blocked_permissions: ["history"] },
      },
    },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id } },
      name: "Per-id overrides global",
      version: "1.0",
      permissions: ["tabs"],
    },
  });

  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    false,
    "Per-id blocked_permissions fully shadows global; tabs is not blocked here"
  );
  await install.addon.uninstall();
});

add_task(async function test_per_id_entry_shadows_global_allowed_types() {
  // Verifies the Chrome per-id-shadows-* semantic in mayInstallAddon: an
  // empty per-id entry exempts the addon from the global allowed_types
  // restriction.
  let id = "peridshadowstypes@tests.mozilla.org";
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": { allowed_types: ["theme"] },
        [id]: {},
      },
    },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id } },
      name: "Per-id shadows allowed_types",
      version: "1.0",
    },
  });

  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    false,
    "Per-id entry shadows global allowed_types restriction"
  );
  await install.addon.uninstall();
});

add_task(async function test_per_id_entry_bypasses_block_all_extensions() {
  let blockedId = "willBeRemoved@tests.mozilla.org";
  let bypassId = "bypassGlobal@tests.mozilla.org";

  await setupPolicyEngineWithJson({
    policies: { ExtensionSettings: { "*": { blocked_permissions: [] } } },
  });

  let blockedXpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id: blockedId } },
      name: "Will be removed",
      version: "1.0",
    },
  });
  let bypassXpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id: bypassId } },
      name: "Bypass global",
      version: "1.0",
    },
  });

  await (await AddonManager.getInstallForFile(blockedXpi)).install();
  await (await AddonManager.getInstallForFile(bypassXpi)).install();

  // blockAll with a per-id override entry for bypassId only.
  await Promise.all([
    AddonTestUtils.promiseAddonEvent("onUninstalled"),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { installation_mode: "blocked" },
          [bypassId]: {},
        },
      },
    }),
  ]);

  let blocked = await AddonManager.getAddonByID(blockedId);
  equal(blocked, null, "Addon without per-id entry was uninstalled");

  let bypass = await AddonManager.getAddonByID(bypassId);
  notEqual(bypass, null, "Addon with per-id entry survived blockAllExtensions");
  equal(
    bypass.appDisabled,
    false,
    "Per-id override addon stays enabled under blockAllExtensions"
  );

  await bypass.uninstall();
  // Reset so subsequent tests do not inherit installation_mode:blocked.
  await setupPolicyEngineWithJson({
    policies: { ExtensionSettings: { "*": { blocked_permissions: [] } } },
  });
});

add_task(async function test_blocked_permissions_filters_invalid_entries() {
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": {
          blocked_permissions: [
            "internal:privateBrowsingAllowed",
            "<all_urls>",
            "https://example.com/*",
            "history",
          ],
        },
      },
    },
  });

  let settings = Services.policies.getExtensionSettings("*");
  Assert.deepEqual(
    settings.blocked_permissions,
    ["history"],
    "Only valid permission names are preserved; internal:/host patterns/<all_urls> stripped"
  );
});

add_task(async function test_post_install_block_disables_addon() {
  let id = "postinstallblock@tests.mozilla.org";

  // Install with no policy restricting the permission.
  await setupPolicyEngineWithJson({
    policies: { ExtensionSettings: { "*": { blocked_permissions: [] } } },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id } },
      name: "Post-install block",
      version: "1.0",
      permissions: ["history"],
    },
  });
  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    false,
    "Addon is enabled before policy is applied"
  );

  // Apply policy that blocks the addon's required permission.
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": { blocked_permissions: ["history"] },
      },
    },
  });

  let addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Addon should still be installed (not uninstalled)");
  equal(
    addon.appDisabled,
    true,
    "Addon should be appDisabled after blocking policy"
  );

  // User tries to re-enable. isUsableAddon re-evaluates via mayInstallAddon,
  // which still returns false, so appDisabled stays true.
  await addon.enable();
  equal(
    addon.appDisabled,
    true,
    "appDisabled remains true after user attempts to re-enable"
  );

  await addon.uninstall();
});

add_task(async function test_post_install_block_revokes_granted_optional() {
  const { ExtensionPermissions } = ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionPermissions.sys.mjs"
  );
  let id = "optionalrevoke@tests.mozilla.org";

  await setupPolicyEngineWithJson({
    policies: { ExtensionSettings: { "*": { blocked_permissions: [] } } },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      applications: { gecko: { id } },
      name: "Optional revoke",
      version: "1.0",
      optional_permissions: ["cookies", "notifications"],
    },
  });
  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();

  // Grant the optional permissions directly.
  await ExtensionPermissions.add(id, {
    permissions: ["cookies", "notifications"],
    origins: [],
    data_collection: [],
  });

  let granted = await ExtensionPermissions.get(id);
  ok(
    granted.permissions.includes("cookies"),
    "cookies was granted before policy"
  );

  // Apply a policy that blocks "cookies".
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": { blocked_permissions: ["cookies"] },
      },
    },
  });

  granted = await ExtensionPermissions.get(id);
  ok(
    !granted.permissions.includes("cookies"),
    "blocked optional permission was revoked"
  );
  ok(
    granted.permissions.includes("notifications"),
    "non-blocked optional permission was preserved"
  );

  let addon = await AddonManager.getAddonByID(id);
  equal(
    addon.appDisabled,
    false,
    "Addon stays enabled when only an optional perm was blocked"
  );
  await addon.uninstall();
});

// allowed_permissions tests -----------------------------------------------
//
// One consistent model on both the install path (mayInstallAddon, required
// permissions) and the optional-permission path (permissions.request and the
// about:addons toggle UI): a per-id entry replaces "*" entirely (it does not
// inherit "*"'s blocked_permissions), and a per-id allowed_permissions
// un-blocks its own blocked_permissions. "*"-level allowed_permissions is
// inert.

add_task(async function test_star_allowed_permissions_is_inert() {
  let id = "starallowedinert@tests.mozilla.org";
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        "*": {
          blocked_permissions: ["history"],
          allowed_permissions: ["history"],
        },
      },
    },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      browser_specific_settings: { gecko: { id } },
      name: "Star allowed inert",
      version: "1.0",
      permissions: ["history"],
    },
  });
  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    true,
    "*-level allowed_permissions is inert; blocked required permission disables"
  );
  await install.addon.uninstall();
});

add_task(async function test_per_id_allowed_unblocks_required_permission() {
  let id = "peridallowedinstall@tests.mozilla.org";
  await setupPolicyEngineWithJson({
    policies: {
      ExtensionSettings: {
        [id]: {
          blocked_permissions: ["history"],
          allowed_permissions: ["history"],
        },
      },
    },
  });

  let xpi = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      browser_specific_settings: { gecko: { id } },
      name: "Per-id allowed install",
      version: "1.0",
      permissions: ["history"],
    },
  });
  let install = await AddonManager.getInstallForFile(xpi);
  await install.install();
  equal(
    install.addon.appDisabled,
    false,
    "Per-id allowed_permissions un-blocks its own blocked required permission"
  );
  await install.addon.uninstall();
});

add_task(
  {
    pref_set: [
      ["extensions.webextOptionalPermissionPrompts", false],
      [
        "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer",
        true,
      ],
    ],
  },
  async function test_per_id_allowed_carveout_for_request() {
    let id = "peridallowedreq@tests.mozilla.org";
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          [id]: {
            blocked_permissions: ["cookies", "tabs"],
            allowed_permissions: ["cookies"],
          },
        },
      },
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: { gecko: { id } },
        optional_permissions: ["cookies", "tabs"],
      },
      useAddonManager: "temporary",
      async background() {
        let allowedResult;
        browser.test.withHandlingUserInput(() => {
          allowedResult = browser.permissions.request({
            permissions: ["cookies"],
          });
        });
        browser.test.assertTrue(
          await allowedResult,
          "allowed_permissions un-blocks the listed permission"
        );

        let blockedResult;
        browser.test.withHandlingUserInput(() => {
          blockedResult = browser.permissions.request({
            permissions: ["tabs"],
          });
        });
        await browser.test.assertRejects(
          blockedResult,
          /Permissions are blocked by enterprise policy/,
          "blocked-but-not-allowed permission stays blocked"
        );
        browser.test.sendMessage("done");
      },
    });

    await extension.startup();
    await extension.awaitMessage("done");
    await extension.unload();
  }
);

add_task(
  {
    pref_set: [
      ["extensions.webextOptionalPermissionPrompts", false],
      [
        "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer",
        true,
      ],
    ],
  },
  async function test_per_id_allowed_does_not_inherit_global() {
    let id = "peridnoinherit@tests.mozilla.org";
    await setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "*": { blocked_permissions: ["cookies"] },
          [id]: { allowed_permissions: ["tabs"] },
        },
      },
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: { gecko: { id } },
        optional_permissions: ["cookies"],
      },
      useAddonManager: "temporary",
      async background() {
        let result;
        browser.test.withHandlingUserInput(() => {
          result = browser.permissions.request({ permissions: ["cookies"] });
        });
        browser.test.assertTrue(
          await result,
          "per-id entry replaces *: the *-blocked permission is not inherited"
        );
        browser.test.sendMessage("done");
      },
    });

    await extension.startup();
    await extension.awaitMessage("done");
    await extension.unload();
  }
);

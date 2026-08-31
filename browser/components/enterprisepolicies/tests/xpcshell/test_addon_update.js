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
ExtensionTestUtils.init(this);

const server = AddonTestUtils.createHttpServer({ hosts: ["example.com"] });
const BASE_URL = `http://example.com/data`;

let TEST_NAME = "updatable.xpi";

/* Test that when a local file addon is updated,
   the new version gets installed. */
add_task(async function test_local_addon_update() {
  await AddonTestUtils.promiseStartupManager();

  let tmpDir = Services.dirsvc.get("TmpD", Ci.nsIFile);
  let id = "updatable1@test";
  let xpi1 = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: "1.0",
      browser_specific_settings: {
        gecko: { id },
      },
    },
  });
  xpi1.copyTo(tmpDir, TEST_NAME);
  let extension = ExtensionTestUtils.expectExtension(id);
  await Promise.all([
    extension.awaitStartup(),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "updatable1@test": {
            installation_mode: "force_installed",
            install_url: Services.io.newFileURI(tmpDir).spec + "/" + TEST_NAME,
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Addon should not be null");
  equal(addon.version, "1.0", "Addon 1.0 installed");

  let xpi2 = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: "2.0",
      browser_specific_settings: {
        gecko: { id },
      },
    },
  });
  // overwrite the test file
  xpi2.copyTo(tmpDir, TEST_NAME);

  extension = ExtensionTestUtils.expectExtension(id);
  await Promise.all([
    extension.awaitStartup(),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "updatable1@test": {
            installation_mode: "force_installed",
            install_url: Services.io.newFileURI(tmpDir).spec + "/" + TEST_NAME,
          },
        },
      },
    }),
  ]);

  addon = await AddonManager.getAddonByID(id);
  equal(addon.version, "2.0", "Addon 2.0 installed");

  await addon.uninstall();

  let xpifile = tmpDir.clone();
  xpifile.append(TEST_NAME);
  xpifile.remove(false);
});

/* Test that when the url changes,
   the new version gets installed. */
add_task(async function test_newurl_addon_update() {
  let id = "updatable2@test";

  let xpi1 = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: "1.0",
      browser_specific_settings: {
        gecko: { id },
      },
    },
  });
  server.registerFile("/data/policy_test1.xpi", xpi1);

  let xpi2 = AddonTestUtils.createTempWebExtensionFile({
    manifest: {
      version: "2.0",
      browser_specific_settings: {
        gecko: { id },
      },
    },
  });
  server.registerFile("/data/policy_test2.xpi", xpi2);

  let extension = ExtensionTestUtils.expectExtension(id);
  await Promise.all([
    extension.awaitStartup(),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "updatable2@test": {
            installation_mode: "force_installed",
            install_url: `${BASE_URL}/policy_test1.xpi`,
          },
        },
      },
    }),
  ]);
  let addon = await AddonManager.getAddonByID(id);
  notEqual(addon, null, "Addon should not be null");
  equal(addon.version, "1.0", "Addon 1.0 installed");

  extension = ExtensionTestUtils.expectExtension(id);
  await Promise.all([
    extension.awaitStartup(),
    setupPolicyEngineWithJson({
      policies: {
        ExtensionSettings: {
          "updatable2@test": {
            installation_mode: "force_installed",
            install_url: `${BASE_URL}/policy_test2.xpi`,
          },
        },
      },
    }),
  ]);

  addon = await AddonManager.getAddonByID(id);
  equal(addon.version, "2.0", "Addon 2.0 installed");

  await addon.uninstall();
  await AddonTestUtils.promiseShutdownManager();
});

add_task(
  {
    // Allow insecure (http) update URLs in this test.
    pref_set: [
      ["extensions.checkUpdateSecurity", false],
      ["extensions.install.requireSecureOrigin", false],
    ],
  },
  async function test_addon_install_url_after_update_installed() {
    let id = "updatable2@test";

    const updates = [];
    const updateToV2 = {
      version: "2.0",
      update_link: `${BASE_URL}/policy_test2.xpi`,
    };
    const policyData = {
      policies: {
        ExtensionSettings: {
          "updatable2@test": {
            installation_mode: "force_installed",
            install_url: `${BASE_URL}/policy_test1.xpi`,
          },
        },
      },
    };

    server.registerPathHandler(
      "/data/policy_update.json",
      (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.write(
          JSON.stringify({
            addons: {
              [id]: { updates },
            },
          })
        );
      }
    );

    const testExtManifest = {
      version: "1.0",
      browser_specific_settings: {
        gecko: {
          id,
          update_url: `${BASE_URL}/policy_update.json`,
        },
      },
    };

    let xpi1 = AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        ...testExtManifest,
      },
    });
    server.registerFile("/data/policy_test1.xpi", xpi1);

    let xpi2 = AddonTestUtils.createTempWebExtensionFile({
      manifest: {
        ...testExtManifest,
        version: "2.0",
      },
    });
    server.registerFile("/data/policy_test2.xpi", xpi2);

    let extension = ExtensionTestUtils.expectExtension(id);

    await AddonTestUtils.promiseStartupManager();

    await Promise.all([
      extension.awaitStartup(),
      setupPolicyEngineWithJson(policyData),
    ]);

    let addon = await AddonManager.getAddonByID(id);
    Assert.equal(
      addon.version,
      "1.0",
      "Expect test extension v1.0 to be force installed"
    );

    // Add the update to V2 to the updates json data.
    updates.push(updateToV2);

    let addonUpdate = await AddonTestUtils.promiseFindAddonUpdates(addon);

    Assert.ok(
      addonUpdate.updateAvailable,
      "Expect an addon update to be found"
    );

    await AddonTestUtils.promiseCompleteAllInstalls([
      addonUpdate.updateAvailable,
    ]);

    addon = await AddonManager.getAddonByID(id);
    Assert.equal(addon.version, "2.0", "Expect test extension updated to v2.0");

    info("Mock browser restart with the same enterprise policy set");
    await AddonTestUtils.promiseShutdownManager();
    extension = ExtensionTestUtils.expectExtension(id);

    const promiseInstallEndedOrCancelled = Promise.race([
      AddonTestUtils.promiseInstallEvent("onInstallEnded"),
      AddonTestUtils.promiseInstallEvent("onDownloadCancelled"),
    ]);

    await Promise.all([
      setupPolicyEngineWithJson(policyData),
      extension.awaitStartup(),
      AddonTestUtils.promiseStartupManager(),
    ]);

    const allInstalls = await AddonManager.getAllInstalls();
    if (allInstalls.length) {
      info("Found pending addon install, wait until is completed or cancelled");
      await promiseInstallEndedOrCancelled;
    }

    addon = await AddonManager.getAddonByID(id);
    Assert.equal(
      addon.version,
      "2.0",
      "Expect test extension should not be downgraded to v1.0"
    );

    await addon.uninstall();
    await AddonTestUtils.promiseShutdownManager();
  }
);

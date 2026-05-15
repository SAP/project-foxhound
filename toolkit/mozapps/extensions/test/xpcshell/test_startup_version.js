/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ADDON_ID = "@test-addon-version";

function getExtensionVersion(addonId) {
  const policy = WebExtensionPolicy.getByID(addonId);
  return policy?.version;
}

add_task(async function setup() {
  await ExtensionTestUtils.startAddonManager();
});

add_task(async function version_at_install() {
  let addon = await promiseInstallWebExtension({
    manifest: {
      version: "2.3.4",
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
  });
  equal(addon.version, "2.3.4", "Add-on has correct version");
  equal(
    getExtensionVersion(ADDON_ID),
    "2.3.4",
    "WebExtensionPolicy has correct version"
  );
});

add_task(async function version_at_restart() {
  await promiseRestartManager();
  let addon = await AddonManager.getAddonByID(ADDON_ID);
  equal(addon.version, "2.3.4", "Add-on has correct version after restart");
  equal(
    getExtensionVersion(ADDON_ID),
    "2.3.4",
    "WebExtensionPolicy has correct version after restart"
  );
});

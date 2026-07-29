/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

const ADDON_ID = "newtab-disable@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_disable_extension_reverts_dropdown() {
  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "Test New Tab Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      chrome_url_overrides: { newtab: "/newtab.html" },
    },
    files: { "newtab.html": "<h1>Custom New Tab</h1>" },
  });

  await extension.startup();

  let { win, tab } = await openHomePreferences();

  let control = await settingControlRenders("homepageNewTabs", win);
  let select = control.controlEl;
  let nativeSelect = select.inputEl;

  info("Waiting for dropdown to show extension");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value === ADDON_ID
  );

  let addon = await AddonManager.getAddonByID(ADDON_ID);
  await addon.disable();

  info("Waiting for dropdown to revert from disabled extension");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value !== ADDON_ID
  );

  is(nativeSelect.value, "home", "Dropdown reverted to Firefox Home");

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

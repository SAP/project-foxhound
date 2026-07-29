/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionSettingsStore:
    "resource://gre/modules/ExtensionSettingsStore.sys.mjs",
});

const ADDON_ID = "newtab-restore@tests.mozilla.org";
const URL_OVERRIDES_TYPE = "url_overrides";
const NEW_TAB_KEY = "newTabURL";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_restore_defaults_deselects_extension() {
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

  let tabsControl = await settingControlRenders("homepageNewTabs", win);
  let tabsSelect = tabsControl.controlEl;
  let tabsNativeSelect = tabsSelect.inputEl;

  info("Waiting for new tabs dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    tabsSelect,
    { attributes: true, childList: true, subtree: true },
    () => tabsNativeSelect.value === ADDON_ID
  );

  let restoreControl = await settingControlRenders(
    "homepageRestoreDefaults",
    win
  );
  synthesizeClick(restoreControl.controlEl);

  // Switching the dropdown from an extension back to Firefox Home doesn't
  // fire a DOM change we can watch for, so poll here.
  await BrowserTestUtils.waitForCondition(
    () => tabsNativeSelect.value === "home",
    "New tabs dropdown reset to Firefox Home"
  );

  let setting = ExtensionSettingsStore.getSetting(
    URL_OVERRIDES_TYPE,
    NEW_TAB_KEY
  );
  ok(!setting || !setting.id, "Extension is deselected after restore defaults");

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

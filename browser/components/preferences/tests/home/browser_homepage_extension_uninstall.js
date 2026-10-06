/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
  ExtensionSettingsStore:
    "resource://gre/modules/ExtensionSettingsStore.sys.mjs",
});

const ADDON_ID = "newtab-uninstall@tests.mozilla.org";
const URL_OVERRIDES_TYPE = "url_overrides";
const NEW_TAB_KEY = "newTabURL";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_uninstall_extension_reverts_dropdown() {
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

  info("Waiting for dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value === ADDON_ID
  );

  await extension.unload();

  info("Waiting for dropdown to revert after uninstall");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value !== ADDON_ID
  );

  is(nativeSelect.value, "home", "Dropdown reverted to Firefox Home");

  let setting = ExtensionSettingsStore.getSetting(
    URL_OVERRIDES_TYPE,
    NEW_TAB_KEY
  );
  ok(!setting || !setting.id, "Setting removed from store after uninstall");

  is(
    AboutNewTab.newTabURL,
    "about:newtab",
    "AboutNewTab.newTabURL reverted to default"
  );

  BrowserTestUtils.removeTab(tab);
});

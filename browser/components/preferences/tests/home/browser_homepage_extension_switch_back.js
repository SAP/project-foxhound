/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
  ExtensionSettingsStore:
    "resource://gre/modules/ExtensionSettingsStore.sys.mjs",
});

const ADDON_ID = "newtab-switchback@tests.mozilla.org";
const URL_OVERRIDES_TYPE = "url_overrides";
const NEW_TAB_KEY = "newTabURL";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_switch_from_extension_to_firefox_home() {
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

  await changeMozSelectValue(select, "home");

  is(nativeSelect.value, "home", "Dropdown switched back to Firefox Home");
  is(
    Services.prefs.getBoolPref("browser.newtabpage.enabled"),
    true,
    "Pref is true after switching to Firefox Home"
  );

  let setting = ExtensionSettingsStore.getSetting(
    URL_OVERRIDES_TYPE,
    NEW_TAB_KEY
  );
  ok(
    !setting || !setting.id,
    "Extension is deselected in ExtensionSettingsStore"
  );

  is(
    AboutNewTab.newTabURL,
    "about:newtab",
    "AboutNewTab.newTabURL reverted to default"
  );

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

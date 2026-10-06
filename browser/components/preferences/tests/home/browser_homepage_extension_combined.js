/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
});

const ADDON_ID = "combined-override@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["browser.startup.homepage", "about:home"],
    ],
  });
});

add_task(async function test_combined_homepage_and_newtab_extension() {
  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "Combined Override Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      chrome_settings_overrides: { homepage: "https://example.com" },
      chrome_url_overrides: { newtab: "/newtab.html" },
    },
    files: { "newtab.html": "<h1>Custom New Tab</h1>" },
  });

  await extension.startup();

  let { win, tab } = await openHomePreferences();

  let windowsControl = await settingControlRenders("homepageNewWindows", win);
  let windowsSelect = windowsControl.controlEl;

  info("Waiting for New Windows dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    windowsSelect,
    { attributes: true, childList: true, subtree: true },
    () => windowsSelect.inputEl.value === ADDON_ID
  );

  let tabsControl = await settingControlRenders("homepageNewTabs", win);
  let tabsSelect = tabsControl.controlEl;

  info("Waiting for New Tabs dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    tabsSelect,
    { attributes: true, childList: true, subtree: true },
    () => tabsSelect.inputEl.value === ADDON_ID
  );

  // The homepage pref may have already been updated by the time we get here
  // (extension started before openHomePreferences). Check before waiting.
  if (
    !Services.prefs
      .getStringPref("browser.startup.homepage", "")
      .includes("example.com")
  ) {
    await TestUtils.waitForPrefChange("browser.startup.homepage", v =>
      v.includes("example.com")
    );
  }

  is(
    AboutNewTab.newTabURL,
    `moz-extension://${extension.uuid}/newtab.html`,
    "AboutNewTab.newTabURL points to the extension"
  );

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

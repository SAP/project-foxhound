/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
});

const ADDON_ID = "newtab-extension@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_extension_shows_in_newtab_dropdown() {
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

  info("Waiting for new tabs dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value === ADDON_ID
  );

  let extensionOption = select.querySelector(
    `moz-option[value="${CSS.escape(ADDON_ID)}"]`
  );
  ok(extensionOption, "Extension option exists in the dropdown");

  ok(
    AboutNewTab.newTabURL.startsWith("moz-extension://"),
    "AboutNewTab.newTabURL points to the extension"
  );

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

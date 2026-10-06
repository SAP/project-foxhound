/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
});

const ADDON_ID_1 = "newtab-multi-1@tests.mozilla.org";
const ADDON_ID_2 = "newtab-multi-2@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_multiple_extensions_in_dropdown() {
  let extension1 = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "First New Tab Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID_1 } },
      chrome_url_overrides: { newtab: "/newtab1.html" },
    },
    files: { "newtab1.html": "<h1>First</h1>" },
  });

  let extension2 = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "Second New Tab Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID_2 } },
      chrome_url_overrides: { newtab: "/newtab2.html" },
    },
    files: { "newtab2.html": "<h1>Second</h1>" },
  });

  await extension1.startup();
  await extension2.startup();

  let { win, tab } = await openHomePreferences();

  let control = await settingControlRenders("homepageNewTabs", win);
  let select = control.controlEl;
  let nativeSelect = select.inputEl;

  info("Waiting for latest extension to be selected in dropdown");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value === ADDON_ID_2
  );

  let option1 = select.querySelector(
    `moz-option[value="${CSS.escape(ADDON_ID_1)}"]`
  );
  let option2 = select.querySelector(
    `moz-option[value="${CSS.escape(ADDON_ID_2)}"]`
  );
  ok(option1, "First extension is available in dropdown");
  ok(option2, "Second extension is available in dropdown");

  // Register the observer before the dropdown change so we don't miss the
  // notification if it fires synchronously.
  let urlChanged = TestUtils.topicObserved("newtab-url-changed");
  await changeMozSelectValue(select, ADDON_ID_1);
  is(nativeSelect.value, ADDON_ID_1, "Dropdown switched to first extension");

  await urlChanged;
  is(
    AboutNewTab.newTabURL,
    `moz-extension://${extension1.uuid}/newtab1.html`,
    "AboutNewTab.newTabURL points to the first extension"
  );

  await extension2.unload();
  await extension1.unload();
  BrowserTestUtils.removeTab(tab);
});

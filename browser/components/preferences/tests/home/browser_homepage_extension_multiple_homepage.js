/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ADDON_ID_1 = "homepage-multi-1@tests.mozilla.org";
const ADDON_ID_2 = "homepage-multi-2@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["browser.startup.homepage", "about:home"],
    ],
  });
});

add_task(async function test_multiple_homepage_extensions_in_dropdown() {
  let extension1 = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "First Homepage Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID_1 } },
      chrome_settings_overrides: { homepage: "https://example.com/first" },
    },
  });

  let extension2 = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "Second Homepage Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID_2 } },
      chrome_settings_overrides: { homepage: "https://example.com/second" },
    },
  });

  await extension1.startup();
  await extension2.startup();

  let { win, tab } = await openHomePreferences();

  let control = await settingControlRenders("homepageNewWindows", win);
  let select = control.controlEl;
  let nativeSelect = select.inputEl;

  info("Waiting for latest homepage extension to be selected in dropdown");
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
  ok(option1, "First homepage extension is available in dropdown");
  ok(option2, "Second homepage extension is available in dropdown");

  let prefChangedToFirst = TestUtils.waitForPrefChange(
    "browser.startup.homepage",
    v => v.includes("example.com/first")
  );
  await changeMozSelectValue(select, ADDON_ID_1);
  is(
    nativeSelect.value,
    ADDON_ID_1,
    "Dropdown switched to first homepage extension"
  );
  await prefChangedToFirst;

  await extension2.unload();
  await extension1.unload();
  BrowserTestUtils.removeTab(tab);
});

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ADDON_ID = "homepage-extension@tests.mozilla.org";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["browser.startup.homepage", "about:home"],
    ],
  });
});

add_task(async function test_extension_shows_in_windows_dropdown() {
  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      name: "Test Homepage Extension",
      browser_specific_settings: { gecko: { id: ADDON_ID } },
      chrome_settings_overrides: { homepage: "https://example.com" },
    },
  });

  await extension.startup();

  let { win, tab } = await openHomePreferences();

  let control = await settingControlRenders("homepageNewWindows", win);
  let select = control.controlEl;
  let nativeSelect = select.inputEl;

  info("Waiting for new windows dropdown to show the extension");
  await BrowserTestUtils.waitForMutationCondition(
    select,
    { attributes: true, childList: true, subtree: true },
    () => nativeSelect.value === ADDON_ID
  );

  let extensionOption = select.querySelector(
    `moz-option[value="${CSS.escape(ADDON_ID)}"]`
  );
  ok(extensionOption, "Extension option exists in the dropdown");

  // The pref may already have been written by the time we get here, so
  // check before waiting.
  if (
    !Services.prefs
      .getStringPref("browser.startup.homepage", "")
      .includes("example.com")
  ) {
    await TestUtils.waitForPrefChange("browser.startup.homepage", v =>
      v.includes("example.com")
    );
  }

  await extension.unload();
  BrowserTestUtils.removeTab(tab);
});

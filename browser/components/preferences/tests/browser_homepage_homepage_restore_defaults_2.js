/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const NEWTAB_ENABLED_PREF = "browser.newtabpage.enabled";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(
  async function test_restore_defaults_button_enabled_when_newtab_changed() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL],
        [NEWTAB_ENABLED_PREF, false],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let restoreDefaultsControl = await settingControlRenders(
      "homepageRestoreDefaults",
      win
    );
    let button = restoreDefaultsControl.controlEl;

    ok(
      !button.disabled,
      "Restore defaults button is enabled when new tab setting is changed"
    );

    await BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_restore_defaults_button_resets_both_settings() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [HOMEPAGE_PREF, "https://example.com"],
      [NEWTAB_ENABLED_PREF, false],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let restoreDefaultsControl = await settingControlRenders(
    "homepageRestoreDefaults",
    win
  );
  let button = restoreDefaultsControl.controlEl;

  ok(!button.disabled, "Restore defaults button is initially enabled");

  button.click();

  await TestUtils.waitForCondition(
    () =>
      Services.prefs.getStringPref(HOMEPAGE_PREF) === DEFAULT_HOMEPAGE_URL &&
      Services.prefs.getBoolPref(NEWTAB_ENABLED_PREF) === true,
    "Wait for prefs to be reset to defaults"
  );

  is(
    Services.prefs.getStringPref(HOMEPAGE_PREF),
    DEFAULT_HOMEPAGE_URL,
    "Homepage pref reset to default"
  );
  is(
    Services.prefs.getBoolPref(NEWTAB_ENABLED_PREF),
    true,
    "New tab pref reset to default"
  );

  await TestUtils.waitForCondition(
    () => button.disabled,
    "Wait for button to become disabled"
  );

  ok(
    button.disabled,
    "Restore defaults button is disabled after resetting to defaults"
  );

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  let select = homepageNewWindowsControl.controlEl;
  let nativeSelect = select.inputEl;

  is(
    nativeSelect.value,
    "home",
    "Homepage dropdown reset to 'home' after restore"
  );

  let homepageNewTabsControl = await settingControlRenders(
    "homepageNewTabs",
    win
  );
  let newTabsSelect = homepageNewTabsControl.controlEl;
  let newTabsNativeSelect = newTabsSelect.inputEl;

  is(
    newTabsNativeSelect.value,
    "true",
    "New tabs dropdown reset to 'true' after restore"
  );

  await BrowserTestUtils.removeTab(tab);
});

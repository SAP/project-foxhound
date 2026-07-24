/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const NEWTAB_ENABLED_PREF = "browser.newtabpage.enabled";
const DEFAULT_HOMEPAGE_URL = "about:home";
const BLANK_HOMEPAGE_URL = "chrome://browser/content/blanktab.html";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(async function test_homepage_section_visible() {
  let { win, doc, tab } = await openHomePreferences();

  let homepageGroup = doc.querySelector('setting-group[groupid="homepage"]');
  ok(homepageGroup, "Homepage setting group exists");
  ok(BrowserTestUtils.isVisible(homepageGroup), "Homepage section is visible");

  let fieldset = homepageGroup.querySelector("moz-fieldset");
  ok(fieldset, "Homepage moz-fieldset exists");

  await fieldset.updateComplete;

  let icon = fieldset.shadowRoot.querySelector(
    'img[src*="window-firefox.svg"]'
  );
  ok(icon, "Homepage icon is present in shadow DOM");

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  ok(homepageNewWindowsControl, "Homepage new windows control exists");

  let select = homepageNewWindowsControl.controlEl;
  ok(select, "Homepage new windows select exists");
  is(select.localName, "moz-select", "Control is a moz-select");

  let homepageNewTabsControl = await settingControlRenders(
    "homepageNewTabs",
    win
  );
  ok(homepageNewTabsControl, "Homepage new tabs control exists");

  let newTabsSelect = homepageNewTabsControl.controlEl;
  ok(newTabsSelect, "Homepage new tabs select exists");
  is(newTabsSelect.localName, "moz-select", "Control is a moz-select");

  let restoreDefaultsControl = await settingControlRenders(
    "homepageRestoreDefaults",
    win
  );
  ok(restoreDefaultsControl, "Restore defaults control exists");

  let button = restoreDefaultsControl.controlEl;
  ok(button, "Restore defaults button exists");
  is(button.localName, "moz-button", "Control is a moz-button");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_homepage_new_windows_dropdown() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL]],
  });

  let { win, tab } = await openHomePreferences();

  let homepageNewWindowsControl = await settingControlRenders(
    "homepageNewWindows",
    win
  );
  let select = homepageNewWindowsControl.controlEl;
  let nativeSelect = select.inputEl;

  is(nativeSelect.value, "home", "Dropdown value is 'home' for default URL");

  await changeMozSelectValue(select, "custom");
  is(
    nativeSelect.value,
    "custom",
    "Dropdown value is 'custom' when custom selected"
  );

  await changeMozSelectValue(select, "home");
  is(
    Services.prefs.getStringPref(HOMEPAGE_PREF),
    DEFAULT_HOMEPAGE_URL,
    "Pref updated back to default URL"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_homepage_new_tabs_dropdown() {
  await SpecialPowers.pushPrefEnv({
    set: [[NEWTAB_ENABLED_PREF, true]],
  });

  let { win, tab } = await openHomePreferences();

  let homepageNewTabsControl = await settingControlRenders(
    "homepageNewTabs",
    win
  );
  let select = homepageNewTabsControl.controlEl;
  let nativeSelect = select.inputEl;

  is(nativeSelect.value, "true", "Dropdown value is 'true' when pref is true");

  await changeMozSelectValue(select, "false");
  is(
    Services.prefs.getBoolPref(NEWTAB_ENABLED_PREF),
    false,
    "Pref updated to false"
  );

  await changeMozSelectValue(select, "true");
  is(
    Services.prefs.getBoolPref(NEWTAB_ENABLED_PREF),
    true,
    "Pref updated back to true"
  );

  await BrowserTestUtils.removeTab(tab);
});

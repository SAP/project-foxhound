/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const PREF_NEW_TAB_ON_RESTORE = "browser.sessionstore.newTabOnRestore";
const PREF_SHOW_SETTING = "browser.sessionstore.newTabOnRestore.showSetting";
const PREF_STARTUP_PAGE = "browser.startup.page";

afterEach(async function () {
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_checkbox_hidden_when_showSetting_false() {
  await SpecialPowers.pushPrefEnv({
    set: [[PREF_SHOW_SETTING, false]],
  });

  let tab = await openPrefsTab("general");
  let doc = tab.linkedBrowser.contentDocument;
  let settingControl = doc.querySelector(
    "#setting-control-sessionRestoreNewTab"
  );

  Assert.ok(
    !settingControl || settingControl.hidden,
    "Checkbox hidden when showSetting is false"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_checkbox_visible_when_showSetting_true() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SHOW_SETTING, true],
      [PREF_STARTUP_PAGE, 3],
    ],
  });

  let tab = await openPrefsTab("general");
  let doc = tab.linkedBrowser.contentDocument;
  let settingControl = doc.querySelector(
    "#setting-control-sessionRestoreNewTab"
  );

  Assert.ok(
    settingControl,
    "Setting control rendered when showSetting is true"
  );
  Assert.ok(
    !settingControl.hidden,
    "Setting control visible when showSetting is true"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_checkbox_disabled_when_startup_page_not_restore() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SHOW_SETTING, true],
      [PREF_STARTUP_PAGE, 1],
    ],
  });

  let tab = await openPrefsTab("general");
  let doc = tab.linkedBrowser.contentDocument;
  let checkbox = doc.querySelector("#sessionRestoreNewTab");

  Assert.ok(checkbox, "Checkbox rendered when showSetting is true");
  Assert.ok(checkbox.disabled, "Checkbox disabled when startup page is not 3");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_checkbox_toggles_pref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [PREF_SHOW_SETTING, true],
      [PREF_NEW_TAB_ON_RESTORE, false],
      [PREF_STARTUP_PAGE, 3],
    ],
  });

  let tab = await openPrefsTab("general");
  let doc = tab.linkedBrowser.contentDocument;
  let checkbox = doc.querySelector("#sessionRestoreNewTab");
  Assert.ok(checkbox, "Checkbox exists");
  Assert.ok(!checkbox.disabled, "Checkbox enabled when startup page is 3");

  let prefChanged = TestUtils.waitForPrefChange(PREF_NEW_TAB_ON_RESTORE);
  checkbox.click();
  await prefChanged;
  Assert.ok(
    Services.prefs.getBoolPref(PREF_NEW_TAB_ON_RESTORE),
    "Pref toggled to true"
  );

  prefChanged = TestUtils.waitForPrefChange(PREF_NEW_TAB_ON_RESTORE);
  checkbox.click();
  await prefChanged;
  Assert.ok(
    !Services.prefs.getBoolPref(PREF_NEW_TAB_ON_RESTORE),
    "Pref toggled back to false"
  );

  BrowserTestUtils.removeTab(tab);
});

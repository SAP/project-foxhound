/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const WIDGETS_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.widgets.system.enabled";
const WIDGETS_PREF = "browser.newtabpage.activity-stream.widgets.enabled";
const LISTS_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.widgets.system.lists.enabled";
const LISTS_PREF = "browser.newtabpage.activity-stream.widgets.lists.enabled";
const TIMER_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.widgets.system.focusTimer.enabled";
const TIMER_PREF =
  "browser.newtabpage.activity-stream.widgets.focusTimer.enabled";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      // Opening preferences initializes FxA code which sets this pref.
      // Track it to avoid test warnings.
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(async function test_widgets_parent_toggle_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [[WIDGETS_SYSTEM_PREF, false]],
  });

  let { win, tab } = await openHomePreferences();

  let widgetsWrapper = getSettingControl("widgets", win);
  ok(
    !widgetsWrapper || BrowserTestUtils.isHidden(widgetsWrapper),
    "Widgets control is hidden when system pref is false"
  );

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [
      [WIDGETS_SYSTEM_PREF, true],
      [WIDGETS_PREF, true],
    ],
  });

  ({ win, tab } = await openHomePreferences());

  widgetsWrapper = await settingControlRenders("widgets", win);
  ok(widgetsWrapper, "Widgets control exists when system pref is true");
  ok(
    BrowserTestUtils.isVisible(widgetsWrapper),
    "Widgets control is visible when system pref is true"
  );

  let widgetsControl = await settingControlRenders("widgets", win);
  let toggle = widgetsControl.querySelector("moz-toggle");
  ok(toggle, "Widgets toggle exists");
  ok(toggle.pressed, "Widgets toggle is checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_widgets_lists_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [WIDGETS_SYSTEM_PREF, true],
      [WIDGETS_PREF, true],
      [LISTS_SYSTEM_PREF, false],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let listsWrapper = getSettingControl("lists", win);
  ok(
    !listsWrapper || BrowserTestUtils.isHidden(listsWrapper),
    "Lists control is hidden when system pref is false"
  );

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [
      [LISTS_SYSTEM_PREF, true],
      [LISTS_PREF, true],
    ],
  });

  ({ win, tab } = await openHomePreferences());

  listsWrapper = await settingControlRenders("lists", win);
  ok(listsWrapper, "Lists control exists when system pref is true");
  ok(
    BrowserTestUtils.isVisible(listsWrapper),
    "Lists control is visible when system pref is true"
  );

  let listsControl = await settingControlRenders("lists", win);

  let checkbox = listsControl.controlEl;
  ok(checkbox, "Lists checkbox control exists");
  ok(checkbox.checked, "Lists checkbox is initially checked");

  let prefChanged = waitForPrefChange(LISTS_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(!Services.prefs.getBoolPref(LISTS_PREF), "Lists pref is now false");
  ok(!checkbox.checked, "Lists checkbox is now unchecked");

  prefChanged = waitForPrefChange(LISTS_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(Services.prefs.getBoolPref(LISTS_PREF), "Lists pref is now true");
  ok(checkbox.checked, "Lists checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_widgets_timer_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [WIDGETS_SYSTEM_PREF, true],
      [WIDGETS_PREF, true],
      [TIMER_SYSTEM_PREF, false],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let timerWrapper = getSettingControl("timer", win);
  ok(
    !timerWrapper || BrowserTestUtils.isHidden(timerWrapper),
    "Timer control is hidden when system pref is false"
  );

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [
      [TIMER_SYSTEM_PREF, true],
      [TIMER_PREF, true],
    ],
  });

  ({ win, tab } = await openHomePreferences());

  timerWrapper = await settingControlRenders("timer", win);
  ok(timerWrapper, "Timer control exists when system pref is true");
  ok(
    BrowserTestUtils.isVisible(timerWrapper),
    "Timer control is visible when system pref is true"
  );

  let timerControl = await settingControlRenders("timer", win);

  let checkbox = timerControl.controlEl;
  ok(checkbox, "Timer checkbox control exists");
  ok(checkbox.checked, "Timer checkbox is initially checked");

  let prefChanged = waitForPrefChange(TIMER_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(!Services.prefs.getBoolPref(TIMER_PREF), "Timer pref is now false");
  ok(!checkbox.checked, "Timer checkbox is now unchecked");

  prefChanged = waitForPrefChange(TIMER_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(Services.prefs.getBoolPref(TIMER_PREF), "Timer pref is now true");
  ok(checkbox.checked, "Timer checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

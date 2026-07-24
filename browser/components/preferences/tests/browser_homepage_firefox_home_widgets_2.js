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

add_task(async function test_widgets_children_disabled_when_parent_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [WIDGETS_SYSTEM_PREF, true],
      [WIDGETS_PREF, false],
      [LISTS_SYSTEM_PREF, true],
      [TIMER_SYSTEM_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let widgetsControl = await settingControlRenders("widgets", win);

  let toggle = widgetsControl.controlEl;
  await toggle.updateComplete;

  ok(!toggle.pressed, "Widgets toggle is unchecked");

  // Child controls (lists and timer) should remain visible but be disabled
  let listsWrapper = await settingControlRenders("lists", win);
  let timerWrapper = await settingControlRenders("timer", win);

  ok(listsWrapper, "Lists control exists");
  ok(timerWrapper, "Timer control exists");

  let listsCheckbox = listsWrapper.controlEl;
  let timerCheckbox = timerWrapper.controlEl;

  ok(
    listsCheckbox.disabled || listsCheckbox.parentDisabled,
    "Lists control is disabled when widgets parent is disabled"
  );
  ok(
    timerCheckbox.disabled || timerCheckbox.parentDisabled,
    "Timer control is disabled when widgets parent is disabled"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_widgets_children_enabled_when_parent_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [WIDGETS_SYSTEM_PREF, true],
      [WIDGETS_PREF, true],
      [LISTS_SYSTEM_PREF, true],
      [LISTS_PREF, true],
      [TIMER_SYSTEM_PREF, true],
      [TIMER_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let widgetsControl = await settingControlRenders("widgets", win);

  let toggle = widgetsControl.controlEl;
  await toggle.updateComplete;

  ok(toggle.pressed, "Widgets toggle is checked");

  // Child controls (lists and timer) should be enabled
  let listsWrapper = await settingControlRenders("lists", win);
  let timerWrapper = await settingControlRenders("timer", win);

  ok(listsWrapper, "Lists control exists");
  ok(timerWrapper, "Timer control exists");

  let listsCheckbox = listsWrapper.controlEl;
  let timerCheckbox = timerWrapper.controlEl;

  ok(
    !listsCheckbox.disabled && !listsCheckbox.parentDisabled,
    "Lists control is enabled when widgets parent is enabled"
  );
  ok(
    !timerCheckbox.disabled && !timerCheckbox.parentDisabled,
    "Timer control is enabled when widgets parent is enabled"
  );

  BrowserTestUtils.removeTab(tab);
});

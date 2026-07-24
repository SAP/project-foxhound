/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Shortcuts
const SHORTCUTS_PREF = "browser.newtabpage.activity-stream.feeds.topsites";
const SHORTCUTS_ROWS_PREF = "browser.newtabpage.activity-stream.topSitesRows";

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

add_task(async function test_shortcuts_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [[SHORTCUTS_PREF, true]],
  });

  let { win, tab } = await openHomePreferences();

  let shortcutsControl = await settingControlRenders("shortcuts", win);
  ok(shortcutsControl, "Shortcuts control exists");

  let toggle = shortcutsControl.querySelector("moz-toggle");
  ok(toggle, "Shortcuts toggle element exists");
  ok(toggle.pressed, "Shortcuts toggle is initially checked");

  let prefChanged = waitForPrefChange(SHORTCUTS_PREF, false);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, false);

  ok(
    !Services.prefs.getBoolPref(SHORTCUTS_PREF),
    "Shortcuts pref is now false"
  );
  ok(!toggle.pressed, "Shortcuts toggle is now unchecked");

  prefChanged = waitForPrefChange(SHORTCUTS_PREF, true);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, true);

  ok(Services.prefs.getBoolPref(SHORTCUTS_PREF), "Shortcuts pref is now true");
  ok(toggle.pressed, "Shortcuts toggle is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_shortcuts_rows() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SHORTCUTS_PREF, true],
      [SHORTCUTS_ROWS_PREF, 4],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let rowsControl = await settingControlRenders("shortcutsRows", win);
  ok(rowsControl, "Shortcuts rows control exists");
  ok(
    BrowserTestUtils.isVisible(rowsControl),
    "Shortcuts rows control is visible"
  );

  let select = rowsControl.controlEl;
  ok(select, "Shortcuts rows select exists");
  let nativeSelect = select.inputEl;
  ok(nativeSelect, "Shortcuts rows native select exists");

  let optionValues = [...nativeSelect.options].map(option =>
    Number(option.value)
  );
  Assert.deepEqual(
    optionValues,
    [1, 2, 3, 4],
    "Shortcuts rows has options 1-4"
  );

  for (let rows of [1, 2, 3, 4]) {
    let previousRows = Services.prefs.getIntPref(SHORTCUTS_ROWS_PREF);
    isnot(
      previousRows,
      rows,
      `Shortcuts rows pref changes from ${previousRows} to ${rows}`
    );

    await changeMozSelectValue(select, String(rows));

    is(
      Services.prefs.getIntPref(SHORTCUTS_ROWS_PREF),
      rows,
      `Shortcuts rows pref is ${rows}`
    );
  }

  BrowserTestUtils.removeTab(tab);
});

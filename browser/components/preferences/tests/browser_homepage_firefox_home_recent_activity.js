/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Recent Activity
const RECENT_ACTIVITY_PREF =
  "browser.newtabpage.activity-stream.feeds.section.highlights";
const RECENT_ACTIVITY_ROWS_PREF =
  "browser.newtabpage.activity-stream.section.highlights.rows";
const RECENT_ACTIVITY_VISITED_PREF =
  "browser.newtabpage.activity-stream.section.highlights.includeVisited";
const RECENT_ACTIVITY_BOOKMARKS_PREF =
  "browser.newtabpage.activity-stream.section.highlights.includeBookmarks";
const RECENT_ACTIVITY_DOWNLOADS_PREF =
  "browser.newtabpage.activity-stream.section.highlights.includeDownloads";

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

add_task(async function test_recent_activity_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [[RECENT_ACTIVITY_PREF, true]],
  });

  let { win, tab } = await openHomePreferences();

  let recentActivityControl = await settingControlRenders(
    "recentActivity",
    win
  );
  ok(recentActivityControl, "Recent Activity control exists");

  let toggle = recentActivityControl.querySelector("moz-toggle");
  ok(toggle, "Recent Activity toggle element exists");
  ok(toggle.pressed, "Recent Activity toggle is initially checked");

  let prefChanged = waitForPrefChange(RECENT_ACTIVITY_PREF, false);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, false);

  ok(
    !Services.prefs.getBoolPref(RECENT_ACTIVITY_PREF),
    "Recent Activity pref is now false"
  );
  ok(!toggle.pressed, "Recent Activity toggle is now unchecked");

  prefChanged = waitForPrefChange(RECENT_ACTIVITY_PREF, true);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, true);

  ok(
    Services.prefs.getBoolPref(RECENT_ACTIVITY_PREF),
    "Recent Activity pref is now true"
  );
  ok(toggle.pressed, "Recent Activity toggle is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_recent_activity_rows() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [RECENT_ACTIVITY_PREF, true],
      [RECENT_ACTIVITY_ROWS_PREF, 4],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let rowsControl = await settingControlRenders("recentActivityRows", win);
  ok(rowsControl, "Recent Activity rows control exists");
  ok(
    BrowserTestUtils.isVisible(rowsControl),
    "Recent Activity rows control is visible"
  );

  let select = rowsControl.controlEl;
  ok(select, "Recent Activity rows select exists");
  let nativeSelect = select.inputEl;
  ok(nativeSelect, "Recent Activity rows native select exists");

  let optionValues = [...nativeSelect.options].map(option =>
    Number(option.value)
  );
  Assert.deepEqual(
    optionValues,
    [1, 2, 3, 4],
    "Recent Activity rows has options 1-4"
  );

  for (let rows of [1, 2, 3, 4]) {
    let previousRows = Services.prefs.getIntPref(RECENT_ACTIVITY_ROWS_PREF);
    isnot(
      previousRows,
      rows,
      `Recent Activity rows pref changes from ${previousRows} to ${rows}`
    );

    await changeMozSelectValue(select, String(rows));

    is(
      Services.prefs.getIntPref(RECENT_ACTIVITY_ROWS_PREF),
      rows,
      `Recent Activity rows pref is ${rows}`
    );
  }

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_recent_activity_visited_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [RECENT_ACTIVITY_PREF, true],
      [RECENT_ACTIVITY_VISITED_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let visitedControl = await settingControlRenders(
    "recentActivityVisited",
    win
  );
  ok(visitedControl, "Recent Activity visited control exists");

  let checkbox = visitedControl.controlEl;
  ok(checkbox, "Recent Activity visited checkbox element exists");
  ok(checkbox.checked, "Recent Activity visited checkbox is initially checked");

  let prefChanged = waitForPrefChange(RECENT_ACTIVITY_VISITED_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(
    !Services.prefs.getBoolPref(RECENT_ACTIVITY_VISITED_PREF),
    "Recent Activity visited pref is now false"
  );
  ok(!checkbox.checked, "Recent Activity visited checkbox is now unchecked");

  prefChanged = waitForPrefChange(RECENT_ACTIVITY_VISITED_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(
    Services.prefs.getBoolPref(RECENT_ACTIVITY_VISITED_PREF),
    "Recent Activity visited pref is now true"
  );
  ok(checkbox.checked, "Recent Activity visited checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_recent_activity_bookmarks_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [RECENT_ACTIVITY_PREF, true],
      [RECENT_ACTIVITY_BOOKMARKS_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let bookmarksControl = await settingControlRenders(
    "recentActivityBookmarks",
    win
  );
  ok(bookmarksControl, "Recent Activity bookmarks control exists");

  let checkbox = bookmarksControl.controlEl;
  ok(checkbox, "Recent Activity bookmarks checkbox element exists");
  ok(
    checkbox.checked,
    "Recent Activity bookmarks checkbox is initially checked"
  );

  let prefChanged = waitForPrefChange(RECENT_ACTIVITY_BOOKMARKS_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(
    !Services.prefs.getBoolPref(RECENT_ACTIVITY_BOOKMARKS_PREF),
    "Recent Activity bookmarks pref is now false"
  );
  ok(!checkbox.checked, "Recent Activity bookmarks checkbox is now unchecked");

  prefChanged = waitForPrefChange(RECENT_ACTIVITY_BOOKMARKS_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(
    Services.prefs.getBoolPref(RECENT_ACTIVITY_BOOKMARKS_PREF),
    "Recent Activity bookmarks pref is now true"
  );
  ok(checkbox.checked, "Recent Activity bookmarks checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_recent_activity_downloads_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [RECENT_ACTIVITY_PREF, true],
      [RECENT_ACTIVITY_DOWNLOADS_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let downloadsControl = await settingControlRenders(
    "recentActivityDownloads",
    win
  );
  ok(downloadsControl, "Recent Activity downloads control exists");

  let checkbox = downloadsControl.controlEl;
  ok(checkbox, "Recent Activity downloads checkbox element exists");
  ok(
    checkbox.checked,
    "Recent Activity downloads checkbox is initially checked"
  );

  let prefChanged = waitForPrefChange(RECENT_ACTIVITY_DOWNLOADS_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(
    !Services.prefs.getBoolPref(RECENT_ACTIVITY_DOWNLOADS_PREF),
    "Recent Activity downloads pref is now false"
  );
  ok(!checkbox.checked, "Recent Activity downloads checkbox is now unchecked");

  prefChanged = waitForPrefChange(RECENT_ACTIVITY_DOWNLOADS_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(
    Services.prefs.getBoolPref(RECENT_ACTIVITY_DOWNLOADS_PREF),
    "Recent Activity downloads pref is now true"
  );
  ok(checkbox.checked, "Recent Activity downloads checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_recent_activity_children_disabled_when_parent_disabled() {
    await SpecialPowers.pushPrefEnv({
      set: [[RECENT_ACTIVITY_PREF, false]],
    });

    let { win, tab } = await openHomePreferences();

    let recentActivityControl = await settingControlRenders(
      "recentActivity",
      win
    );
    let toggle = recentActivityControl.querySelector("moz-toggle");
    await toggle.updateComplete;

    ok(!toggle.pressed, "Recent Activity toggle is unchecked");

    let rowsControl = await settingControlRenders("recentActivityRows", win);
    let visitedControl = await settingControlRenders(
      "recentActivityVisited",
      win
    );
    let bookmarksControl = await settingControlRenders(
      "recentActivityBookmarks",
      win
    );
    let downloadsControl = await settingControlRenders(
      "recentActivityDownloads",
      win
    );

    ok(rowsControl, "Rows control exists");
    ok(visitedControl, "Visited control exists");
    ok(bookmarksControl, "Bookmarks control exists");
    ok(downloadsControl, "Downloads control exists");

    let rowsSelect = rowsControl.controlEl;
    let visitedCheckbox = visitedControl.controlEl;
    let bookmarksCheckbox = bookmarksControl.controlEl;
    let downloadsCheckbox = downloadsControl.controlEl;

    ok(
      rowsSelect.disabled || rowsSelect.parentDisabled,
      "Rows select is disabled when parent is disabled"
    );
    ok(
      visitedCheckbox.disabled || visitedCheckbox.parentDisabled,
      "Visited checkbox is disabled when parent is disabled"
    );
    ok(
      bookmarksCheckbox.disabled || bookmarksCheckbox.parentDisabled,
      "Bookmarks checkbox is disabled when parent is disabled"
    );
    ok(
      downloadsCheckbox.disabled || downloadsCheckbox.parentDisabled,
      "Downloads checkbox is disabled when parent is disabled"
    );

    toggle.click();

    await TestUtils.waitForCondition(
      () => Services.prefs.getBoolPref(RECENT_ACTIVITY_PREF),
      "Waiting for Recent Activity pref to become true"
    );

    await TestUtils.waitForCondition(
      () => !rowsSelect.disabled && !rowsSelect.parentDisabled,
      "Waiting for rows select to become enabled"
    );

    await TestUtils.waitForCondition(
      () => !visitedCheckbox.disabled && !visitedCheckbox.parentDisabled,
      "Waiting for visited checkbox to become enabled"
    );

    await TestUtils.waitForCondition(
      () => !bookmarksCheckbox.disabled && !bookmarksCheckbox.parentDisabled,
      "Waiting for bookmarks checkbox to become enabled"
    );

    await TestUtils.waitForCondition(
      () => !downloadsCheckbox.disabled && !downloadsCheckbox.parentDisabled,
      "Waiting for downloads checkbox to become enabled"
    );

    ok(
      !rowsSelect.disabled && !rowsSelect.parentDisabled,
      "Rows select becomes enabled when parent is enabled"
    );
    ok(
      !visitedCheckbox.disabled && !visitedCheckbox.parentDisabled,
      "Visited checkbox becomes enabled when parent is enabled"
    );
    ok(
      !bookmarksCheckbox.disabled && !bookmarksCheckbox.parentDisabled,
      "Bookmarks checkbox becomes enabled when parent is enabled"
    );
    ok(
      !downloadsCheckbox.disabled && !downloadsCheckbox.parentDisabled,
      "Downloads checkbox becomes enabled when parent is enabled"
    );

    BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_choose_wallpaper_visible() {
  let { win, tab } = await openHomePreferences();

  let chooseWallpaperControl = await settingControlRenders(
    "chooseWallpaper",
    win
  );
  ok(chooseWallpaperControl, "Choose wallpaper control exists");
  ok(
    BrowserTestUtils.isVisible(chooseWallpaperControl),
    "Choose wallpaper box link is visible"
  );

  BrowserTestUtils.removeTab(tab);
});

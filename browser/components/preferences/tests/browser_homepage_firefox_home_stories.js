/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Stories
const STORIES_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.feeds.system.topstories";
const STORIES_PREF =
  "browser.newtabpage.activity-stream.feeds.section.topstories";

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

add_task(async function test_stories_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [[STORIES_SYSTEM_PREF, false]],
  });

  let { win, tab } = await openHomePreferences();

  let storiesWrapper = getSettingControl("stories", win);
  ok(
    !storiesWrapper || BrowserTestUtils.isHidden(storiesWrapper),
    "Stories control is hidden when system pref is false"
  );

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [[STORIES_SYSTEM_PREF, true]],
  });

  ({ win, tab } = await openHomePreferences());

  storiesWrapper = await settingControlRenders("stories", win);
  ok(storiesWrapper, "Stories control exists when system pref is true");
  ok(
    BrowserTestUtils.isVisible(storiesWrapper),
    "Stories control is visible when system pref is true"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_stories_toggle_functionality() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let storiesControl = await settingControlRenders("stories", win);
  ok(storiesControl, "Stories control exists");

  let toggle = storiesControl.querySelector("moz-toggle");
  ok(toggle, "Stories toggle element exists");
  await BrowserTestUtils.waitForCondition(
    () => toggle.descriptionEl?.textContent?.trim().length > 0,
    "Wait for stories description text to render"
  );
  ok(toggle.hasDescription, "Stories toggle has description");
  ok(
    BrowserTestUtils.isVisible(toggle.descriptionEl),
    "Stories description is visible"
  );
  ok(toggle.pressed, "Stories toggle is initially checked");

  let prefChanged = waitForPrefChange(STORIES_PREF, false);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, false);

  ok(!Services.prefs.getBoolPref(STORIES_PREF), "Stories pref is now false");
  ok(!toggle.pressed, "Stories toggle is now unchecked");

  prefChanged = waitForPrefChange(STORIES_PREF, true);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, true);

  ok(Services.prefs.getBoolPref(STORIES_PREF), "Stories pref is now true");
  ok(toggle.pressed, "Stories toggle is now checked");

  BrowserTestUtils.removeTab(tab);
});

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Shortcuts and stories
const SHORTCUTS_PREF = "browser.newtabpage.activity-stream.feeds.topsites";
const SHORTCUTS_ROWS_PREF = "browser.newtabpage.activity-stream.topSitesRows";
const STORIES_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.feeds.system.topstories";
const STORIES_PREF =
  "browser.newtabpage.activity-stream.feeds.section.topstories";

// Support Firefox sponsored content
const SUPPORT_FIREFOX_PREF =
  "browser.newtabpage.activity-stream.showSponsoredCheckboxes";
const SPONSORED_SHORTCUTS_PREF =
  "browser.newtabpage.activity-stream.showSponsoredTopSites";
const SPONSORED_STORIES_PREF =
  "browser.newtabpage.activity-stream.showSponsored";

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

add_task(async function test_sponsored_stories_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [STORIES_SYSTEM_PREF, false],
      [STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let sponsoredStoriesControl = getSettingControl("sponsoredStories", win);
  ok(
    !sponsoredStoriesControl ||
      BrowserTestUtils.isHidden(sponsoredStoriesControl),
    "Sponsored stories control is hidden when system topstories pref is false"
  );

  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
    ],
  });

  ({ win, tab } = await openHomePreferences());

  sponsoredStoriesControl = await settingControlRenders(
    "sponsoredStories",
    win
  );
  ok(
    sponsoredStoriesControl,
    "Sponsored stories control exists when system topstories pref is true"
  );
  ok(
    BrowserTestUtils.isVisible(sponsoredStoriesControl),
    "Sponsored stories control is visible when system topstories pref is true"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_sponsored_stories_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
      [SPONSORED_STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let sponsoredStoriesControl = await settingControlRenders(
    "sponsoredStories",
    win
  );
  ok(sponsoredStoriesControl, "Sponsored stories control exists");

  let checkbox = sponsoredStoriesControl.controlEl;
  ok(checkbox, "Sponsored stories checkbox element exists");
  ok(checkbox.checked, "Sponsored stories checkbox is initially checked");

  let prefChanged = waitForPrefChange(SPONSORED_STORIES_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(
    !Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref is now false"
  );
  ok(!checkbox.checked, "Sponsored stories checkbox is now unchecked");

  prefChanged = waitForPrefChange(SPONSORED_STORIES_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(
    Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref is now true"
  );
  ok(checkbox.checked, "Sponsored stories checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_sponsored_stories_disabled_when_stories_disabled() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [SUPPORT_FIREFOX_PREF, true],
        [STORIES_SYSTEM_PREF, true],
        [STORIES_PREF, false],
        [SPONSORED_STORIES_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let sponsoredStoriesControl = await settingControlRenders(
      "sponsoredStories",
      win
    );
    ok(sponsoredStoriesControl, "Sponsored stories control exists");

    let checkbox = sponsoredStoriesControl.controlEl;
    ok(checkbox, "Sponsored stories checkbox element exists");

    ok(
      checkbox.disabled || checkbox.parentDisabled,
      "Sponsored stories checkbox is disabled when stories pref is disabled"
    );

    BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function test_sponsored_stories_enabled_when_stories_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
      [SPONSORED_STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let sponsoredStoriesControl = await settingControlRenders(
    "sponsoredStories",
    win
  );
  ok(sponsoredStoriesControl, "Sponsored stories control exists");

  let checkbox = sponsoredStoriesControl.controlEl;
  ok(checkbox, "Sponsored stories checkbox element exists");

  ok(
    !checkbox.disabled && !checkbox.parentDisabled,
    "Sponsored stories checkbox is enabled when stories pref is enabled"
  );

  BrowserTestUtils.removeTab(tab);
});

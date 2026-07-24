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
      // Reset sponsored shortcuts to testing profile default to avoid warnings.
      [SPONSORED_SHORTCUTS_PREF, false],
    ],
  });
});

add_task(async function test_support_firefox_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [SHORTCUTS_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let supportFirefoxControl = await settingControlRenders(
    "supportFirefox",
    win
  );
  ok(supportFirefoxControl, "Support Firefox control exists");

  let toggle = supportFirefoxControl.querySelector("moz-toggle");
  ok(toggle, "Support Firefox toggle element exists");
  ok(toggle.pressed, "Support Firefox toggle is initially checked");

  let prefChanged = waitForPrefChange(SUPPORT_FIREFOX_PREF, false);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, false);

  ok(
    !Services.prefs.getBoolPref(SUPPORT_FIREFOX_PREF),
    "Support Firefox pref is now false"
  );
  ok(!toggle.pressed, "Support Firefox toggle is now unchecked");

  prefChanged = waitForPrefChange(SUPPORT_FIREFOX_PREF, true);
  toggle.click();
  await prefChanged;
  await waitForToggleState(toggle, true);

  ok(
    Services.prefs.getBoolPref(SUPPORT_FIREFOX_PREF),
    "Support Firefox pref is now true"
  );
  ok(toggle.pressed, "Support Firefox toggle is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_support_firefox_cascades_to_children() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, false],
      [SPONSORED_SHORTCUTS_PREF, false],
      [SPONSORED_STORIES_PREF, false],
      [SHORTCUTS_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let supportFirefoxControl = await settingControlRenders(
    "supportFirefox",
    win
  );
  let toggle = supportFirefoxControl.querySelector("moz-toggle");

  ok(!toggle.pressed, "Support Firefox toggle is initially unchecked");
  ok(
    !Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref is initially false"
  );
  ok(
    !Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref is initially false"
  );

  let supportFirefoxChanged = waitForPrefChange(SUPPORT_FIREFOX_PREF, true);
  let sponsoredShortcutsChanged = waitForPrefChange(
    SPONSORED_SHORTCUTS_PREF,
    true
  );
  let sponsoredStoriesChanged = waitForPrefChange(SPONSORED_STORIES_PREF, true);

  toggle.click();

  await supportFirefoxChanged;
  await sponsoredShortcutsChanged;
  await sponsoredStoriesChanged;
  await waitForToggleState(toggle, true);

  ok(
    Services.prefs.getBoolPref(SUPPORT_FIREFOX_PREF),
    "Support Firefox pref is now true"
  );
  ok(
    Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref cascaded to true"
  );
  ok(
    Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref cascaded to true"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_support_firefox_cascades_off_to_children() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [SPONSORED_SHORTCUTS_PREF, true],
      [SPONSORED_STORIES_PREF, true],
      [SHORTCUTS_PREF, true],
      [STORIES_SYSTEM_PREF, true],
      [STORIES_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let supportFirefoxControl = await settingControlRenders(
    "supportFirefox",
    win
  );
  let toggle = supportFirefoxControl.querySelector("moz-toggle");

  ok(toggle.pressed, "Support Firefox toggle is initially checked");
  ok(
    Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref is initially true"
  );
  ok(
    Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref is initially true"
  );

  let supportFirefoxChanged = waitForPrefChange(SUPPORT_FIREFOX_PREF, false);
  let sponsoredShortcutsChanged = waitForPrefChange(
    SPONSORED_SHORTCUTS_PREF,
    false
  );
  let sponsoredStoriesChanged = waitForPrefChange(
    SPONSORED_STORIES_PREF,
    false
  );

  toggle.click();

  await supportFirefoxChanged;
  await sponsoredShortcutsChanged;
  await sponsoredStoriesChanged;
  await waitForToggleState(toggle, false);

  ok(
    !Services.prefs.getBoolPref(SUPPORT_FIREFOX_PREF),
    "Support Firefox pref is now false"
  );
  ok(
    !Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref cascaded to false"
  );
  ok(
    !Services.prefs.getBoolPref(SPONSORED_STORIES_PREF),
    "Sponsored stories pref cascaded to false"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_support_firefox_promo_visible() {
  let { win, tab } = await openHomePreferences();

  let supportFirefoxPromoControl = await settingControlRenders(
    "supportFirefoxPromo",
    win
  );
  ok(supportFirefoxPromoControl, "Support Firefox promo exists");
  ok(
    BrowserTestUtils.isVisible(supportFirefoxPromoControl),
    "Support Firefox promo is visible"
  );

  BrowserTestUtils.removeTab(tab);
});

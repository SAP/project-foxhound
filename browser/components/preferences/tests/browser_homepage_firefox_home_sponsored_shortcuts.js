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

add_task(async function test_sponsored_shortcuts_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [SUPPORT_FIREFOX_PREF, true],
      [SHORTCUTS_PREF, true],
      [SPONSORED_SHORTCUTS_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();

  let sponsoredShortcutsControl = await settingControlRenders(
    "sponsoredShortcuts",
    win
  );
  ok(sponsoredShortcutsControl, "Sponsored shortcuts control exists");

  let checkbox = sponsoredShortcutsControl.controlEl;
  ok(checkbox, "Sponsored shortcuts checkbox element exists");
  ok(checkbox.checked, "Sponsored shortcuts checkbox is initially checked");

  let prefChanged = waitForPrefChange(SPONSORED_SHORTCUTS_PREF, false);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, false);

  ok(
    !Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref is now false"
  );
  ok(!checkbox.checked, "Sponsored shortcuts checkbox is now unchecked");

  prefChanged = waitForPrefChange(SPONSORED_SHORTCUTS_PREF, true);
  checkbox.click();
  await prefChanged;
  await waitForCheckboxState(checkbox, true);

  ok(
    Services.prefs.getBoolPref(SPONSORED_SHORTCUTS_PREF),
    "Sponsored shortcuts pref is now true"
  );
  ok(checkbox.checked, "Sponsored shortcuts checkbox is now checked");

  BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_sponsored_shortcuts_disabled_when_topsites_disabled() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [SUPPORT_FIREFOX_PREF, true],
        [SHORTCUTS_PREF, false],
        [SPONSORED_SHORTCUTS_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let sponsoredShortcutsControl = await settingControlRenders(
      "sponsoredShortcuts",
      win
    );
    ok(sponsoredShortcutsControl, "Sponsored shortcuts control exists");

    let checkbox = sponsoredShortcutsControl.controlEl;
    ok(checkbox, "Sponsored shortcuts checkbox element exists");

    ok(
      checkbox.disabled || checkbox.parentDisabled,
      "Sponsored shortcuts checkbox is disabled when shortcuts is disabled"
    );

    BrowserTestUtils.removeTab(tab);
  }
);

add_task(
  async function test_sponsored_shortcuts_enabled_when_topsites_enabled() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [SUPPORT_FIREFOX_PREF, true],
        [SHORTCUTS_PREF, true],
        [SPONSORED_SHORTCUTS_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let sponsoredShortcutsControl = await settingControlRenders(
      "sponsoredShortcuts",
      win
    );
    ok(sponsoredShortcutsControl, "Sponsored shortcuts control exists");

    let checkbox = sponsoredShortcutsControl.controlEl;
    ok(checkbox, "Sponsored shortcuts checkbox element exists");

    ok(
      !checkbox.disabled && !checkbox.parentDisabled,
      "Sponsored shortcuts checkbox is enabled when shortcuts is enabled"
    );

    BrowserTestUtils.removeTab(tab);
  }
);

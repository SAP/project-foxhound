/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const NEWTAB_ENABLED_PREF = "browser.newtabpage.enabled";
const BLANK_HOMEPAGE_URL = "chrome://browser/content/blanktab.html";
// @nova-cleanup(remove-conditional): Delete this constant; the firefoxLogo gate in assertSectionDisabled below and the _classic task become unconditional after cleanup.
const NOVA_ENABLED_PREF = "browser.newtabpage.activity-stream.nova.enabled";
const WEATHER_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.widgets.system.weather.enabled";
// @nova-cleanup(remove-conditional): Delete this constant; only used by the test_firefox_home_disabled_when_both_off_classic task below.
const CLASSIC_WEATHER_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.system.showWeather";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["identity.fxaccounts.account.device.name", ""],
      // Set both to non-Firefox-Home values
      [HOMEPAGE_PREF, BLANK_HOMEPAGE_URL],
      [NEWTAB_ENABLED_PREF, false],
      // Enable conditionally-visible settings so we can test they get disabled
      [WEATHER_SYSTEM_PREF, true],
      ["browser.newtabpage.activity-stream.widgets.system.enabled", true],
      ["browser.newtabpage.activity-stream.feeds.system.topstories", true],
      // manageTopics needs this pref to be on, and the default varies
      // by region and language.
      [
        "browser.newtabpage.activity-stream.discoverystream.sections.enabled",
        true,
      ],
    ],
  });
});

async function assertSectionDisabled(win) {
  let noticeControl = await settingControlRenders(
    "firefoxHomeDisabledNotice",
    win
  );
  ok(noticeControl, "Disabled notice control exists");

  let messageBar = noticeControl.querySelector("moz-message-bar");
  ok(messageBar, "Message bar element exists");
  ok(
    BrowserTestUtils.isVisible(noticeControl),
    "Disabled notice is visible when both settings are not Firefox Home"
  );

  // firefoxLogo is only registered when Nova is enabled.
  const novaEnabled = Services.prefs.getBoolPref(NOVA_ENABLED_PREF, false);
  for (let settingId of [
    "webSearch",
    "weather",
    "widgets",
    "shortcuts",
    "stories",
    "supportFirefox",
    "recentActivity",
    ...(novaEnabled ? ["firefoxLogo"] : []),
  ]) {
    let control = await settingControlRenders(settingId, win);
    ok(
      control.controlEl.disabled,
      `${settingId} is disabled when Firefox Home is not active`
    );
  }
}

add_task(async function test_firefox_home_disabled_when_both_off() {
  let { win, tab } = await openHomePreferences();
  await assertSectionDisabled(win);

  let manageTopicsControl = getSettingControl("manageTopics", win);
  ok(
    !manageTopicsControl || BrowserTestUtils.isHidden(manageTopicsControl),
    "manageTopics box link is hidden when Firefox Home is not active"
  );
  let chooseWallpaperControl = getSettingControl("chooseWallpaper", win);
  ok(
    !chooseWallpaperControl ||
      BrowserTestUtils.isHidden(chooseWallpaperControl),
    "chooseWallpaper box link is hidden when Firefox Home is not active"
  );

  BrowserTestUtils.removeTab(tab);
});

// @nova-cleanup(remove-conditional): Delete this entire add_task; covers the Classic newtab UI which is being removed.
add_task(async function test_firefox_home_disabled_when_both_off_classic() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [NOVA_ENABLED_PREF, false],
      [CLASSIC_WEATHER_SYSTEM_PREF, true],
    ],
  });

  let { win, tab } = await openHomePreferences();
  await assertSectionDisabled(win);
  BrowserTestUtils.removeTab(tab);
});

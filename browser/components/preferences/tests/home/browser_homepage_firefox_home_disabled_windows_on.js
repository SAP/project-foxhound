/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const NEWTAB_ENABLED_PREF = "browser.newtabpage.enabled";
const DEFAULT_HOMEPAGE_URL = "about:home";
// @nova-cleanup(remove-conditional): Delete this constant; the firefoxLogo gate in assertSectionEnabled below and the _classic task become unconditional after cleanup.
const NOVA_ENABLED_PREF = "browser.newtabpage.activity-stream.nova.enabled";
const WEATHER_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.widgets.system.weather.enabled";
// @nova-cleanup(remove-conditional): Delete this constant; only used by the test_firefox_home_enabled_when_windows_is_home_classic task below.
const CLASSIC_WEATHER_SYSTEM_PREF =
  "browser.newtabpage.activity-stream.system.showWeather";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["identity.fxaccounts.account.device.name", ""],
      // New windows = Firefox Home, New tabs = blank
      [HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL],
      [NEWTAB_ENABLED_PREF, false],
      // Enable conditionally-visible settings so we can test they stay enabled
      [WEATHER_SYSTEM_PREF, true],
      ["browser.newtabpage.activity-stream.widgets.system.enabled", true],
      ["browser.newtabpage.activity-stream.feeds.system.topstories", true],
    ],
  });
});

async function assertSectionEnabled(win) {
  let noticeControl = await settingControlRenders(
    "firefoxHomeDisabledNotice",
    win
  );
  // The setting-control wrapper stays visible in the DOM; only the inner
  // message bar gets the hidden attribute, so we check that directly.
  let messageBar = noticeControl.querySelector("moz-message-bar");
  ok(messageBar, "Message bar element exists");
  ok(
    messageBar.hidden,
    "Message bar is hidden when New windows is Firefox Home"
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
      !control.controlEl.disabled,
      `${settingId} is enabled when New windows is Firefox Home`
    );
  }
}

add_task(async function test_firefox_home_enabled_when_windows_is_home() {
  let { win, tab } = await openHomePreferences();
  await assertSectionEnabled(win);
  BrowserTestUtils.removeTab(tab);
});

// @nova-cleanup(remove-conditional): Delete this entire add_task; covers the Classic newtab UI which is being removed.
add_task(
  async function test_firefox_home_enabled_when_windows_is_home_classic() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [NOVA_ENABLED_PREF, false],
        [CLASSIC_WEATHER_SYSTEM_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();
    await assertSectionEnabled(win);
    BrowserTestUtils.removeTab(tab);
  }
);

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const NEWTAB_ENABLED_PREF = "browser.newtabpage.enabled";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["identity.fxaccounts.account.device.name", ""],
    ],
  });
});

add_task(
  async function test_restore_defaults_button_disabled_when_at_defaults() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL],
        [NEWTAB_ENABLED_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let restoreDefaultsControl = await settingControlRenders(
      "homepageRestoreDefaults",
      win
    );
    let button = restoreDefaultsControl.controlEl;

    let icon = button.shadowRoot.querySelector(
      'img[src*="arrow-counterclockwise-16.svg"]'
    );
    ok(icon, "Restore defaults button has icon in shadow DOM");

    ok(
      button.disabled,
      "Restore defaults button is disabled when both settings are at defaults"
    );

    await BrowserTestUtils.removeTab(tab);
  }
);

add_task(
  async function test_restore_defaults_button_enabled_when_homepage_changed() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [HOMEPAGE_PREF, "https://example.com"],
        [NEWTAB_ENABLED_PREF, true],
      ],
    });

    let { win, tab } = await openHomePreferences();

    let restoreDefaultsControl = await settingControlRenders(
      "homepageRestoreDefaults",
      win
    );
    let button = restoreDefaultsControl.controlEl;

    ok(
      !button.disabled,
      "Restore defaults button is enabled when homepage is changed"
    );

    await BrowserTestUtils.removeTab(tab);
  }
);

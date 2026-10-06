/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
"use strict";

/**
 * This file tests the background update UI in about:preferences.
 */

ChromeUtils.defineESModuleGetters(this, {
  UpdateUtils: "resource://gre/modules/UpdateUtils.sys.mjs",
});

const BACKGROUND_UPDATE_PREF = "app.update.background.enabled";

/**
 * Helper function to wait for the background update checkbox to reach the expected state.
 * This accounts for the async nature of the config-based preferences system.
 *
 * @param {object} browser - The browser object
 * @param {boolean} expectedChecked - The expected checked state
 */
async function waitForBackgroundUpdateCheckbox(browser, expectedChecked) {
  let checkbox = browser.contentDocument.getElementById("backgroundUpdate");
  await BrowserTestUtils.waitForMutationCondition(
    checkbox,
    { attributes: true, attributeFilter: ["checked", "disabled"] },
    () => checkbox.checked === expectedChecked && !checkbox.disabled
  );
}

add_task(async function testBackgroundUpdateSettingUI() {
  if (!AppConstants.MOZ_UPDATE_AGENT) {
    // The element that we are testing in about:preferences is #ifdef'ed out of
    // the file if MOZ_UPDATE_AGENT isn't defined. So there is nothing to
    // test in that case.
    logTestInfo(
      `
===============================================================================
WARNING! This test involves background update, but background tasks are
         disabled. This test will unconditionally pass since the feature it
         wants to test isn't available.
===============================================================================
`
    );
    // Some of our testing environments do not consider a test to have passed if
    // it didn't make any assertions.
    ok(true, "Unconditionally passing test");
    return;
  }

  let settingsRedesignEnabled = Services.prefs.getBoolPref(
    "browser.settings-redesign.enabled",
    false
  );
  let prefUrl = settingsRedesignEnabled
    ? "about:preferences#about"
    : "about:preferences";
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, prefUrl);

  const originalBackgroundUpdateVal = await UpdateUtils.readUpdateConfigSetting(
    BACKGROUND_UPDATE_PREF
  );
  const originalUpdateAutoVal = await UpdateUtils.getAppUpdateAutoEnabled();
  registerCleanupFunction(async () => {
    await BrowserTestUtils.removeTab(tab);
    await UpdateUtils.writeUpdateConfigSetting(
      BACKGROUND_UPDATE_PREF,
      originalBackgroundUpdateVal
    );
    await UpdateUtils.setAppUpdateAutoEnabled(originalUpdateAutoVal);
  });

  // If auto update is disabled, the control for background update should be
  // disabled, since we cannot update in the background if we can't update
  // automatically.
  await UpdateUtils.setAppUpdateAutoEnabled(false);
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [UpdateUtils.PER_INSTALLATION_PREFS_SUPPORTED],
    async perInstallationPrefsSupported => {
      let backgroundUpdateCheckbox =
        content.document.getElementById("backgroundUpdate");
      let backgroundUpdateControl =
        backgroundUpdateCheckbox.closest("setting-control");
      await ContentTaskUtils.waitForMutationCondition(
        backgroundUpdateControl,
        { attributes: true },
        () => backgroundUpdateControl.hidden === !perInstallationPrefsSupported
      );
      await backgroundUpdateCheckbox.updateComplete;
      is(
        backgroundUpdateControl.hidden,
        !perInstallationPrefsSupported,
        `The background update UI should ${
          perInstallationPrefsSupported ? "not" : ""
        } be hidden when perInstallationPrefsSupported is ` +
          `${perInstallationPrefsSupported}`
      );
      if (perInstallationPrefsSupported) {
        is(
          backgroundUpdateCheckbox.inputEl.disabled,
          true,
          `The background update UI should be disabled when auto update is ` +
            `disabled`
        );
      }
    }
  );

  if (!UpdateUtils.PER_INSTALLATION_PREFS_SUPPORTED) {
    // The remaining tests only make sense on platforms where per-installation
    // prefs are supported and the UI will ever actually be displayed
    return;
  }

  await UpdateUtils.setAppUpdateAutoEnabled(true);
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, true);

  // Wait for the checkbox to reflect the enabled state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, true);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    let backgroundUpdateCheckbox =
      content.document.getElementById("backgroundUpdate");
    is(
      backgroundUpdateCheckbox.disabled,
      false,
      `The background update UI should not be disabled when auto update is ` +
        `enabled`
    );

    is(
      backgroundUpdateCheckbox.checked,
      true,
      "After enabling background update, the checkbox should be checked"
    );

    // Note that this action results in asynchronous activity. Normally when
    // we change the update config, we await on the function to wait for the
    // value to be written to the disk. We can't easily await on the UI state
    // though. Luckily, we don't have to because reads/writes of the config file
    // are serialized. So when we verify the written value by awaiting on
    // readUpdateConfigSetting(), that will also wait for the value to be
    // written to disk and for this UI to react to that.
    backgroundUpdateCheckbox.click();
  });

  // Wait for the checkbox to reflect the enabled state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);

  is(
    await UpdateUtils.readUpdateConfigSetting(BACKGROUND_UPDATE_PREF),
    false,
    "Toggling the checkbox should have changed the setting value to false"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    let backgroundUpdateCheckbox =
      content.document.getElementById("backgroundUpdate");
    is(
      backgroundUpdateCheckbox.checked,
      false,
      "After toggling the checked checkbox, it should be unchecked."
    );

    // Like the last call like this one, this initiates asynchronous behavior.
    backgroundUpdateCheckbox.click();
  });

  // Wait for the checkbox to reflect the enabled state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, true);

  is(
    await UpdateUtils.readUpdateConfigSetting(BACKGROUND_UPDATE_PREF),
    true,
    "Toggling the checkbox should have changed the setting value to true"
  );

  // Wait for the checkbox to reflect the checked state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, true);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      true,
      "After toggling the unchecked checkbox, it should be checked"
    );
  });

  // Test that the UI reacts to observed setting changes properly.
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, false);

  // Wait for the checkbox to reflect the disabled state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      false,
      "Externally disabling background update should uncheck the checkbox"
    );
  });

  await UpdateUtils.setAppUpdateAutoEnabled(true);
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, true);

  // Wait for the checkbox to reflect the enabled state
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, true);

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      true,
      "Externally enabling background update should check the checkbox"
    );
  });

  await UpdateUtils.setAppUpdateAutoEnabled(false);
  // Wait for the checkbox to reflect that auto update is disabled
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    let backgroundUpdateCheckbox =
      content.document.getElementById("backgroundUpdate");
    is(
      backgroundUpdateCheckbox.checked,
      false,
      "Background update should be unchecked if auto update is unchecked"
    );
    is(
      backgroundUpdateCheckbox.inputEl.disabled,
      true,
      "Background update should be disabled if auto update is unchecked"
    );
  });

  // Need to toggle this twice to actually test the UI
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, false);
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, true);
  // Checkbox should remain false because auto update is still disabled
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      false,
      "Externally enabling background update should not check the checkbox if auto update is disabled"
    );
  });

  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, false);
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);
  await UpdateUtils.setAppUpdateAutoEnabled(true);
  // Wait for the checkbox state to stabilize after re-enabling auto update
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      false,
      "Reenabling auto update should not check backgroundUpdate if the background update is false"
    );
  });

  await UpdateUtils.setAppUpdateAutoEnabled(false);
  await UpdateUtils.writeUpdateConfigSetting(BACKGROUND_UPDATE_PREF, true);
  // Even though we set the pref to true, checkbox shows false because auto update is disabled
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, false);
  await UpdateUtils.setAppUpdateAutoEnabled(true);
  // Wait for the checkbox to reflect the enabled state after enabling auto update
  await waitForBackgroundUpdateCheckbox(tab.linkedBrowser, true);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    is(
      content.document.getElementById("backgroundUpdate").checked,
      true,
      "Enabling auto update should check backgroundUpdate if the background update is true"
    );
  });
});

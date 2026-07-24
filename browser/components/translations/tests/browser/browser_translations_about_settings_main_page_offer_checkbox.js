/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the "Always offer to translate" checkbox in about:preferences
 * properly updates the browser.translations.automaticallyPopup preference
 * when toggled by the user.
 */
add_task(async function test_offer_translations_checkbox_toggle() {
  const PREF_NAME = "browser.translations.automaticallyPopup";

  const { cleanup } = await setupAboutPreferences(LANGUAGE_PAIRS, {
    prefs: [
      ["browser.settings-redesign.enabled", true],
      [PREF_NAME, true],
    ],
  });

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Waiting for the offerTranslations checkbox to be available");
  const checkbox = await waitForCondition(
    () => document.getElementById("offerTranslations"),
    "Waiting for offerTranslations checkbox to be visible"
  );

  await ensureVisibility({
    message: "offerTranslations checkbox should be visible",
    visible: { checkbox },
  });

  info("Scrolling checkbox into view");
  checkbox.scrollIntoView({ behavior: "instant", block: "center" });

  info("Verifying initial state matches the preference");
  let prefValue = Services.prefs.getBoolPref(PREF_NAME);
  is(prefValue, true, "Initial pref value should be true");

  const checkboxInput =
    checkbox.tagName === "INPUT"
      ? checkbox
      : checkbox.querySelector('input[type="checkbox"]');

  if (checkboxInput) {
    is(
      checkboxInput.checked,
      prefValue,
      "Checkbox checked state should match preference value"
    );
  } else {
    is(
      checkbox.checked,
      prefValue,
      "Checkbox checked state should match preference value"
    );
  }

  info("Clicking checkbox to toggle it OFF (true → false)");
  let prefChanged = TestUtils.waitForPrefChange(PREF_NAME);
  click(checkbox, "Toggling offerTranslations checkbox to false");
  await prefChanged;

  prefValue = Services.prefs.getBoolPref(PREF_NAME);
  is(prefValue, false, "Pref should now be false after clicking");

  if (checkboxInput) {
    is(checkboxInput.checked, false, "Checkbox should be unchecked");
  } else {
    is(checkbox.checked, false, "Checkbox should be unchecked");
  }

  info("Clicking checkbox to toggle it back ON (false → true)");
  prefChanged = TestUtils.waitForPrefChange(PREF_NAME);
  click(checkbox, "Toggling offerTranslations checkbox to true");
  await prefChanged;

  prefValue = Services.prefs.getBoolPref(PREF_NAME);
  is(prefValue, true, "Pref should now be true after clicking again");

  if (checkboxInput) {
    is(checkboxInput.checked, true, "Checkbox should be checked");
  } else {
    is(checkbox.checked, true, "Checkbox should be checked");
  }

  await cleanup();
});

/**
 * Tests that changing the browser.translations.automaticallyPopup preference
 * directly updates the checkbox state in the UI automatically.
 */
add_task(async function test_offer_translations_pref_updates_checkbox() {
  const PREF_NAME = "browser.translations.automaticallyPopup";

  const { cleanup } = await setupAboutPreferences(LANGUAGE_PAIRS, {
    prefs: [
      ["browser.settings-redesign.enabled", true],
      [PREF_NAME, true],
    ],
  });

  const document = gBrowser.selectedBrowser.contentDocument;

  info("Waiting for the offerTranslations checkbox to be available");
  const checkbox = await waitForCondition(
    () => document.getElementById("offerTranslations"),
    "Waiting for offerTranslations checkbox to be visible"
  );

  await ensureVisibility({
    message: "offerTranslations checkbox should be visible",
    visible: { checkbox },
  });

  info("Scrolling checkbox into view");
  checkbox.scrollIntoView({ behavior: "instant", block: "center" });

  const checkboxInput =
    checkbox.tagName === "INPUT"
      ? checkbox
      : checkbox.querySelector('input[type="checkbox"]');

  const getCheckedState = () =>
    checkboxInput ? checkboxInput.checked : checkbox.checked;

  info("Verifying initial state is checked (pref is true)");
  is(getCheckedState(), true, "Checkbox should initially be checked");

  info("Setting pref to false directly");
  Services.prefs.setBoolPref(PREF_NAME, false);

  info("Waiting for checkbox to update to unchecked state");
  await waitForCondition(
    () => getCheckedState() === false,
    "Waiting for checkbox to become unchecked after pref change"
  );

  is(
    getCheckedState(),
    false,
    "Checkbox should be unchecked after pref set to false"
  );

  info("Setting pref to true directly");
  Services.prefs.setBoolPref(PREF_NAME, true);

  info("Waiting for checkbox to update to checked state");
  await waitForCondition(
    () => getCheckedState() === true,
    "Waiting for checkbox to become checked after pref change"
  );

  is(
    getCheckedState(),
    true,
    "Checkbox should be checked after pref set to true"
  );

  await cleanup();
});

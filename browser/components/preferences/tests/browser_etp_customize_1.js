/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CAT_PREF = "browser.contentblocking.category";
const BASELINE_PREF = "privacy.trackingprotection.allow_list.baseline.enabled";
const CONVENIENCE_PREF =
  "privacy.trackingprotection.allow_list.convenience.enabled";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_etp_reset_buttons_update_category() {
  await SpecialPowers.pushPrefEnv({
    set: [[CAT_PREF, "standard"]],
  });

  let { doc } = await openEtpCustomizePage();
  let standardButton = getControl(doc, "etpResetStandardButton");
  let strictButton = getControl(doc, "etpResetStrictButton");

  ok(standardButton.disabled, "Standard reset button disabled on standard");
  ok(!strictButton.disabled, "Strict reset button enabled");

  let prefChange = waitForAndAssertPrefState(
    CAT_PREF,
    "strict",
    "ETP category pref switched to strict"
  );
  synthesizeClick(strictButton);
  await prefChange;

  ok(strictButton.disabled, "Strict reset button disabled after use");
  ok(
    !standardButton.disabled,
    "Standard reset button enabled after switching to strict"
  );

  prefChange = waitForAndAssertPrefState(
    CAT_PREF,
    "standard",
    "ETP category pref switched back to standard"
  );
  synthesizeClick(standardButton);
  await prefChange;

  gBrowser.removeCurrentTab();
});

add_task(async function test_custom_allow_list_controls_match_old_behavior() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "custom"],
      [BASELINE_PREF, true],
      [CONVENIENCE_PREF, true],
    ],
  });

  let { doc } = await openEtpCustomizePage();
  let baselineCheckbox = getControl(doc, "etpAllowListBaselineEnabledCustom");
  let convenienceCheckbox = getControl(
    doc,
    "etpAllowListConvenienceEnabledCustom"
  );

  ok(baselineCheckbox.checked, "Custom baseline checkbox starts checked");

  await clickEtpBaselineCheckboxWithConfirm(
    doc,
    "etpAllowListBaselineEnabledCustom",
    BASELINE_PREF,
    false,
    1
  );

  ok(
    !Services.prefs.getBoolPref(BASELINE_PREF),
    "Baseline pref disabled from custom controls"
  );
  ok(
    convenienceCheckbox.parentDisabled,
    "Custom convenience checkbox disabled when baseline unchecked"
  );

  let baselinePrefChange = waitForAndAssertPrefState(
    BASELINE_PREF,
    true,
    "Baseline pref restored"
  );
  synthesizeClick(baselineCheckbox);
  await baselinePrefChange;
  await BrowserTestUtils.waitForCondition(
    () => !convenienceCheckbox.parentDisabled,
    "Custom convenience checkbox enabled once baseline rechecked"
  );

  gBrowser.removeCurrentTab();
});

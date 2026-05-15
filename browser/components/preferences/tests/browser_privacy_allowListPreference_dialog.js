/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BASELINE_PREF = "privacy.trackingprotection.allow_list.baseline.enabled";
const CONVENIENCE_PREF =
  "privacy.trackingprotection.allow_list.convenience.enabled";
const CB_CATEGORY_PREF = "browser.contentblocking.category";

const ETP_STANDARD_ID = "standardRadio";
const ETP_STRICT_ID = "strictRadio";
const ETP_CUSTOM_ID = "customRadio";

const STRICT_BASELINE_CHECKBOX_ID = "contentBlockingBaselineExceptionsStrict";
const STRICT_CONVENIENCE_CHECKBOX_ID =
  "contentBlockingConvenienceExceptionsStrict";
const CUSTOM_BASELINE_CHECKBOX_ID = "contentBlockingBaselineExceptionsCustom";
const CUSTOM_CONVENIENCE_CHECKBOX_ID =
  "contentBlockingConvenienceExceptionsCustom";

async function cleanUp() {
  await SpecialPowers.popPrefEnv();
  gBrowser.removeCurrentTab();
}

async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [[CB_CATEGORY_PREF, "standard"]],
  });
  Assert.ok(
    Services.prefs.getBoolPref(BASELINE_PREF),
    "The baseline preference should be initially true."
  );
  Assert.ok(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    "The convenience preference should be initially true."
  );
}

add_task(async function test_baseline_checkbox_dialog_cancel() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  doc.getElementById(ETP_STRICT_ID).click();

  // Initially, baseline should be checked
  let baselineCheckbox = doc.getElementById(STRICT_BASELINE_CHECKBOX_ID);
  is(
    baselineCheckbox.checked,
    true,
    "The baseline checkbox should be checked initially."
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    STRICT_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    true,
    0
  );

  // Verify the checkbox is still checked and pref is still true
  is(
    baselineCheckbox.checked,
    true,
    "The baseline checkbox should remain checked after canceling dialog."
  );
  Assert.ok(
    Services.prefs.getBoolPref(BASELINE_PREF),
    "The baseline pref should remain true after canceling dialog."
  );

  await cleanUp();
});

add_task(async function test_baseline_checkbox_dialog_confirm() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  doc.getElementById(ETP_STRICT_ID).click();

  let baselineCheckbox = doc.getElementById(STRICT_BASELINE_CHECKBOX_ID);
  is(
    baselineCheckbox.checked,
    true,
    "The baseline checkbox should be checked initially."
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    STRICT_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    false,
    1
  );

  is(
    baselineCheckbox.checked,
    false,
    "The baseline checkbox should be unchecked after confirming dialog."
  );
  Assert.ok(
    !Services.prefs.getBoolPref(BASELINE_PREF),
    "The baseline pref should be false after confirming dialog."
  );

  Assert.ok(
    !Services.prefs.getBoolPref(CONVENIENCE_PREF),
    "The convenience pref should be false when baseline is disabled."
  );

  await cleanUp();
});

add_task(async function test_custom_baseline_checkbox_dialog_cancel() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  doc.getElementById(ETP_CUSTOM_ID).click();

  let baselineCheckbox = doc.getElementById(CUSTOM_BASELINE_CHECKBOX_ID);
  is(
    baselineCheckbox.checked,
    true,
    "The custom baseline checkbox should be checked initially."
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    CUSTOM_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    true,
    0
  );

  is(
    baselineCheckbox.checked,
    true,
    "The custom baseline checkbox should remain checked after canceling dialog."
  );
  Assert.ok(
    Services.prefs.getBoolPref(BASELINE_PREF),
    "The baseline pref should remain true after canceling dialog."
  );

  Assert.ok(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    "The convenience pref should remain true when baseline is enabled."
  );

  await cleanUp();
});

add_task(async function test_custom_baseline_checkbox_dialog_confirm() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  doc.getElementById(ETP_CUSTOM_ID).click();

  let baselineCheckbox = doc.getElementById(CUSTOM_BASELINE_CHECKBOX_ID);
  is(
    baselineCheckbox.checked,
    true,
    "The custom baseline checkbox should be checked initially."
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    CUSTOM_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    false,
    1
  );

  is(
    baselineCheckbox.checked,
    false,
    "The custom baseline checkbox should be unchecked after confirming dialog."
  );
  Assert.ok(
    !Services.prefs.getBoolPref(BASELINE_PREF),
    "The baseline pref should be false after confirming dialog."
  );

  let convenienceCheckbox = doc.getElementById(CUSTOM_CONVENIENCE_CHECKBOX_ID);
  is(
    convenienceCheckbox.checked,
    true,
    "The custom convenience checkbox should be unchanged when baseline is disabled."
  );
  Assert.ok(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    "The convenience pref should be unchanged when baseline is disabled."
  );

  await cleanUp();
});

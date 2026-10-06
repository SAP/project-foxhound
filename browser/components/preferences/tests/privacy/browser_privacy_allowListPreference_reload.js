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

add_task(
  async function test_reload_does_not_show_after_baseline_checkbox_dialog_cancel() {
    await SpecialPowers.pushPrefEnv({
      set: [
        [CB_CATEGORY_PREF, "strict"],
        // Prevent migration from running and changing baseline to false
        [
          "privacy.trackingprotection.allow_list.hasMigratedCategoryPrefs",
          true,
        ],
      ],
    });
    Assert.ok(
      Services.prefs.getBoolPref(BASELINE_PREF),
      "The baseline preference should be initially true."
    );
    Assert.ok(
      !Services.prefs.getBoolPref(CONVENIENCE_PREF),
      "The convenience preference should be initially false."
    );
    await openPreferencesViaOpenPreferencesAPI("privacy", {
      leaveOpen: true,
    });
    let doc = gBrowser.contentDocument;

    let reloadButton = doc.querySelector(
      "#contentBlockingOptionStrict .content-blocking-warning.reload-tabs .reload-tabs-button"
    );
    is_element_hidden(
      reloadButton,
      "The reload button should be hidden initially in Strict mode."
    );

    await clickCheckboxWithConfirmDialog(
      doc,
      STRICT_BASELINE_CHECKBOX_ID,
      BASELINE_PREF,
      true,
      0
    );

    Assert.ok(
      Services.prefs.getBoolPref(BASELINE_PREF),
      "The baseline pref should remain true after canceling dialog."
    );

    is_element_hidden(
      reloadButton,
      "The reload button should be hidden after canceling the checkbox dialog."
    );

    await cleanUp();
  }
);

add_task(async function test_reload_button_shows_after_prefs_changed_strict() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let tab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let doc = gBrowser.contentDocument;

  doc.getElementById(ETP_STRICT_ID).click();

  let strictReloadButton = doc.querySelector(
    "#contentBlockingOptionStrict .content-blocking-warning.reload-tabs .reload-tabs-button"
  );

  is_element_visible(
    strictReloadButton,
    "The strict reload button must be visible"
  );

  strictReloadButton.click();

  is_element_hidden(
    strictReloadButton,
    "The strict reload button must be hidden after clicking it"
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    STRICT_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    false,
    1
  );

  is_element_visible(
    strictReloadButton,
    "The strict reload button must be visible after baseline pref changes"
  );

  strictReloadButton.click();

  is_element_hidden(
    strictReloadButton,
    "The strict reload button must be hidden after clicking it"
  );

  BrowserTestUtils.removeTab(tab);
  await cleanUp();
});

add_task(async function test_reload_button_shows_after_prefs_changed_custom() {
  await setup();
  await openPreferencesViaOpenPreferencesAPI("privacy", {
    leaveOpen: true,
  });
  let tab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let doc = gBrowser.contentDocument;

  doc.getElementById(ETP_CUSTOM_ID).click();

  let customReloadButton = doc.querySelector(
    "#contentBlockingOptionCustom .content-blocking-warning.reload-tabs .reload-tabs-button"
  );

  is_element_hidden(
    customReloadButton,
    "The custom reload button must be hidden when switching from strict"
  );

  await clickCheckboxWithConfirmDialog(
    doc,
    CUSTOM_BASELINE_CHECKBOX_ID,
    BASELINE_PREF,
    false,
    1
  );

  is_element_visible(
    customReloadButton,
    "The custom reload button must be visible after baseline checkbox changes"
  );

  customReloadButton.click();

  is_element_hidden(
    customReloadButton,
    "The custom reload button must be hidden after clicking it"
  );

  BrowserTestUtils.removeTab(tab);
  await cleanUp();
});

/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests for the ETP advanced settings view.

const CAT_PREF = "browser.contentblocking.category";
const BASELINE_PREF = "privacy.trackingprotection.allow_list.baseline.enabled";
const CONVENIENCE_PREF =
  "privacy.trackingprotection.allow_list.convenience.enabled";
const PERMISSIONS_DIALOG_URL =
  "chrome://browser/content/preferences/dialogs/permissions.xhtml";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

// Verifies category radios reflect pref changes and the customize entry point navigates correctly.
add_task(async function test_etp_category_radios_and_customize_navigation() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "standard"],
      [BASELINE_PREF, true],
      [CONVENIENCE_PREF, true],
    ],
  });

  let { win, doc, tab } = await openEtpPage();

  let standardRadio = getControl(doc, "etpLevelStandard");
  let strictRadio = getControl(doc, "etpLevelStrict");
  let customRadio = getControl(doc, "etpLevelCustom");
  let customizeButton = getControl(doc, "etpCustomizeButton");
  let levelWarning = getControl(doc, "etpLevelWarning");

  ok(standardRadio.checked, "Standard ETP level is initially selected");
  ok(
    customizeButton.parentDisabled,
    "Customize button disabled until custom level selected"
  );
  ok(
    BrowserTestUtils.isHidden(levelWarning),
    "ETP level warning hidden while standard selected"
  );

  info("Switch to strict and wait for the pref to change");
  let prefChange = waitForAndAssertPrefState(
    CAT_PREF,
    "strict",
    "ETP category pref set to strict"
  );
  synthesizeClick(strictRadio);
  await prefChange;
  ok(strictRadio.checked, "Strict radio button selected");

  let strictBaselineWrapper = getControlWrapper(
    doc,
    "etpAllowListBaselineEnabled"
  );
  ok(
    BrowserTestUtils.isVisible(strictBaselineWrapper),
    "Baseline checkbox for strict is visible when strict selected"
  );

  let levelWarningVisible = () => BrowserTestUtils.isVisible(levelWarning);
  if (!levelWarningVisible()) {
    await BrowserTestUtils.waitForMutationCondition(
      levelWarning,
      { attributes: true, attributeFilter: ["hidden"] },
      levelWarningVisible
    );
  }
  ok(levelWarningVisible(), "ETP level warning visible for strict level");

  info("Switch to custom and ensure the pref updates");
  prefChange = waitForAndAssertPrefState(
    CAT_PREF,
    "custom",
    "ETP category pref set to custom"
  );
  synthesizeClick(customRadio);
  await prefChange;
  ok(customRadio.checked, "Custom radio button selected");

  let customizeEnabled = () => !customizeButton.parentDisabled;
  if (!customizeEnabled()) {
    await BrowserTestUtils.waitForMutationCondition(
      customizeButton,
      { attributes: true, attributeFilter: ["parentdisabled"] },
      customizeEnabled
    );
  }
  ok(customizeEnabled(), "Customize button enabled when custom level selected");
  ok(levelWarningVisible(), "ETP level warning remains visible for custom");

  info("Click customize and wait for the custom pane to load");
  let paneShown = waitForPaneChange("etpCustomize");
  synthesizeClick(customizeButton);
  await paneShown;
  is(
    win.history.state,
    "paneEtpCustomize",
    "Customize button navigated to the ETP custom pane"
  );

  BrowserTestUtils.removeTab(tab);
});

// Ensures the reload tabs message bar appears when ETP settings change.
add_task(async function test_reload_tabs_message_bar() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "strict"],
      [BASELINE_PREF, true],
      [CONVENIENCE_PREF, true],
    ],
  });

  info("Open an additional tab so the reload notification will show");
  let extraTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com"
  );

  let { doc, tab } = await openEtpPage();

  let reloadTabsHint = getControl(doc, "reloadTabsHint");
  ok(reloadTabsHint, "reloadTabsHint element exists");
  ok(
    BrowserTestUtils.isHidden(reloadTabsHint),
    "Reload tabs message bar is initially hidden"
  );

  info("Toggle convenience checkbox to trigger reload notification");
  let convenienceCheckbox = getControl(doc, "etpAllowListConvenienceEnabled");
  ok(convenienceCheckbox.checked, "Convenience checkbox starts checked");

  let prefChange = waitForAndAssertPrefState(
    CONVENIENCE_PREF,
    false,
    "Convenience pref disabled"
  );
  synthesizeClick(convenienceCheckbox);
  await prefChange;

  info("Wait for message bar to become visible");
  await BrowserTestUtils.waitForCondition(
    () => BrowserTestUtils.isVisible(reloadTabsHint),
    "Waiting for reload tabs message bar to become visible"
  );

  ok(
    BrowserTestUtils.isVisible(reloadTabsHint),
    "Reload tabs message bar is visible after changing ETP setting"
  );

  let reloadButton = reloadTabsHint.querySelector("moz-button");
  ok(reloadButton, "Reload button exists in the message bar");

  info("Click reload button to hide the message bar");
  synthesizeClick(reloadButton);

  await BrowserTestUtils.waitForCondition(
    () => BrowserTestUtils.isHidden(reloadTabsHint),
    "Waiting for reload tabs message bar to become hidden"
  );

  ok(
    BrowserTestUtils.isHidden(reloadTabsHint),
    "Reload tabs message bar is hidden after reload button clicked"
  );

  BrowserTestUtils.removeTab(extraTab);
  BrowserTestUtils.removeTab(tab);
});

// Ensures strict baseline checkbox flows prompt for confirmation and gate the convenience checkbox.
add_task(async function test_strict_baseline_checkbox_requires_confirmation() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "strict"],
      [BASELINE_PREF, true],
      [CONVENIENCE_PREF, true],
    ],
  });

  let { doc, tab } = await openEtpPage();

  let baselineCheckbox = getControl(doc, "etpAllowListBaselineEnabled");
  let convenienceCheckbox = getControl(doc, "etpAllowListConvenienceEnabled");

  ok(baselineCheckbox.checked, "Baseline checkbox starts checked");

  info("Cancel the confirmation dialog and ensure checkbox stays checked");
  await clickEtpBaselineCheckboxWithConfirm(
    doc,
    "etpAllowListBaselineEnabled",
    BASELINE_PREF,
    true,
    0
  );
  ok(
    baselineCheckbox.checked,
    "Baseline checkbox remains checked after cancelling dialog"
  );

  info("Confirm the dialog to disable the baseline allow list");
  await clickEtpBaselineCheckboxWithConfirm(
    doc,
    "etpAllowListBaselineEnabled",
    BASELINE_PREF,
    false,
    1
  );
  ok(
    !Services.prefs.getBoolPref(BASELINE_PREF),
    "Baseline pref disabled after confirming dialog"
  );
  ok(
    convenienceCheckbox.parentDisabled,
    "Convenience checkbox disabled when baseline unchecked"
  );

  info("Re-enable baseline and ensure convenience becomes active again");
  let prefChange = waitForAndAssertPrefState(
    BASELINE_PREF,
    true,
    "Baseline pref restored"
  );
  synthesizeClick(baselineCheckbox);
  await prefChange;

  let convenienceEnabled = () => !convenienceCheckbox.parentDisabled;
  if (!convenienceEnabled()) {
    await BrowserTestUtils.waitForMutationCondition(
      convenienceCheckbox,
      { attributes: true, attributeFilter: ["parentdisabled"] },
      convenienceEnabled
    );
  }
  ok(
    convenienceEnabled(),
    "Convenience checkbox enabled again after baseline re-enabled"
  );

  BrowserTestUtils.removeTab(tab);
});

// Ensures the RFP warning visibility follows the resistFingerprinting pref.
add_task(async function test_rfp_warning_visibility() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [CAT_PREF, "strict"],
      ["privacy.resistFingerprinting.pbmode", false],
      ["privacy.resistFingerprinting", false],
    ],
  });

  let { doc, tab } = await openEtpPage();

  let rfpWarning = getControl(doc, "rfpWarning");
  ok(
    BrowserTestUtils.isHidden(rfpWarning),
    "RFP warning hidden while pref disabled"
  );

  let mutationTarget = doc.documentElement;
  let warningVisibleCondition = () => {
    let el = doc.getElementById("rfpWarning");
    return el && BrowserTestUtils.isVisible(el);
  };

  info("Enable normal RFP and wait for the warning to show");
  let waitForVisible = BrowserTestUtils.waitForMutationCondition(
    mutationTarget,
    { attributes: true, childList: true, subtree: true },
    warningVisibleCondition
  );
  Services.prefs.setBoolPref("privacy.resistFingerprinting", true);
  await waitForVisible;
  rfpWarning = getControl(doc, "rfpWarning");
  ok(
    BrowserTestUtils.isVisible(rfpWarning),
    "RFP warning visible when pref enabled"
  );

  let warningHiddenCondition = () => {
    let el = doc.getElementById("rfpWarning");
    return el && BrowserTestUtils.isHidden(el);
  };

  info("Disable normal RFP and wait for the warning to hide");
  let waitForHidden = BrowserTestUtils.waitForMutationCondition(
    mutationTarget,
    { attributes: true, childList: true, subtree: true },
    warningHiddenCondition
  );
  Services.prefs.setBoolPref("privacy.resistFingerprinting", false);
  await waitForHidden;
  rfpWarning = getControl(doc, "rfpWarning");
  ok(
    BrowserTestUtils.isHidden(rfpWarning),
    "RFP warning hidden when pref disabled again"
  );

  info("Enable PBM RFP and wait for the warning to show");
  waitForVisible = BrowserTestUtils.waitForMutationCondition(
    mutationTarget,
    { attributes: true, childList: true, subtree: true },
    warningVisibleCondition
  );
  Services.prefs.setBoolPref("privacy.resistFingerprinting.pbmode", true);
  await waitForVisible;
  rfpWarning = getControl(doc, "rfpWarning");
  ok(
    BrowserTestUtils.isVisible(rfpWarning),
    "RFP warning visible when PBM pref enabled"
  );

  info("Disable PBM RFP and wait for the warning to hide");
  waitForHidden = BrowserTestUtils.waitForMutationCondition(
    mutationTarget,
    { attributes: true, childList: true, subtree: true },
    warningHiddenCondition
  );
  Services.prefs.setBoolPref("privacy.resistFingerprinting.pbmode", false);
  await waitForHidden;
  rfpWarning = getControl(doc, "rfpWarning");
  ok(
    BrowserTestUtils.isHidden(rfpWarning),
    "RFP warning hidden when PBM pref disabled again"
  );

  BrowserTestUtils.removeTab(tab);
});

// Ensures the manage exceptions button opens the permissions dialog.
add_task(async function test_manage_exceptions_button_opens_dialog() {
  await SpecialPowers.pushPrefEnv({
    set: [[CAT_PREF, "standard"]],
  });

  let { doc, tab } = await openEtpPage();

  let manageButton = getControl(doc, "etpManageExceptionsButton");
  let dialogPromise = promiseLoadSubDialog(PERMISSIONS_DIALOG_URL);
  synthesizeClick(manageButton);
  let dialogWin = await dialogPromise;
  await dialogWin.document.mozSubdialogReady;
  ok(
    dialogWin.document.getElementById("permissionsBox"),
    "Permissions dialog rendered for manage exceptions"
  );
  let dialogEl = dialogWin.document.querySelector("dialog");
  dialogEl.getButton("cancel").click();
  await BrowserTestUtils.waitForEvent(dialogWin, "unload");

  BrowserTestUtils.removeTab(tab);
});

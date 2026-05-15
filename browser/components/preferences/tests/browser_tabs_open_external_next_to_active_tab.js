/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF_NAME = "browser.link.open_newwindow.override.external";
const PREF_VALUE_FEATURE_OFF = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB_BACKGROUND;
const PREF_VALUE_FEATURE_ON = Ci.nsIBrowserDOMWindow.OPEN_NEWTAB_AFTER_CURRENT;

let resetTelemetry = async () => {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
};

registerCleanupFunction(async () => {
  await resetTelemetry();
});

/**
 * @param {boolean} shouldBeEnabled
 */
async function assertOpenNextToActiveTabSettingsEnabled(shouldBeEnabled) {
  await TestUtils.waitForCondition(
    () =>
      Glean.linkHandling.openNextToActiveTabSettingsEnabled.testGetValue() ===
      shouldBeEnabled,
    "wait for metric to be recorded"
  );
  Assert.equal(
    Glean.linkHandling.openNextToActiveTabSettingsEnabled.testGetValue(),
    shouldBeEnabled,
    `metric should have recorded that the pref is ${shouldBeEnabled ? "on" : "off"}`
  );
}

/**
 * @param {number} nthEvent
 * @param {boolean} shouldBeChecked
 */
async function assertOpenNextToActiveTabSettingsChange(
  nthEvent,
  shouldBeChecked
) {
  await TestUtils.waitForCondition(
    () =>
      Glean.linkHandling.openNextToActiveTabSettingsChange.testGetValue()
        ?.length == nthEvent,
    "wait for event to be recorded"
  );
  let settingsChangeEvents =
    Glean.linkHandling.openNextToActiveTabSettingsChange.testGetValue();
  Assert.ok(settingsChangeEvents, "an event should have been recorded");
  Assert.equal(
    settingsChangeEvents.length,
    nthEvent,
    `${nthEvent} event(s) should have been recorded so far`
  );
  Assert.equal(
    settingsChangeEvents[nthEvent - 1].extra.checked,
    shouldBeChecked.toString(),
    `event #${nthEvent} should record that the checkbox was ${shouldBeChecked ? "checked" : "not checked"}`
  );
}

/**
 * @param {number} expectedCounterValue
 */
async function assertBrowserUiInteraction(expectedCounterValue) {
  await TestUtils.waitForCondition(
    () =>
      Glean.browserUiInteraction.preferencesPaneGeneral?.openAppLinksNextToActiveTab?.testGetValue() ==
      expectedCounterValue,
    "wait for metric to be recorded"
  );
  Assert.equal(
    Glean.browserUiInteraction.preferencesPaneGeneral.openAppLinksNextToActiveTab.testGetValue(),
    expectedCounterValue,
    "click on the pref checkbox should have been counted"
  );
}

add_task(async function test_open_external_link_next_to_active_tab_pref() {
  await SpecialPowers.pushPrefEnv({
    set: [[PREF_NAME, PREF_VALUE_FEATURE_OFF]],
  });
  await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  await resetTelemetry();

  const doc = gBrowser.contentDocument;
  const checkbox = doc.getElementById("openAppLinksNextToActiveTab");

  info("validate default starting conditions");
  Assert.ok(checkbox, "pref should have a checkbox");
  Assert.ok(
    !checkbox.checked,
    "pref checkbox should not be checked when the feature is off"
  );

  info("validate checking and unchecking the pref checkbox");
  let becameChecked = BrowserTestUtils.waitForAttribute("checked", checkbox);
  checkbox.click();
  await becameChecked;

  Assert.equal(
    Services.prefs.getIntPref(PREF_NAME),
    PREF_VALUE_FEATURE_ON,
    "pref should be set to open external links after the active tab"
  );
  await assertOpenNextToActiveTabSettingsEnabled(true);
  await assertOpenNextToActiveTabSettingsChange(1, true);
  await assertBrowserUiInteraction(1);

  let becameUnchecked = BrowserTestUtils.waitForAttributeRemoval(
    "checked",
    checkbox
  );
  checkbox.click();
  await becameUnchecked;

  Assert.ok(
    !Services.prefs.prefHasUserValue(PREF_NAME),
    "pref should have been reverted to its default value"
  );
  await assertOpenNextToActiveTabSettingsEnabled(false);
  await assertOpenNextToActiveTabSettingsChange(2, false);
  await assertBrowserUiInteraction(2);

  await SpecialPowers.popPrefEnv();
  BrowserTestUtils.removeTab(gBrowser.selectedTab, { animate: false });
});

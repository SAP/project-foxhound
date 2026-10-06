const DEFAULT_HW_ACCEL_PREF = Services.prefs
  .getDefaultBranch(null)
  .getBoolPref("layers.acceleration.disabled");
const DEFAULT_PROCESS_COUNT = Services.prefs
  .getDefaultBranch(null)
  .getIntPref("dom.ipc.processCount");

add_task(async function () {
  // We must temporarily disable `Once` StaticPrefs check for the duration of
  // this test (see bug 1556131). We must do so in a separate operation as
  // pushPrefEnv doesn't set the preferences in the order one could expect.
  await SpecialPowers.pushPrefEnv({
    set: [["preferences.force-disable.check.once.policy", true]],
  });
  await SpecialPowers.pushPrefEnv({
    set: [
      ["layers.acceleration.disabled", DEFAULT_HW_ACCEL_PREF],
      ["dom.ipc.processCount", DEFAULT_PROCESS_COUNT],
      ["browser.preferences.defaultPerformanceSettings.enabled", true],
    ],
  });
});

add_task(async function () {
  let prefs = await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  is(prefs.selectedPane, "paneGeneral", "General pane was selected");

  let doc = gBrowser.contentDocument;
  let useRecommendedPerformanceSettings = doc.querySelector(
    "#useRecommendedPerformanceSettings"
  );
  let allowHWAccel = doc.querySelector("#allowHWAccel");

  is(
    Services.prefs.getBoolPref(
      "browser.preferences.defaultPerformanceSettings.enabled"
    ),
    true,
    "pref value should be true before clicking on checkbox"
  );
  ok(
    useRecommendedPerformanceSettings.checked,
    "checkbox should be checked before clicking on checkbox"
  );

  useRecommendedPerformanceSettings.click();
  await allowHWAccel.updateComplete;

  ok(BrowserTestUtils.isVisible(allowHWAccel), "allowHWAccel setting is shown");

  is(
    Services.prefs.getBoolPref(
      "browser.preferences.defaultPerformanceSettings.enabled"
    ),
    false,
    "pref value should be false after clicking on checkbox"
  );
  ok(
    !useRecommendedPerformanceSettings.checked,
    "checkbox should not be checked after clicking on checkbox"
  );

  let allowHWAccelPref = Services.prefs.getBoolPref(
    "layers.acceleration.disabled"
  );
  is(
    allowHWAccelPref,
    DEFAULT_HW_ACCEL_PREF,
    "pref value should be the default value before clicking on checkbox"
  );
  is(
    allowHWAccel.checked,
    !DEFAULT_HW_ACCEL_PREF,
    "checkbox should show the invert of the default value"
  );

  allowHWAccel.click();
  allowHWAccelPref = Services.prefs.getBoolPref("layers.acceleration.disabled");
  is(
    allowHWAccelPref,
    !DEFAULT_HW_ACCEL_PREF,
    "pref value should be opposite of the default value after clicking on checkbox"
  );
  is(
    allowHWAccel.checked,
    !allowHWAccelPref,
    "checkbox should show the invert of the current value"
  );

  allowHWAccel.click();
  allowHWAccelPref = Services.prefs.getBoolPref("layers.acceleration.disabled");
  is(
    allowHWAccelPref,
    DEFAULT_HW_ACCEL_PREF,
    "pref value should be the default value after clicking on checkbox"
  );
  is(
    allowHWAccel.checked,
    !allowHWAccelPref,
    "checkbox should show the invert of the current value"
  );

  ok(
    BrowserTestUtils.isVisible(allowHWAccel),
    "allowHWAccel setting should be still shown"
  );

  Services.prefs.setBoolPref(
    "browser.preferences.defaultPerformanceSettings.enabled",
    true
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function () {
  let prefs = await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  is(prefs.selectedPane, "paneGeneral", "General pane was selected");

  let doc = gBrowser.contentDocument;
  let allowHWAccel = doc.querySelector("#allowHWAccel");

  ok(
    !BrowserTestUtils.isVisible(allowHWAccel),
    "allowHWAccel setting should not be shown"
  );

  Services.prefs.setBoolPref(
    "browser.preferences.defaultPerformanceSettings.enabled",
    false
  );
  await allowHWAccel.updateComplete;

  ok(
    BrowserTestUtils.isVisible(allowHWAccel),
    "allowHWAccel setting should be shown"
  );

  Services.prefs.setBoolPref(
    "browser.preferences.defaultPerformanceSettings.enabled",
    true
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function () {
  Services.prefs.setBoolPref("layers.acceleration.disabled", true);

  let prefs = await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  is(prefs.selectedPane, "paneGeneral", "General pane was selected");

  let doc = gBrowser.contentDocument;

  let allowHWAccel = doc.querySelector("#allowHWAccel");
  ok(
    BrowserTestUtils.isVisible(allowHWAccel),
    "allowHWAccel setting should be shown"
  );

  is(
    Services.prefs.getBoolPref("layers.acceleration.disabled"),
    true,
    "pref value is false"
  );
  ok(!allowHWAccel.checked, "checkbox should not be checked");

  Services.prefs.setBoolPref(
    "browser.preferences.defaultPerformanceSettings.enabled",
    true
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function () {
  // We must temporarily disable `Once` StaticPrefs check for the duration of
  // this test (see bug 1556131). We must do so in a separate operation as
  // pushPrefEnv doesn't set the preferences in the order one could expect.
  await SpecialPowers.pushPrefEnv({
    set: [["preferences.force-disable.check.once.policy", true]],
  });
  await SpecialPowers.pushPrefEnv({
    set: [["layers.acceleration.disabled", false]],
  });

  let prefs = await openPreferencesViaOpenPreferencesAPI(PERF_PREF_PANE, {
    leaveOpen: true,
  });
  is(prefs.selectedPane, PERF_PREF_PANE, `${PERF_PREF_PANE} was selected`);

  let doc = gBrowser.contentDocument;
  let checkbox = doc.querySelector("#allowHWAccel");
  is(
    !checkbox.checked,
    Services.prefs.getBoolPref("layers.acceleration.disabled"),
    "checkbox should represent inverted pref value before clicking on checkbox"
  );

  checkbox.click();

  is(
    !checkbox.checked,
    Services.prefs.getBoolPref("layers.acceleration.disabled"),
    "checkbox should represent inverted pref value after clicking on checkbox"
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

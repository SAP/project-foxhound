/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

async function launchPreferences() {
  let prefs = await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });
  Assert.equal(prefs.selectedPane, "paneGeneral", "General pane was selected");
}

async function reset() {
  // We have to add this in because the initial state of `document_color_use`
  // affects the initial state of color preferenced which can change the
  // starting color values.
  Services.prefs.clearUserPref("browser.anchor_color");
  Services.prefs.clearUserPref("browser.visited_color");
  Services.prefs.clearUserPref("browser.display.foreground_color");
  Services.prefs.clearUserPref("browser.display.background_color");
}

add_setup(async function () {
  info("Setting the test up");
  // Ensure default color values are used:
  reset();
  // Ensure the pref is set to "Always" on all platforms (1 is default on Mac,
  // but on Windows and Linux it's 0, and the colors dialog is available on 2):
  Services.prefs.setIntPref("browser.display.document_color_use", 1);

  registerCleanupFunction(async function () {
    reset();
    Services.prefs.clearUserPref("browser.display.document_color_use");
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });
});

add_task(async function testColorPicker() {
  await launchPreferences();

  const button = gBrowser.contentDocument.getElementById("colors");

  const radioOff = content.document.getElementById("contrastSettingsOff");
  const radioCustom = content.document.getElementById("contrastSettingsOn");

  radioOff.focus();
  Assert.equal(
    radioOff,
    gBrowser.contentDocument.activeElement,
    "Radio group for Custom Colors is focused"
  );
  Assert.ok(button.buttonEl.disabled, "Manage Colors button is disabled");

  // Focus "Custom" Contrast radio button:
  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    radioCustom,
    gBrowser.contentDocument.activeElement,
    "Radio group with option 'Custom' is focused"
  );
  await new Promise(r => requestAnimationFrame(r));
  Assert.ok(!button.buttonEl.disabled, "Manage Colors button is now enabled");

  // Focus "Manage Colors" button:
  EventUtils.synthesizeKey("KEY_Tab");
  Assert.equal(
    button,
    gBrowser.contentDocument.activeElement,
    "Manage Colors button is focused"
  );

  info("Open Colors dialog");
  // Open Colors sub-dialog:
  let promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/preferences/dialogs/colors.xhtml"
  );
  EventUtils.synthesizeKey(" ");
  let colorsDialogWindow = await promiseSubDialogLoaded;
  let colorsDialogDoc = colorsDialogWindow.document;
  Assert.ok(colorsDialogDoc, "Colors dialog exists");
  Assert.ok(
    BrowserTestUtils.isVisible(colorsDialogDoc.getElementById("ColorsDialog")),
    "Colors dialog is visible"
  );

  // Pickers and preferences defaults (should be the same length and order):
  const pickerControlAttrs = [
    "foregroundtextmenu",
    "backgroundmenu",
    "unvisitedlinkmenu",
    "visitedlinkmenu",
  ];
  const prefNames = [
    "browser.display.foreground_color",
    "browser.display.background_color",
    "browser.anchor_color",
    "browser.visited_color",
  ];
  // Values of static preferences (https://searchfox.org/mozilla-central/rev/270c20e4b063d80ce71f029b4adc4ba03a12edc0/modules/libpref/init/StaticPrefList.yaml#1506-1508,1439-1441,1039-1041,2097-2099):
  const colorValuesHex = ["#000000", "#FFFFFF", "#0000EE", "#551A8B"];
  const colorValuesSystem = ["CanvasText", "Canvas", "LinkText", "VisitedText"];

  // Checking the defaults are entered correctly:
  Assert.equal(
    prefNames.length,
    pickerControlAttrs.length,
    "prefNames and pickerControlAttrs arrays have the same length"
  );
  Assert.equal(
    prefNames.length,
    colorValuesHex.length,
    "prefNames and colorValuesHex arrays have the same length"
  );
  Assert.equal(
    prefNames.length,
    colorValuesSystem.length,
    "prefNames and colorValuesSystem arrays have the same length"
  );

  const expectedPickersMap = prefNames.map((pref, i) => ({
    pref,
    id: pickerControlAttrs[i],
    control: pickerControlAttrs[i],
    // Ensure a HEX value and a system color are interchangeable in this
    // scenario, i.e. CanvasText resolves to #000000 in our default test cases:
    expectedValues: [colorValuesSystem[i], colorValuesHex[i]],
  }));

  for (const picker of expectedPickersMap) {
    // Pref:
    const prefValue = Services.prefs.getStringPref(picker.pref, "");
    Assert.ok(prefValue, `Preference with id="${picker.pref}" exists`);
    const prefValueNormalized = prefValue.startsWith("#")
      ? prefValue.toUpperCase()
      : prefValue;

    // Picker:
    const pickerEl = colorsDialogDoc.getElementById(picker.id);
    Assert.ok(pickerEl, `Moz-input-color picker with id="${picker.id}" exists`);
    const pickerValueNormalized = pickerEl.value.startsWith("#")
      ? pickerEl.value.toUpperCase()
      : pickerEl.value;

    info("Test markup of a color picker");

    // Checking default picker attributes:
    Assert.equal(
      pickerEl.getAttribute("id"),
      picker.id,
      `Picker's "id" attribute is as expected`
    );
    Assert.equal(
      pickerEl.getAttribute("control"),
      picker.control,
      `Picker's "control" attribute is as expected`
    );
    Assert.equal(
      pickerEl.getAttribute("preference"),
      picker.pref,
      `Picker's "preference" attribute is as expected`
    );
    Assert.ok(
      picker.expectedValues.includes(prefValueNormalized),
      `Pref ${picker.pref} value "${prefValue}" is one of two expected values: ${picker.expectedValues.join(" or ")}`
    );
    Assert.ok(
      picker.expectedValues.includes(pickerValueNormalized),
      `Picker "${picker.id}" value "${pickerEl.value}" is one of two expected values: ${picker.expectedValues.join(" or ")}`
    );
    Assert.ok(
      pickerEl.hasAttribute("data-l10n-id"),
      `Picker has a localizable ID`
    );
    Assert.equal(
      pickerEl.getAttribute("data-l10n-attrs"),
      "label",
      `Picker has a localizable "label" attribute`
    );
    Assert.ok(pickerEl.label, `Picker has a localizable label text`);

    // Checking pref and picker values are referencing the same actual color:
    const prefValueIsExpected =
      picker.expectedValues.includes(prefValueNormalized);
    const pickerValueIsExpected = picker.expectedValues.includes(
      pickerValueNormalized
    );
    const valuesMatchExactly = prefValueNormalized === pickerValueNormalized;

    Assert.ok(
      valuesMatchExactly || (prefValueIsExpected && pickerValueIsExpected),
      `Pref and picker values should be using the same color:
      pref="${prefValue}", pickerEl="${pickerEl.value}", expected=
      ${picker.expectedValues.join(" or ")}`
    );

    info("Test a color picker is focusable");

    // Confirming the focus location:
    Assert.equal(
      pickerEl,
      colorsDialogDoc.activeElement,
      `The ${picker.id} picker is focused`
    );
    // Move focus to the next picker:
    EventUtils.synthesizeKey("KEY_Tab");
  }
  info("Close Colors dialog");
  EventUtils.synthesizeKey("KEY_Enter");

  // Confirm the focus is returned to the "Manage Colors" button:
  Assert.equal(
    button,
    gBrowser.contentDocument.activeElement,
    "Manage Colors button is focused"
  );
});

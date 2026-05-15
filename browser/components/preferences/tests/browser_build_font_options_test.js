add_task(async function () {
  await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
  await gBrowser.contentWindow.gMainPane._selectDefaultLanguageGroupPromise;
  await TestUtils.waitForCondition(
    () => !gBrowser.contentWindow.Preferences.updateQueued
  );

  let doc = gBrowser.contentDocument;
  let contentWindow = gBrowser.contentWindow;
  let langGroup = Services.locale.fontLanguageGroup;
  let defaultFontType = Services.prefs.getCharPref("font.default." + langGroup);
  let fontFamilyPref = "font.name." + defaultFontType + "." + langGroup;
  let fontFamily = Services.prefs.getCharPref(fontFamilyPref);

  let fontsGroup = doc.querySelector('setting-group[groupid="fonts"]');
  ok(fontsGroup, "Fonts setting-group exists");

  let mozSelect = fontsGroup.querySelector("#defaultFont");
  ok(mozSelect, "defaultFont moz-select exists");
  is(mozSelect.localName, "moz-select", "Control is a moz-select");
  is(mozSelect.value, fontFamily, "Font family should be set correctly.");

  function fontFamilyPrefChanged() {
    return new Promise(resolve => {
      const observer = {
        observe(aSubject, aTopic, aData) {
          if (aData == fontFamilyPref) {
            Services.prefs.removeObserver(fontFamilyPref, observer);
            resolve();
          }
        },
      };
      Services.prefs.addObserver(fontFamilyPref, observer);
    });
  }

  let selectEl = mozSelect.inputEl;
  let options = [...selectEl.options];
  Assert.greater(options.length, 1, "There are multiple font options.");
  is(selectEl.selectedIndex, 0, "The first (default) font option is selected.");

  let prefChangePromise = fontFamilyPrefChanged();
  let pickerOpened = BrowserTestUtils.waitForSelectPopupShown(window);
  mozSelect.focus();
  EventUtils.synthesizeKey(" ", {}, contentWindow);
  await pickerOpened;
  EventUtils.synthesizeKey("KEY_ArrowDown", {}, contentWindow);
  EventUtils.synthesizeKey("KEY_Enter", {}, contentWindow);
  await prefChangePromise;

  fontFamily = Services.prefs.getCharPref(fontFamilyPref);
  is(mozSelect.value, fontFamily, "The font family has been updated.");
  is(selectEl.selectedIndex, 1, "The second font option is now selected.");

  prefChangePromise = fontFamilyPrefChanged();
  pickerOpened = BrowserTestUtils.waitForSelectPopupShown(window);
  mozSelect.focus();
  EventUtils.synthesizeKey(" ", {}, contentWindow);
  await pickerOpened;
  EventUtils.synthesizeKey("KEY_ArrowUp", {}, contentWindow);
  EventUtils.synthesizeKey("KEY_Enter", {}, contentWindow);
  await prefChangePromise;

  // Wait for the setting-control and moz-select Lit render cycles to
  // complete after the pref observer chain runs. Without this, assertions
  // could pass before a corrupted value propagates to the UI (bug 2019296).
  let settingControl = fontsGroup.querySelector("#setting-control-defaultFont");
  await settingControl.updateComplete;
  await mozSelect.updateComplete;

  fontFamily = Services.prefs.getCharPref(fontFamilyPref);
  is(mozSelect.value, fontFamily, "The font family has been updated.");
  is(
    mozSelect.value,
    "",
    "The default font value should be the empty string sentinel."
  );
  is(
    selectEl.selectedIndex,
    0,
    "The first (default) font option is selected again."
  );

  let defaultFontSize = Services.prefs.getIntPref(
    "font.size.variable." + langGroup
  );
  let sizeSelect = fontsGroup.querySelector("#defaultFontSize");
  ok(sizeSelect, "defaultFontSize moz-select exists");
  is(sizeSelect.localName, "moz-select", "Size control is a moz-select");
  is(
    sizeSelect.value,
    String(defaultFontSize),
    "Font size should be set correctly."
  );

  let advancedButton = fontsGroup.querySelector("#advancedFonts");
  ok(advancedButton, "advancedFonts button exists");
  let promiseSubDialogLoaded = promiseLoadSubDialog(
    "chrome://browser/content/preferences/dialogs/fonts.xhtml"
  );
  advancedButton.click();
  let win = await promiseSubDialogLoaded;
  doc = win.document;

  // Simulate a dumb font backend.
  win.FontBuilder._enumerator = {
    _list: ["MockedFont1", "MockedFont2", "MockedFont3"],
    _defaultFont: null,
    EnumerateFontsAsync() {
      return Promise.resolve(this._list);
    },
    EnumerateAllFontsAsync() {
      return Promise.resolve(this._list);
    },
    getDefaultFont() {
      return this._defaultFont;
    },
    getStandardFamilyName(name) {
      return name;
    },
  };
  win.FontBuilder._allFonts = null;
  win.FontBuilder._langGroupSupported = false;

  let langGroupElement = win.Preferences.get("font.language.group");
  let selectLangsField = doc.getElementById("selectLangs");
  let serifField = doc.getElementById("serif");
  let armenian = "x-armn";
  let western = "x-western";

  // Await rebuilding of the font lists, which happens asynchronously in
  // gFontsDialog._selectLanguageGroup.  Testing code needs to call this
  // function and await its resolution after changing langGroupElement's value
  // (or doing anything else that triggers a call to _selectLanguageGroup).
  function fontListsRebuilt() {
    return win.gFontsDialog._selectLanguageGroupPromise;
  }

  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(serifField.value, "", "Font family should not be set.");

  let armenianSerifElement = win.Preferences.get("font.name.serif.x-armn");

  langGroupElement.value = western;
  await fontListsRebuilt();
  selectLangsField.value = western;

  // Simulate a font backend supporting language-specific enumeration.
  // NB: FontBuilder has cached the return value from EnumerateAllFonts(),
  // so _allFonts will always have 3 elements regardless of subsequent
  // _list changes.
  win.FontBuilder._enumerator._list = ["MockedFont2"];

  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(
    serifField.value,
    "",
    "Font family should still be empty for indicating using 'default' font."
  );

  langGroupElement.value = western;
  await fontListsRebuilt();
  selectLangsField.value = western;

  // Simulate a system that has no fonts for the specified language.
  win.FontBuilder._enumerator._list = [];

  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(serifField.value, "", "Font family should not be set.");

  // Setting default font to "MockedFont3".  Then, when serifField.value is
  // empty, it should indicate using "MockedFont3" but it shouldn't be saved
  // to "MockedFont3" in the pref.  It should be resolved at runtime.
  win.FontBuilder._enumerator._list = [
    "MockedFont1",
    "MockedFont2",
    "MockedFont3",
  ];
  win.FontBuilder._enumerator._defaultFont = "MockedFont3";
  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(
    serifField.value,
    "",
    "Font family should be empty even if there is a default font."
  );

  armenianSerifElement.value = "MockedFont2";
  serifField.value = "MockedFont2";
  is(
    serifField.value,
    "MockedFont2",
    'Font family should be "MockedFont2" for now.'
  );

  langGroupElement.value = western;
  await fontListsRebuilt();
  selectLangsField.value = western;
  is(serifField.value, "", "Font family of other language should not be set.");

  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(
    serifField.value,
    "MockedFont2",
    "Font family should not be changed even after switching the language."
  );

  // If MochedFont2 is removed from the system, the value should be treated
  // as empty (i.e., 'default' font) after rebuilding the font list.
  win.FontBuilder._enumerator._list = ["MockedFont1", "MockedFont3"];
  win.FontBuilder._enumerator._allFonts = ["MockedFont1", "MockedFont3"];
  serifField.removeAllItems(); // This will cause rebuilding the font list from available fonts.
  langGroupElement.value = armenian;
  await fontListsRebuilt();
  selectLangsField.value = armenian;
  is(
    serifField.value,
    "",
    "Font family should become empty due to the font uninstalled."
  );

  gBrowser.removeCurrentTab();
});

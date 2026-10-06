/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const LAST_USED_PREF = "browser.urlbar.lastUrlbarSearchSeconds";

add_setup(async function () {
  await SearchTestUtils.installOpenSearchEngine({
    url: getRootDirectory(gTestPath) + "searchSuggestionEngine.xml",
    setAsDefault: true,
  });

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(LAST_USED_PREF);
  });
});

add_task(async () => {
  let initialValue = Services.prefs.getIntPref(LAST_USED_PREF);
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "test",
    waitForFocus: SimpleTest.waitForFocus,
  });

  let loaded = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Enter");
  });
  await loaded;

  let newValue = Services.prefs.getIntPref(LAST_USED_PREF);
  Assert.greater(newValue, initialValue, "The urlbar search was recorded");
});

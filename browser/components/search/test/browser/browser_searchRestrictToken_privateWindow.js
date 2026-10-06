/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const PREF = "browser.search.separatePrivateDefault.ui.enabled";

const CONFIG = [
  {
    recordType: "engine",
    identifier: "basic",
    base: {
      name: "basic",
      urls: {
        search: {
          base: "https://example.com",
          searchTermParamName: "q",
        },
      },
    },
    variants: [{ environment: { allRegionsAndLocales: true } }],
  },
  {
    recordType: "engine",
    identifier: "private",
    base: {
      name: "private",
      urls: {
        search: {
          base: "https://example.com/private",
          searchTermParamName: "q",
        },
      },
    },
    variants: [{ environment: { allRegionsAndLocales: true } }],
  },
  {
    recordType: "defaultEngines",
    globalDefault: "basic",
    globalDefaultPrivate: "private",
    specificDefaults: [],
  },
];

add_setup(async function () {
  await SearchService.init();
  await SpecialPowers.pushPrefEnv({
    set: [[PREF, true]],
  });

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref(PREF);
  });
});

add_task(async function test_restrict_token_private_default() {
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);

  let win = await BrowserTestUtils.openNewBrowserWindow({ private: true });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: win,
    value: "? ",
  });

  let engine = await SearchService.getDefaultPrivate();

  Assert.equal(
    engine._name,
    "private",
    "Private default engine should be used when typing '? ' in a private window"
  );

  let urlbar = win.gURLBar;
  urlbar.value = "test";
  EventUtils.synthesizeKey("KEY_Enter", {}, win);

  await BrowserTestUtils.browserLoaded(win.gBrowser.selectedBrowser, {
    wantLoad: "https://example.com/private?q=test",
  });

  await BrowserTestUtils.closeWindow(win);
});

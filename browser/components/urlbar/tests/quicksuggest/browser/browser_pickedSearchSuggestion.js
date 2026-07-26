/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  CustomizableUITestUtils:
    "resource://testing-common/CustomizableUITestUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "SearchbarTestUtils", () => {
  const { SearchbarTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

add_setup(async function () {
  await PlacesUtils.history.clear();
  await UrlbarTestUtils.formHistory.clear();

  // Set up two app-provided config engines.
  await SearchTestUtils.updateRemoteSettingsConfig([
    {
      recordType: "engine",
      identifier: "appEngine1",
      base: {
        name: "appEngine1",
        urls: {
          search: {
            base: "https://example.com/",
            searchTermParamName: "q",
          },
        },
      },
    },
    {
      recordType: "engine",
      identifier: "appEngine2",
      base: {
        name: "appEngine2",
        urls: {
          search: {
            base: "https://example.com/second",
            searchTermParamName: "q",
          },
        },
      },
    },
    {
      recordType: "defaultEngines",
      globalDefault: "appEngine1",
      specificDefaults: [],
    },
  ]);

  // A non-app-provided engine.
  await SearchTestUtils.installSearchExtension({ name: "AddonEngine" });

  // Enable online Suggest with a mock Merino server. This registers its own
  // teardown (stops the server, clears the online prefs). `scotchBonnet.
  // enableOverride` shows the one-off buttons so `enterSearchMode` can select an
  // engine.
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    merinoSuggestions: [],
    prefs: [["scotchBonnet.enableOverride", false]],
  });
});

add_task(async function basicSelection() {
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let backend = QuickSuggest.getFeature("SuggestBackendMerino");
    Assert.ok(backend, "The Merino backend should exist");

    // Type to create a Merino session (sequence number 0).
    let searchString = "search test";
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: searchString,
      fireInputEvent: true,
    });

    MerinoTestUtils.server.checkAndClearRequests([
      {
        params: {
          [MerinoTestUtils.SEARCH_PARAMS.QUERY]: searchString,
          [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
        },
      },
    ]);

    let sessionID = backend.client.sessionID;
    Assert.ok(sessionID, "A session ID should exist after typing");

    // Select the heuristic result.
    let requestPromise = MerinoTestUtils.server.waitForNextRequest();
    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;
    await requestPromise;

    MerinoTestUtils.server.checkAndClearRequests([
      {
        params: {
          [MerinoTestUtils.SEARCH_PARAMS.QUERY]: searchString,
          [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 1,
          [MerinoTestUtils.SEARCH_PARAMS.SESSION_ID]: sessionID,
        },
      },
    ]);
  });
});

// We should ignore private browsing contexts.
add_task(async function privateWindow() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: privateWin,
    value: "private search",
    fireInputEvent: true,
  });

  let loadPromise = BrowserTestUtils.browserLoaded(
    privateWin.gBrowser.selectedBrowser
  );
  EventUtils.synthesizeKey("KEY_Enter", {}, privateWin);
  await loadPromise;

  MerinoTestUtils.server.checkAndClearRequests([]);

  await BrowserTestUtils.closeWindow(privateWin);
});

// We shouldn't handle non-app-provided engines, even if they are the default.
add_task(async function nonAppProvidedDefault() {
  let originalDefault = SearchService.defaultEngine;
  let addonEngine = SearchService.getEngineByName("AddonEngine");
  await SearchService.setDefault(
    addonEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );

  try {
    await BrowserTestUtils.withNewTab("about:blank", async () => {
      let searchString = "addon default search";
      await UrlbarTestUtils.promiseAutocompleteResultPopup({
        window,
        value: searchString,
        fireInputEvent: true,
      });

      MerinoTestUtils.server.checkAndClearRequests([
        {
          params: {
            [MerinoTestUtils.SEARCH_PARAMS.QUERY]: searchString,
            [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
          },
        },
      ]);

      let loadPromise = BrowserTestUtils.browserLoaded(
        gBrowser.selectedBrowser
      );
      EventUtils.synthesizeKey("KEY_Enter");
      await loadPromise;

      MerinoTestUtils.server.checkAndClearRequests([]);
    });
  } finally {
    await SearchService.setDefault(
      originalDefault,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  }
});

// We shouldn't handle app-provided engines that are not the default engine.
add_task(async function appProvidedNonDefault() {
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    let searchString = "second engine search";
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: searchString,
      fireInputEvent: true,
    });

    MerinoTestUtils.server.checkAndClearRequests([
      {
        params: {
          [MerinoTestUtils.SEARCH_PARAMS.QUERY]: searchString,
          [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
        },
      },
    ]);

    await UrlbarTestUtils.enterSearchMode(window, {
      engineName: "appEngine2",
      source: UrlbarShared.RESULT_SOURCE.SEARCH,
    });

    let loadPromise = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    EventUtils.synthesizeKey("KEY_Enter");
    await loadPromise;

    MerinoTestUtils.server.checkAndClearRequests([]);
  });
});

// We should ignore when online Suggest is disabled.
add_task(async function onlineDisabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.quicksuggest.online.enabled", false]],
  });

  let backend = QuickSuggest.getFeature("SuggestBackendMerino");
  Assert.ok(
    !backend.isEnabled,
    "The Merino backend should be disabled when online Suggest is disabled"
  );

  try {
    await BrowserTestUtils.withNewTab("about:blank", async () => {
      await UrlbarTestUtils.promiseAutocompleteResultPopup({
        window,
        value: "disabled search",
        fireInputEvent: true,
      });

      let loadPromise = BrowserTestUtils.browserLoaded(
        gBrowser.selectedBrowser
      );
      EventUtils.synthesizeKey("KEY_Enter");
      await loadPromise;

      MerinoTestUtils.server.checkAndClearRequests([]);
    });
  } finally {
    await SpecialPowers.popPrefEnv();
  }
});

// We should ignore the searchbar.
add_task(async function searchbar() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", true]],
  });
  let cuiTestUtils = new CustomizableUITestUtils(window);
  await cuiTestUtils.addSearchBar();

  try {
    await BrowserTestUtils.withNewTab("about:blank", async () => {
      await SearchbarTestUtils.promiseAutocompleteResultPopup({
        window,
        value: "searchbar query",
      });

      let loadPromise = BrowserTestUtils.browserLoaded(
        gBrowser.selectedBrowser
      );
      EventUtils.synthesizeKey("KEY_Enter");
      await loadPromise;

      MerinoTestUtils.server.checkAndClearRequests([]);
    });
  } finally {
    // The shared cleanup in head.js only closes the urlbar popup, so make sure
    // the search bar's popup is closed before removing the widget to avoid
    // leaking an open panel into the next test.
    await SearchbarTestUtils.promisePopupClose(window);
    cuiTestUtils.removeSearchBar();
    await SpecialPowers.popPrefEnv();
  }
});

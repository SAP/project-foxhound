/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Main tests for SearchSERPTelemetry - general engine visiting and link clicking.
 */

"use strict";

const { SearchSERPTelemetry } = ChromeUtils.importESModule(
  "resource:///modules/SearchSERPTelemetry.sys.mjs"
);
const { UrlbarTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlbarTestUtils.sys.mjs"
);
const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);

const TEST_PROVIDER_INFO = [
  {
    telemetryId: "example",
    searchPageRegexp: /^https:\/\/example.com\/browser\/browser\/components\/search\/test\/browser\/searchTelemetry(?:Ad)?.html/,
    queryParamName: "s",
    codeParamName: "abc",
    taggedCodes: ["ff"],
    followOnParamNames: ["a"],
    extraAdServersRegexps: [/^https:\/\/example\.com\/ad2?/],
  },
];

function getPageUrl(useAdPage = false) {
  let page = useAdPage ? "searchTelemetryAd.html" : "searchTelemetry.html";
  return `https://example.com/browser/browser/components/search/test/browser/${page}`;
}

/**
 * Returns the index of the first search suggestion in the urlbar results.
 *
 * @returns {number} An index, or -1 if there are no search suggestions.
 */
async function getFirstSuggestionIndex() {
  const matchCount = UrlbarTestUtils.getResultCount(window);
  for (let i = 0; i < matchCount; i++) {
    let result = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
    if (
      result.type == UrlbarUtils.RESULT_TYPE.SEARCH &&
      result.searchParams.suggestion
    ) {
      return i;
    }
  }
  return -1;
}

// sharedData messages are only passed to the child on idle. Therefore
// we wait for a few idles to try and ensure the messages have been able
// to be passed across and handled.
async function waitForIdle() {
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => Services.tm.idleDispatchToMainThread(resolve));
  }
}

SearchTestUtils.init(this);
UrlbarTestUtils.init(this);

add_setup(async function() {
  SearchSERPTelemetry.overrideSearchTelemetryForTests(TEST_PROVIDER_INFO);
  await waitForIdle();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      [
        "browser.newtabpage.activity-stream.improvesearch.handoffToAwesomebar",
        true,
      ],
      // Ensure to add search suggestion telemetry as search_suggestion not search_formhistory.
      ["browser.urlbar.maxHistoricalSearchSuggestions", 0],
      ["browser.search.serpEventTelemetry.enabled", true],
    ],
  });
  // Enable local telemetry recording for the duration of the tests.
  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;
  Services.prefs.setBoolPref("browser.search.log", true);

  await SearchTestUtils.installSearchExtension(
    {
      search_url: getPageUrl(true),
      search_url_get_params: "s={searchTerms}&abc=ff",
      suggest_url:
        "https://example.com/browser/browser/components/search/test/browser/searchSuggestionEngine.sjs",
      suggest_url_get_params: "query={searchTerms}",
    },
    { setAsDefault: true }
  );

  await gCUITestUtils.addSearchBar();

  registerCleanupFunction(async () => {
    gCUITestUtils.removeSearchBar();
    Services.prefs.clearUserPref("browser.search.log");
    SearchSERPTelemetry.overrideSearchTelemetryForTests();
    Services.telemetry.canRecordExtended = oldCanRecord;
    Services.telemetry.clearScalars();
  });
});

async function track_ad_click(
  expectedHistogramSource,
  expectedScalarSource,
  searchAdsFn,
  cleanupFn
) {
  searchCounts.clear();
  Services.telemetry.clearScalars();

  let expectedContentScalarKey = "example:tagged:ff";
  let expectedScalarKey = "example:tagged";
  let expectedHistogramSAPSourceKey = `other-Example.${expectedHistogramSource}`;
  let expectedContentScalar = `browser.search.content.${expectedScalarSource}`;
  let expectedWithAdsScalar = `browser.search.withads.${expectedScalarSource}`;
  let expectedAdClicksScalar = `browser.search.adclicks.${expectedScalarSource}`;

  let tab = await searchAdsFn();

  await assertSearchSourcesTelemetry(
    {
      [expectedHistogramSAPSourceKey]: 1,
    },
    {
      [expectedContentScalar]: { [expectedContentScalarKey]: 1 },
      [expectedWithAdsScalar]: { [expectedScalarKey]: 1 },
    }
  );

  assertImpressionEvents([
    {
      provider: "example",
      tagged: "true",
      partner_code: "ff",
      source: expectedScalarSource,
    },
  ]);

  let pageLoadPromise = BrowserTestUtils.waitForLocationChange(gBrowser);
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.document.getElementById("ad1").click();
  });
  await pageLoadPromise;
  await promiseWaitForAdLinkCheck();

  await assertSearchSourcesTelemetry(
    {
      [expectedHistogramSAPSourceKey]: 1,
    },
    {
      [expectedContentScalar]: { [expectedContentScalarKey]: 1 },
      [expectedWithAdsScalar]: { [expectedScalarKey]: 1 },
      [expectedAdClicksScalar]: { [expectedScalarKey]: 1 },
    }
  );

  assertImpressionEvents([
    {
      provider: "example",
      tagged: "true",
      partner_code: "ff",
      source: expectedScalarSource,
    },
  ]);

  await cleanupFn();

  Services.fog.testResetFOG();
}

add_task(async function test_source_urlbar() {
  let tab;
  await track_ad_click(
    "urlbar",
    "urlbar",
    async () => {
      tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

      await UrlbarTestUtils.promiseAutocompleteResultPopup({
        window,
        value: "searchSuggestion",
      });
      let idx = await getFirstSuggestionIndex();
      Assert.greaterOrEqual(idx, 0, "there should be a first suggestion");
      let loadPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      while (idx--) {
        EventUtils.sendKey("down");
      }
      EventUtils.sendKey("return");
      await loadPromise;
      return tab;
    },
    async () => {
      BrowserTestUtils.removeTab(tab);
    }
  );
});

add_task(async function test_source_urlbar_handoff() {
  let tab;
  await track_ad_click(
    "urlbar-handoff",
    "urlbar_handoff",
    async () => {
      Services.fog.testResetFOG();
      tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
      BrowserTestUtils.loadURIString(tab.linkedBrowser, "about:newtab");
      await BrowserTestUtils.browserStopped(tab.linkedBrowser, "about:newtab");

      info("Focus on search input in newtab content");
      await SpecialPowers.spawn(tab.linkedBrowser, [], async function() {
        const searchInput = content.document.querySelector(".fake-editable");
        searchInput.click();
      });

      info("Get suggestions");
      for (const c of "searchSuggestion".split("")) {
        EventUtils.synthesizeKey(c);
        /* eslint-disable mozilla/no-arbitrary-setTimeout */
        await new Promise(r => setTimeout(r, 50));
      }
      await TestUtils.waitForCondition(async () => {
        const index = await getFirstSuggestionIndex();
        return index >= 0;
      }, "Wait until suggestions are ready");

      let idx = await getFirstSuggestionIndex();
      Assert.greaterOrEqual(idx, 0, "there should be a first suggestion");
      const onLoaded = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      while (idx--) {
        EventUtils.sendKey("down");
      }
      EventUtils.sendKey("return");
      await onLoaded;

      return tab;
    },
    async () => {
      const issueRecords = Glean.newtabSearch.issued.testGetValue();
      Assert.ok(!!issueRecords, "Must have recorded a search issuance");
      Assert.equal(issueRecords.length, 1, "One search, one event");
      const newtabVisitId = issueRecords[0].extra.newtab_visit_id;
      Assert.ok(!!newtabVisitId, "Must have a visit id");
      Assert.deepEqual(
        {
          // Yes, this is tautological. But I want to use deepEqual.
          newtab_visit_id: newtabVisitId,
          search_access_point: "urlbar_handoff",
          telemetry_id: "other-Example",
        },
        issueRecords[0].extra,
        "Must have recorded the expected information."
      );
      const impRecords = Glean.newtabSearchAd.impression.testGetValue();
      Assert.equal(impRecords.length, 1, "One impression, one event.");
      Assert.deepEqual(
        {
          newtab_visit_id: newtabVisitId,
          search_access_point: "urlbar_handoff",
          telemetry_id: "example",
          is_tagged: "true",
          is_follow_on: "false",
        },
        impRecords[0].extra,
        "Must have recorded the expected information."
      );
      const clickRecords = Glean.newtabSearchAd.click.testGetValue();
      Assert.equal(clickRecords.length, 1, "One click, one event.");
      Assert.deepEqual(
        {
          newtab_visit_id: newtabVisitId,
          search_access_point: "urlbar_handoff",
          telemetry_id: "example",
          is_tagged: "true",
          is_follow_on: "false",
        },
        clickRecords[0].extra,
        "Must have recorded the expected information."
      );
      BrowserTestUtils.removeTab(tab);
    }
  );
});

add_task(async function test_source_searchbar() {
  let tab;
  await track_ad_click(
    "searchbar",
    "searchbar",
    async () => {
      tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

      let sb = BrowserSearch.searchBar;
      // Write the search query in the searchbar.
      sb.focus();
      sb.value = "searchSuggestion";
      sb.textbox.controller.startSearch("searchSuggestion");
      // Wait for the popup to show.
      await BrowserTestUtils.waitForEvent(sb.textbox.popup, "popupshown");
      // And then for the search to complete.
      await BrowserTestUtils.waitForCondition(
        () =>
          sb.textbox.controller.searchStatus >=
          Ci.nsIAutoCompleteController.STATUS_COMPLETE_NO_MATCH,
        "The search in the searchbar must complete."
      );

      let loadPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      EventUtils.synthesizeKey("KEY_Enter");
      await loadPromise;
      return tab;
    },
    async () => {
      BrowserTestUtils.removeTab(tab);
    }
  );
});

async function checkAboutPage(
  page,
  expectedHistogramSource,
  expectedScalarSource
) {
  let tab;
  await track_ad_click(
    expectedHistogramSource,
    expectedScalarSource,
    async () => {
      tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

      BrowserTestUtils.loadURIString(tab.linkedBrowser, page);
      await BrowserTestUtils.browserStopped(tab.linkedBrowser, page);

      // Wait for the full load.
      await SpecialPowers.pushPrefEnv({
        set: [
          [
            "browser.newtabpage.activity-stream.improvesearch.handoffToAwesomebar",
            false,
          ],
        ],
      });
      await SpecialPowers.spawn(tab.linkedBrowser, [], async function() {
        await ContentTaskUtils.waitForCondition(
          () => content.wrappedJSObject.gContentSearchController.defaultEngine
        );
      });

      let p = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      await typeInSearchField(
        tab.linkedBrowser,
        "test query",
        "newtab-search-text"
      );
      await BrowserTestUtils.synthesizeKey("VK_RETURN", {}, tab.linkedBrowser);
      await p;
      return tab;
    },
    async () => {
      BrowserTestUtils.removeTab(tab);
      await SpecialPowers.popPrefEnv();
    }
  );
}

add_task(async function test_source_about_home() {
  await checkAboutPage("about:home", "abouthome", "about_home");
});

add_task(async function test_source_about_newtab() {
  await checkAboutPage("about:newtab", "newtab", "about_newtab");
});

add_task(async function test_source_system() {
  let tab;
  await track_ad_click(
    "system",
    "system",
    async () => {
      tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

      let loadPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);

      // This is not quite the same as calling from the commandline, but close
      // enough for this test.
      BrowserSearch.loadSearchFromCommandLine(
        "searchSuggestion",
        false,
        Services.scriptSecurityManager.getSystemPrincipal(),
        gBrowser.selectedBrowser.csp
      );

      await loadPromise;
      return tab;
    },
    async () => {
      BrowserTestUtils.removeTab(tab);
    }
  );
});

add_task(async function test_source_webextension_search() {
  /* global browser */
  async function background(SEARCH_TERM) {
    // Search with no tabId
    browser.search.search({ query: "searchSuggestion", engine: "Example" });
  }

  let searchExtension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["search", "tabs"],
    },
    background,
    useAddonManager: "temporary",
  });

  let tab;
  await track_ad_click(
    "webextension",
    "webextension",
    async () => {
      let tabPromise = BrowserTestUtils.waitForNewTab(gBrowser, null, true);

      await searchExtension.startup();

      return (tab = await tabPromise);
    },
    async () => {
      await searchExtension.unload();
      BrowserTestUtils.removeTab(tab);
    }
  );
});

add_task(async function test_source_webextension_query() {
  async function background(SEARCH_TERM) {
    // Search with no tabId
    browser.search.query({
      text: "searchSuggestion",
      disposition: "NEW_TAB",
    });
  }

  let searchExtension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["search", "tabs"],
    },
    background,
    useAddonManager: "temporary",
  });

  let tab;
  await track_ad_click(
    "webextension",
    "webextension",
    async () => {
      let tabPromise = BrowserTestUtils.waitForNewTab(gBrowser, null, true);

      await searchExtension.startup();

      return (tab = await tabPromise);
    },
    async () => {
      await searchExtension.unload();
      BrowserTestUtils.removeTab(tab);
    }
  );
});

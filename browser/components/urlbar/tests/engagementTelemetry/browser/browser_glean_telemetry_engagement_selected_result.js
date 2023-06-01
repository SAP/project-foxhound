/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the following data of engagement telemetry.
// - selected_result
// - selected_result_subtype
// - provider
// - results

add_setup(async function() {
  await setup();
});

add_task(async function selected_result_autofill_about() {
  await doTest(async browser => {
    await openPopup("about:about");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "autofill_about",
        selected_result_subtype: "",
        provider: "Autofill",
        results: "autofill_about",
      },
    ]);
  });
});

add_task(async function selected_result_autofill_adaptive() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill.adaptiveHistory.enabled", true]],
  });

  await doTest(async browser => {
    await PlacesTestUtils.addVisits("https://example.com/test");
    await UrlbarUtils.addToInputHistory("https://example.com/test", "exa");
    await openPopup("exa");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "autofill_adaptive",
        selected_result_subtype: "",
        provider: "Autofill",
        results: "autofill_adaptive",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_autofill_origin() {
  await doTest(async browser => {
    await PlacesTestUtils.addVisits("https://example.com/test");
    await openPopup("exa");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "autofill_origin",
        selected_result_subtype: "",
        provider: "Autofill",
        results: "autofill_origin,history",
      },
    ]);
  });
});

add_task(async function selected_result_autofill_url() {
  await doTest(async browser => {
    await PlacesTestUtils.addVisits("https://example.com/test");
    await openPopup("https://example.com/test");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "autofill_url",
        selected_result_subtype: "",
        provider: "Autofill",
        results: "autofill_url",
      },
    ]);
  });
});

add_task(async function selected_result_bookmark() {
  await doTest(async browser => {
    await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.unfiledGuid,
      url: "https://example.com/bookmark",
      title: "bookmark",
    });

    await openPopup("bookmark");
    await selectRowByURL("https://example.com/bookmark");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "bookmark",
        selected_result_subtype: "",
        provider: "Places",
        results: "search_engine,action,bookmark",
      },
    ]);
  });
});

add_task(async function selected_result_history() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.autoFill", false]],
  });

  await doTest(async browser => {
    await PlacesTestUtils.addVisits("https://example.com/test");

    await openPopup("example");
    await selectRowByURL("https://example.com/test");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "history",
        selected_result_subtype: "",
        provider: "Places",
        results: "search_engine,history",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_keyword() {
  await doTest(async browser => {
    await PlacesUtils.keywords.insert({
      keyword: "keyword",
      url: "https://example.com/?q=%s",
    });

    await openPopup("keyword test");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "keyword",
        selected_result_subtype: "",
        provider: "BookmarkKeywords",
        results: "keyword",
      },
    ]);

    await PlacesUtils.keywords.remove("keyword");
  });
});

add_task(async function selected_result_search_engine() {
  await doTest(async browser => {
    await openPopup("x");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "search_engine",
        selected_result_subtype: "",
        provider: "HeuristicFallback",
        results: "search_engine",
      },
    ]);
  });
});

add_task(async function selected_result_search_suggest() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      ["browser.urlbar.maxHistoricalSearchSuggestions", 2],
    ],
  });

  await doTest(async browser => {
    await openPopup("foo");
    await selectRowByURL("http://mochi.test:8888/?terms=foofoo");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "search_suggest",
        selected_result_subtype: "",
        provider: "SearchSuggestions",
        results: "search_engine,search_suggest,search_suggest",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_search_history() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.suggest.searches", true],
      ["browser.urlbar.maxHistoricalSearchSuggestions", 2],
    ],
  });

  await doTest(async browser => {
    await UrlbarTestUtils.formHistory.add(["foofoo", "foobar"]);

    await openPopup("foo");
    await selectRowByURL("http://mochi.test:8888/?terms=foofoo");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "search_history",
        selected_result_subtype: "",
        provider: "SearchSuggestions",
        results: "search_engine,search_history,search_history",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_url() {
  await doTest(async browser => {
    await openPopup("https://example.com/");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "url",
        selected_result_subtype: "",
        provider: "HeuristicFallback",
        results: "url",
      },
    ]);
  });
});

add_task(async function selected_result_action() {
  await doTest(async browser => {
    await showResultByArrowDown();
    await selectRowByProvider("quickactions");
    const onLoad = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    doClickSubButton(".urlbarView-quickaction-row[data-key=addons]");
    await onLoad;

    assertEngagementTelemetry([
      {
        selected_result: "action",
        selected_result_subtype: "addons",
        provider: "quickactions",
        results: "action",
      },
    ]);
  });
});

add_task(async function selected_result_tab() {
  const tab = BrowserTestUtils.addTab(gBrowser, "https://example.com/");

  await doTest(async browser => {
    await openPopup("example");
    await selectRowByProvider("Places");
    EventUtils.synthesizeKey("KEY_Enter");
    await BrowserTestUtils.waitForCondition(() => gBrowser.selectedTab === tab);

    assertEngagementTelemetry([
      {
        selected_result: "tab",
        selected_result_subtype: "",
        provider: "Places",
        results: "search_engine,search_suggest,search_suggest,tab",
      },
    ]);
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function selected_result_remote_tab() {
  const remoteTab = await loadRemoteTab("https://example.com");

  await doTest(async browser => {
    await openPopup("example");
    await selectRowByProvider("RemoteTabs");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "remote_tab",
        selected_result_subtype: "",
        provider: "RemoteTabs",
        results: "search_engine,remote_tab",
      },
    ]);
  });

  await remoteTab.unload();
});

add_task(async function selected_result_addon() {
  const addon = loadOmniboxAddon({ keyword: "omni" });
  await addon.startup();

  await doTest(async browser => {
    await openPopup("omni test");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "addon",
        selected_result_subtype: "",
        provider: "Omnibox",
        results: "addon",
      },
    ]);
  });

  await addon.unload();
});

add_task(async function selected_result_tab_to_search() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.tabToSearch.onboard.interactionsLeft", 0]],
  });

  await SearchTestUtils.installSearchExtension({
    name: "mozengine",
    search_url: "https://mozengine/",
  });

  await doTest(async browser => {
    for (let i = 0; i < 3; i++) {
      await PlacesTestUtils.addVisits(["https://mozengine/"]);
    }

    await openPopup("moze");
    await selectRowByProvider("TabToSearch");
    const onComplete = UrlbarTestUtils.promiseSearchComplete(window);
    EventUtils.synthesizeKey("KEY_Enter");
    await onComplete;

    assertEngagementTelemetry([
      {
        selected_result: "tab_to_search",
        selected_result_subtype: "",
        provider: "TabToSearch",
        results: "search_engine,tab_to_search,history",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_top_site() {
  await doTest(async browser => {
    await addTopSites("https://example.com/");
    await showResultByArrowDown();
    await selectRowByURL("https://example.com/");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "top_site",
        selected_result_subtype: "",
        provider: "UrlbarProviderTopSites",
        results: "top_site,action",
      },
    ]);
  });
});

add_task(async function selected_result_calc() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.suggest.calculator", true]],
  });

  await doTest(async browser => {
    await openPopup("8*8");
    await selectRowByProvider("calculator");
    await SimpleTest.promiseClipboardChange("64", () => {
      EventUtils.synthesizeKey("KEY_Enter");
    });

    assertEngagementTelemetry([
      {
        selected_result: "calc",
        selected_result_subtype: "",
        provider: "calculator",
        results: "search_engine,calc",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_unit() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.unitConversion.enabled", true]],
  });

  await doTest(async browser => {
    await openPopup("1m to cm");
    await selectRowByProvider("UnitConversion");
    await SimpleTest.promiseClipboardChange("100 cm", () => {
      EventUtils.synthesizeKey("KEY_Enter");
    });

    assertEngagementTelemetry([
      {
        selected_result: "unit",
        selected_result_subtype: "",
        provider: "UnitConversion",
        results: "search_engine,unit",
      },
    ]);
  });

  await SpecialPowers.popPrefEnv();
});

add_task(async function selected_result_suggest_sponsor() {
  const cleanupQuickSuggest = await ensureQuickSuggestInit();

  await doTest(async browser => {
    await openPopup("sponsored");
    await selectRowByURL("https://example.com/sponsored");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "suggest_sponsor",
        selected_result_subtype: "",
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,suggest_sponsor",
      },
    ]);
  });

  cleanupQuickSuggest();
});

add_task(async function selected_result_suggest_non_sponsor() {
  const cleanupQuickSuggest = await ensureQuickSuggestInit();

  await doTest(async browser => {
    await openPopup("nonsponsored");
    await selectRowByURL("https://example.com/nonsponsored");
    await doEnter();

    assertEngagementTelemetry([
      {
        selected_result: "suggest_non_sponsor",
        selected_result_subtype: "",
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,suggest_non_sponsor",
      },
    ]);
  });

  cleanupQuickSuggest();
});

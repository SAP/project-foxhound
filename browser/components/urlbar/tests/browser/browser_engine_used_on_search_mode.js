/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests config engines are marked as used when search mode is entered.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ConfigSearchEngine:
    "moz-src:///toolkit/components/search/ConfigSearchEngine.sys.mjs",
});

const CONFIG = [
  {
    recordType: "engine",
    identifier: "Example",
    base: {
      name: "Example",
      urls: {
        search: {
          base: "https://www.example.com/",
          searchTermParamName: "q",
        },
      },
      aliases: ["example"],
    },
  },
];

add_setup(async function setup() {
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
});

add_task(async function test_engine_used_on_search_mode_entry() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let engine = SearchService.getEngineByName("Example");

  Assert.equal(
    engine instanceof ConfigSearchEngine,
    true,
    `${engine.name} should be a config engine.`
  );
  Assert.equal(
    engine.hasBeenUsed,
    false,
    `${engine.name} should not be marked as used before entering search mode.`
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: engine.aliases[0],
  });

  // Pick the keyword offer result to enter search mode.
  let searchPromise = UrlbarTestUtils.promiseSearchComplete(window);
  EventUtils.synthesizeKey("KEY_Enter");
  await searchPromise;

  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: engine.name,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    entry: "keywordoffer",
  });

  Assert.equal(
    engine.hasBeenUsed,
    true,
    `${engine.name} should be marked as used after entering search mode.`
  );

  engine.clearUsage();
  await UrlbarTestUtils.exitSearchMode(window);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_engine_already_used_on_search_mode_entry() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let engine = SearchService.getEngineByName("Example");
  engine.markAsUsed();

  Assert.equal(
    engine.hasBeenUsed,
    true,
    `${engine.name} should already be marked as used before entering search mode.`
  );

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: engine.aliases[0],
  });

  // Pick the keyword offer result to enter search mode.
  let searchPromise = UrlbarTestUtils.promiseSearchComplete(window);
  EventUtils.synthesizeKey("KEY_Enter");
  await searchPromise;

  await UrlbarTestUtils.assertSearchMode(window, {
    engineName: engine.name,
    source: UrlbarUtils.RESULT_SOURCE.SEARCH,
    entry: "keywordoffer",
  });

  Assert.equal(
    engine.hasBeenUsed,
    true,
    `${engine.name} should remain marked as used after entering search mode again.`
  );

  engine.clearUsage();
  await UrlbarTestUtils.exitSearchMode(window);
  BrowserTestUtils.removeTab(tab);
});

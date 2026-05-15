/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the Ask result in the urlbar.
 *
 * The ask result in the urlbar should appear for certain prompts in the smart
 * window, and when clicked, should trigger a chat in the assistant sidebar.
 */

"use strict";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  IntentClassifier:
    "moz-src:///browser/components/aiwindow/models/IntentClassifier.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "UrlbarTestUtils", () => {
  const { UrlbarTestUtils } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  UrlbarTestUtils.init(this);
  return UrlbarTestUtils;
});

ChromeUtils.defineLazyGetter(lazy, "UrlbarSearchUtils", () => {
  const { UrlbarSearchUtils } = ChromeUtils.importESModule(
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs"
  );
  UrlbarSearchUtils.init(this);
  return UrlbarSearchUtils;
});

let gIntentEngineStub;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "hello"];
      const formattedPrompt = query.toLowerCase();
      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      // Simulate model confidence scores
      if (isSearch) {
        return [
          { label: "search", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      return [
        { label: "chat", score: 0.95 },
        { label: "search", score: 0.05 },
      ];
    },
  };

  gIntentEngineStub = sinon
    .stub(lazy.IntentClassifier, "_createEngine")
    .resolves(fakeIntentEngine);
  registerCleanupFunction(() => {
    sinon.restore();
  });

  await lazy.UrlbarSearchUtils.init();

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  // Set required prefs
  Services.prefs.setBoolPref("browser.ml.enable", true);
});

add_task(async function test_chat_intent_in_aiwindow() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  // Open new tab - regular page
  const url = "https://example.com/";
  await BrowserTestUtils.openNewForegroundTab(win.gBrowser, url);
  // We want a normal visit, not a 404, to have it appear in the urlbar results.
  await lazy.PlacesTestUtils.addVisits(Services.io.newURI(url + "hello"));

  // Make a search in the urlbar.
  await lazy.UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: win,
    value: "Hello",
  });

  Assert.equal(
    lazy.UrlbarTestUtils.getResultCount(win),
    3,
    "There should be three results in the view."
  );
  let firstResult = await lazy.UrlbarTestUtils.getDetailsOfResultAt(win, 0);
  Assert.equal(
    firstResult.type,
    UrlbarUtils.RESULT_TYPE.SEARCH,
    "The first result should be a search."
  );
  let secondResult = await lazy.UrlbarTestUtils.getDetailsOfResultAt(win, 1);
  Assert.equal(
    secondResult.type,
    UrlbarUtils.RESULT_TYPE.AI_CHAT,
    "The second result should be AI chat."
  );
  let thirdResult = await lazy.UrlbarTestUtils.getDetailsOfResultAt(win, 2);
  Assert.equal(
    thirdResult.type,
    UrlbarUtils.RESULT_TYPE.URL,
    "The third result should be a URL result."
  );

  // Pick the AI chat result.
  let telemetries = Glean.urlbar.engagement.testGetValue() ?? [];
  Assert.equal(
    telemetries.length,
    0,
    "Found the expected number of telemetry events for urlbar engagement"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
  EventUtils.synthesizeKey("VK_RETURN", {}, win);
  telemetries = Glean.urlbar.engagement.testGetValue();
  Assert.equal(
    telemetries.length,
    1,
    "Found the expected number of telemetry events for urlbar engagement"
  );
  Assert.equal(
    telemetries[0].extra.selected_result,
    "ai_chat",
    "The selected result should be AI chat."
  );
  Assert.equal(
    telemetries[0].extra.selected_position,
    2,
    "The selected result should be in the correct position."
  );

  await BrowserTestUtils.closeWindow(win);
  Services.fog.testResetFOG();
});

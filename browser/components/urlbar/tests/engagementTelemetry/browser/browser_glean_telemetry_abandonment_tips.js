/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for abandonment telemetry for tips using Glean.

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser-tips/head.js",
  this
);

add_setup(async function() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.searchEngagementTelemetry.enabled", true],
      ["browser.urlbar.searchTips.test.ignoreShowLimits", true],
      ["browser.urlbar.showSearchTerms.featureGate", true],
    ],
  });
  const engine = await SearchTestUtils.promiseNewSearchEngine({
    url:
      "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/searchSuggestionEngine.xml",
  });
  const originalDefaultEngine = await Services.search.getDefault();
  await Services.search.setDefault(
    engine,
    Ci.nsISearchService.CHANGE_REASON_UNKNOWN
  );
  await Services.search.moveEngine(engine, 0);

  registerCleanupFunction(async function() {
    await SpecialPowers.popPrefEnv();
    await Services.search.setDefault(
      originalDefaultEngine,
      Ci.nsISearchService.CHANGE_REASON_UNKNOWN
    );
    resetSearchTipsProvider();
  });
});

add_task(async function tip_persist() {
  await doTest(async browser => {
    await showPersistSearchTip("test");
    gURLBar.focus();
    await UrlbarTestUtils.promisePopupClose(window, () => {
      gURLBar.blur();
    });

    assertAbandonmentTelemetry([{ results: "tip_persist" }]);
  });
});

add_task(async function mouse_down_with_tip() {
  await doTest(async browser => {
    await showPersistSearchTip("test");
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeMouseAtCenter(browser, {});
    });

    assertAbandonmentTelemetry([{ results: "tip_persist" }]);
  });
});

add_task(async function mouse_down_without_tip() {
  await doTest(async browser => {
    EventUtils.synthesizeMouseAtCenter(browser, {});

    assertAbandonmentTelemetry([]);
  });
});

async function showPersistSearchTip(word) {
  await openPopup(word);
  await doEnter();
  await BrowserTestUtils.waitForCondition(async () => {
    for (let i = 0; i < UrlbarTestUtils.getResultCount(window); i++) {
      const detail = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
      if (detail.result.payload?.type === "searchTip_persist") {
        return true;
      }
    }
    return false;
  });
}

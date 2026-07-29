/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for abandonment telemetry for tips using Glean.

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser-tips/head.js",
  this
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.searchTips.test.ignoreShowLimits", true],
      ["browser.urlbar.showSearchTerms.featureGate", true],
    ],
  });
  const engine = await SearchTestUtils.installOpenSearchEngine({
    url: "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/searchSuggestionEngine.xml",
  });
  const originalDefaultEngine = await SearchService.getDefault();
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);
  await SearchService.moveEngine(engine, 0);

  registerCleanupFunction(async function () {
    await SpecialPowers.popPrefEnv();
    await SearchService.setDefault(
      originalDefaultEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
    resetSearchTipsProvider();
  });
});

add_task(async function mouse_down_without_tip() {
  await doTest(async browser => {
    // We intentionally turn off this a11y check, because the following click
    // is sent to test the telemetry behavior using an alternative way of the
    // urlbar dismissal, where other ways are accessible, therefore this test
    // can be ignored.
    AccessibilityUtils.setEnv({
      mustHaveAccessibleRule: false,
    });
    EventUtils.synthesizeMouseAtCenter(browser, {});
    AccessibilityUtils.resetEnv();

    assertAbandonmentTelemetry([]);
  });
});

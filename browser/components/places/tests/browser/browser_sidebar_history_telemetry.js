/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { TelemetryTestUtils } = ChromeUtils.import(
  "resource://testing-common/TelemetryTestUtils.jsm"
);
const firstNodeIndex = 0;

function mockPromptService(response) {
  let promptService = {
    // The prompt returns 1 for cancelled and 0 for accepted.
    _response: response,
    QueryInterface: ChromeUtils.generateQI(["nsIPromptService"]),
    confirmEx: () => promptService._response,
  };

  Services.prompt = promptService;

  return promptService;
}

add_setup(async function() {
  await PlacesUtils.history.clear();

  // Visited pages listed by descending visit date.
  let pages = [
    "https://sidebar.mozilla.org/a",
    "https://sidebar.mozilla.org/b",
    "https://sidebar.mozilla.org/c",
    "https://www.mozilla.org/d",
  ];

  // Add some visited page.
  let time = Date.now();
  let places = [];
  for (let i = 0; i < pages.length; i++) {
    places.push({
      uri: NetUtil.newURI(pages[i]),
      visitDate: (time - i) * 1000,
      transition: PlacesUtils.history.TRANSITION_TYPED,
    });
  }
  await PlacesTestUtils.addVisits(places);

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });
});

add_task(async function test_click_multiple_history_entries() {
  await withSidebarTree("history", async tree => {
    tree.ownerDocument.getElementById("byday").doCommand();

    // Select the first link and click on it.
    tree.selectNode(tree.view.nodeForTreeIndex(firstNodeIndex));
    is(
      tree.selectedNode.title,
      "Today",
      "The Today history sidebar button is selected"
    );

    // if a user tries to open all history items and they cancel opening
    // those items in new tabs (due to max tab limit warning),
    // no telemetry should be recorded
    mockPromptService(1);
    await SpecialPowers.pushPrefEnv({
      set: [["browser.tabs.maxOpenBeforeWarn", 4]],
    });

    // open multiple history items with a single click
    synthesizeClickOnSelectedTreeCell(tree, { button: 1 });

    TelemetryTestUtils.assertScalarUnset(
      TelemetryTestUtils.getProcessScalars("parent", true, true),
      "sidebar.link"
    );

    // if they proceed with opening history multiple history items despite the warning,
    // telemetry should be recorded
    mockPromptService(0);
    synthesizeClickOnSelectedTreeCell(tree, { button: 1 });

    TelemetryTestUtils.assertKeyedScalar(
      TelemetryTestUtils.getProcessScalars("parent", true, true),
      "sidebar.link",
      "history",
      4
    );
  });

  // reset the mockPromptService
  let { prompt } = Services;
  Services.prompt = prompt;
  await SpecialPowers.popPrefEnv();

  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
});

add_task(async function test_search_and_filter() {
  let cumulativeSearchesHistogram = Services.telemetry.getHistogramById(
    "PLACES_SEARCHBAR_CUMULATIVE_SEARCHES"
  );
  cumulativeSearchesHistogram.clear();
  let cumulativeFilterCountHistogram = Services.telemetry.getHistogramById(
    "PLACES_SEARCHBAR_CUMULATIVE_FILTER_COUNT"
  );
  cumulativeFilterCountHistogram.clear();

  await withSidebarTree("history", async tree => {
    // Apply a search filter.
    tree.ownerDocument.getElementById("bylastvisited").doCommand();
    info("Search filter was changed to bylastvisited");

    // Search the tree.
    let searchBox = tree.ownerDocument.getElementById("search-box");
    searchBox.value = "sidebar.mozilla";
    searchBox.doCommand();
    info("Tree was searched with sting sidebar.mozilla");

    searchBox.value = "";
    searchBox.doCommand();
    info("Search was reset");

    // Perform a second search.
    searchBox.value = "sidebar.mozilla";
    searchBox.doCommand();
    info("Second search was performed");

    // Select the first link and click on it.
    tree.selectNode(tree.view.nodeForTreeIndex(firstNodeIndex));
    synthesizeClickOnSelectedTreeCell(tree, { button: 1 });
    info("First link was selected and then clicked on");

    TelemetryTestUtils.assertKeyedScalar(
      TelemetryTestUtils.getProcessScalars("parent", true, true),
      "sidebar.link",
      "history",
      1
    );
  });

  TelemetryTestUtils.assertHistogram(cumulativeSearchesHistogram, 2, 1);
  info("Cumulative search telemetry looks right");

  TelemetryTestUtils.assertHistogram(cumulativeFilterCountHistogram, 1, 1);
  info("Cumulative search filter telemetry looks right");

  cumulativeSearchesHistogram.clear();
  cumulativeFilterCountHistogram.clear();

  await withSidebarTree("history", async tree => {
    // Apply a search filter.
    tree.ownerDocument.getElementById("byday").doCommand();
    info("First search filter applied");

    // Apply another search filter.
    tree.ownerDocument.getElementById("bylastvisited").doCommand();
    info("Second search filter applied");

    // Apply a search filter.
    tree.ownerDocument.getElementById("byday").doCommand();
    info("Third search filter applied");

    // Search the tree.
    let searchBox = tree.ownerDocument.getElementById("search-box");
    searchBox.value = "sidebar.mozilla";
    searchBox.doCommand();

    // Select the first link and click on it.
    tree.selectNode(tree.view.nodeForTreeIndex(firstNodeIndex));
    synthesizeClickOnSelectedTreeCell(tree, { button: 1 });

    TelemetryTestUtils.assertKeyedScalar(
      TelemetryTestUtils.getProcessScalars("parent", true, true),
      "sidebar.link",
      "history",
      1
    );
  });

  TelemetryTestUtils.assertHistogram(cumulativeSearchesHistogram, 1, 1);
  TelemetryTestUtils.assertHistogram(cumulativeFilterCountHistogram, 3, 1);

  cumulativeSearchesHistogram.clear();
  cumulativeFilterCountHistogram.clear();
  while (gBrowser.tabs.length > 1) {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
});

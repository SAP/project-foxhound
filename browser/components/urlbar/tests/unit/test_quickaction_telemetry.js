/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ActionsProviderQuickActions:
    "moz-src:///browser/components/urlbar/ActionsProviderQuickActions.sys.mjs",
  UrlbarProviderActionsSearchMode:
    "moz-src:///browser/components/urlbar/UrlbarProviderActionsSearchMode.sys.mjs",
});

add_task(async function test_inputLength_not_nan_in_search_mode() {
  let context = createContext("", {
    searchMode: { source: UrlbarUtils.RESULT_SOURCE.ACTIONS },
  });

  let provider = new UrlbarProviderActionsSearchMode();
  let results = [];
  await provider.startQuery(context, (_provider, result) => {
    results.push(result);
  });

  Assert.greater(results.length, 0, "Got results from search mode"); // should return all quick actions
  for (let result of results) {
    Assert.ok(
      !isNaN(result.payload.inputLength),
      `inputLength should not be NaN, got: ${result.payload.inputLength}`
    );
    Assert.equal(
      result.payload.inputLength,
      0,
      "inputLength should be 0 for empty search string in search mode"
    );
  }
});

add_task(async function test_inputLength_with_search_string_in_search_mode() {
  let context = createContext("pri", {
    searchMode: { source: UrlbarUtils.RESULT_SOURCE.ACTIONS },
  });

  let provider = new UrlbarProviderActionsSearchMode();
  let results = [];
  await provider.startQuery(context, (_provider, result) => {
    results.push(result);
  });

  Assert.greater(results.length, 0, "Got results from search mode"); // Print page, Open private window
  for (let result of results) {
    Assert.equal(
      result.payload.inputLength,
      3, // length of "pri"
      "inputLength should match the length of the search string"
    );
  }
});

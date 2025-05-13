/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

// This test checks that searching for "@" provides restrict keywords
// (@bookmarks, @history, @tabs), and verifies that selecting one of
// these keywords enters the appropriate search mode.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  UrlbarTokenizer: "resource:///modules/UrlbarTokenizer.sys.mjs",
});

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.searchRestrictKeywords.featureGate", true]],
  });
});

async function getRestrictKeywordResult(window, restrictToken) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "@",
  });

  let result;
  let resultCount = await UrlbarTestUtils.getResultCount(window);

  for (let index = 0; !result && index < resultCount; index++) {
    let details = await UrlbarTestUtils.getDetailsOfResultAt(window, index);

    if (details.result.payload.keyword == restrictToken) {
      Assert.equal(
        details.displayed.title,
        `Search with ${details.result.payload.l10nRestrictKeyword}`,
        "The result's title is set correctly."
      );

      result = await UrlbarTestUtils.waitForAutocompleteResultAt(window, index);
    }
  }

  return result;
}

async function exitSearchModeAndClosePanel() {
  await UrlbarTestUtils.exitSearchMode(window);
  await UrlbarTestUtils.promisePopupClose(window, () =>
    EventUtils.synthesizeKey("KEY_Escape")
  );
}

async function assertRestrictKeywordResult(window, restrictToken) {
  let restrictResult = await getRestrictKeywordResult(window, restrictToken);

  let searchPromise = UrlbarTestUtils.promiseSearchComplete(window);
  EventUtils.synthesizeMouseAtCenter(restrictResult, {});
  await searchPromise;

  let searchMode = UrlbarUtils.searchModeForToken(
    restrictResult.result.payload.keyword
  );
  await UrlbarTestUtils.assertSearchMode(window, {
    ...searchMode,
    entry: "keywordoffer",
  });

  await exitSearchModeAndClosePanel();
}

add_task(async function test_search_restrict_keyword_results() {
  const restrictTokens = [
    UrlbarTokenizer.RESTRICT.HISTORY,
    UrlbarTokenizer.RESTRICT.BOOKMARK,
    UrlbarTokenizer.RESTRICT.OPENPAGE,
  ];

  for (const restrictToken of restrictTokens) {
    await assertRestrictKeywordResult(window, restrictToken);
  }
});

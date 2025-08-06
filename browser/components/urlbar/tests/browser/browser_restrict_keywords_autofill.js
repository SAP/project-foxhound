/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

// Tests autofill functionality for restrict keywords (@tabs, @bookmarks,
// @history, @actions) by typing the full or partial keyword to enter local
// search mode.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  UrlbarTokenizer: "resource:///modules/UrlbarTokenizer.sys.mjs",
});

let gFluentStrings = new Localization(["browser/browser.ftl"]);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.searchRestrictKeywords.featureGate", true]],
  });
});

async function assertAutofill(
  searchString,
  searchMode,
  entry,
  userEventAction
) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: searchString,
  });

  if (userEventAction) {
    userEventAction();
  }
  await UrlbarTestUtils.assertSearchMode(window, {
    ...searchMode,
    entry,
    restrictType: "keyword",
  });

  await UrlbarTestUtils.exitSearchMode(window);
}

async function getSearchModeKeywords() {
  let searchModeKeys = [
    "urlbar-search-mode-bookmarks",
    "urlbar-search-mode-tabs",
    "urlbar-search-mode-history",
    "urlbar-search-mode-actions",
  ];

  let [bookmarks, tabs, history, actions] = await Promise.all(
    searchModeKeys.map(key =>
      gFluentStrings.formatValue(key).then(str => `@${str.toLowerCase()}`)
    )
  );

  return [bookmarks, tabs, history, actions];
}

add_task(async function test_autofill_enters_search_mode() {
  let [bookmarks, tabs, history, actions] = await getSearchModeKeywords();

  const keywordToToken = new Map([
    [history, UrlbarTokenizer.RESTRICT.HISTORY],
    [bookmarks, UrlbarTokenizer.RESTRICT.BOOKMARK],
    [tabs, UrlbarTokenizer.RESTRICT.OPENPAGE],
    [actions, UrlbarTokenizer.RESTRICT.ACTION],
  ]);

  for (const [keyword, token] of keywordToToken) {
    let searchMode = UrlbarUtils.searchModeForToken(token);
    let searchString = `${keyword} `;

    info("Test full keyword");
    await assertAutofill(searchString, searchMode, "typed", null);

    info("Test partial keyword autofill by pressing right arrow");
    searchString = keyword.slice(0, 3);
    await assertAutofill(searchString, searchMode, "typed", () =>
      EventUtils.synthesizeKey("KEY_ArrowRight")
    );

    info("Test partial keyword autofill by pressing enter");
    await assertAutofill(searchString, searchMode, "keywordoffer", () =>
      EventUtils.synthesizeKey("KEY_Enter")
    );
  }
});

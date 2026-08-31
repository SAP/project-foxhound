/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  let original = await SearchService.getDefault();
  registerCleanupFunction(() => {
    SearchService.setDefault(original, SearchService.CHANGE_REASON.UNKNOWN);
  });
});

add_task(async function test_search_suggestion_normal() {
  let engine = await addTestSuggestionsEngine(q => [q]);
  SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);
  await doTest({
    context: createContext("test", {
      providers: ["UrlbarProviderSearchSuggestions"],
      isPrivate: false,
    }),
    expected: [
      {
        title: "test",
        highlights: {
          title: UrlbarUtils.HIGHLIGHT.SUGGESTED,
        },
      },
    ],
  });
});

add_task(async function test_search_tail() {
  let engine = await addTestTailSuggestionsEngine(searchStr => {
    let suffixes = ["tail"];
    return [
      "test t",
      suffixes.map(s => searchStr + s.slice(1)),
      [],
      {
        "google:irrelevantparameter": [],
        "google:suggestdetail": suffixes.map(s => ({
          mp: "… ",
          t: s,
        })),
      },
    ];
  });
  SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  await doTest({
    context: createContext("test t", {
      providers: ["UrlbarProviderSearchSuggestions"],
      isPrivate: false,
    }),
    expected: [
      {
        title: "tail",
        tail: "tail",
        highlights: {
          title: UrlbarUtils.HIGHLIGHT.SUGGESTED,
        },
      },
    ],
  });
});

async function doTest({ context, expected }) {
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let controller = UrlbarTestUtils.newMockController({
    input: {
      isPrivate: context.isPrivate,
      onFirstResult() {
        return false;
      },
      getSearchSource() {
        return "dummy-search-source";
      },
      window: {
        location: {
          href: AppConstants.BROWSER_CHROME_URL,
        },
      },
    },
  });
  controller.setView({
    get visibleResults() {
      return context.results;
    },
    controller: {
      removeResult() {},
    },
  });

  await controller.startQuery(context);

  Assert.equal(context.results.length, expected.length);
  for (let i = 0; i < context.results.length; i++) {
    info(`Test for index[${i}]`);
    let actualResult = context.results[i];
    let expectedResult = expected[i];
    Assert.equal(actualResult.payload.title, expectedResult.title);
    Assert.equal(actualResult.payload.tail, expectedResult.tail);
    Assert.deepEqual(actualResult.testHighlights, expectedResult.highlights);
  }
}

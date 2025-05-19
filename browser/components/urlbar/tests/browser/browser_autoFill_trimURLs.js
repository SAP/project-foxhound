/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// This test ensures that autoFilled values are not trimmed, unless the user
// selects from the autocomplete popup.

"use strict";

add_setup(async function () {
  SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.trimURLs", true],
      ["browser.urlbar.autoFill", true],
    ],
  });
  registerCleanupFunction(async function () {
    await PlacesUtils.history.clear();
    gURLBar.handleRevert();
  });

  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();

  // Adding a tab would hit switch-to-tab, so it's safer to just add a visit.
  await PlacesTestUtils.addVisits([
    {
      uri: "http://www.autofilltrimurl.com/whatever",
    },
    {
      uri: "https://www.secureautofillurl.com/whatever",
    },
  ]);
});

async function promiseSearch(searchtext) {
  await UrlbarTestUtils.inputIntoURLBar(window, searchtext);
  await UrlbarTestUtils.promiseSearchComplete(window);
}

async function promiseTestResult(test) {
  info(`Searching for '${test.search}'`);

  await promiseSearch(test.search);

  Assert.equal(
    gURLBar.value,
    test.autofilledValue,
    `Autofilled value is as expected for search '${test.search}'`
  );

  let result = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);

  Assert.equal(
    result.displayed.title,
    test.resultListDisplayTitle != BrowserUIUtils.trimURLProtocol
      ? BrowserUIUtils.trimURL(test.resultListDisplayTitle)
      : test.resultListDisplayTitle,
    `Autocomplete result should have displayed title as expected for search '${test.search}'`
  );

  Assert.equal(
    result.displayed.action,
    test.resultListActionText,
    `Autocomplete action text should be as expected for search '${test.search}'`
  );

  Assert.equal(
    result.type,
    test.resultListType,
    `Autocomplete result should have searchengine for the type for search '${test.search}'`
  );

  Assert.equal(
    !!result.searchParams,
    !!test.searchParams,
    "Should have search params if expected"
  );
  if (test.searchParams) {
    let definedParams = {};
    for (let [k, v] of Object.entries(result.searchParams)) {
      if (v !== undefined) {
        definedParams[k] = v;
      }
    }
    Assert.deepEqual(
      definedParams,
      test.searchParams,
      "Shoud have the correct search params"
    );
  } else {
    Assert.equal(
      result.url,
      test.finalCompleteValue,
      "Should have the correct URL/finalCompleteValue"
    );
  }
}

const tests = [
  {
    search: "http://",
    autofilledValue: "http://",
    resultListDisplayTitle: "http://",
    resultListActionText: "Search with Google",
    resultListType: UrlbarUtils.RESULT_TYPE.SEARCH,
    searchParams: {
      engine: "Google",
      query: "http://",
    },
  },
  {
    search: "https://",
    autofilledValue: "https://",
    resultListDisplayTitle: "https://",
    resultListActionText: "Search with Google",
    resultListType: UrlbarUtils.RESULT_TYPE.SEARCH,
    searchParams: {
      engine: "Google",
      query: "https://",
    },
  },
  {
    search: "au",
    autofilledValue: "autofilltrimurl.com/",
    resultListDisplayTitle: "http://www.autofilltrimurl.com",
    resultListActionText: "Visit",
    resultListType: UrlbarUtils.RESULT_TYPE.URL,
    finalCompleteValue: "http://www.autofilltrimurl.com/",
  },
  {
    search: "http://au",
    autofilledValue: "http://autofilltrimurl.com/",
    resultListDisplayTitle: "http://www.autofilltrimurl.com",
    resultListActionText: "Visit",
    resultListType: UrlbarUtils.RESULT_TYPE.URL,
    finalCompleteValue: "http://www.autofilltrimurl.com/",
  },
  {
    search: "sec",
    autofilledValue: "secureautofillurl.com/",
    resultListDisplayTitle: "https://www.secureautofillurl.com",
    resultListActionText: "Visit",
    resultListType: UrlbarUtils.RESULT_TYPE.URL,
    finalCompleteValue: "https://www.secureautofillurl.com/",
  },
  {
    search: "https://sec",
    autofilledValue: "https://secureautofillurl.com/",
    resultListDisplayTitle: "https://www.secureautofillurl.com",
    resultListActionText: "Visit",
    resultListType: UrlbarUtils.RESULT_TYPE.URL,
    finalCompleteValue: "https://www.secureautofillurl.com/",
  },
];

add_task(async function autofill_tests() {
  for (let test of tests) {
    await promiseTestResult(test);
  }
});

add_task(async function autofill_complete_domain() {
  await promiseSearch("http://www.autofilltrimurl.com");
  Assert.equal(
    gURLBar.value,
    "http://www.autofilltrimurl.com/",
    "Should have the correct autofill value"
  );

  // Now ensure selecting from the popup correctly trims.
  Assert.equal(
    UrlbarTestUtils.getResultCount(window),
    2,
    "Should have the correct matches"
  );
  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    gURLBar.value,
    "http://www.autofilltrimurl.com/whatever",
    "Should not have applied trim"
  );
});

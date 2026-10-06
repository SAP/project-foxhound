/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests `UrlbarResult.getDisplayableValueAndHighlights()`, including titles for
// various types of results, especially results with URLs.

"use strict";

// Tests titles for Places URL results (history/visits).
add_task(async function title_places_history() {
  const TEST_DATA = [
    {
      url: "https://example.com/foo/bar",
      title: "Example",
      expected: {
        payloadTitle: "Example",
        displayableTitle: {
          value: "Example",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "https://example.com/foo/bar",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "example.com",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "file:///foo/bar/example.txt",
      title: "Example file URL",
      expected: {
        payloadTitle: "Example file URL",
        displayableTitle: {
          value: "Example file URL",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "file:///foo/bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo/bar/example.txt",
          highlights: [[16, 7]],
        },
      },
    },
    // URL without a domain that should be unescaped for display
    {
      url: "file:///foo%20bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo bar/example.txt",
          highlights: [[16, 7]],
        },
      },
    },
  ];

  for (let { url, title, expected } of TEST_DATA) {
    await PlacesTestUtils.addVisits({
      url,
      title,
    });

    let context = createContext("example", {
      providers: ["UrlbarProviderPlaces"],
      isPrivate: false,
    });
    await check_results({
      context,
      matches: [
        makeVisitResult(context, {
          uri: url,
          title: expected.payloadTitle,
        }),
      ],
    });

    doTitleTest({ context, expected: expected.displayableTitle });

    await PlacesUtils.history.clear();
  }
});

// Tests titles for Places bookmark results.
add_task(async function title_places_bookmark() {
  const TEST_DATA = [
    {
      url: "https://example.com/foo/bar",
      title: "Example",
      expected: {
        payloadTitle: "Example",
        displayableTitle: {
          value: "Example",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "https://example.com/foo/bar",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "example.com",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "data:text/html,<h1>example</h1>",
      title: "Example data URI",
      expected: {
        payloadTitle: "Example data URI",
        displayableTitle: {
          value: "Example data URI",
          highlights: [[0, 7]],
        },
      },
    },
    {
      url: "data:text/html,<h1>example</h1>",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "data:text/html,<h1>example</h1>",
          highlights: [[19, 7]],
        },
      },
    },
    // URL without a domain that should be unescaped for display
    {
      url: "file:///foo%20bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo bar/example.txt",
          highlights: [[16, 7]],
        },
      },
    },
  ];

  for (let { url, title, expected } of TEST_DATA) {
    await PlacesUtils.bookmarks.insert({
      url,
      title,
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    });

    let context = createContext("example", {
      providers: ["UrlbarProviderPlaces"],
      isPrivate: false,
    });
    await check_results({
      context,
      matches: [
        makeBookmarkResult(context, {
          uri: url,
          title: expected.payloadTitle,
        }),
      ],
    });

    doTitleTest({ context, expected: expected.displayableTitle });

    await PlacesUtils.bookmarks.eraseEverything();
  }
});

// Tests titles for input history URL results.
add_task(async function title_inputHistory_url() {
  const TEST_DATA = [
    {
      url: "https://example.com/foo/bar",
      title: "Example",
      expected: {
        payloadTitle: "Example",
        displayableTitle: {
          value: "Example",
          highlights: [],
        },
      },
    },
    {
      url: "https://example.com/foo/bar",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "example.com",
          highlights: [],
        },
      },
    },
    {
      url: "file:///foo/bar/example.txt",
      title: "Example file URL",
      expected: {
        payloadTitle: "Example file URL",
        displayableTitle: {
          value: "Example file URL",
          highlights: [],
        },
      },
    },
    {
      url: "file:///foo/bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo/bar/example.txt",
          highlights: [],
        },
      },
    },
    // URL without a domain that should be unescaped for display
    {
      url: "file:///foo%20bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo bar/example.txt",
          highlights: [],
        },
      },
    },
  ];

  for (let { url, title, expected } of TEST_DATA) {
    await PlacesTestUtils.addVisits({
      url,
      title,
    });
    await UrlbarUtils.addToInputHistory(url, "inputhistory");

    let context = createContext("inputhistory", {
      providers: ["UrlbarProviderInputHistory"],
      isPrivate: false,
    });
    await check_results({
      context,
      matches: [
        makeVisitResult(context, {
          uri: url,
          title: expected.payloadTitle,
        }),
      ],
    });

    doTitleTest({ context, expected: expected.displayableTitle });

    await PlacesUtils.history.clear();
    await PlacesTestUtils.clearInputHistory();
  }
});

// Tests titles for generic URL results from a test provider.
add_task(async function title_genericUrlResult() {
  const TEST_DATA = [
    // URLs with a domain
    {
      url: "https://example.com/foo/bar",
      title: "Example URL",
      expected: {
        payloadTitle: "Example URL",
        displayableTitle: {
          value: "Example URL",
          highlights: undefined,
        },
      },
    },
    {
      url: "https://example.com/foo/bar",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "example.com",
          highlights: [[0, 7]],
        },
      },
    },
    // URLs without a domain
    {
      url: "file:///foo/bar/example.txt",
      title: "Example file URL",
      expected: {
        payloadTitle: "Example file URL",
        displayableTitle: {
          value: "Example file URL",
          highlights: undefined,
        },
      },
    },
    {
      url: "file:///foo/bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo/bar/example.txt",
          highlights: [[16, 7]],
        },
      },
    },
    // URL without a domain that should be unescaped for display
    {
      url: "file:///foo%20bar/example.txt",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "file:///foo bar/example.txt",
          highlights: [[16, 7]],
        },
      },
    },
    // Invalid URLs
    {
      url: "not a valid URL",
      title: "This is not a valid URL",
      expected: {
        payloadTitle: "This is not a valid URL",
        displayableTitle: {
          value: "This is not a valid URL",
          highlights: undefined,
        },
      },
    },
    {
      url: "not a valid %20 URL",
      title: undefined,
      expected: {
        payloadTitle: "",
        displayableTitle: {
          value: "not a valid %20 URL",
          highlights: [],
        },
      },
    },
  ];

  for (let { url, title, expected } of TEST_DATA) {
    let result = new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.OTHER_NETWORK,
      payload: {
        url,
        title,
      },
    });

    doTitleTest({
      result,
      context: createContext("example"),
      expected: expected.displayableTitle,
    });
  }
});

add_task(function highlight_typed() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens },
    expected: {
      value: "https://test.example.com/",
      highlights: [[8, 4]],
    },
  });
});

add_task(function highlight_suggested() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.SEARCH,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      suggestion: "test search test",
    },
    highlights: {
      suggestion: UrlbarUtils.HIGHLIGHT.SUGGESTED,
    },
  });

  doTest({
    result,
    target: "suggestion",
    options: { tokens: queryContext.tokens },
    expected: {
      value: "test search test",
      highlights: [[4, 8]],
    },
  });
});

add_task(function highlight_all() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.ALL,
    },
  });

  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens },
    expected: {
      value: "https://test.example.com/",
      highlights: [[0, 25]],
    },
  });
});

add_task(function option_isURL() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens, isURL: true },
    expected: {
      value: "test.example.com",
      highlights: [[0, 4]],
    },
  });
});

add_task(function option_no_tokens() {
  let queryContext = createContext("");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens },
    expected: {
      value: "https://test.example.com/",
      highlights: undefined,
    },
  });
});

add_task(function option_nothing() {
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  doTest({
    result,
    target: "url",
    expected: {
      value: "https://test.example.com/",
      highlights: undefined,
    },
  });
});

add_task(function invalid_target() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  doTest({
    result,
    target: "invalid",
    options: { tokens: queryContext.tokens },
    expected: {
      value: undefined,
      highlights: undefined,
    },
  });
});

add_task(function cache() {
  let queryContext = createContext("test");
  let result = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    payload: {
      url: "https://test.example.com/",
    },
    highlights: {
      url: UrlbarUtils.HIGHLIGHT.TYPED,
    },
  });

  info("Get without any options");
  doTest({
    result,
    target: "url",
    expected: {
      value: "https://test.example.com/",
      highlights: undefined,
    },
  });

  info("Get with tokens");
  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens },
    expected: {
      value: "https://test.example.com/",
      highlights: [[8, 4]],
    },
  });

  info("Get with different isURL");
  doTest({
    result,
    target: "url",
    options: { tokens: queryContext.tokens, isURL: true },
    expected: {
      value: "test.example.com",
      highlights: [[0, 4]],
    },
  });

  info("Get without tokens");
  doTest({
    result,
    target: "url",
    options: { isURL: true },
    expected: {
      value: "test.example.com",
      highlights: [[0, 4]],
    },
  });

  info("Get without different tokens");
  let anotherQueryContext = createContext("example");
  doTest({
    result,
    target: "url",
    options: { tokens: anotherQueryContext.tokens },
    expected: {
      value: "https://test.example.com/",
      highlights: [[13, 7]],
    },
  });
});

function doTest({ result, target, options, expected }) {
  let { value, highlights } = result.getDisplayableValueAndHighlights(
    target,
    options
  );
  Assert.equal(value, expected.value);
  Assert.deepEqual(highlights, expected.highlights);
}

function doTitleTest({ context, expected, result = context.results[0] }) {
  doTest({
    result,
    expected,
    target: "title",
    options: {
      tokens: context.tokens,
    },
  });
}

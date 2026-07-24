/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// `UrlbarResult`s without titles should be shown with proper titles in the
// view, especially results with URLs.

const NO_TITLE_URL =
  "http://mochi.test:8888/browser/browser/components/urlbar/tests/browser/no_title.html";

ChromeUtils.defineESModuleGetters(this, {
  UrlbarProviderInputHistory:
    "moz-src:///browser/components/urlbar/UrlbarProviderInputHistory.sys.mjs",
  UrlbarProviderPlaces:
    "moz-src:///browser/components/urlbar/UrlbarProviderPlaces.sys.mjs",
});

add_setup(async function () {
  registerCleanupFunction(async () => {
    await PlacesTestUtils.clearInputHistory();
    await PlacesUtils.history.clear();
  });
});

add_task(async function places_history() {
  await PlacesTestUtils.addVisits({
    url: NO_TITLE_URL,
    title: "",
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mochi",
  });

  await checkTitleElement({
    target: {
      type: UrlbarUtils.RESULT_TYPE.URL,
      url: NO_TITLE_URL,
      providerName: UrlbarProviderPlaces.name,
    },
    expected: {
      title: "mochi.test:8888",
      highlightedText: "mochi",
    },
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function places_switchToTab() {
  await doSwitchToTabTest({
    target: {
      url: NO_TITLE_URL,
      providerName: UrlbarProviderPlaces.name,
    },
    searchString: "mochi",
    expected: {
      title: "mochi.test:8888",
      highlightedText: "mochi",
    },
  });

  await PlacesUtils.history.clear();
});

add_task(async function places_bookmark() {
  let bookmark = await PlacesUtils.bookmarks.insert({
    url: NO_TITLE_URL,
    title: "",
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mochi",
  });

  await checkTitleElement({
    target: {
      type: UrlbarUtils.RESULT_TYPE.URL,
      url: NO_TITLE_URL,
      providerName: UrlbarProviderPlaces.name,
    },
    expected: {
      title: "mochi.test:8888",
      highlightedText: "mochi",
    },
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.bookmarks.remove(bookmark);
});

add_task(async function inputHistory() {
  await PlacesTestUtils.addVisits({
    url: NO_TITLE_URL,
    title: "",
  });
  await UrlbarUtils.addToInputHistory(NO_TITLE_URL, "inputhistory");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "inputhistory",
  });

  await checkTitleElement({
    target: {
      type: UrlbarUtils.RESULT_TYPE.URL,
      url: NO_TITLE_URL,
      providerName: UrlbarProviderInputHistory.name,
    },
    expected: {
      title: "mochi.test:8888",
    },
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesTestUtils.clearInputHistory();
  await PlacesUtils.history.clear();
});

add_task(async function inputHistory_switchToTab() {
  await PlacesTestUtils.addVisits({
    url: NO_TITLE_URL,
    title: "",
  });
  await UrlbarUtils.addToInputHistory(NO_TITLE_URL, "inputhistory");

  await doSwitchToTabTest({
    target: {
      url: NO_TITLE_URL,
      providerName: UrlbarProviderInputHistory.name,
    },
    searchString: "inputhistory",
    expected: {
      title: "mochi.test:8888",
    },
  });

  await PlacesTestUtils.clearInputHistory();
  await PlacesUtils.history.clear();
});

add_task(async function genericUrlResult_domain_noTitle() {
  await doGenericUrlResultTest({
    payload: {
      url: "https://example-with-domain.com/foo/bar",
    },
    searchString: "with-domain",
    expected: {
      title: "example-with-domain.com",
      highlightedText: "with-domain",
    },
  });
});

add_task(async function genericUrlResult_domain_title() {
  await doGenericUrlResultTest({
    payload: {
      url: "https://example-with-domain.com/foo/bar",
      title: "Title for URL with domain",
    },
    searchString: "with-domain",
    expected: {
      title: "Title for URL with domain",
    },
  });
});

add_task(async function genericUrlResult_noDomain_noTitle() {
  await doGenericUrlResultTest({
    payload: {
      // URL without a domain that should be unescaped for display
      url: "file:///foo%20bar/baz.txt",
    },
    searchString: "baz.txt",
    expected: {
      title: "file:///foo bar/baz.txt",
      highlightedText: "baz.txt",
    },
  });
});

add_task(async function genericUrlResult_noDomain_title() {
  await doGenericUrlResultTest({
    payload: {
      url: "file:///foo/bar/baz.txt",
      title: "Title for URL without domain",
    },
    searchString: "baz.txt",
    expected: {
      title: "Title for URL without domain",
    },
  });
});

add_task(async function genericUrlResult_invalid_noTitle() {
  await doGenericUrlResultTest({
    payload: {
      url: "this is not a valid URL",
    },
    searchString: "valid",
    expected: {
      title: "this is not a valid URL",
      highlightedText: "valid",
    },
  });
});

add_task(async function genericUrlResult_invalid_title() {
  await doGenericUrlResultTest({
    payload: {
      url: "this is not a valid URL",
      title: "Title for invalid URL",
    },
    searchString: "valid",
    expected: {
      title: "Title for invalid URL",
    },
  });
});

async function doSwitchToTabTest({ target, searchString, expected }) {
  await BrowserTestUtils.withNewTab({ gBrowser, url: target.url }, async () => {
    await BrowserTestUtils.withNewTab({ gBrowser }, async () => {
      await UrlbarTestUtils.promiseAutocompleteResultPopup({
        window,
        value: searchString,
      });

      await checkTitleElement({
        expected,
        target: {
          ...target,
          type: UrlbarUtils.RESULT_TYPE.TAB_SWITCH,
        },
      });

      await UrlbarTestUtils.promisePopupClose(window);
    });
  });
}

async function doGenericUrlResultTest({ payload, searchString, expected }) {
  let provider = new UrlbarTestUtils.TestProvider({
    priority: Infinity,
    results: [
      new UrlbarResult({
        type: UrlbarUtils.RESULT_TYPE.URL,
        source: UrlbarUtils.RESULT_SOURCE.OTHER_NETWORK,
        payload,
      }),
    ],
  });

  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(provider);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: searchString,
  });

  await checkTitleElement({
    expected,
    target: {
      type: UrlbarUtils.RESULT_TYPE.URL,
      url: payload.url,
      providerName: provider.name,
    },
  });

  await UrlbarTestUtils.promisePopupClose(window);
  providersManager.unregisterProvider(provider);
}

async function checkTitleElement({ target, expected }) {
  let row;
  for (let i = 0; i < UrlbarTestUtils.getResultCount(window); i++) {
    let details = await UrlbarTestUtils.getDetailsOfResultAt(window, i);
    if (
      details.url == target.url &&
      details.type == target.type &&
      details.result.providerName == target.providerName
    ) {
      row = details.element.row;
      break;
    }
  }

  Assert.ok(!!row, "Row should have been found");

  let titleElement = row.querySelector(".urlbarView-title");
  Assert.ok(!!titleElement, "Title element should exist");
  Assert.equal(
    titleElement.textContent,
    expected.title,
    "Title element text content should be correct"
  );

  let strong = titleElement.querySelector("strong");
  Assert.equal(
    !!strong,
    !!expected.highlightedText,
    "Title element should have `strong` text iff highlights are expectd"
  );
  if (expected.highlightedText) {
    Assert.equal(
      strong.textContent,
      expected.highlightedText,
      "Highlighted text should be correct"
    );
  }
}

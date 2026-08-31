/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENGINE_TEST_URL =
  "http://mochi.test:8888/browser/browser/components/search/test/browser/opensearch.html";
const EXPECTED_URL =
  "http://mochi.test:8888/browser/browser/components/search/test/browser/?search&test=";
const NOTIFICATION_VALUE = "install-search-engine";

const CONFIG = [
  {
    recordType: "engine",
    identifier: "Example",
    base: {
      name: "Example",
      urls: {
        search: {
          base: "https://www.example.com/",
          searchTermParamName: "q",
        },
      },
      aliases: ["example"],
    },
  },
];

const CONFIG_2 = [
  {
    recordType: "engine",
    identifier: "Foo Config",
    base: {
      name: "Foo Config",
      urls: {
        search: {
          base: ENGINE_TEST_URL,
          searchTermParamName: "q",
        },
      },
      aliases: ["foo config"],
    },
  },
];

let loadUri = async uri => {
  let loaded = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    uri
  );
  BrowserTestUtils.startLoadingURIString(gBrowser.selectedBrowser, uri);
  await loaded;
};

let performContextualSearch = async query => {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: query,
  });

  let onLoad = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    EXPECTED_URL + query
  );
  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Enter");
  await onLoad;
};

async function enterAndAssertContextualSearch(
  query,
  expectedEngineName,
  source
) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: query,
  });

  let searchPromise = UrlbarTestUtils.promiseSearchComplete(window);
  EventUtils.synthesizeKey("KEY_Tab");
  EventUtils.synthesizeKey("KEY_Enter");
  await searchPromise;

  let expected = {
    engineName: expectedEngineName,
    entry: "keywordoffer",
  };

  if (source !== undefined) {
    expected.source = source;
  }
  await UrlbarTestUtils.assertSearchMode(window, expected);
  await UrlbarTestUtils.exitSearchMode(window);
  await UrlbarTestUtils.promisePopupClose(window);
}

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.contextualSearch.enabled", true],
      ["browser.urlbar.scotchBonnet.enableOverride", true],
    ],
  });
});

add_task(async function test_contextualsearch_install_deny() {
  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("search");

  info("The first search only performs a search");
  await UrlbarTestUtils.assertSearchMode(window, null);

  let notificationBar =
    window.gNotificationBox.getNotificationWithValue(NOTIFICATION_VALUE);
  Assert.ok(!notificationBar, "No notification is shown");

  let notificationPromise = BrowserTestUtils.waitForGlobalNotificationBar(
    window,
    NOTIFICATION_VALUE
  );

  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("newsearch");

  let notification = await notificationPromise;
  notification.buttonContainer
    .querySelector("[data-l10n-id=install-search-engine-no]")
    .click();

  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("thirdsearch");

  notificationBar =
    window.gNotificationBox.getNotificationWithValue(NOTIFICATION_VALUE);
  Assert.ok(!notificationBar, "No notification is not shown after deny chosen");

  SearchService._settings.setMetaDataAttribute("contextual-engines-seen", {});
});

add_task(async function test_contextualsearch_install() {
  let initialEngines = await SearchService.getVisibleEngines();
  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("search");

  info("The first search only performs a search");
  await UrlbarTestUtils.assertSearchMode(window, null);

  let notificationBar =
    window.gNotificationBox.getNotificationWithValue(NOTIFICATION_VALUE);
  Assert.ok(!notificationBar, "No notification is shown");

  let notificationPromise = BrowserTestUtils.waitForGlobalNotificationBar(
    window,
    NOTIFICATION_VALUE
  );
  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("newsearch");
  let notification = await notificationPromise;

  let promiseEngineAdded = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.ADDED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );
  notification.buttonContainer
    .querySelector("[data-l10n-id=install-search-engine-add]")
    .click();
  await promiseEngineAdded;

  Assert.greater(
    (await SearchService.getVisibleEngines()).length,
    initialEngines.length,
    "New engine was installed"
  );

  info("The third search uses the installed engine and navigates immediately");
  await loadUri(ENGINE_TEST_URL);
  await performContextualSearch("search");
  await UrlbarTestUtils.assertSearchMode(window, null);

  let engine = SearchService.getEngineByName("Foo");
  await SearchService.removeEngine(engine);
  SearchService._settings.setMetaDataAttribute("contextual-engines-seen", {});
});

add_task(async function test_contextualsearch_extension_set_as_default() {
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
  let example = SearchService.getEngineByName("Example");
  await SearchService.setDefault(example, SearchService.CHANGE_REASON.UNKNOWN);
  Assert.equal(
    SearchService.defaultEngine,
    example,
    "default should be config engine."
  );

  info("Install an Addon engine with a similar name");
  await SearchTestUtils.installSearchExtension({
    name: "Example Test",
    search_url: "https://example.com/",
    search_url_get_params: "q={searchTerms}",
  });

  await enterAndAssertContextualSearch(
    "example",
    "Example",
    UrlbarUtils.RESULT_SOURCE.SEARCH
  );

  let exampleTest = SearchService.getEngineByName("Example Test");
  await SearchService.setDefault(
    exampleTest,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(
    SearchService.defaultEngine,
    exampleTest,
    "default engine should be the extension engine."
  );

  await enterAndAssertContextualSearch("example", "Example Test");
  await SearchService.removeEngine(exampleTest);
});

add_task(async function test_contextualsearch_open_search_set_as_default() {
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG_2);
  let fooConfig = SearchService.getEngineByName("Foo Config");
  await SearchService.setDefault(
    fooConfig,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  Assert.equal(
    SearchService.defaultEngine,
    fooConfig,
    "default should be config engine."
  );

  info("Install an OpenSearch engine with a similar name");
  await SearchTestUtils.installOpenSearchEngine({
    url: "chrome://mochitests/content/browser/browser/components/search/test/browser/testEngine.xml",
  });

  await enterAndAssertContextualSearch(
    "foo",
    "Foo Config",
    UrlbarUtils.RESULT_SOURCE.SEARCH
  );

  info("Change default to OpenSearch engine.");
  let foo = SearchService.getEngineByName("Foo");
  await SearchService.setDefault(foo, SearchService.CHANGE_REASON.UNKNOWN);
  Assert.equal(
    SearchService.defaultEngine,
    foo,
    "default engine should be the OpenSearch engine."
  );

  await enterAndAssertContextualSearch("foo", "Foo");
  await SearchService.removeEngine(foo);
});

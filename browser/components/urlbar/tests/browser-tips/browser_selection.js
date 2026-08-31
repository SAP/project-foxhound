/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests keyboard selection within UrlbarUtils.RESULT_TYPE.TIP results.

"use strict";

const HELP_URL = "about:mozilla";
const TIP_URL = "about:about";
const LEARN_MORE_TOPIC = "test-learn-more";
const LEARN_MORE_URL =
  Services.urlFormatter.formatURLPref("app.support.baseURL") + LEARN_MORE_TOPIC;

add_task(async function tipIsSecondResult() {
  let results = [
    new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.HISTORY,
      payload: {
        url: "http://mozilla.org/a",
        helpUrl: "http://example.com/",
        isBlockable: true,
        blockL10n: { id: "urlbar-result-menu-remove-from-history" },
      },
    }),
    makeTipResult({
      buttonUrl: TIP_URL,
      helpUrl: HELP_URL,
      descriptionL10n: {
        id: "urlbar-result-market-opt-in-description",
        parseMarkup: true,
      },
      descriptionLearnMoreTopic: LEARN_MORE_TOPIC,
    }),
  ];

  let provider = new UrlbarTestUtils.TestProvider({ results, priority: 1 });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(provider);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    value: "test",
    window,
  });

  Assert.equal(
    UrlbarTestUtils.getResultCount(window),
    2,
    "There should be two results in the view."
  );
  let secondResult = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
  Assert.equal(
    secondResult.type,
    UrlbarUtils.RESULT_TYPE.TIP,
    "The second result should be a tip."
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    0,
    "The first result's row element should be selected."
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-0"
    ),
    "The selected element should be the tip button."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    2,
    "Selected element index"
  );
  Assert.equal(
    gURLBar.value,
    TIP_URL,
    "Input value should be the button's URL"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-result-menu"
    ),
    "The selected element should be the tip menu button."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedRowIndex(window),
    1,
    "getSelectedRowIndex should return 1 even though the menu button is selected."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    3,
    "Selected element index"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.equal(
    UrlbarTestUtils.getSelectedElement(window).dataset.l10nName,
    "learn-more-link",
    "The selected element should be the learn-more link."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedRowIndex(window),
    1,
    "getSelectedRowIndex should return 1 when the learn-more link is selected."
  );
  Assert.equal(
    gURLBar.value,
    LEARN_MORE_URL,
    "Input value should be the learn-more URL"
  );

  // Don't check `UrlbarTestUtils.getSelectedElementIndex(window)`. The link
  // won't have an `elementIndex`, so `getSelectedElementIndex()` will return
  // undefined. It won't have an `elementIndex` because the `<a>` is created
  // lazily when the Fluent `descriptionL10n` string is fetched, and element
  // indexes are assigned before that, when the view updates row indices.

  EventUtils.synthesizeKey("KEY_ArrowDown");
  EventUtils.synthesizeKey("KEY_ArrowUp");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-0"
    ),
    "The selected element should be the tip button."
  );
  Assert.equal(
    gURLBar.value,
    TIP_URL,
    "Input value should be the button's URL"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  providersManager.unregisterProvider(provider);
});

add_task(async function tipIsOnlyResult() {
  let results = [
    makeTipResult({
      buttonUrl: TIP_URL,
      helpUrl: HELP_URL,
      descriptionL10n: {
        id: "urlbar-result-market-opt-in-description",
        parseMarkup: true,
      },
      descriptionLearnMoreTopic: LEARN_MORE_TOPIC,
    }),
  ];

  let provider = new UrlbarTestUtils.TestProvider({ results, priority: 1 });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(provider);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    value: "test",
    window,
  });

  Assert.equal(
    UrlbarTestUtils.getResultCount(window),
    1,
    "There should be one result in the view."
  );
  let firstResult = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    firstResult.type,
    UrlbarUtils.RESULT_TYPE.TIP,
    "The first and only result should be a tip."
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-0"
    ),
    "The selected element should be the tip button."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    0,
    "The first element should be selected."
  );
  Assert.equal(
    gURLBar.value,
    TIP_URL,
    "Input value should be the button's URL"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-result-menu"
    ),
    "The selected element should be the tip menu button."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    1,
    "The second element should be selected."
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.equal(
    UrlbarTestUtils.getSelectedElement(window).dataset.l10nName,
    "learn-more-link",
    "The selected element should be the learn-more link."
  );
  Assert.equal(
    gURLBar.value,
    LEARN_MORE_URL,
    "Input value should be the learn-more URL"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    -1,
    "There should be no selection."
  );

  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true });
  Assert.equal(
    UrlbarTestUtils.getSelectedElement(window).dataset.l10nName,
    "learn-more-link",
    "The selected element should be the learn-more link."
  );
  Assert.equal(
    gURLBar.value,
    LEARN_MORE_URL,
    "Input value should be the learn-more URL"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  providersManager.unregisterProvider(provider);
});

add_task(async function tipHasNoResultMenuButton() {
  let results = [
    new UrlbarResult({
      type: UrlbarUtils.RESULT_TYPE.URL,
      source: UrlbarUtils.RESULT_SOURCE.HISTORY,
      payload: {
        url: "http://mozilla.org/a",
        helpUrl: "http://example.com/",
        isBlockable: true,
        blockL10n: { id: "urlbar-result-menu-remove-from-history" },
      },
    }),

    // No `helpUrl` means no result-menu button.
    makeTipResult({
      buttonUrl: TIP_URL,
      descriptionL10n: {
        id: "urlbar-result-market-opt-in-description",
        parseMarkup: true,
      },
      descriptionLearnMoreTopic: LEARN_MORE_TOPIC,
    }),
  ];

  let provider = new UrlbarTestUtils.TestProvider({ results, priority: 1 });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(provider);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    value: "test",
    window,
  });

  Assert.equal(
    UrlbarTestUtils.getResultCount(window),
    2,
    "There should be two results in the view."
  );
  let secondResult = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
  Assert.equal(
    secondResult.type,
    UrlbarUtils.RESULT_TYPE.TIP,
    "The second result should be a tip."
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    0,
    "The first result's row element should be selected."
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-0"
    ),
    "The selected element should be the tip button."
  );
  Assert.equal(
    UrlbarTestUtils.getSelectedElementIndex(window),
    2,
    "Selected element index"
  );
  Assert.equal(
    gURLBar.value,
    TIP_URL,
    "Input value should be the button's URL"
  );

  EventUtils.synthesizeKey("KEY_Tab");
  Assert.equal(
    UrlbarTestUtils.getSelectedElement(window).dataset.l10nName,
    "learn-more-link",
    "The selected element should be the learn-more link."
  );
  Assert.equal(
    gURLBar.value,
    LEARN_MORE_URL,
    "Input value should be the learn-more URL"
  );

  EventUtils.synthesizeKey("KEY_ArrowDown");
  EventUtils.synthesizeKey("KEY_ArrowUp");
  Assert.ok(
    UrlbarTestUtils.getSelectedElement(window).classList.contains(
      "urlbarView-button-0"
    ),
    "The selected element should be the tip button."
  );
  Assert.equal(
    gURLBar.value,
    TIP_URL,
    "Input value should be the button's URL"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  providersManager.unregisterProvider(provider);
});

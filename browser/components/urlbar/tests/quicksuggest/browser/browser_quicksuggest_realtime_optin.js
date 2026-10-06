/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const OFFLINE_REMOTE_SETTINGS = [
  {
    type: "dynamic-suggestions",
    suggestion_type: "market_opt_in",
    attachment: [
      {
        keywords: ["stock"],
      },
    ],
  },
  {
    type: "dynamic-suggestions",
    suggestion_type: "yelpRealtime_opt_in",
    attachment: [
      {
        keywords: ["coffee"],
      },
    ],
  },
];

const TEST_MERINO_SINGLE = [
  {
    provider: "polygon",
    is_sponsored: false,
    custom_details: {
      polygon: {
        values: [
          {
            image_url: "https://example.com/aapl.svg",
            query: "AAPL stock",
            name: "Apple Inc",
            ticker: "AAPL",
            todays_change_perc: "-0.54",
            last_price: "$181.98 USD",
          },
        ],
      },
    },
  },
];

add_setup(async function () {
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsRecords: OFFLINE_REMOTE_SETTINGS,
    merinoSuggestions: TEST_MERINO_SINGLE,
    prefs: [
      ["market.featureGate", true],
      ["yelpRealtime.featureGate", true],
    ],
  });

  registerCleanupFunction(async () => {
    UrlbarPrefs.clear("suggest.realtimeOptIn");
    UrlbarPrefs.clear("quicksuggest.online.enabled");

    // Make sure all ingest is done before finishing.
    await QuickSuggestTestUtils.forceSync();
  });
});

add_task(async function messages() {
  await doMessagesTest({
    input: "stock",
    expected: {
      title: "Get stock market data right in your search bar",
      description:
        "Show market updates and more from our partners when you share search query data with Mozilla. Learn more",
    },
  });
  await doMessagesTest({
    input: "coffee",
    expected: {
      title: "Find great places nearby and more",
      description:
        "Get suggestions for nearby places and services — plus updates on stocks, sports scores, and more from our partners by sharing search query data with Mozilla. Learn more",
    },
  });
});

async function doMessagesTest({ input, expected }) {
  UrlbarPrefs.set("quicksuggest.online.enabled", false);

  let { element } = await openRealtimeSuggestion({ input });
  let title = element.row.querySelector(".urlbarView-title");
  Assert.equal(title.textContent, expected.title);
  let description = element.row.querySelector(
    ".urlbarView-row-body-description"
  );
  Assert.equal(description.textContent, expected.description);

  await UrlbarTestUtils.promisePopupClose(window);
  UrlbarPrefs.clear("quicksuggest.online.enabled");
}

add_task(async function optIn_mouse() {
  await doOptInTest(false);
});

add_task(async function optIn_keyboard() {
  await doOptInTest(true);
});

async function doOptInTest(useKeyboard) {
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "Sanity check: MarketSuggestions is enabled initially"
  );

  UrlbarPrefs.set("quicksuggest.online.enabled", false);

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled after disabling quicksuggest.online.enabled"
  );

  let { element, result } = await openRealtimeSuggestion({ input: "stock" });
  Assert.ok(result.isBestMatch);
  Assert.equal(result.payload.suggestionType, "market_opt_in");
  Assert.equal(result.type, UrlbarUtils.RESULT_TYPE.TIP);

  Assert.ok(
    !element.row.querySelector(".urlbarView-button-result-menu"),
    "The opt-in row should not have a result menu button"
  );

  info(
    "Click allow button that changes dataCollection pref and starts new query with same keyword"
  );

  let allowButton = element.row.querySelector(".urlbarView-button-0");
  Assert.ok(
    allowButton.hasAttribute("primary"),
    "The allow button should be primary"
  );

  if (!useKeyboard) {
    info("Picking allow button with mouse");
    EventUtils.synthesizeMouseAtCenter(allowButton, {});
  } else {
    info("Picking allow button with keyboard");
    EventUtils.synthesizeKey("KEY_ArrowDown");
    Assert.equal(
      UrlbarTestUtils.getSelectedElement(window),
      allowButton,
      "The allow button should be selected after pressing Down"
    );
    Assert.equal(
      gURLBar.value,
      "stock",
      "Input value should be the query's search string"
    );
    EventUtils.synthesizeKey("KEY_Enter");
  }

  await UrlbarTestUtils.promiseSearchComplete(window);
  let { result: merinoResult } = await UrlbarTestUtils.getDetailsOfResultAt(
    window,
    1
  );
  Assert.ok(UrlbarPrefs.get("quicksuggest.online.enabled"));
  Assert.equal(merinoResult.payload.source, "merino");
  Assert.equal(merinoResult.payload.provider, "polygon");
  Assert.equal(merinoResult.payload.dynamicType, "realtime-market");
  info("Allow button works");

  await UrlbarTestUtils.promisePopupClose(window);

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled opting in"
  );

  UrlbarPrefs.clear("quicksuggest.online.enabled");

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled after clearing quicksuggest.online.enabled"
  );
}

add_task(async function dismiss() {
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "Sanity check: MarketSuggestions is enabled initially"
  );

  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTimeSeconds");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");
  UrlbarPrefs.set("quicksuggest.realtimeOptIn.notNowReshowAfterPeriodDays", 3);

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled after resetting prefs"
  );

  info("Check the initial dismiss button state");
  let { element } = await openRealtimeSuggestion({ input: "stock" });
  let dismissButton = element.row.querySelector(".urlbarView-button-1");
  Assert.equal(dismissButton.dataset.command, "not_now");
  Assert.equal(dismissButton.textContent, "Not now");
  Assert.ok(
    !dismissButton.hasAttribute("primary"),
    "The dismiss button should not be primary"
  );

  info("Check 'Not now' button behavior");
  EventUtils.synthesizeMouseAtCenter(dismissButton, {});
  await TestUtils.waitForCondition(
    () =>
      UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes").has("market"),
    "Wait until quicksuggest.realtimeOptIn.notNowTypes pref changes"
  );
  Assert.notEqual(
    UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTimeSeconds"),
    0
  );
  Assert.equal(
    UrlbarPrefs.get("quicksuggest.realtimeOptIn.dismissTypes").size,
    0
  );
  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions is disabled after clicking Not now"
  );
  info("Not now button works");
  await UrlbarTestUtils.promisePopupClose(window);

  info(
    "Check whether the opt-in result will not be shown until having passed notNowReshowAfterPeriodDays days"
  );
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });
  info("Simulate the passage of one day");
  let notNowTimeSeconds = UrlbarPrefs.get(
    "quicksuggest.realtimeOptIn.notNowTimeSeconds"
  );
  moveNotNowTimeSecondsEalier(notNowTimeSeconds, 1);
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });
  info("Simulate the passage of two days");
  moveNotNowTimeSecondsEalier(notNowTimeSeconds, 2);
  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains disabled after simulating passage of two days"
  );
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });
  info("Simulate the passage of three days");
  moveNotNowTimeSecondsEalier(notNowTimeSeconds, 3);
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes enabled after simulating passage of three days"
  );

  // Suggest will ingest the Rust suggestions for `MarketSuggestions` after it
  // became enabled, so wait for that to finish before continuing.
  await QuickSuggestTestUtils.forceSync();

  await assertOptInVisibility({ input: "stock", expectedVisibility: true });
  notNowTimeSeconds = UrlbarPrefs.get(
    "quicksuggest.realtimeOptIn.notNowTimeSeconds"
  );

  info(
    "Check the dismiss button state after having passed notNowReshowAfterPeriodDays days"
  );
  element = (await openRealtimeSuggestion({ input: "stock" })).element;
  dismissButton = element.row.querySelector(".urlbarView-button-1");
  Assert.equal(dismissButton.dataset.command, "dismiss");
  Assert.equal(dismissButton.textContent, "Dismiss");

  info("Check 'Dismiss' button behavior");
  EventUtils.synthesizeMouseAtCenter(dismissButton, {});
  await TestUtils.waitForCondition(
    () =>
      UrlbarPrefs.get("quicksuggest.realtimeOptIn.dismissTypes").has("market"),
    "Wait until quicksuggest.realtimeOptIn.dismissTypes pref changes"
  );
  Assert.equal(
    UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTimeSeconds"),
    notNowTimeSeconds,
    "Not now time does not change"
  );
  Assert.ok(
    UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes").size == 1 &&
      UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes").has("market"),
    "notNowTypes does not change"
  );
  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes disabled after clicking Dismiss"
  );
  info("Dismiss button works");
  await UrlbarTestUtils.promisePopupClose(window);

  info("Once dismissed, the realtime type opt-in result shoud never shown");
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });
  info("Simulate the passage of 1000 days");
  moveNotNowTimeSecondsEalier(notNowTimeSeconds, 1000);
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });

  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains disabled simulating passage of 1000 days"
  );

  UrlbarPrefs.clear("quicksuggest.online.enabled");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTimeSeconds");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowReshowAfterPeriodDays");

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes enabled after clearing prefs"
  );

  // Suggest will ingest the Rust suggestions for `MarketSuggestions` after it
  // became enabled, so wait for that to finish before continuing.
  await QuickSuggestTestUtils.forceSync();
});

add_task(async function dismiss_with_another_type() {
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "Sanity check: MarketSuggestions is enabled initially"
  );

  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTimeSeconds");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");
  UrlbarPrefs.set("quicksuggest.realtimeOptIn.notNowReshowAfterPeriodDays", 3);

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled after resetting prefs"
  );

  info("Sanity check - market shoud be shown");
  await assertOptInVisibility({ input: "stock", expectedVisibility: true });

  info("Simulate user clicks 'Not now' for sports suggestion");
  UrlbarPrefs.add("quicksuggest.realtimeOptIn.notNowTypes", "sports");

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled simulating 'Not now' for sports"
  );

  let { element: marketElement } = await openRealtimeSuggestion({
    input: "stock",
  });
  let marketDismissButton = marketElement.row.querySelector(
    ".urlbarView-button-1"
  );
  Assert.equal(marketDismissButton.dataset.command, "not_now");
  Assert.equal(marketDismissButton.textContent, "Not now");
  await UrlbarTestUtils.promisePopupClose(window);

  info("Simulate user clicks 'Dismiss' for sports suggestion");
  UrlbarPrefs.set("quicksuggest.realtimeOptIn.dismissTypes", "sports");
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled simulating 'Dismiss' for sports"
  );
  await assertOptInVisibility({ input: "stock", expectedVisibility: true });

  info("Click 'Not now' for market suggestion");
  marketElement = (await openRealtimeSuggestion({ input: "stock" })).element;
  marketDismissButton = marketElement.row.querySelector(".urlbarView-button-1");
  EventUtils.synthesizeMouseAtCenter(marketDismissButton, {});
  await TestUtils.waitForCondition(
    () =>
      UrlbarPrefs.get("quicksuggest.realtimeOptIn.notNowTypes").has("market"),
    "Wait until quicksuggest.realtimeOptIn.notNowTypes pref changes"
  );

  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes disabled after clicking 'Not now'"
  );

  let notNowTimeSeconds = UrlbarPrefs.get(
    "quicksuggest.realtimeOptIn.notNowTimeSeconds"
  );
  Assert.notEqual(notNowTimeSeconds, 0);
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });

  info("Simulate the passage of three days");
  moveNotNowTimeSecondsEalier(notNowTimeSeconds, 3);

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes enabled after simulating passage of three days"
  );

  // Suggest will ingest the Rust suggestions for `MarketSuggestions` after it
  // became enabled, so wait for that to finish before continuing.
  await QuickSuggestTestUtils.forceSync();

  await assertOptInVisibility({ input: "stock", expectedVisibility: true });

  UrlbarPrefs.clear("quicksuggest.online.enabled");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTimeSeconds");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowReshowAfterPeriodDays");

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions remains enabled after clearing prefs"
  );
});

add_task(async function not_interested() {
  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "Sanity check: MarketSuggestions is enabled initially"
  );

  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.set("suggest.realtimeOptIn", true);

  info("Click on dropdown button");
  let { element } = await openRealtimeSuggestion({ input: "stock" });

  const popup = gURLBar.view.resultMenu;
  const onPopupShown = BrowserTestUtils.waitForEvent(popup, "popupshown");
  const dropmarker = element.row.querySelector(
    ".urlbarView-splitbutton-dropmarker"
  );
  EventUtils.synthesizeMouseAtCenter(dropmarker, {});
  await onPopupShown;

  info("Activate the not_interested item");
  const onPopupHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  const targetMenuItem = popup.querySelector("menuitem");
  if (AppConstants.platform == "macosx") {
    // Synthesized clicks don't work in the native Mac menu.
    targetMenuItem.doCommand();
    popup.hidePopup(true);
  } else {
    EventUtils.synthesizeMouseAtCenter(targetMenuItem, {});
  }
  await onPopupHidden;
  await TestUtils.waitForCondition(
    () => !UrlbarPrefs.get("suggest.realtimeOptIn"),
    "Wait until suggest.realtimeOptIn pref changes"
  );
  Assert.ok(
    !QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes disabled after clicking not_interested menu item"
  );
  info("not_interested item works");

  info("Any realtime type suggestion never be shown");
  await assertOptInVisibility({ input: "stock", expectedVisibility: false });

  UrlbarPrefs.clear("quicksuggest.online.enabled");
  UrlbarPrefs.clear("suggest.realtimeOptIn");

  Assert.ok(
    QuickSuggest.getFeature("MarketSuggestions").isEnabled,
    "MarketSuggestions becomes enabled after clearing prefs"
  );

  // Suggest will ingest the Rust suggestions for `MarketSuggestions` after it
  // became enabled, so wait for that to finish before continuing.
  await QuickSuggestTestUtils.forceSync();
});

async function openRealtimeSuggestion({ input }) {
  await BrowserTestUtils.waitForCondition(async () => {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
    });

    let result = UrlbarTestUtils.getResultCount(window) == 2;
    if (!result) {
      await UrlbarTestUtils.promisePopupClose(window);
    }
    return result;
  });
  return UrlbarTestUtils.getDetailsOfResultAt(window, 1);
}

async function assertOptInVisibility({ input, expectedVisibility }) {
  if (expectedVisibility) {
    let { result } = await openRealtimeSuggestion({ input });
    Assert.equal(
      result.payload.type,
      "realtime_opt_in",
      "Realtime suggestion opt-in result shoud be shown"
    );
  } else {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: input,
    });
    const count = UrlbarTestUtils.getResultCount(window);
    Assert.equal(count, 1);
    let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
    Assert.notEqual(
      result.payload.type,
      "realtime_opt_in",
      "Realtime suggestion opt-in result shoud not be shown"
    );
  }

  await UrlbarTestUtils.promisePopupClose(window);
}

function moveNotNowTimeSecondsEalier(currentTime, days) {
  // Subtract an extra 60s just to make sure the returned time is at least
  // `days` ago.
  let newTime = currentTime - days * 24 * 60 * 60 - 60;
  UrlbarPrefs.set("quicksuggest.realtimeOptIn.notNowTimeSeconds", newTime);
}

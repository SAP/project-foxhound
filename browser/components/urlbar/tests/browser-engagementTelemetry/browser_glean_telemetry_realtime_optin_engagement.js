/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async function () {
  await setup();

  await ensureQuickSuggestInit({
    remoteSettingsRecords: [
      {
        // eslint-disable-next-line mozilla/valid-lazy
        collection: lazy.QuickSuggestTestUtils.RS_COLLECTION.OTHER,
        type: "dynamic-suggestions",
        suggestion_type: "market_opt_in",
        attachment: [
          {
            keywords: ["stock"],
            data: {
              result: {
                isBestMatch: true,
                realtimeType: "market",
                payload: {
                  type: "realtime_opt_in",
                  icon: "chrome://browser/skin/illustrations/market-opt-in.svg",
                  titleL10n: {
                    id: "urlbar-result-market-opt-in-title",
                  },
                  descriptionL10n: {
                    id: "urlbar-result-market-opt-in-description",
                    parseMarkup: true,
                  },
                },
              },
            },
          },
        ],
      },
    ],
    prefs: [
      ["quicksuggest.online.available", true],
      ["market.featureGate", true],
    ],
  });

  registerCleanupFunction(() => {
    UrlbarPrefs.clear("quicksuggest.online.enabled");
    UrlbarPrefs.clear("quicksuggest.dynamicSuggestionTypes");
    UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");
    UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTimeSeconds");
    UrlbarPrefs.clear("quicksuggest.realtimeOptIn.notNowTypes");
    UrlbarPrefs.clear("suggest.realtimeOptIn");
  });
});

add_task(async function opt_in() {
  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.set("suggest.realtimeOptIn", true);

  await doTest(async () => {
    await openPopup("stock");
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let target = element.row.querySelector(".urlbarView-button-0");
    EventUtils.synthesizeMouseAtCenter(target, {});

    assertEngagementTelemetry([
      {
        engagement_type: "opt_in",
        selected_result: "rust_market_opt_in",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,rust_market_opt_in",
      },
    ]);
  });
});

add_task(async function not_now_and_dismiss() {
  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.set("suggest.realtimeOptIn", true);

  await doTest(async () => {
    info("Choose Not now button");
    await openPopup("stock");
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let target = element.row.querySelector(".urlbarView-button-1");
    EventUtils.synthesizeMouseAtCenter(target, {});

    assertEngagementTelemetry([
      {
        engagement_type: "not_now",
        selected_result: "rust_market_opt_in",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,rust_market_opt_in",
      },
    ]);

    info("Simulate the passage of some days to show Dismiss button");
    let notNowTimeSeconds = UrlbarPrefs.get(
      "quicksuggest.realtimeOptIn.notNowTimeSeconds"
    );
    let notNowReshowAfterPeriodDays = UrlbarPrefs.get(
      "quicksuggest.realtimeOptIn.notNowReshowAfterPeriodDays"
    );
    let newTime =
      notNowTimeSeconds - notNowReshowAfterPeriodDays * 24 * 60 * 60 - 60;
    UrlbarPrefs.set("quicksuggest.realtimeOptIn.notNowTimeSeconds", newTime);

    await Services.fog.testFlushAllChildren();
    Services.fog.testResetFOG();

    info("Choose Dismiss button");
    await openPopup("stock");
    element = (await UrlbarTestUtils.getDetailsOfResultAt(window, 1)).element;
    target = element.row.querySelector(".urlbarView-button-1");
    EventUtils.synthesizeMouseAtCenter(target, {});

    assertEngagementTelemetry([
      {
        engagement_type: "dismiss",
        selected_result: "rust_market_opt_in",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,rust_market_opt_in",
      },
    ]);
  });
});

add_task(async function not_interested() {
  UrlbarPrefs.set("quicksuggest.online.enabled", false);
  UrlbarPrefs.set("suggest.realtimeOptIn", true);
  UrlbarPrefs.clear("quicksuggest.realtimeOptIn.dismissTypes");

  await doTest(async () => {
    await openPopup("stock");

    info("Open result menu");
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let popup = gURLBar.view.resultMenu;
    let onPopupShown = BrowserTestUtils.waitForEvent(popup, "popupshown");
    let dropmarker = element.row.querySelector(
      ".urlbarView-splitbutton-dropmarker"
    );
    EventUtils.synthesizeMouseAtCenter(dropmarker, {});
    await onPopupShown;

    info("Activate the dismiss all item");
    let onPopupHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
    let targetMenuItem = popup.querySelector("menuitem");
    if (AppConstants.platform == "macosx") {
      // Synthesized clicks don't work in the native Mac menu.
      targetMenuItem.doCommand();
      popup.hidePopup(true);
    } else {
      EventUtils.synthesizeMouseAtCenter(targetMenuItem, {});
    }
    await onPopupHidden;

    assertEngagementTelemetry([
      {
        engagement_type: "not_interested",
        selected_result: "rust_market_opt_in",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,rust_market_opt_in",
      },
    ]);
  });
});

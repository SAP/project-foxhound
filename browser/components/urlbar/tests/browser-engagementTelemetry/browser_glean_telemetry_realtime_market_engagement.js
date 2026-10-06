/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async function () {
  await setup();

  await ensureQuickSuggestInit({
    merinoSuggestions: [
      {
        provider: "polygon",
        score: 0,
        custom_details: {
          polygon: {
            values: [
              {
                image_url: "https://example.com/voo.svg",
                query: "VOO stock",
                name: "Vanguard S&P 500 ETF",
                ticker: "VOO",
                todays_change_perc: "-0.11",
                last_price: "$559.44 USD",
                index: "S&P 500",
              },
            ],
          },
        },
      },
    ],
    prefs: [
      ["market.featureGate", true],
      ["suggest.market", true],
      ["suggest.quicksuggest.all", true],
    ],
  });
});

add_task(async function click() {
  await doTest(async () => {
    await openPopup("stock");
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let target = element.row.querySelector(".urlbarView-realtime-item");
    let onLocationChange = BrowserTestUtils.waitForLocationChange(gBrowser);
    EventUtils.synthesizeMouseAtCenter(target, {});
    await onLocationChange;

    assertEngagementTelemetry([
      {
        engagement_type: "click",
        selected_result: "merino_market",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,merino_market",
      },
    ]);
    await PlacesUtils.history.clear();
  });
});

add_task(async function enter() {
  await doTest(async () => {
    await openPopup("stock");
    let onLocationChange = BrowserTestUtils.waitForLocationChange(gBrowser);
    EventUtils.synthesizeKey("KEY_Tab");
    EventUtils.synthesizeKey("KEY_Enter");
    await onLocationChange;

    assertEngagementTelemetry([
      {
        engagement_type: "enter",
        selected_result: "merino_market",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,merino_market",
      },
    ]);
    await PlacesUtils.history.clear();
  });
});

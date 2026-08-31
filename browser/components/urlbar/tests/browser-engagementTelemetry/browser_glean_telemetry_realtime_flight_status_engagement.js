/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async function () {
  await setup();

  await ensureQuickSuggestInit({
    merinoSuggestions: [
      {
        provider: "flightaware",
        is_sponsored: false,
        score: 0,
        title: "Flight Suggestion",
        custom_details: {
          flightaware: {
            values: [
              {
                flight_number: "A1",
                airline: {
                  name: null,
                  code: null,
                  icon: null,
                },
                origin: {
                  city: "Origin",
                  code: "O",
                },
                destination: {
                  city: "Destination",
                  code: "D",
                },
                departure: {
                  scheduled_time: "2025-09-17T14:05:00Z",
                },
                arrival: {
                  scheduled_time: "2025-09-17T18:30:00Z",
                },
                status: "Scheduled",
                url: "https://example.com/A1",
              },
            ],
          },
        },
      },
    ],
    prefs: [
      ["flightStatus.featureGate", true],
      ["suggest.flightStatus", true],
      ["suggest.quicksuggest.all", true],
    ],
  });
});

add_task(async function click() {
  await doTest(async () => {
    await openPopup("a1");
    let { element } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);
    let target = element.row.querySelector(".urlbarView-realtime-item");
    let onLocationChange = BrowserTestUtils.waitForLocationChange(gBrowser);
    EventUtils.synthesizeMouseAtCenter(target, {});
    await onLocationChange;

    assertEngagementTelemetry([
      {
        engagement_type: "click",
        selected_result: "merino_flights",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,merino_flights",
      },
    ]);
    await PlacesUtils.history.clear();
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });
});

add_task(async function enter() {
  await doTest(async () => {
    await openPopup("a1");
    let onLocationChange = BrowserTestUtils.waitForLocationChange(gBrowser);
    EventUtils.synthesizeKey("KEY_Tab");
    EventUtils.synthesizeKey("KEY_Enter");
    await onLocationChange;

    assertEngagementTelemetry([
      {
        engagement_type: "enter",
        selected_result: "merino_flights",
        selected_position: 2,
        provider: "UrlbarProviderQuickSuggest",
        results: "search_engine,merino_flights",
      },
    ]);
    await PlacesUtils.history.clear();
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });
});

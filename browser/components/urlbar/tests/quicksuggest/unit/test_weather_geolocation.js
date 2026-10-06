/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests the weather suggestion with geolocation.

"use strict";

add_setup(async () => {
  await MerinoTestUtils.server.start();
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsRecords: [QuickSuggestTestUtils.weatherRecord()],
    prefs: [
      ["suggest.quicksuggest.sponsored", true],
      ["weather.featureGate", true],
    ],
  });
});

const TEST_DATA = [
  {
    geolocation: {
      country_code: "US",
      region_code: "CA",
      city: "San Francisco",
    },
    expected: {
      country: "US",
      region: "CA",
      city: "San Francisco",
    },
  },
  {
    geolocation: {
      region_code: "CA",
      city: "San Francisco",
    },
    expected: {
      region: "CA",
      city: "San Francisco",
    },
  },
  {
    geolocation: {
      country_code: "US",
      region_code: "CA",
    },
    expected: {
      country: "US",
      region: "CA",
    },
  },
  {
    geolocation: {
      country_code: "US",
      city: "San Francisco",
    },
    expected: {
      country: "US",
      region: "San Francisco",
      city: "San Francisco",
    },
  },
  {
    // Use region as city if no city.
    geolocation: {
      country_code: "JP",
      region: "Kanagawa",
      region_code: "14",
    },
    expected: {
      country: "JP",
      region: "14",
      city: "Kanagawa",
    },
  },
];

add_task(async function () {
  // No need actual suggestions as we check only the http requests in Merino
  // server.
  MerinoTestUtils.server.response.body.suggestions = [];

  let controller = UrlbarTestUtils.newMockController();

  for (let [index, { geolocation, expected }] of TEST_DATA.entries()) {
    info(`Test for ${JSON.stringify(geolocation)}`);
    let cleanup = GeolocationTestUtils.stubGeolocation(geolocation);

    await controller.startQuery(
      createContext("weather", {
        providers: [UrlbarProviderQuickSuggest.name],
        isPrivate: false,
      })
    );

    MerinoTestUtils.server.checkAndClearRequests([
      {
        params: {
          [MerinoTestUtils.SEARCH_PARAMS.QUERY]: "",
          [MerinoTestUtils.SEARCH_PARAMS.PROVIDERS]: "accuweather",
          [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: index,
          request_type: "weather",
          source: "urlbar",
          ...expected,
        },
      },
    ]);

    await cleanup();
  }
});

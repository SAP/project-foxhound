/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests the weather related APIs in merino client.

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  MerinoClient: "moz-src:///browser/components/urlbar/MerinoClient.sys.mjs",
});

add_setup(async () => {
  let cleanup = GeolocationTestUtils.stubGeolocation({
    country_code: "JP",
    region: "Kanagawa",
    region_code: "14",
  });

  registerCleanupFunction(async function () {
    await cleanup();
  });
});

add_task(async function fetchWeather() {
  const testData = [
    {
      params: {
        source: "test",
        timeoutMs: 100,
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
          country: "JP",
          region: "14",
          city: "Kanagawa",
        },
        timeoutMs: 100,
      },
    },
    {
      params: {
        source: "test",
        locationName: "location name",
      },
      expected: {
        query: "location name",
        otherParams: {
          source: "test",
        },
      },
    },
    {
      params: {
        source: "test",
        city: "test city",
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
          city: "test city",
        },
      },
    },
    {
      params: {
        source: "test",
        country: "test country code",
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
          country: "test country code",
        },
      },
    },
    {
      params: {
        source: "test",
        region: "r1,r2,r3",
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
          region: "r1,r2,r3",
        },
      },
    },
    {
      params: {
        source: "test",
        city: "test city",
        country: "test country code",
        region: "r1,r2,r3",
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
          city: "test city",
          country: "test country code",
          region: "r1,r2,r3",
        },
      },
    },
    {
      params: {
        source: "test",
        locationName: "location name",
        city: "test city",
        country: "test country code",
        region: "r1,r2,r3",
      },
      expected: {
        query: "location name",
        otherParams: {
          source: "test",
        },
      },
    },
  ];

  let merino = new MerinoClient("test");

  for (let { params, expected } of testData) {
    let stub = sinon.stub(merino, "fetch").resolves([]);

    await merino.fetchWeather(params);

    Assert.ok(stub.calledOnce);
    Assert.deepEqual(stub.firstCall.args[0], {
      providers: ["accuweather"],
      query: expected.query,
      otherParams: {
        request_type: "weather",
        ...expected.otherParams,
      },
      timeoutMs: expected.timeoutMs,
    });

    stub.restore();
  }
});

add_task(async function autoCompleteWeatherLocation() {
  const testData = [
    {
      params: {
        source: "test",
        timeoutMs: 100,
      },
      expected: {
        query: "",
        otherParams: {
          source: "test",
        },
        timeoutMs: 100,
      },
    },
    {
      params: {
        source: "test",
        query: "q",
        timeoutMs: 100,
      },
      expected: {
        query: "q",
        otherParams: {
          source: "test",
        },
        timeoutMs: 100,
      },
    },
  ];

  let merino = new MerinoClient("test");

  for (let { params, expected } of testData) {
    let stub = sinon.stub(merino, "fetch").resolves([]);

    await merino.autoCompleteWeatherLocation(params);

    Assert.ok(stub.calledOnce);
    Assert.deepEqual(stub.firstCall.args[0], {
      providers: ["accuweather"],
      query: expected.query,
      otherParams: {
        request_type: "location",
        ...expected.otherParams,
      },
      timeoutMs: expected.timeoutMs,
    });

    stub.restore();
  }
});

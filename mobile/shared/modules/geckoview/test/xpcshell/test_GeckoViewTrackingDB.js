/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { GeckoViewTrackingDB } = ChromeUtils.importESModule(
  "resource://gre/modules/GeckoViewTrackingDB.sys.mjs"
);

const mockService = {
  getEventsByDateRange(dateFrom, dateTo) {
    return Promise.resolve([
      {
        getResultByName(name) {
          switch (name) {
            case "type":
              return 1;
            case "count":
              return 5;
            case "timestamp":
              return "2023-01-01";
            default:
              return null;
          }
        },
      },
    ]);
  },
  sumAllEvents() {
    return Promise.resolve(42);
  },
  getEarliestRecordedDate() {
    return Promise.resolve(1000);
  },
  QueryInterface: ChromeUtils.generateQI(["nsITrackingDBService"]),
};

// Mock TrackingDBService
const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);
MockRegistrar.register("@mozilla.org/tracking-db-service;1", mockService);

add_task(async function test_getEventsByDateRange() {
  const callback = {
    onSuccess(data) {
      Assert.equal(data.events.length, 1);
      Assert.equal(data.events[0].type, 1);
      Assert.equal(data.events[0].count, 5);
      Assert.equal(data.events[0].date, "2023-01-01");
    },
    onError(err) {
      do_throw("Unexpected error: " + err);
    },
  };

  await GeckoViewTrackingDB.onEvent(
    "GeckoView:TrackingDB:GetEventsByDateRange",
    { dateFrom: 0, dateTo: Date.now() },
    callback
  );
});

add_task(async function test_sumAllEvents() {
  const callback = {
    onSuccess(data) {
      Assert.equal(data.sum, 42);
    },
    onError(err) {
      do_throw("Unexpected error: " + err);
    },
  };

  await GeckoViewTrackingDB.onEvent(
    "GeckoView:TrackingDB:SumAllEvents",
    {},
    callback
  );
});

add_task(async function test_getEarliestRecordedDate() {
  const callback = {
    onSuccess(data) {
      Assert.equal(data.date, 1000);
    },
    onError(err) {
      do_throw("Unexpected error: " + err);
    },
  };

  await GeckoViewTrackingDB.onEvent(
    "GeckoView:TrackingDB:GetEarliestRecordedDate",
    {},
    callback
  );
});

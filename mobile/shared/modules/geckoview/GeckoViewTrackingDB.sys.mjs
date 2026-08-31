/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "TrackingDBService",
  "@mozilla.org/tracking-db-service;1",
  Ci.nsITrackingDBService
);

const { debug, warn } = GeckoViewUtils.initLogging("GeckoViewTrackingDB");

export const GeckoViewTrackingDB = {
  async onEvent(aEvent, aData, aCallback) {
    debug`onEvent ${aEvent} ${aData}`;

    try {
      switch (aEvent) {
        case "GeckoView:TrackingDB:GetEventsByDateRange": {
          const events = await lazy.TrackingDBService.getEventsByDateRange(
            aData.dateFrom,
            aData.dateTo
          );
          const serialized = [];
          for (const row of events) {
            serialized.push({
              type: row.getResultByName("type"),
              count: row.getResultByName("count"),
              date: row.getResultByName("timestamp"),
            });
          }
          aCallback.onSuccess({ events: serialized });
          break;
        }
        case "GeckoView:TrackingDB:SumAllEvents": {
          const sum = await lazy.TrackingDBService.sumAllEvents();
          aCallback.onSuccess({ sum });
          break;
        }
        case "GeckoView:TrackingDB:GetEarliestRecordedDate": {
          const date = await lazy.TrackingDBService.getEarliestRecordedDate();
          aCallback.onSuccess({ date: date ?? 0 });
          break;
        }
        case "GeckoView:TrackingDB:ClearAll": {
          await lazy.TrackingDBService.clearAll();
          aCallback.onSuccess();
          break;
        }
      }
    } catch (ex) {
      warn`Error in ${aEvent}: ${ex}`;
      aCallback.onError(`Error in ${aEvent}: ${ex}`);
    }
  },
};

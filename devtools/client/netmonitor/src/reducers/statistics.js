/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  FILTER_TAGS,
} = require("resource://devtools/client/netmonitor/src/constants.js");
const {
  Filters,
} = require("resource://devtools/client/netmonitor/src/utils/filter-predicates.js");
const {
  processNetworkUpdates,
  responseIsFresh,
} = require("resource://devtools/client/netmonitor/src/utils/request-utils.js");
const {
  ADD_REQUEST,
  UPDATE_REQUEST,
  CLEAR_REQUESTS,
  OPEN_STATISTICS,
} = require("resource://devtools/client/netmonitor/src/constants.js");

function initStatisticsData() {
  return FILTER_TAGS.map(type => ({
    cached: 0,
    count: 0,
    label: type,
    size: 0,
    transferredSize: 0,
    time: 0,
    nonBlockingTime: 0,
  }));
}

/**
 * This structure stores the statistics data for the empty browser cache (first visit to the site)
 * and the primed browser cache (subsequent visits to the site) scenarios.
 */
function Statistics() {
  return {
    // This list of requests is used to help process the statistics data.
    // Changes to this list should not trigger updates.
    mutableRequests: [],
    // List of requests whose data has already been included in the
    // statistics data.
    mutableUsedRequests: new Set(),
    statisticsData: {
      emptyCacheData: initStatisticsData(),
      primedCacheData: initStatisticsData(),
    },
    // Tracks when the statistics panel is open so we only process requests
    // for the reducer then.
    statisticsPanelOpen: false,
  };
}

/**
 * This reducer is responsible for maintaining the statistics data.
 */
function statisticsReducer(state = Statistics(), action) {
  switch (action.type) {
    case OPEN_STATISTICS: {
      if (state.statisticsPanelOpen !== action.open) {
        state.statisticsPanelOpen = action.open;
      }
      return state;
    }
    case ADD_REQUEST: {
      if (!state.statisticsPanelOpen) {
        return state;
      }
      return addRequest(state, action);
    }

    case UPDATE_REQUEST: {
      if (!state.statisticsPanelOpen) {
        return state;
      }
      const index = state.mutableRequests.findIndex(
        request => request.id === action.id
      );
      if (index === -1) {
        return state;
      }
      const request = state.mutableRequests[index];
      const updatedRequest = {
        ...request,
        ...processNetworkUpdates(action.data),
      };
      state.mutableRequests[index] = updatedRequest;

      return updateStatisticsData(state, state.mutableRequests[index]);
    }

    case CLEAR_REQUESTS: {
      return {
        ...Statistics(),
        statisticsPanelOpen: state.statisticsPanelOpen,
      };
    }

    default:
      return state;
  }
}

function addRequest(state, action) {
  // The target front is not used and cannot be serialized by redux
  // eslint-disable-next-line no-unused-vars
  const { targetFront, ...requestData } = action.data;
  const newRequest = {
    id: action.id,
    ...requestData,
  };
  state.mutableRequests.push(newRequest);
  return state;
}

function updateStatisticsData(state, request) {
  // Make sure all the data needed is included in the request
  // This avoids firing unnecessary request updates.
  if (
    request.contentSize == undefined ||
    !request.mimeType ||
    !request.eventTimings ||
    !request.responseHeaders ||
    request.status == undefined ||
    request.totalTime == undefined ||
    state.mutableUsedRequests.has(request.id)
  ) {
    return state;
  }
  const {
    statisticsData: { emptyCacheData, primedCacheData },
  } = state;
  // If non of the filter types are matched, defaults to "others"
  let dataType = 8;
  for (const [index, type] of FILTER_TAGS.entries()) {
    if (Filters[type](request)) {
      dataType = index;
    }
    if (Filters.xhr(request)) {
      // Verify XHR last, to categorize other mime types in their own blobs.
      // "xhr"
      dataType = 3;
    }
  }

  let newEmptyCacheData = [...emptyCacheData];
  let newPrimedCacheData = [...primedCacheData];

  newEmptyCacheData = setData(newEmptyCacheData, request, dataType, true);
  newPrimedCacheData = setData(newPrimedCacheData, request, dataType, false);
  state.mutableUsedRequests.add(request.id);

  return {
    mutableRequests: state.mutableRequests,
    mutableUsedRequests: state.mutableUsedRequests,
    statisticsData: {
      emptyCacheData: newEmptyCacheData,
      primedCacheData: newPrimedCacheData,
    },
    statisticsPanelOpen: state.statisticsPanelOpen,
  };
}

function setData(cacheData, request, dataType, emptyCache) {
  if (emptyCache || !responseIsFresh(request)) {
    cacheData[dataType].time += request.totalTime || 0;
    cacheData[dataType].size += request.contentSize || 0;
    cacheData[dataType].transferredSize += request.transferredSize || 0;

    const nonBlockingTime =
      request.eventTimings.totalTime -
      (request.eventTimings.timings?.blocked || 0);
    cacheData[dataType].nonBlockingTime += nonBlockingTime || 0;
  } else {
    cacheData[dataType].cached++;
  }
  cacheData[dataType].count++;
  return cacheData;
}

module.exports = {
  statisticsReducer,
};

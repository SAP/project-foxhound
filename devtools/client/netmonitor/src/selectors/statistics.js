/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function getStatisticsData(state) {
  const { emptyCacheData, primedCacheData } = state.statistics.statisticsData;
  return {
    emptyCacheData: emptyCacheData.filter(e => e.count > 0),
    primedCacheData: primedCacheData.filter(e => e.count > 0),
  };
}

module.exports = {
  getStatisticsData,
};

/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  FILTER_TAGS,
} = require("resource://devtools/client/netmonitor/src/constants.js");
const {
  Filters,
} = require("resource://devtools/client/netmonitor/src/utils/filter-predicates.js");
const {
  getSizeWithDecimals,
} = require("resource://devtools/client/netmonitor/src/utils/format-utils.js");
const {
  responseIsFresh,
} = require("resource://devtools/client/netmonitor/src/utils/request-utils.js");
/**
 * Tests that the content rendered in the Statistics Panel is displayed correctly.
 */
add_task(async function () {
  const { monitor } = await initNetMonitor(STATISTICS_URL, { requestCount: 1 });
  info("Starting test... ");

  const panel = monitor.panelWin;
  const { document, store, windowRequire, connector } = panel;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");
  const { getDisplayedRequests } = windowRequire(
    "devtools/client/netmonitor/src/selectors/index"
  );

  ok(
    document.querySelector(".monitor-panel"),
    "The current main panel is correct."
  );

  info("Displaying statistics panel");
  store.dispatch(Actions.openStatistics(connector, true));

  ok(
    document.querySelector(".statistics-panel"),
    "The current main panel is correct."
  );

  await waitForAllNetworkUpdateEvents();

  info("Waiting for chart to display");
  await waitUntil(() => {
    return (
      document.querySelectorAll(".pie-chart-container:not([placeholder=true])")
        .length == 2 &&
      document.querySelectorAll(
        ".table-chart-container:not([placeholder=true])"
      ).length == 2
    );
  });

  // Wait a bit for the charts and tables to fully render
  // This is needed as, unfortunately just waiting rendered elements won't work,
  // as they may be rendered but not yet with all the needed information.
  await wait(2000);

  const allRequests = getDisplayedRequests(store.getState());
  // Assert the primed cache data
  const expectedPrimedCacheData = generateExpectedData(allRequests, false);
  await assertChartContent(
    document,
    "Primed Cache",
    "primed-cache-chart",
    expectedPrimedCacheData
  );

  // Assert the empty cache data
  const expectedEmptyCacheData = generateExpectedData(allRequests, true);
  await assertChartContent(
    document,
    "Empty Cache",
    "empty-cache-chart",
    expectedEmptyCacheData
  );

  await teardown(monitor);
});

// The expected data is generated based of the list of displayed requests
function generateExpectedData(requests, isForEmptyCache) {
  const expectedData = { slices: [] };
  const requestsGroupedAsTypes = {};
  // Group the request based on the types
  requests.forEach(request => {
    // If non of the filter types are matched, default to "others"
    let dataType = 8;
    for (const type of FILTER_TAGS) {
      if (Filters[type](request)) {
        dataType = type;
      }
      if (Filters.xhr(request)) {
        // Verify XHR last, to categorize other mime types in their own blobs.
        // "xhr"
        dataType = "xhr";
      }
    }
    if (!requestsGroupedAsTypes[dataType]) {
      requestsGroupedAsTypes[dataType] = [];
    }
    requestsGroupedAsTypes[dataType].push(request);
  });

  let totalRequests = 0,
    totalSize = 0,
    totalTransferredSize = 0,
    totalRequestsFromCache = 0;
  for (const type in requestsGroupedAsTypes) {
    const requestsForType = requestsGroupedAsTypes[type];
    if (!requestsForType.length) {
      return expectedData;
    }

    const size = accumulate(requestsForType, "contentSize");
    const transferred = accumulate(
      requestsForType,
      "transferredSize",
      request => isForEmptyCache || !responseIsFresh(request)
    );

    const data = {
      pieSize: "",
      pieName: type,
      count: String(requestsForType.length),
      size: `${getSizeWithDecimals(size / 1000)} kB`,
      type,
      transferred: `${getSizeWithDecimals(transferred / 1000)} kB`,
      // temp size data which would be used to calculate the pieSize
      // Should be deleted after.
      _size: size,
    };

    totalRequests += requestsForType.length;
    totalSize += size;
    totalTransferredSize += transferred;
    for (const request of requestsForType) {
      const isCached = request.fromCache || request.status === "304";
      totalRequestsFromCache = isCached
        ? totalRequestsFromCache + 1
        : totalRequestsFromCache;
    }
    expectedData.slices.push(data);
  }

  expectedData.totals = {
    cachedResponses: isForEmptyCache ? 0 : totalRequestsFromCache,
    requests: totalRequests,
    size: `${getSizeWithDecimals(totalSize / 1000)} kB`,
    transferred: `${getSizeWithDecimals(totalTransferredSize / 1000)} kB`,
  };

  // Calculate the expected % size of the pies in the chart for each type
  // This can only be done after we have calculated the totalSize
  for (const slice of expectedData.slices) {
    const pieSize = (slice._size * 100) / totalSize;
    // No need to apply precision to the pie size if its 0 or 100%
    slice.pieSize =
      pieSize == 0 || pieSize == 100 ? pieSize : pieSize.toPrecision(4);
    delete slice._size;
  }
  return expectedData;
}

async function assertChartContent(
  doc,
  name,
  chartClassName,
  expectedChartData
) {
  info(`Assert the displayed data for the ${name} chart`);
  const chartRootEl = doc.querySelector(`.${chartClassName}`);
  for (const slice of expectedChartData.slices) {
    info(`Assert the ${slice.type} pie slice`);
    const el = chartRootEl.querySelector(
      `svg.pie-chart-container a#${slice.type}-slice`
    );
    // Slices may not be displayed, if the % are too low
    if (el) {
      isSimilar(
        Math.ceil(el.getAttribute("aria-label").match(/[0-9\.]+/g)[0]),
        Math.ceil(slice.pieSize),
        1,
        `The size of the '${slice.type}' pie slice is correct`
      );
      const pieChartLabel = el.querySelector(".pie-chart-label");
      if (pieChartLabel) {
        is(
          pieChartLabel.textContent,
          slice.pieName,
          `The pie name for the '${slice.type}' pie slice is correct.`
        );
      }
    }

    info(`Assert the '${slice.type} table content`);
    const tableRow = chartRootEl.querySelector(
      `div.table-chart-container tr[data-statistic-name="${slice.type}"]`
    );
    is(
      tableRow.querySelector("td[name='count']").innerText,
      slice.count,
      `The no of ${slice.type} requests is correct`
    );
    is(
      tableRow.querySelector("td[name='label']").innerText,
      slice.type,
      `The type label of ${slice.type} requests is correct`
    );
    is(
      tableRow.querySelector("td[name='size']").innerText,
      `${slice.size}`,
      `The size of the ${slice.type} requests  correct`
    );
    is(
      tableRow.querySelector("td[name='transferredSize']").innerText,
      `${slice.transferred}`,
      `The transferred size of the ${slice.type} requests is correct`
    );
  }

  info("Assert the chart totals");
  const totalsRootEl = chartRootEl.querySelector(
    `.table-chart-container  div.table-chart-totals`
  );
  is(
    totalsRootEl.querySelector("span[name='cached']").innerText,
    `Cached responses: ${expectedChartData.totals.cachedResponses}`,
    `The total no of cached responses is correct`
  );
  is(
    totalsRootEl.querySelector("span[name='count']").innerText,
    `Total requests: ${expectedChartData.totals.requests}`,
    `The total no of requests is correct`
  );
  is(
    totalsRootEl.querySelector("span[name='size']").innerText,
    `Size: ${expectedChartData.totals.size}`,
    `The total size of requests is correct`
  );
  is(
    totalsRootEl.querySelector("span[name='transferredSize']").innerText,
    `Transferred Size: ${expectedChartData.totals.transferred}`,
    `The total transferred size is correct`
  );
}

/**
 * Sums together a specified field from a list of requests based
 * on the condition.
 *
 * @param {Array} requests
 * @param {string} field
 * @param {Function} condition
 * @returns {number}
 */
function accumulate(requests, field, condition = () => true) {
  return requests.reduce((acc, request) => {
    if (condition(request)) {
      return acc + request[field];
    }
    return acc;
  }, 0);
}
/**
 * Assert that two values are equal or different by up to a specific margin
 *
 * @param {number} actual
 * @param {number} expected
 * @param {number} margin
 * @param {string} comment
 */
function isSimilar(actual, expected, margin, comment) {
  Assert.greaterOrEqual(actual, expected - margin, comment);
  Assert.lessOrEqual(actual, expected + margin, comment);
}

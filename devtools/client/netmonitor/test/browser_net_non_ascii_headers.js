/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests if non-ASCII headers are correctly displayed in the netmonitor when set via fetch API.
 */

add_task(async function () {
  const { tab, monitor } = await initNetMonitor(SIMPLE_URL, {
    requestCount: 1,
  });
  info("Starting test...");

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  const waitRequest = waitForNetworkEvents(monitor, 1);
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [SIMPLE_SJS],
    async function (url) {
      const headers = {};
      headers["x-panel-title"] = "ä";
      await content.fetch(url, {
        method: "GET",
        headers,
      });
    }
  );
  await waitRequest;

  const requests = document.querySelectorAll(".request-list-item");
  is(requests.length, 1, "There should be one request");

  EventUtils.sendMouseEvent({ type: "mousedown" }, requests[0]);

  await waitFor(
    () => document.querySelector(".network-details-bar"),
    "Wait for network details after selecting the request"
  );

  await waitFor(
    () =>
      document.querySelectorAll("#headers-panel .accordion-item").length >= 2,
    "Wait for headers panel to be ready"
  );

  const tabpanel = document.querySelector("#headers-panel");
  const headersTable = tabpanel.querySelectorAll(
    ".accordion-item .properties-view"
  )[1];

  const headerLabels = headersTable.querySelectorAll("tbody .treeLabel");
  const headerValues = headersTable.querySelectorAll("tbody .objectBox");

  let foundHeader = false;
  for (let i = 0; i < headerLabels.length; i++) {
    const label = headerLabels[i].textContent.trim();
    const value = headerValues[i].textContent.trim();
    if (label === "x-panel-title") {
      foundHeader = true;
      is(value, "ä", "The x-panel-title header should contain 'ä'");
      break;
    }
  }

  ok(foundHeader, "The x-panel-title header should be present");

  await teardown(monitor);
});

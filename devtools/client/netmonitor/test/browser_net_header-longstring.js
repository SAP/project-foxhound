/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that a request header with a long string value is correctly displayed
 * in the headers panel.
 */

add_task(async function () {
  const {
    DevToolsServer,
  } = require("resource://devtools/server/devtools-server.js");

  const { tab, monitor } = await initNetMonitor(SIMPLE_URL, {
    requestCount: 1,
  });
  info("Starting test...");

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  const largeHeaderValue = "a".repeat(DevToolsServer.LONG_STRING_LENGTH + 1);

  const waitRequest = waitForNetworkEvents(monitor, 1);
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [SIMPLE_SJS, largeHeaderValue],
    async function (url, headerValue) {
      await content.fetch(url, {
        method: "GET",
        headers: { "x-large-header": headerValue },
      });
    }
  );
  await waitRequest;

  const requests = document.querySelectorAll(".request-list-item");
  is(requests.length, 1, "There should be one request");

  EventUtils.sendMouseEvent({ type: "mousedown" }, requests[0]);
  await waitFor(
    () =>
      document.querySelectorAll("#headers-panel .accordion-item").length >= 2,
    "Wait for headers panel to be ready"
  );

  const tabpanel = document.querySelector("#headers-panel");
  const headers = tabpanel.querySelectorAll(
    ".accordion-item .properties-view"
  )[1];

  const headerLabels = [...headers.querySelectorAll("tbody .treeLabel")];
  const headerValues = headers.querySelectorAll("tbody .objectBox");

  const index = headerLabels.findIndex(
    label => label.textContent.trim() === "x-large-header"
  );
  Assert.notEqual(index, -1, "x-large-header should be present");

  ok(
    /^a+…a+$/.test(headerValues[index].textContent),
    "The x-large-header value should be displayed correctly"
  );

  await teardown(monitor);
});

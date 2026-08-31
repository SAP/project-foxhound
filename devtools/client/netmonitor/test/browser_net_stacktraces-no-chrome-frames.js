/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that chrome URIs are not added to the stacktrace details
 * panel in the netmonitor.
 */

add_task(async function () {
  const URL = EXAMPLE_URL + "html_single_get_page_favicon.html";

  const { monitor } = await initNetMonitor(URL, {
    requestCount: 1,
  });

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  info("Starting test...");

  await reloadSelectedTab();

  await waitUntil(() =>
    document.querySelector(".requests-list-file[title*='favicon.ico']")
  );

  const row = document.querySelector(
    ".requests-list-file[title*='favicon.ico']"
  );

  ok(row, "Favicon request row should appear in the Netmonitor");

  EventUtils.sendMouseEvent({ type: "mousedown" }, row);

  await waitUntil(() => document.querySelector(".network-details-bar"));

  await waitForTime(1000);

  const stackTab = document.querySelector("#stack-trace-tab");

  is(stackTab, null, "Favicon request should not show a stack trace tab");

  return teardown(monitor);
});

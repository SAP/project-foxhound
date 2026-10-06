/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that cached JS files show the expected stacktraces.
 */

add_task(async function () {
  const URL = EXAMPLE_URL + "html_cache-test-page-js.html";
  const SCRIPT_URL = EXAMPLE_URL + "js_cache-test2.js";

  const { monitor } = await initNetMonitor(URL, {
    requestCount: 1,
    enableCache: true,
  });

  const { document, store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  info("Starting test... ");

  const allRequestsVisible = waitUntil(
    () => document.querySelectorAll(".request-list-item").length == 3
  );

  await waitForAllNetworkUpdateEvents();
  await reloadSelectedTab();
  await allRequestsVisible;

  const onStackTracesVisible = waitUntil(
    () => document.querySelector("#stack-trace-panel .stack-trace .frame-link"),
    "Wait for the stacktrace to be rendered"
  );

  const file = document.querySelector(
    `.request-list-item .requests-list-file[title="${SCRIPT_URL}"]`
  );
  const initiator = file.parentNode.querySelector(".requests-list-initiator");

  ok(
    initiator.textContent.includes("js_cache-test.js:6"),
    "Initiator column should show the source line"
  );

  // Select the script request initiated by another script.
  EventUtils.sendMouseEvent({ type: "mousedown" }, file);

  // Wait for the stack trace tab to show
  await waitUntil(() =>
    document.querySelector(".network-details-bar #stack-trace-tab")
  );

  clickOnSidebarTab(document, "stack-trace");

  await onStackTracesVisible;

  const panel = document.querySelector("#stack-trace-panel");

  ok(
    panel.textContent.includes("scriptInitiatorFunc"),
    "Stacktrace should show the enclosing function name"
  );

  ok(
    panel.textContent.includes("js_cache-test.js:6"),
    "Stacktrace should show the source line"
  );

  return teardown(monitor);
});

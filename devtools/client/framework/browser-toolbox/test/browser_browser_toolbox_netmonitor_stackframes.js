/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that the stack trace panel does appear for favicon requests in the Browser Toolbox Netmonitor.
 */

/* global gToolbox */

add_task(async function () {
  // Set up preferences for a consistent environment
  await pushPref("devtools.browsertoolbox.scope", "everything");
  await pushPref("network.proxy.allow_hijacking_localhost", true);

  const ToolboxTask = await initBrowserToolboxTask();

  await ToolboxTask.importFunctions({
    waitUntil,
  });

  // Select netmonitor tool
  await ToolboxTask.spawn(null, async () => {
    await gToolbox.selectTool("netmonitor");
  });
  ok(true, "Netmonitor selected");

  await addTab(
    "data:text/html,<head><link rel='icon' href='https://example.com/favicon.ico'/></head>"
  );

  // In the Browser Toolbox, select the favicon request and check the stack trace
  await ToolboxTask.spawn(null, async () => {
    const monitor = gToolbox.getCurrentPanel();
    const { document, store, windowRequire } = monitor.panelWin;
    const Actions = windowRequire(
      "devtools/client/netmonitor/src/actions/index"
    );

    let request;
    await waitUntil(() => {
      request = store
        .getState()
        .requests.requests.find(
          request => request.url == "https://example.com/favicon.ico"
        );
      return !!request;
    });

    // Select the favicon row
    const faviconCell = document.querySelector(
      "td.requests-list-file[title*='favicon.ico']"
    );
    const faviconRow =
      faviconCell && faviconCell.closest("tr.request-list-item");
    ok(!!faviconRow, "Favicon request row should appear in the Netmonitor");

    // Select the favicon request
    store.dispatch(Actions.selectRequest(request.id));

    // Wait for the details panel to appear
    await waitUntil(() => document.querySelector(".network-details-bar"));

    // Assert that the stack trace tab is  present
    const stackTab = document.querySelector("#stack-trace-tab");
    ok(!!stackTab, "Favicon request should show a stack trace tab");
  });

  await ToolboxTask.destroy();
});

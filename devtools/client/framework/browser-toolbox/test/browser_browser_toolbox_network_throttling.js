/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* global gToolbox */

requestLongerTimeout(2);

// Setup the same test server as in
// devtools/client/netmonitor/test/browser_net_throttling_disable_unblocks_requests.js
const httpServer = createTestHTTPServer();
httpServer.registerPathHandler(`/`, function (request, response) {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write(`<meta charset=utf8><h1>Test Browser Toolbox throttling</h1>`);
});
// The "data" path takes a size query parameter and will return a body of the
// requested size.
httpServer.registerPathHandler("/data", function (request, response) {
  const size = request.queryString.match(/size=(\d+)/)[1];
  response.setHeader("Content-Type", "text/plain");

  response.setStatusLine(request.httpVersion, 200, "OK");
  const body = new Array(size * 1).join("a");
  response.bodyOutputStream.write(body, body.length);
});

const TEST_URI = `http://localhost:${httpServer.identity.primaryPort}/`;

add_task(async function () {
  await pushPref("devtools.browsertoolbox.scope", "everything");

  const ToolboxTask = await initBrowserToolboxTask();

  await ToolboxTask.importFunctions({
    waitUntil,
  });

  await ToolboxTask.spawn(null, async () => {
    const { resourceCommand } = gToolbox.commands;

    await gToolbox.selectTool("netmonitor");
    const monitor = gToolbox.getCurrentPanel();
    const { store, windowRequire } = monitor.panelWin;

    const Actions = windowRequire(
      "devtools/client/netmonitor/src/actions/index"
    );

    store.dispatch(Actions.batchEnable(false));

    is(
      resourceCommand.isResourceWatched(resourceCommand.TYPES.NETWORK_EVENT),
      true,
      "The network panel is watching for network event resources"
    );

    const networkFront =
      await gToolbox.commands.watcherFront.getNetworkParentActor();

    info("Test that network throttling starts as disabled");
    const initialState = await networkFront.getNetworkThrottling();
    is(initialState, null, "Network throttling should be disabled initially");
  });

  const tab = await addTab(TEST_URI);
  info("Make an normal request to establish baseline");
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.fetch("data?size=500&normal");
  });

  await ToolboxTask.spawn(null, async () => {
    const monitor = gToolbox.getCurrentPanel();
    const { store, windowRequire } = monitor.panelWin;
    const { getSortedRequests } = windowRequire(
      "devtools/client/netmonitor/src/selectors/index"
    );

    info("Wait for the normal request to appear");
    await waitUntil(() =>
      getSortedRequests(store.getState()).some(r => r.url.includes("normal"))
    );

    info("Wait for the normal request to complete");
    await waitUntil(() => {
      const requests = getSortedRequests(store.getState());
      const normalReq = requests.find(r => r.url.includes("normal"));
      return normalReq && normalReq.eventTimings;
    });

    const normalRequest = getSortedRequests(store.getState()).find(r =>
      r.url.includes("normal")
    );
    const normalTime = normalRequest.eventTimings.timings.receive || 0;
    info(`Unthrottled request receive time: ${normalTime}ms`);

    // In ToolboxTask we do not have access to extra asserts.
    // eslint-disable-next-line mozilla/no-comparison-or-assignment-inside-ok
    ok(normalTime < 1000, "Unthrottled request should complete quickly (< 1s)");
  });

  info("Enable network throttling with slow profile");
  await ToolboxTask.spawn(null, async () => {
    const networkFront =
      await gToolbox.commands.watcherFront.getNetworkParentActor();

    // Use a very slow throttling profile to ensure measurable delay
    // This is slower than Regular 3G to make the test more reliable
    await networkFront.setNetworkThrottling({
      downloadThroughput: 200, // 200 bytes per second
      uploadThroughput: 10000,
      latency: 100, // 100ms latency
    });

    info("Verify network throttling is now enabled");
    const throttlingState = await networkFront.getNetworkThrottling();
    is(
      throttlingState.downloadThroughput,
      200,
      "Download throughput should be set to 200 B/s"
    );
  });

  info("Make a throttled request");
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.fetch("data?size=500&throttled");
  });

  await ToolboxTask.spawn(null, async () => {
    const monitor = gToolbox.getCurrentPanel();
    const { store, windowRequire } = monitor.panelWin;
    const { getSortedRequests } = windowRequire(
      "devtools/client/netmonitor/src/selectors/index"
    );

    info("Wait for the throttled request to appear");
    await waitUntil(() =>
      getSortedRequests(store.getState()).some(r => r.url.includes("throttled"))
    );

    info("Wait for the throttled request to complete");
    await waitUntil(() => {
      const requests = getSortedRequests(store.getState());
      const throttledReq = requests.find(r => r.url.includes("throttled"));
      return throttledReq && throttledReq.eventTimings;
    });

    const throttledRequest = getSortedRequests(store.getState()).find(r =>
      r.url.includes("throttled")
    );
    const throttledTime = throttledRequest.eventTimings.timings.receive || 0;
    info(`Throttled request receive time: ${throttledTime}ms`);

    // In ToolboxTask we do not have access to extra asserts.
    // eslint-disable-next-line mozilla/no-comparison-or-assignment-inside-ok
    ok(
      throttledTime > 1000,
      "Throttled request should take more than 1 second"
    );

    info("Clear network throttling");
    const networkFront =
      await gToolbox.commands.watcherFront.getNetworkParentActor();
    await networkFront.clearNetworkThrottling();
  });

  await ToolboxTask.destroy();
});

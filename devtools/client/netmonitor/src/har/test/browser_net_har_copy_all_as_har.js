/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Basic tests for exporting Network panel content into HAR format.
 */

const EXPECTED_REQUEST_HEADER_COUNT = 13;
// We always get the following 5 headers:
//   "Host", "User-agent", "Accept", "Accept-Language", "Accept-Encoding"
// while "Connection" is sometimes set or not set,
// but are missing the three last headers:
// "Upgrade-Insecure-Requests", "Pragma", "Cache-Control"
const EXPECTED_PARTIAL_REQUEST_HEADER_COUNT = [5, 6];
// We may or may not receive "Connection: keep-alive" header
const EXPECTED_RESPONSE_HEADER_COUNT = [5, 6];

add_task(async function () {
  // Disable tcp fast open, because it is setting a response header indicator
  // (bug 1352274). TCP Fast Open is not present on all platforms therefore the
  // number of response headers will vary depending on the platform.
  await pushPref("network.tcp.tcp_fastopen_enable", false);

  info("Starting test... ");

  await testSimpleReload();
  await testResponseBodyLimits();
  await testManyReloads();
  await testClearedRequests();
});

async function testSimpleReload() {
  info("Test with a simple page reload");
  const { tab, monitor, toolbox } = await initNetMonitor(HTTPS_SIMPLE_URL, {
    requestCount: 1,
  });

  const har = await reloadAndCopyAllAsHar({ tab, monitor, toolbox });

  // Check out HAR log
  isnot(har.log, null, "The HAR log must exist");
  is(har.log.creator.name, "Firefox", "The creator field must be set");
  is(har.log.browser.name, "Firefox", "The browser field must be set");
  is(har.log.pages.length, 1, "There must be one page");
  is(har.log.entries.length, 1, "There must be one request");

  const page = har.log.pages[0];

  is(page.title, HTTPS_SIMPLE_URL, "There must be some page title");
  ok("onContentLoad" in page.pageTimings, "There must be onContentLoad time");
  ok("onLoad" in page.pageTimings, "There must be onLoad time");

  const entry = har.log.entries[0];
  assertNavigationRequestEntry(entry);

  info("We get the response content and timings when doing a simple reload");
  isnot(entry.response.content.text, undefined, "Check response body");
  is(entry.response.content.text.length, 465, "Response body is complete");
  isnot(entry.timings, undefined, "Check timings");

  await teardown(monitor);
}

async function testResponseBodyLimits() {
  {
    info("Test response body limit (non zero).");
    await pushPref("devtools.netmonitor.responseBodyLimit", 10);
    const { tab, monitor, toolbox } = await initNetMonitor(HTTPS_SIMPLE_URL, {
      requestCount: 1,
    });

    const har = await reloadAndCopyAllAsHar({ tab, monitor, toolbox });
    const entry = har.log.entries[0];
    is(
      entry.response.content.text.length,
      10,
      "Response body must be truncated"
    );
    await teardown(monitor);
  }

  {
    await pushPref("devtools.netmonitor.responseBodyLimit", 0);
    info("Test response body limit (zero).");

    const { tab, monitor, toolbox } = await initNetMonitor(HTTPS_SIMPLE_URL, {
      requestCount: 1,
    });
    const har = await reloadAndCopyAllAsHar({ tab, monitor, toolbox });
    const entry = har.log.entries[0];
    is(
      entry.response.content.text.length,
      465,
      "Response body must not be truncated"
    );
    await teardown(monitor);
  }
}

async function testManyReloads() {
  const { tab, monitor, toolbox } = await initNetMonitor(HTTPS_SIMPLE_URL, {
    requestCount: 1,
  });

  const har = await reloadAndCopyAllAsHar({
    tab,
    monitor,
    toolbox,
    reloadTwice: true,
  });
  // In most cases, we will have two requests, but sometimes,
  // the first one might be missing as we couldn't fetch any lazy data for it.
  Assert.greaterOrEqual(
    har.log.entries.length,
    1,
    "There must be at least one request"
  );
  info(
    "Assert the first navigation request which has been cancelled by the second reload"
  );
  // Requests may come out of order, so try to find the bogus cancelled request
  let entry = har.log.entries.find(e => e.response.status == 0);
  if (entry) {
    ok(entry, "Found the cancelled request");
    is(entry.request.method, "GET", "Method is set");
    is(entry.request.url, HTTPS_SIMPLE_URL, "URL is set");
    ok(
      EXPECTED_PARTIAL_REQUEST_HEADER_COUNT.includes(
        entry.request.headers.length
      ),
      "But headers are partialy populated"
    );
    is(entry.response.status, 0, "And status is set to 0");
  }

  entry = har.log.entries.find(e => e.response.status != 0);
  assertNavigationRequestEntry(entry);

  await teardown(monitor);
}

async function testClearedRequests() {
  const { tab, monitor } = await initNetMonitor(HTTPS_SIMPLE_URL, {
    requestCount: 1,
  });

  info("Navigate to an empty page");
  const topDocumentURL =
    "https://example.org/document-builder.sjs?html=empty-document";
  const iframeURL =
    "https://example.org/document-builder.sjs?html=" +
    encodeURIComponent(
      `iframe<script>fetch("/document-builder.sjs?html=iframe-request")</script>`
    );

  await waitForAllNetworkUpdateEvents();
  await navigateTo(topDocumentURL);

  info("Create an iframe doing a request and remove the iframe.");
  info(
    "Doing this, should notify a network request that is destroyed on the server side"
  );
  const onNetworkEvents = waitForNetworkEvents(monitor, 2);
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [iframeURL],
    async function (_iframeURL) {
      const iframe = content.document.createElement("iframe");
      iframe.setAttribute("src", _iframeURL);
      content.document.body.appendChild(iframe);
    }
  );
  // Wait for the two request to be processed (iframe doc + fetch requests)
  // before removing the iframe so that the netmonitor is able to fetch
  // all lazy data without throwing
  await onNetworkEvents;
  await waitForAllNetworkUpdateEvents();

  info("Remove the iframe so that lazy request data are freed");
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    content.document.querySelector("iframe").remove();
  });

  const har = await copyAllAsHARWithContextMenu(monitor);
  // Har will fetch the two HTML documents (top document and iframe)
  // as well as the fetch request from within the iframe.
  is(har.log.entries.length, 3, "There must be three requests");
  is(
    har.log.entries[0].request.url,
    topDocumentURL,
    "First request is for the top level document"
  );
  is(
    har.log.entries[1].request.url,
    iframeURL,
    "Second request is for the iframe"
  );
  info(
    "The fetch request doesn't appear in HAR export, because its lazy data is freed and we completely ignore the request."
  );

  // Do not use teardown(monitor) as testClearedRequests register broken requests
  // which never complete and would block on waitForAllNetworkUpdateEvents
  await closeTabAndToolbox();
}

function assertNavigationRequestEntry(entry) {
  info("Assert that the entry relates to the navigation request");
  Assert.greater(entry.time, 0, "Check the total time");
  is(entry.request.method, "GET", "Check the method");
  is(entry.request.url, HTTPS_SIMPLE_URL, "Check the URL");
  is(
    entry.request.headers.length,
    EXPECTED_REQUEST_HEADER_COUNT,
    "Check number of request headers"
  );
  is(entry.response.status, 200, "Check response status");
  is(entry.response.statusText, "OK", "Check response status text");
  ok(
    EXPECTED_RESPONSE_HEADER_COUNT.includes(entry.response.headers.length),
    "Check number of response headers"
  );

  is(
    entry.response.content.mimeType,
    "text/html",
    "Check response content type"
  );
}
/**
 * Reload the page and copy all as HAR.
 */
async function reloadAndCopyAllAsHar({
  monitor,
  toolbox,
  reloadTwice = false,
}) {
  const { store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  const onNetworkEvent = waitForNetworkEvents(monitor, reloadTwice ? 2 : 1);
  const { onDomCompleteResource } =
    await waitForNextTopLevelDomCompleteResource(toolbox.commands);

  if (reloadTwice) {
    reloadSelectedTab();
  }
  await reloadSelectedTab();

  info("Waiting for network events");
  await onNetworkEvent;
  info("Waiting for DOCUMENT_EVENT dom-complete resource");
  await onDomCompleteResource;

  return copyAllAsHARWithContextMenu(monitor);
}

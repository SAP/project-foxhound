/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const server = new HttpServer();

server.registerContentType("html", "text/html");
server.registerContentType("js", "application/javascript");

server.registerPathHandler(`/`, function (request, response) {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write("<html>Test page for response body limit</html>");
});

server.registerPathHandler("/getdata", function (request, response) {
  info("Got request for " + request.path);
  const params = request.queryString.split("&");
  const size = (params.filter(s => s.includes("size="))[0] || "").split("=")[1];
  const body = "A".repeat(size);

  const gzip = params.some(p => p === "gzip");
  if (gzip) {
    response.processAsync();
    gzipCompressString(body).then(buffer => {
      response.setHeader("Content-Encoding", "gzip", false);
      response.setHeader("Content-Length", "" + buffer.length, false);
      response.write(buffer);
      response.finish();
    });
  } else {
    response.bodyOutputStream.write(body, body.length);
  }
});

server.start(-1);

const port = server.identity.primaryPort;
const TEST_URL = "http://localhost:" + port;
const GET_DATA_URL = TEST_URL + "/getdata";

registerCleanupFunction(() => {
  return new Promise(resolve => server.stop(resolve));
});

const BYTES_1000 = 1000;
const smallSize = BYTES_1000 / 2;
const bigSize = BYTES_1000 * 2;
const hugeSize = BYTES_1000 * 20;
const tooManyArgumentsSize = BYTES_1000 * 1000;

add_task(async function testNetworkObserverWithResponseBodyLimit1000() {
  info("Test a network observer with specific response body limit (1000)");
  const tab = await addTab(TEST_URL);

  const events = [];
  const networkObserver = createNetworkObserver({
    events,
    responseBodyLimit: BYTES_1000,
    decodeResponseBodies: true,
  });

  await performGetDataRequest(gBrowser, events, smallSize);
  await assertNetworkEventContent(events.at(-1), smallSize, false);

  await performGetDataRequest(gBrowser, events, bigSize);
  await assertNetworkEventContent(events.at(-1), BYTES_1000, true);

  await performGetDataRequest(gBrowser, events, hugeSize);
  await assertNetworkEventContent(events.at(-1), BYTES_1000, true);

  info("Increase the response body limit dynamically");
  networkObserver.setResponseBodyLimit(bigSize);

  await performGetDataRequest(gBrowser, events, bigSize);
  await assertNetworkEventContent(events.at(-1), bigSize, false);

  await performGetDataRequest(gBrowser, events, hugeSize);
  await assertNetworkEventContent(events.at(-1), bigSize, true);

  networkObserver.destroy();

  gBrowser.removeTab(tab);
});

add_task(async function testNetworkObserverWithResponseBodyLimitGzipped() {
  info("Test a network observer with specific response body limit (1000)");
  const tab = await addTab(TEST_URL);

  const events = [];

  info("Create a first NetworkObserver which stores decoded responses");
  const networkObserver = createNetworkObserver({
    events,
    responseBodyLimit: BYTES_1000,
    decodeResponseBodies: true,
  });

  await performGetDataRequest(gBrowser, events, bigSize, true /* gzip */);
  await assertNetworkEventContent(events.at(-1), BYTES_1000, true);

  networkObserver.destroy();

  info("Create another NetworkObserver which will store encoded responses");
  const noDecodeObserver = createNetworkObserver({
    events,
    responseBodyLimit: BYTES_1000,
    decodeResponseBodies: false,
  });

  // This time, with gzip compression enabled, a network observer storing
  // encoded responses should be able to persist the complete response, because
  // the encoded size is lower than 1000 bytes.
  await performGetDataRequest(gBrowser, events, bigSize, true /* gzip */);
  await assertNetworkEventContent(events.at(-1), bigSize, false);

  noDecodeObserver.destroy();

  gBrowser.removeTab(tab);
});

add_task(async function testNetworkObserverWithResponseBodyLimitZero() {
  info("Test a network observer with a response body limit = zero (unlimited)");
  const tab = await addTab(TEST_URL);

  for (const useGzip of [true, false]) {
    for (const decodeResponseBodies of [true, false]) {
      info("Test with decodeResponseBodies=" + decodeResponseBodies);
      const events = [];
      const noLimitNetworkObserver = createNetworkObserver({
        events,
        responseBodyLimit: 0,
        decodeResponseBodies,
      });

      await performGetDataRequest(gBrowser, events, smallSize, useGzip);
      await assertNetworkEventContent(events.at(-1), smallSize, false);

      await performGetDataRequest(gBrowser, events, bigSize, useGzip);
      await assertNetworkEventContent(events.at(-1), bigSize, false);

      await performGetDataRequest(gBrowser, events, hugeSize, useGzip);
      await assertNetworkEventContent(events.at(-1), hugeSize, false);

      await performGetDataRequest(
        gBrowser,
        events,
        tooManyArgumentsSize,
        useGzip
      );
      await assertNetworkEventContent(
        events.at(-1),
        tooManyArgumentsSize,
        false
      );

      noLimitNetworkObserver.destroy();
    }
  }

  gBrowser.removeTab(tab);
});

add_task(async function testNetworkObserverWithResponseBodyLimitDefault() {
  info("Test a network observer with default response body limit (unlimited)");
  const tab = await addTab(TEST_URL);

  const events = [];
  const noLimitNetworkObserver = createNetworkObserver({
    events,
    responseBodyLimit: undefined,
    decodeResponseBodies: true,
  });

  await performGetDataRequest(gBrowser, events, smallSize);
  await assertNetworkEventContent(events.at(-1), smallSize, false);

  await performGetDataRequest(gBrowser, events, bigSize);
  await assertNetworkEventContent(events.at(-1), bigSize, false);

  await performGetDataRequest(gBrowser, events, hugeSize);
  await assertNetworkEventContent(events.at(-1), hugeSize, false);

  noLimitNetworkObserver.destroy();

  gBrowser.removeTab(tab);
});

function createNetworkObserver({
  events,
  responseBodyLimit,
  decodeResponseBodies = false,
}) {
  info(
    `Create a NetworkObserver with responseBodyLimit=${responseBodyLimit}, ` +
      `decodeResponseBodies=${decodeResponseBodies}`
  );
  const networkObserver = new NetworkObserver({
    decodeResponseBodies,
    ignoreChannelFunction: channel => !channel.URI.spec.includes(TEST_URL),
    onNetworkEvent: () => {
      const owner = new ResponseContentOwner();
      events.push(owner);
      return owner;
    },
    responseBodyLimit,
  });
  registerCleanupFunction(() => networkObserver.destroy());
  return networkObserver;
}

async function performGetDataRequest(gBrowser, events, size, gzip = false) {
  const currentEventsCount = events.length;

  info("Perform a fetch for getdata with size=" + size);
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [`${GET_DATA_URL}?size=${size}${gzip ? "&gzip" : ""}`],
    _url => {
      content.wrappedJSObject.fetch(_url);
    }
  );

  info("Wait for network event to be received");
  await BrowserTestUtils.waitForCondition(
    () => events.length > currentEventsCount
  );
  is(
    events.length,
    currentEventsCount + 1,
    "Received the expected number of network events"
  );
  await BrowserTestUtils.waitForCondition(
    () => events.at(-1).hasResponseContentComplete
  );
}

async function assertNetworkEventContent(event, expectedSize, truncated) {
  info(
    `Assert expected event with size=${expectedSize}, truncated=${truncated}`
  );
  is(
    await event.getDecodedContent(),
    "A".repeat(expectedSize),
    "Response text has the expected content"
  );
  is(
    event.truncated,
    truncated,
    `response content is ${truncated ? "" : "not "}truncated`
  );
}

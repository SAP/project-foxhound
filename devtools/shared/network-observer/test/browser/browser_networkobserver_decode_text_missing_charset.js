/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

/**
 * Test that UTF-8 responses without a charset are decoded identically whether
 * decodeResponseBodies is true or false.
 */

// Prepare test server.
const server = new HttpServer();

server.registerContentType("html", "text/html");
server.registerContentType("js", "application/javascript");

server.registerPathHandler(`/`, function (request, response) {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.write("<html>Test page for ascii without charset</html>");
});

function convertToUtf8(str) {
  return String.fromCharCode(...new TextEncoder().encode(str));
}

const ASCII_TEXT = "àüòç";
server.registerPathHandler("/ascii", function (request, response) {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/plain", false);
  response.write(convertToUtf8(ASCII_TEXT));
});

server.start(-1);

registerCleanupFunction(() => {
  return new Promise(resolve => server.stop(resolve));
});

const port = server.identity.primaryPort;
const TEST_URL = "http://localhost:" + port;
const ASCII_URL = TEST_URL + "/ascii";

add_task(async function () {
  await testMissingCharset({ decodeResponseBodies: true });
  await testMissingCharset({ decodeResponseBodies: false });
});

async function testMissingCharset({ decodeResponseBodies }) {
  info(
    "Test response with missing charset information and decodeResponseBodies=" +
      decodeResponseBodies
  );
  const tab = await addTab(TEST_URL);

  const events = [];
  const networkObserver = new NetworkObserver({
    decodeResponseBodies,
    ignoreChannelFunction: channel => channel.URI.spec !== ASCII_URL,
    onNetworkEvent: () => {
      const owner = new ResponseContentOwner();
      events.push(owner);
      return owner;
    },
  });
  registerCleanupFunction(() => networkObserver.destroy());

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [ASCII_URL], _url => {
    const xhr = new content.wrappedJSObject.XMLHttpRequest();
    xhr.open("GET", _url);
    xhr.send();
  });

  info("Wait for all network events to be received");
  await BrowserTestUtils.waitForCondition(() => events.length >= 1);
  is(events.length, 1, "Received the expected number of network events");
  await BrowserTestUtils.waitForCondition(
    () => events[0].hasResponseContentComplete
  );
  is(
    await events[0].getDecodedContent(),
    ASCII_TEXT,
    "ASCII response content was properly decoded"
  );
  is(events[0].truncated, false, "response content should not be truncated");

  networkObserver.destroy();
  gBrowser.removeTab(tab);
}

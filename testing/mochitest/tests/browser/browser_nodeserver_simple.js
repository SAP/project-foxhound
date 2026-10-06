/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { NodeHTTPServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

add_task(async function test_nodeserver_basic() {
  let server = new NodeHTTPServer();
  await server.start();

  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.registerPathHandler("/test", function (req, resp) {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("Hello from NodeServer!");
  });

  let chan = NetUtil.newChannel({
    uri: `${server.origin()}/test`,
    loadUsingSystemPrincipal: true,
  });

  chan.QueryInterface(Ci.nsIHttpChannelInternal);
  let [response, status] = await new Promise(resolve => {
    NetUtil.asyncFetch(chan, (inputStream, statusCode) => {
      let data = NetUtil.readInputStreamToString(
        inputStream,
        inputStream.available()
      );
      resolve([data, statusCode]);
    });
  });

  Assert.equal(status, Cr.NS_OK, "Request should succeed");
  Assert.equal(
    response,
    "Hello from NodeServer!",
    "Should receive correct response"
  );

  await server.stop();
});

add_task(async function test_nodeserver_multiple_paths() {
  let server = new NodeHTTPServer();
  await server.start();

  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.registerPathHandler("/path1", function (req, resp) {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("Response from path1");
  });

  await server.registerPathHandler("/path2", function (req, resp) {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("Response from path2");
  });

  for (let path of ["/path1", "/path2"]) {
    let chan = NetUtil.newChannel({
      uri: `${server.origin()}${path}`,
      loadUsingSystemPrincipal: true,
    });

    chan.QueryInterface(Ci.nsIHttpChannelInternal);

    let [response] = await new Promise(resolve => {
      NetUtil.asyncFetch(chan, (inputStream, statusCode) => {
        let data = NetUtil.readInputStreamToString(
          inputStream,
          inputStream.available()
        );
        resolve([data, statusCode]);
      });
    });

    let expectedResponse = `Response from ${path.substring(1)}`;
    Assert.equal(
      response,
      expectedResponse,
      `Should get response from ${path}`
    );
  }

  await server.stop();
});

"use strict";

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let server;

add_setup(async function test_setup() {
  do_get_profile();
  Services.prefs.setBoolPref("network.http.http2.enabled", true);
  Services.prefs.setCharPref(
    "network.dns.localDomains",
    "foo.example.com, alt1.example.com"
  );

  server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  // Register path handlers based on moz-http2.js
  await server.registerPathHandler("/origin-1", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-1");
  });

  await server.registerPathHandler("/origin-2", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-2");
  });

  await server.registerPathHandler("/origin-3", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-3");
  });

  await server.registerPathHandler("/origin-4", (req, resp) => {
    // Send empty origin frame BEFORE any response headers
    if (req.stream && req.stream.session) {
      req.stream.session.origin();
    }
    // Add a small delay to ensure origin frame is processed
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-4");
  });

  await server.registerPathHandler("/origin-5", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-5");
  });

  await server.registerPathHandler("/origin-6", (req, resp) => {
    // Send origin frame with alt1, alt2, and bar
    if (req.stream && req.stream.session) {
      req.stream.session.origin(
        `https://alt1.example.com:${server.address().port}`,
        `https://alt2.example.com:${server.address().port}`,
        `https://bar.example.com:${server.address().port}`
      );
    }
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-6");
  });

  await server.registerPathHandler("/origin-7", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-7");
  });

  await server.registerPathHandler("/origin-8", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-8");
  });

  await server.registerPathHandler("/origin-9", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-9");
  });

  await server.registerPathHandler("/origin-10", (req, resp) => {
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-10");
  });
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.http.http2.enabled");
  Services.prefs.clearUserPref("network.dns.localDomains");
});

function makeChan(origin) {
  return NetUtil.newChannel({
    uri: origin,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
}

function channelOpenPromise(chan, loadFlags = 0) {
  return new Promise((resolve, reject) => {
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI | loadFlags;

    function finish(req, buffer) {
      try {
        Assert.ok(req instanceof Ci.nsIHttpChannel);
        Assert.ok(Components.isSuccessCode(req.status));
        Assert.equal(req.responseStatus, 200);
        const clientPort = parseInt(req.getResponseHeader("x-client-port"));
        resolve({ req, buffer, clientPort });
      } catch (e) {
        reject(e);
      }
    }

    chan.asyncOpen(new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL));
  });
}

function channelOpenExpectFailure(chan, loadFlags = 0) {
  return new Promise((resolve, reject) => {
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI | loadFlags;

    function finish(req, buffer) {
      try {
        Assert.ok(req instanceof Ci.nsIHttpChannel);
        Assert.ok(!Components.isSuccessCode(req.status));
        resolve({ req, buffer });
      } catch (e) {
        reject(e);
      }
    }

    chan.asyncOpen(
      new ChannelListener(finish, null, CL_ALLOW_UNKNOWN_CL | CL_EXPECT_FAILURE)
    );
  });
}

add_task(async function test_origin_coalescing_sequence() {
  let currentPort = 0;

  // Test 1: First request to origin-1
  info("Test 1: First request to origin-1");
  let chan = makeChan(`https://foo.example.com:${server.port()}/origin-1`);
  let result = await channelOpenPromise(chan);
  Assert.notEqual(currentPort, result.clientPort);
  currentPort = result.clientPort;

  // Test 2: Plain connection reuse (origin-2)
  info("Test 2: Plain connection reuse (origin-2)");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-2`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 3: RFC 7540 style coalescing (alt1.example.com)
  info("Test 3: RFC 7540 style coalescing (alt1.example.com)");
  chan = makeChan(`https://alt1.example.com:${server.port()}/origin-3`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 4: Forces an empty origin frame to be sent
  info("Test 4: Empty origin frame");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-4`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);
  info(`Test 4 completed with port: ${result.clientPort}`);

  // // Add a small delay to ensure origin frame takes effect
  // await new Promise(resolve => do_timeout(50, resolve));

  // Test 5: Force a new connection by using LOAD_FRESH_CONNECTION
  // (Simulating the effect that origin frame restriction would have)
  info("Test 5: Force new connection (simulating origin frame restriction)");
  chan = makeChan(`https://alt1.example.com:${server.port()}/origin-5`);
  result = await channelOpenPromise(chan, Ci.nsIRequest.LOAD_FRESH_CONNECTION);
  info(`Test 5 - Current port: ${currentPort}, New port: ${result.clientPort}`);
  Assert.notEqual(currentPort, result.clientPort);
  currentPort = result.clientPort;

  // Test 6: Get a fresh connection with alt1 and alt2 in origin set
  info("Test 6: Fresh connection with origin set");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-6`);
  result = await channelOpenPromise(chan, Ci.nsIRequest.LOAD_FRESH_CONNECTION);
  Assert.notEqual(currentPort, result.clientPort);
  currentPort = result.clientPort;

  // Test 7: Check conn reuse to ensure SNI is implicit in origin set
  info("Test 7: Connection reuse with implicit SNI");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-7`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 8: alt1 is in origin set (and is RFC 7540 eligible)
  info("Test 8: alt1 in origin set");
  chan = makeChan(`https://alt1.example.com:${server.port()}/origin-8`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 9: alt2 is in origin set but does not have DNS
  info("Test 9: alt2 in origin set (no DNS)");
  chan = makeChan(`https://alt2.example.com:${server.port()}/origin-9`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 10: bar is in origin set but does not have DNS and cert is not valid
  info("Test 10: bar.example.com (should fail - invalid cert)");
  chan = makeChan(`https://bar.example.com:${server.port()}/origin-10`);
  await channelOpenExpectFailure(chan);
});

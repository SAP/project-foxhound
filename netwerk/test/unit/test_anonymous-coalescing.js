/*
- test to check we use only a single connection for both onymous and anonymous requests over an existing h2 session
- request from a domain w/o LOAD_ANONYMOUS flag
- request again from the same domain, but different URI, with LOAD_ANONYMOUS flag, check the client is using the same conn
- close all and do it in the opposite way (do an anonymous req first)
*/

"use strict";

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let server;

add_setup(async function test_setup() {
  do_get_profile();
  Services.prefs.setBoolPref("network.http.http2.enabled", true);
  Services.prefs.setCharPref("network.dns.localDomains", "foo.example.com");

  server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  // Register path handlers for all test endpoints - copy from moz-http2.js
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
    resp.setHeader("x-client-port", req.socket.remotePort);
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("origin-4");
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

add_task(async function test_anonymous_coalescing_sequence() {
  let currentPort = 0;

  // Test 1: First non-anonymous request
  info("Test 1: First non-anonymous request");
  let chan = makeChan(`https://foo.example.com:${server.port()}/origin-1`);
  let result = await channelOpenPromise(chan);
  Assert.notEqual(currentPort, result.clientPort);
  currentPort = result.clientPort;

  // Test 2: Same request to mark connection as experienced
  info("Test 2: Second non-anonymous request (same endpoint)");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-1`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);

  // Test 3: Anonymous request should reuse connection
  info("Test 3: Anonymous request should reuse connection");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-2`);
  result = await channelOpenPromise(chan, Ci.nsIRequest.LOAD_ANONYMOUS);
  Assert.equal(currentPort, result.clientPort);

  // Test 4: Force new connection with anonymous request
  info("Test 4: Force new connection with anonymous request");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-3`);
  result = await channelOpenPromise(
    chan,
    Ci.nsIRequest.LOAD_ANONYMOUS | Ci.nsIRequest.LOAD_FRESH_CONNECTION
  );
  Assert.notEqual(currentPort, result.clientPort);
  currentPort = result.clientPort;

  // Test 5: Same anonymous request to mark connection as experienced
  info("Test 5: Same anonymous request (mark connection experienced)");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-3`);
  result = await channelOpenPromise(chan, Ci.nsIRequest.LOAD_ANONYMOUS);
  Assert.equal(currentPort, result.clientPort);

  // Test 6: Non-anonymous request should reuse connection
  info("Test 6: Non-anonymous request should reuse connection");
  chan = makeChan(`https://foo.example.com:${server.port()}/origin-4`);
  result = await channelOpenPromise(chan);
  Assert.equal(currentPort, result.clientPort);
});

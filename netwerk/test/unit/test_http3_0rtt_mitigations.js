/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

registerCleanupFunction(async () => {
  http3_clear_prefs();
  Services.prefs.clearUserPref("network.http.http3.0rtt_timeout");
});

add_task(async function setup() {
  await http3_setup_tests("h3");
});

function makeChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  return chan;
}

function channelOpenPromise(chan, flags) {
  return new Promise(resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    chan.asyncOpen(new ChannelListener(finish, null, flags));
  });
}

// Test the normal case.
add_task(async function test_0rtt_timeout_normal_operation() {
  info("Testing 0-RTT timeout with normal operation");

  // Enable 0-RTT
  Services.prefs.setBoolPref("network.http.http3.enable_0rtt", true);
  Services.prefs.setIntPref("network.http.http3.0rtt_timeout", 5000);

  // Clear any existing connections
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Make first request to establish a resumable session
  let chan = makeChan("https://foo.example.com/30");
  let [req] = await channelOpenPromise(chan);
  Assert.equal(req.status, Cr.NS_OK);

  // Wait to ensure session info is saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // Clear connections to force new connection with 0-RTT
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Make multiple requests - they should all succeed quickly
  // (well under the 5 second timeout)
  let promises = [];
  for (let i = 0; i < 3; i++) {
    let c = makeChan(`https://foo.example.com/30?timeout_test=${i}`);
    promises.push(channelOpenPromise(c));
  }

  await Promise.all(promises);
});

// Test whether all transactions is successfully restarted.
add_task(async function test_stuck_0rtt_session() {
  info("Testing stuck 0-RTT session timeout");

  // Start a separate HTTP/3 server for this test
  let h3Port = await create_h3_server();
  Assert.notEqual(h3Port, null);

  info(`Started H3 test server on port ${h3Port}`);

  // Start HTTP/2 server on the same port for fallback
  let h2Server = new NodeHTTP2Server();
  await h2Server.start(h3Port);
  registerCleanupFunction(async () => {
    await h2Server.stop();
  });

  // Register a simple handler for the H2 server
  await h2Server.registerPathHandler("/30", (_req, resp) => {
    resp.writeHead(200, { "content-type": "text/plain" });
    resp.end("H2 fallback response");
  });

  info(`Started H2 fallback server on port ${h3Port}`);

  // Configure for a different hostname
  // The origin will use h3Port, and H3 is the alt-svc
  let testHost = "alt1.example.com";
  Services.prefs.setCharPref("network.dns.localDomains", testHost);
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${testHost};h3=:${h3Port}`
  );

  function makeStuckTestChan(path) {
    let chan = NetUtil.newChannel({
      uri: `https://${testHost}:${h3Port}${path}`,
      loadUsingSystemPrincipal: true,
    }).QueryInterface(Ci.nsIHttpChannel);
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
    return chan;
  }

  // Clear any existing connections
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Make first request to establish a resumable session
  info("Establishing initial session for 0-RTT");
  let chan = makeStuckTestChan("/30");
  let [req] = await channelOpenPromise(chan);
  Assert.equal(req.status, Cr.NS_OK);

  // Wait to ensure session info is saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // Tell the server to enable stuck 0-RTT mode for the next connection
  info("Enabling stuck 0-RTT mode on test server");
  let setupChan = makeStuckTestChan("/SetStuckZeroRtt");
  let [setupReq] = await channelOpenPromise(setupChan);
  Assert.equal(setupReq.status, Cr.NS_OK);

  info("Stuck 0-RTT mode enabled on server");

  // Wait a bit
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // Clear connections to force a new 0-RTT connection
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  info("Making multiple requests that will encounter stuck 0-RTT session");

  let numRequests = 3;
  let promises = [];
  let startTime = Date.now();

  for (let i = 0; i < numRequests; i++) {
    let stuckChan = makeStuckTestChan(`/30?stuck_test=${i}`);
    promises.push(channelOpenPromise(stuckChan, CL_ALLOW_UNKNOWN_CL));
  }

  // Wait for all requests to complete
  let results = await Promise.all(promises);
  let elapsed = Date.now() - startTime;

  info(`All ${numRequests} requests completed after ${elapsed}ms`);

  // Verify all requests completed successfully with H2 fallback
  results.forEach(([req, buffer], index) => {
    Assert.equal(req.status, Cr.NS_OK, `Request ${index} should succeed`);
    Assert.equal(
      buffer,
      "H2 fallback response",
      `Request ${index} should receive H2 fallback response`
    );
    info(`Request ${index} completed successfully with H2 fallback`);
  });

  // All requests should complete within a reasonable time
  Assert.less(
    elapsed,
    10000,
    "All requests should complete within 10 seconds via fallback"
  );
});

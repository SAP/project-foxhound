/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_cache.js */
/* import-globals-from head_cookies.js */
/* import-globals-from head_channels.js */
/* import-globals-from head_servers.js */

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

let h2Port;
let h3Port;
add_setup(function test_setup() {
  do_get_profile();
  h2Port = Services.env.get("MOZHTTP2_PORT");
  Assert.notEqual(h2Port, null);
  Assert.notEqual(h2Port, "");
  h3Port = Services.env.get("MOZHTTP3_PORT");
  Assert.notEqual(h3Port, null);
  Assert.notEqual(h3Port, "");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );

  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setCharPref("network.dns.localDomains", "foo.example.com");
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
});

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
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

async function do_test_timing(url) {
  // Make sure all connections are closed before testing.
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // Make sure 0RTT is not involved.
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  let chan = makeChan(url);
  let timedChannel = chan.QueryInterface(Ci.nsITimedChannel);
  await channelOpenPromise(chan);
  info(`secureConnectionStartTime=${timedChannel.secureConnectionStartTime}`);
  info(`connectEndTime=${timedChannel.connectEndTime}`);
  Assert.ok(timedChannel.secureConnectionStartTime > 0);
  Assert.ok(timedChannel.connectEndTime > 0);
  let handshakeTime =
    timedChannel.connectEndTime - timedChannel.secureConnectionStartTime;
  Assert.ok(handshakeTime > 0);
  info(`handshakeTime=${handshakeTime}`);
  info("perfMetrics", { handshakeTime });
}

add_task(async function test_http2() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_timing(`https://foo.example.com:${h2Port}/server-timing`);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_timing(`https://foo.example.com:${h2Port}/server-timing`);
});

add_task(async function test_http1() {
  let server = new NodeHTTPSServer();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.registerPathHandler("/test", (req, resp) => {
    const output = "done";
    resp.setHeader("Content-Length", output.length);
    resp.writeHead(200);
    resp.end(output);
  });

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_timing(`https://localhost:${server.port()}/test`);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_timing(`https://localhost:${server.port()}/test`);
});

add_task(async function test_http3() {
  await http3_setup_tests("h3", true);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_timing(`https://foo.example.com/`);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_timing(`https://foo.example.com/`);
});

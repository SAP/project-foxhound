/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Verifies the Happy Eyeballs HTTP/3 0-RTT-accepted code path against
// the Neqo HTTP/3 test server. Mirrors test_happy_eyeballs_h2_0rtt.js
// but for h3:
//  * Second fetch resumes with 0-RTT (securityInfo.resumed == true)
//    and still returns 200.
//  * Protocol negotiates to h3 on both fetches.
//
// http3_setup_tests("h3") points foo.example.com at the H3 test server
// via alt-svc and sets network.dns.disableIPv6 = true so HE only races
// IPv4 attempts against the single-use session ticket.

"use strict";

const { HTTP3Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

let server;
let h3Port;

registerCleanupFunction(async () => {
  http3_clear_prefs();
  Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
  Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
  Services.prefs.clearUserPref("network.http.http3.enable_0rtt");
  override.clearOverrides();
  await server.stop();
});

add_task(async function setup() {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  Services.prefs.setBoolPref("network.http.http3.enable_0rtt", true);

  let h3ServerPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  let h3DBPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  server = new HTTP3Server();
  await server.start(h3ServerPath, h3DBPath);
  h3Port = server.port();
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `foo.example.com;h3=:${h3Port}`
  );

  override.addIPOverride("foo.example.com", "127.0.0.1");
});

function openChan(uri) {
  return new Promise(resolve => {
    let chan = NetUtil.newChannel({
      uri,
      loadUsingSystemPrincipal: true,
    }).QueryInterface(Ci.nsIHttpChannel);
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
    chan.asyncOpen(
      new ChannelListener(
        req => {
          let httpChan = req.QueryInterface(Ci.nsIHttpChannel);
          let resumed = false;
          try {
            resumed = req.securityInfo.resumed;
          } catch (e) {}
          resolve({
            status: httpChan.responseStatus,
            protocol: httpChan.protocolVersion,
            resumed,
          });
        },
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });
}

// Like openChan but resolves on both success and failure.
function openChanMayFail(uri) {
  const chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  const promise = new Promise(resolve => {
    chan.asyncOpen({
      onStartRequest() {},
      onDataAvailable(_req, stream, _offset, count) {
        read_stream(stream, count);
      },
      onStopRequest(_req, status) {
        resolve(status);
      },
      QueryInterface: ChromeUtils.generateQI(["nsIStreamListener"]),
    });
  });
  return { chan, promise };
}

add_task(async function test_he_h3_0rtt_resumes() {
  const url = "https://foo.example.com/30";

  let r1 = await openChan(url);
  Assert.equal(r1.status, 200, "First fetch should succeed");
  Assert.equal(r1.protocol, "h3", "First fetch should be h3");
  Assert.equal(r1.resumed, false, "First fetch should not be resumed");

  // Let the NewSessionTicket arrive and be cached before we tear down
  // the connection.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  let r2 = await openChan(url);
  Assert.equal(r2.status, 200, "Second fetch should succeed");
  Assert.equal(r2.protocol, "h3", "Second fetch should be h3");
  Assert.equal(r2.resumed, true, "Second fetch should resume via 0-RTT");
});

// Verifies that when ZeroRttHandle::Finish0RTT sees a null real transaction.
add_task(async function test_he_h3_0rtt_txn_gone_closes_connection() {
  const url = "https://foo.example.com/30";

  // Establish a fresh H3 connection and obtain a session ticket so the next
  // request can attempt 0-RTT.
  let r1 = await openChan(url);
  Assert.equal(r1.status, 200, "warm-up request should succeed");
  Assert.equal(r1.protocol, "h3", "warm-up request should be h3");

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  Services.prefs.setBoolPref(
    "network.http.0rtt_force_txn_gone_for_testing",
    true
  );

  const { promise: failPromise } = openChanMayFail(url);
  const failStatus = await failPromise;
  Assert.equal(
    failStatus,
    Cr.NS_ERROR_ABORT,
    "request with forced-null txn should be aborted cleanly"
  );

  Services.prefs.clearUserPref("network.http.0rtt_force_txn_gone_for_testing");

  // Allow the closed connection to be fully torn down before retrying.
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // The networking stack must still be functional after the forced close.
  let r3 = await openChan(url);
  Assert.equal(r3.status, 200, "recovery request should succeed");
  Assert.equal(r3.protocol, "h3", "recovery request should be h3");
});

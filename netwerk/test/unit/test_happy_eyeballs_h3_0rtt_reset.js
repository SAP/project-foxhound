/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Verifies that when an H3 0-RTT attempt fails with NS_ERROR_NET_RESET,
// ProcessConnectionResult restarts the transaction without 0-RTT and the
// retry succeeds via H3 (full handshake, resumed=false).
//
// blockUDPAddrIO + 0rtt_timeout cause the 0-RTT session to time out, which
// closes the HE stream with NS_ERROR_NET_RESET (mBeforeConnectedError=true).
// ProcessConnectionResult calls FinishAdopted0RTT(true)+Restart().
// Http3Session::Shutdown sets mDontExclude=true (mHad0RttStream) so H3
// stays in the alt-svc map.  After clearing the UDP block the retry H3
// completes the full QUIC handshake and returns 200/h3.

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);
const { HTTP3Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);
const mockController = Cc[
  "@mozilla.org/network/mock-network-controller;1"
].getService(Ci.nsIMockNetworkLayerController);

let h3Server;
let h2Server;
let h3Port;

add_setup(async function () {
  let h3ServerPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  let h3DBPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setBoolPref("network.http.http3.enable_0rtt", true);
  // NSPR I/O is required for the mock network layer to intercept sendto().
  Services.prefs.setBoolPref("network.http.http3.use_nspr_for_io", true);
  Services.prefs.setBoolPref("network.socket.attach_mock_network_layer", true);
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  // Use IPv4 only so HE races a single address — keeps the scenario simple.
  Services.prefs.setBoolPref("network.dns.disableIPv6", true);

  h3Server = new HTTP3Server();
  await h3Server.start(h3ServerPath, h3DBPath);
  h3Port = h3Server.port();

  h2Server = new NodeHTTP2Server();
  await h2Server.start();
  await h2Server.registerPathHandler("/", (_req, resp) => {
    resp.writeHead(200, { "content-type": "text/plain" });
    resp.end("ok");
  });

  override.addIPOverride("foo.example.com", "127.0.0.1");

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.http.http3.enable");
    Services.prefs.clearUserPref("network.http.http3.enable_0rtt");
    Services.prefs.clearUserPref("network.http.http3.use_nspr_for_io");
    Services.prefs.clearUserPref("network.socket.attach_mock_network_layer");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    Services.prefs.clearUserPref("network.dns.disableIPv6");
    Services.prefs.clearUserPref(
      "network.http.http3.alt-svc-mapping-for-testing"
    );
    override.clearOverrides();
    mockController.clearBlockedUDPAddr();
    mockController.clearBlockedTCPConnect();
    await h3Server.stop();
    await h2Server.stop();
  });
});

function openChan(host, port) {
  return new Promise(resolve => {
    let chan = NetUtil.newChannel({
      uri: `https://${host}:${port}/`,
      loadUsingSystemPrincipal: true,
    }).QueryInterface(Ci.nsIHttpChannel);
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
    chan.asyncOpen(
      new ChannelListener(
        (req, buf) => {
          let resumed = false;
          try {
            resumed = req.securityInfo.resumed;
          } catch (_e) {}
          resolve({
            status: req.QueryInterface(Ci.nsIHttpChannel).responseStatus,
            protocol: req.protocolVersion,
            resumed,
            buffer: buf,
          });
        },
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });
}

add_task(async function test_he_h3_0rtt_reset_restarts_without_0rtt() {
  const host = "foo.example.com";
  const h2Port = h2Server.port();

  // Alt-svc maps the host to the H3 server; plain TCP connects to the H2
  // server on h2Port.
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );

  // ── First request: full H3 handshake, PSK ticket written to cache ──────
  let r1 = await openChan(host, h2Port);
  Assert.equal(r1.status, 200, "First request should succeed");
  Assert.equal(r1.protocol, "h3", "First request should use H3");
  Assert.equal(r1.resumed, false, "First request should not use 0-RTT");

  // Give NSS time to persist the session ticket before clearing connections.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // ── Second request: H3 0-RTT times out -> restart -> retry via H3 ──────────
  Services.prefs.setIntPref("network.http.http3.0rtt_timeout", 100);

  let blockAddr = mockController.createScriptableNetAddr("127.0.0.1", h3Port);
  mockController.blockUDPAddrIO(blockAddr);
  let blockedTCP = mockController.createScriptableNetAddr("127.0.0.1", h2Port);
  mockController.blockTCPConnect(blockedTCP);

  let r2Promise = openChan(host, h2Port);

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 150));
  mockController.clearBlockedUDPAddr();

  let r2 = await r2Promise;
  Assert.equal(r2.status, 200, "Restarted request should succeed");
  Assert.equal(r2.protocol, "h3", "Retry uses H3 full handshake (no 0-RTT)");
  Assert.equal(
    r2.resumed,
    false,
    "No 0-RTT: PSK was consumed by the 0-RTT attempt"
  );

  mockController.clearBlockedTCPConnect();
  Services.prefs.clearUserPref("network.http.http3.0rtt_timeout");
});

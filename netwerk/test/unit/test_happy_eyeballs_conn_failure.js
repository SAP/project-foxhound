/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { HTTP3Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let trrServer;
let h3NoResponsePort;
let tcpNoResponseSocket;
let tcpNoResponsePort;

add_setup(async function () {
  h3NoResponsePort = Services.env.get("MOZHTTP3_PORT_NO_RESPONSE");
  Assert.notEqual(h3NoResponsePort, null);
  Assert.notEqual(h3NoResponsePort, "");

  let h3ServerPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  let h3DBPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");

  let server = new HTTP3Server();
  await server.start(h3ServerPath, h3DBPath);

  tcpNoResponsePort = server.no_response_port();

  // A TCP server socket that listens but never accepts connections.
  // TCP handshake completes (OS handles SYN/SYN-ACK) but TLS never starts.
  tcpNoResponseSocket = Cc[
    "@mozilla.org/network/server-socket;1"
  ].createInstance(Ci.nsIServerSocket);
  tcpNoResponseSocket.init(tcpNoResponsePort, true, -1);

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);

  trrServer = new TRRServer();
  await trrServer.start();
  trr_test_setup();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    Services.prefs.clearUserPref(
      "network.http.http3.alt-svc-mapping-for-testing"
    );
    trr_clear_prefs();
    if (trrServer) {
      await trrServer.stop();
    }
    if (tcpNoResponseSocket) {
      tcpNoResponseSocket.close();
    }
    await server.stop();
  });
});

async function resetConnections() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  Services.dns.clearCache(true);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function do_test_h3_no_response(host) {
  await resetConnections();

  let chan = NetUtil.newChannel({
    uri: `https://${host}:${tcpNoResponsePort}/`,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (req, _buf) => {
          Assert.ok(
            !Components.isSuccessCode(req.status),
            `Channel should fail, status=0x${req.status.toString(16)}`
          );
          Assert.equal(
            req.status,
            Cr.NS_ERROR_NET_TIMEOUT,
            "Request should fail with NS_ERROR_NET_TIMEOUT"
          );
          resolve();
        },
        null,
        CL_EXPECT_FAILURE
      )
    );
  });
}

add_task(async function test_h3_connection_no_response() {
  Services.prefs.setIntPref("network.http.connection-timeout", 2);

  let host = "noresponse.example.com";
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3NoResponsePort}`
  );
  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
  });

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_h3_no_response(host);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_h3_no_response(host);

  Services.prefs.clearUserPref("network.http.connection-timeout");
  Services.prefs.clearUserPref(
    "network.http.http3.alt-svc-mapping-for-testing"
  );
});

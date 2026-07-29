/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Verifies that a TRRServiceChannel preemptively sends Proxy-Authorization
// when the nsIProxyInfo returned by the registered proxy filter carries a
// bearer token (as IPPChannelFilter constructs via newProxyInfo's
// aProxyAuthorizationHeader argument).
//
// The HTTP/2 proxy is started in auth-required mode: a CONNECT without a
// Proxy-Authorization header is answered with 407 and the stream is closed.
// TRRServiceChannel has no nsHttpChannelAuthProvider, so it cannot retry
// after a 407. Therefore a successful DNS resolution through the proxy is
// only possible if the channel includes Proxy-Authorization on the first
// CONNECT.

"use strict";

/* import-globals-from head_trr.js */
/* import-globals-from head_channels.js */

const { NodeHTTP2ProxyServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const BEARER_TOKEN = "Bearer trr-preemptive-test-token";

// Mirrors IPPChannelFilter.applyFilter: returns an nsIProxyInfo whose
// proxyAuthorizationHeader is the bearer token. The TRRServiceChannel under
// test should then copy that onto its request head before the CONNECT goes
// out (see TRRServiceChannel::OnProxyAvailable).
class BearerProxyChannelFilter {
  QueryInterface = ChromeUtils.generateQI(["nsIProtocolProxyChannelFilter"]);
  constructor(host, port, trrUriPrefix) {
    this._host = host;
    this._port = port;
    this._trrUriPrefix = trrUriPrefix;
  }
  applyFilter(channel, defaultPI, cb) {
    // Only proxy the TRR DoH endpoint. Anything else (e.g. cert revocation
    // lookups for the proxy itself) stays direct.
    if (!channel.URI.spec.startsWith(this._trrUriPrefix)) {
      cb.onProxyFilterResult(defaultPI);
      return;
    }
    const pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(
      Ci.nsIProtocolProxyService
    );
    cb.onProxyFilterResult(
      pps.newProxyInfo(
        "https",
        this._host,
        this._port,
        BEARER_TOKEN, // aProxyAuthorizationHeader
        "", // aConnectionIsolationKey
        Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST,
        10, // failover timeout
        null
      )
    );
  }
}

let pps;
let proxy;
let trrServer;
let filter;

add_setup(async function setup() {
  trr_test_setup();

  const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");
  addCertFromFile(certdb, "proxy-ca.pem", "CTu,u,u");

  trrServer = new TRRServer();
  await trrServer.start();
  await trrServer.registerDoHAnswers("test.proxy.com", "A", {
    answers: [
      {
        name: "test.proxy.com",
        ttl: 55,
        type: "A",
        flush: false,
        data: "3.3.3.3",
      },
    ],
  });

  // Wrap the DoH handler so we can assert that the inner DoH request the
  // server sees does NOT carry Proxy-Authorization. That header is for the
  // proxy hop only and must never reach the origin.
  await trrServer.execute(`
    global.dnsQuerySawProxyAuth = false;
    global.originalDnsQueryHandler = global.path_handlers["/dns-query"];
  `);
  await trrServer.registerPathHandler("/dns-query", function (req, resp) {
    if (req.headers["proxy-authorization"]) {
      global.dnsQuerySawProxyAuth = true;
    }
    return global.originalDnsQueryHandler(req, resp);
  });

  proxy = new NodeHTTP2ProxyServer();
  // auth=true: reject CONNECT requests without Proxy-Authorization with 407.
  // Skip the proxy's built-in proxy filter; we install our own that carries
  // the bearer token.
  await proxy.startWithoutProxyFilter(0, true);

  pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(
    Ci.nsIProtocolProxyService
  );
  filter = new BearerProxyChannelFilter(
    "localhost",
    proxy.port(),
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );
  pps.registerChannelFilter(filter, 0);

  registerCleanupFunction(async () => {
    if (filter) {
      pps.unregisterChannelFilter(filter);
      filter = null;
    }
    if (proxy) {
      await proxy.stop();
      proxy = null;
    }
    if (trrServer) {
      await trrServer.stop();
      trrServer = null;
    }
    trr_clear_prefs();
  });
});

add_task(async function test_trr_preemptive_proxy_auth() {
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setIntPref(
    "network.trr.request_timeout_mode_trronly_ms",
    5000
  );
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  Services.dns.clearCache(true);
  // If the bearer is not attached to the CONNECT, the proxy answers 407 and
  // TRR cannot retry — the listener would observe a failure here.
  await new TRRDNSListener("test.proxy.com", "3.3.3.3");

  Assert.ok(
    !(await trrServer.execute("global.dnsQuerySawProxyAuth")),
    "Proxy-Authorization must not leak through to the DoH server"
  );
});

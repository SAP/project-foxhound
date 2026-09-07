/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from trr_common.js */
/* import-globals-from head_trr.js */

const { HTTP3Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

let h2Port;
let h3NoResponsePort;
let h3ReverseProxyPort;

add_setup(async function setup() {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  h2Port = Services.env.get("MOZHTTP2_PORT");
  Assert.notEqual(h2Port, null);
  Assert.notEqual(h2Port, "");

  let h3ServerPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  let h3DBPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");

  let server = new HTTP3Server();
  await server.start(h3ServerPath, h3DBPath);

  h3NoResponsePort = server.no_response_port();
  h3ReverseProxyPort = server.reverse_proxy_port();

  Services.prefs.setBoolPref("network.dns.preferIPv6", true);
  Services.prefs.setCharPref(
    "network.dns.localDomains",
    "foo.example.com, alt1.example.com, alt2.example.com"
  );

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.dns.localDomains");
    Services.prefs.clearUserPref("network.trr.force_http3_first");
  });
});

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
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

add_task(async function test_doh_http3_first() {
  Services.dns.clearCache(true);
  let host = "foo.example.com";

  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3ReverseProxyPort}`
  );

  // Our HTTP/3 reverse proxy only supports forwarding plain HTTP traffic,
  // so the backend TRR server must also run over plain HTTP.
  let trrServer = new PlainHttpTRRServer();
  await trrServer.start();

  await trrServer.registerDoHAnswers("example.org", "A", {
    answers: [
      {
        name: "example.org",
        ttl: 55,
        type: "A",
        flush: false,
        data: "2.2.2.2",
      },
    ],
  });

  // Tell the Http/3 server which port to forward requests.
  let chan = makeChan(
    `https://${host}:${h3ReverseProxyPort}/port?${trrServer.port()}`
  );
  await channelOpenPromise(chan, CL_ALLOW_UNKNOWN_CL);

  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    ""
  );

  Services.prefs.setBoolPref("network.trr.force_http3_first", true);

  Services.prefs.setCharPref("network.trr.confirmationNS", "skip");
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://${host}:${h3ReverseProxyPort}/dns-query`
  );

  await new TRRDNSListener("example.org", "2.2.2.2");
  await trrServer.stop();
});

function timeout(ms) {
  return new Promise((_, reject) => {
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
}

// Test when HTTP/3 TRR server is blocked, we fallback to HTTP/2.
add_task(async function test_doh_http3_first_fallback_http2() {
  Services.dns.clearCache(true);
  let host = "alt1.example.com";

  let trrServer = new TRRServer();
  await trrServer.start(h3NoResponsePort);

  await trrServer.registerDoHAnswers("example.net", "A", {
    answers: [
      {
        name: "example.net",
        ttl: 55,
        type: "A",
        flush: false,
        data: "1.2.3.4",
      },
    ],
  });

  Services.prefs.setBoolPref("network.trr.force_http3_first", true);

  Services.prefs.setCharPref("network.trr.confirmationNS", "skip");
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://${host}:${trrServer.port()}/dns-query`
  );

  let dnsRequest = new TRRDNSListener("example.net", "1.2.3.4");
  try {
    await Promise.race([dnsRequest, timeout(1500)]);
  } catch (err) {
    Assert.ok(false, "dnsRequest takes too long");
  } finally {
    await trrServer.stop();
  }
});

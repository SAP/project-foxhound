/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { Http3ProxyFilter, NodeHTTP2Server, NodeHTTP2ProxyServer } =
  ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

let pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService();
let trrServer;
let proxyFilter;
let proxyPort;
let proxyHost;
let serverPort;

add_setup(async function setup() {
  trr_test_setup();

  if (mozinfo.socketprocess_networking) {
    Cc["@mozilla.org/network/protocol;1?name=http"].getService(
      Ci.nsIHttpProtocolHandler
    );
    Services.dns; // Needed to trigger socket process.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setBoolPref(
    "network.http.http3.block_loopback_ipv6_addr",
    true
  );
  Services.prefs.setBoolPref(
    "network.http.http3.retry_different_ip_family",
    false
  );
  Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
  Services.prefs.setBoolPref("network.dns.get-ttl", false);

  let proxy = new NodeHTTP2ProxyServer();
  await proxy.startWithoutProxyFilter();
  proxyPort = proxy.port();
  proxyHost = "alt2.example.com";

  trrServer = new TRRServer();
  await trrServer.start();

  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  await trrServer.registerDoHAnswers(proxyHost, "AAAA", {
    answers: [
      {
        name: proxyHost,
        ttl: 55,
        type: "AAAA",
        flush: false,
        data: "::1",
      },
    ],
  });
  await trrServer.registerDoHAnswers(proxyHost, "A", {
    answers: [
      {
        name: proxyHost,
        ttl: 55,
        type: "A",
        flush: false,
        data: "127.0.0.1",
      },
    ],
  });

  await new TRRDNSListener(proxyHost, "::1");

  let server = new NodeHTTP2Server();
  await server.start();
  serverPort = server.port();
  info(`server port:${server.port()}`);

  // Register multiple endpoints
  await server.registerPathHandler("/concurrent1", (req, resp) => {
    resp.writeHead(200);
    resp.end("response1");
  });
  await server.registerPathHandler("/concurrent2", (req, resp) => {
    resp.writeHead(200);
    resp.end("response2");
  });
  await server.registerPathHandler("/concurrent3", (req, resp) => {
    resp.writeHead(200);
    resp.end("response3");
  });

  proxyFilter = new Http3ProxyFilter(
    proxyHost,
    proxyPort,
    0,
    "/.well-known/masque/udp/{target_host}/{target_port}/",
    ""
  );

  registerCleanupFunction(async () => {
    trr_clear_prefs();
    Services.prefs.clearUserPref(
      "network.http.http3.retry_different_ip_family"
    );
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    Services.prefs.clearUserPref("network.http.http3.block_loopback_ipv6_addr");
    Services.prefs.clearUserPref("network.dns.get-ttl");
    Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
    if (trrServer) {
      await trrServer.stop();
    }
    await proxy.stop();
    await server.stop();
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
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    chan.asyncOpen(new ChannelListener(finish, null, flags));
  });
}

// Test if we fallback to HTTP/2 proxy when IPv6 is blocked.
add_task(async function test_fallback_with_speculative_connection() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  pps.registerFilter(proxyFilter, 10);

  const promises = [];
  for (let i = 1; i <= 3; i++) {
    let chan = makeChan(
      `https://alt1.example.com:${serverPort}/concurrent${i}`
    );
    promises.push(channelOpenPromise(chan, CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL));
  }

  const results = await Promise.all(promises);

  // Verify all requests succeeded with correct responses
  for (let i = 0; i < 3; i++) {
    const [req, buf] = results[i];
    Assert.equal(req.status, Cr.NS_OK);
    Assert.equal(buf, `response${i + 1}`);
  }

  pps.unregisterFilter(proxyFilter);
});

add_task(async function test_fallback_without_speculative_connection() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  pps.registerFilter(proxyFilter, 10);

  const promises = [];
  for (let i = 1; i <= 3; i++) {
    let chan = makeChan(
      `https://alt1.example.com:${serverPort}/concurrent${i}`
    );
    promises.push(channelOpenPromise(chan, CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL));
  }

  const results = await Promise.all(promises);

  // Verify all requests succeeded with correct responses
  for (let i = 0; i < 3; i++) {
    const [req, buf] = results[i];
    Assert.equal(req.status, Cr.NS_OK);
    Assert.equal(buf, `response${i + 1}`);
  }

  pps.unregisterFilter(proxyFilter);
});

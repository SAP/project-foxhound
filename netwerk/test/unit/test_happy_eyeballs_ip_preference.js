/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);
addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

add_setup(function () {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    override.clearOverrides();
  });
});

async function makeServer() {
  let server = new NodeHTTP2Server();
  await server.start();
  await server.registerPathHandler("/", (req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });
  return server;
}

async function openChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let { req } = await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (r, b) => resolve({ req: r, buffer: b }),
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });

  return {
    addr: req.QueryInterface(Ci.nsIHttpChannelInternal).remoteAddress,
    status: req.QueryInterface(Ci.nsIHttpChannel).responseStatus,
  };
}

// Happy Eyeballs should prefer IPv6 over IPv4 when both are available.
add_task(
  { skip_if: () => AppConstants.platform == "android" },
  async function test_ipv6_preferred() {
    override.clearOverrides();
    Services.dns.clearCache(true);

    let server = await makeServer();

    override.addIPOverride("foo.example.com", "::1");
    override.addIPOverride("foo.example.com", "127.0.0.1");

    let { addr } = await openChan(`https://foo.example.com:${server.port()}/`);
    Assert.equal(addr, "::1", "Should prefer IPv6 by default");

    await server.stop();
  }
);

// After a successful IPv4 connection, the IP family preference should be
// recorded in the connection entry. A new connection to the same host should
// prefer IPv4 even when IPv6 is also available.
add_task(
  { skip_if: () => AppConstants.platform == "android" },
  async function test_ipv4_family_preference_learned() {
    override.clearOverrides();
    Services.dns.clearCache(true);

    let server = await makeServer();
    const port = server.port();

    // First connection: only IPv4 available -> records IPv4 preference.
    override.addIPOverride("foo.example.com", "127.0.0.1");
    let { addr: addr1 } = await openChan(`https://foo.example.com:${port}/`);
    Assert.equal(addr1, "127.0.0.1");
    await server.stop();

    // Restart on the same port so the ConnectionEntry (keyed by host+port) is
    // reused, carrying the learned IPv4 preference.
    let server2 = new NodeHTTP2Server();
    await server2.start(port);
    await server2.registerPathHandler("/", (req, resp) => {
      resp.writeHead(200, { "Content-Type": "text/plain" });
      resp.end("ok");
    });

    // Both addresses are now offered — IPv4 should still win.
    override.clearOverrides();
    Services.dns.clearCache(true);
    override.addIPOverride("foo.example.com", "::1");
    override.addIPOverride("foo.example.com", "127.0.0.1");

    let { addr: addr2 } = await openChan(`https://foo.example.com:${port}/`);
    Assert.equal(
      addr2,
      "127.0.0.1",
      "Should prefer IPv4 due to learned preference"
    );

    await server2.stop();
  }
);

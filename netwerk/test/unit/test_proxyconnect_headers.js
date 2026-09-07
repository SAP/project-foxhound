/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  NodeHTTPSServer,
  NodeHTTP2Server,
  NodeHTTPProxyServer,
  NodeHTTPSProxyServer,
  NodeHTTP2ProxyServer,
} = ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

// The certificates we use are for localhost.
Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
});

add_setup(async function () {
  const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");
  addCertFromFile(certdb, "proxy-ca.pem", "CTu,u,u");
});

function makeRequest(uri) {
  const { promise, resolve, reject } = Promise.withResolvers();

  const channel = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  });

  channel.asyncOpen(
    new ChannelListener((request, data) => {
      try {
        request.QueryInterface(Ci.nsIHttpChannel);
        request.QueryInterface(Ci.nsIProxiedChannel);
        resolve({ channel, data });
      } catch (e) {
        reject(e);
      }
    })
  );

  return promise;
}

async function testResponseHeaders(port) {
  const { channel } = await makeRequest(`https://localhost:${port}/`);
  Assert.equal(channel.httpProxyConnectResponseCode, 200);
  Assert.equal(
    channel.getHttpProxyResponseHeader("Proxy-agent"),
    "Node.js-Proxy"
  );
  try {
    channel.getHttpProxyResponseHeader("Not-existing");
    Assert.ok(
      false,
      "We expected an exception when trying to get a non-existing header."
    );
  } catch (e) {
    if (e.result) {
      Assert.equal(
        e.result,
        0x80040111,
        "We got NS_ERROR_NOT_AVAILABLE from a non-existing header."
      );
    } else {
      throw e;
    }
  }
}

add_task(async function test_response_headers() {
  for (const [serverProtocol, serverClass] of [
    ["https", NodeHTTPSServer],
    ["http2", NodeHTTP2Server],
  ]) {
    const server = new serverClass();
    await server.start();
    try {
      for (const [proxyProtocol, proxyClass] of [
        ["plain HTTP/1.1", NodeHTTPProxyServer],
        ["https HTTP/1.1", NodeHTTPSProxyServer],
        ["HTTP/2", NodeHTTP2ProxyServer],
      ]) {
        info(
          `Starting the test with a ${proxyProtocol} proxy and a ${serverProtocol} server`
        );
        let proxy;
        try {
          proxy = new proxyClass();
          await proxy.start();

          await testResponseHeaders(server.port());
          // Test twice to exercise keep-alive.
          await testResponseHeaders(server.port());
        } finally {
          await proxy?.stop();
        }
      }
    } finally {
      await server.stop();
    }
  }
});

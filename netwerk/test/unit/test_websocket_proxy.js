/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from http3_proxy_common.js */

const {
  NodeWebSocketPlainServer,
  NodeWebSocketServer,
  NodeHTTPProxyServer,
  NodeHTTPSProxyServer,
} = ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

add_setup(async function setup() {
  do_get_profile();
});

async function wsChannelOpen(url, msg) {
  let conn = new WebSocketConnection();
  let statusObj = await Promise.race([conn.open(url), conn.finished()]);
  if (statusObj && statusObj.status != Cr.NS_OK) {
    return [statusObj.status, "", null];
  }
  let finalStatusPromise = conn.finished();
  conn.send(msg);
  let res = await conn.receiveMessages();
  conn.close();
  let finalStatus = await finalStatusPromise;

  let proxyInfo = await conn.getProxyInfo();

  return [finalStatus.status, res, proxyInfo?.type];
}

// We don't normally allow localhost channels to be proxied, but this
// is easier than updating all the certs and/or domains.
Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
});

async function do_ws_requests(
  expectedProxyType,
  servers = [
    NodeWebSocketPlainServer,
    NodeWebSocketServer,
    NodeWebSocketHttp2Server,
  ]
) {
  await with_node_servers(servers, async server => {
    Assert.notEqual(server.port(), null);
    await server.registerMessageHandler((data, ws) => {
      ws.send(data);
    });

    let url = `${server.protocol()}://localhost:${server.port()}`;
    const msg = `test ${server.constructor.name} with proxy`;
    let [status, res, proxyType] = await wsChannelOpen(url, msg);
    Assert.equal(status, Cr.NS_OK);
    Assert.deepEqual(res, [msg]);
    Assert.equal(proxyType, expectedProxyType, "WebSocket should use proxy");
  });
}

add_task(async function test_http_proxy() {
  let proxy = new NodeHTTPProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  await do_ws_requests("http");

  await proxy.stop();
});

add_task(async function test_https_proxy() {
  let proxy = new NodeHTTPSProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  await do_ws_requests("https");

  await proxy.stop();
});

add_task(async function test_http2_proxy() {
  let proxy = new NodeHTTP2ProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  await do_ws_requests("https");

  await proxy.stop();
});

// Skipped on Android due to H3 proxy server not working - Bug 1982955
// Also doesn't work on msix - Bug 1808049
add_task(
  {
    skip_if: () =>
      AppConstants.platform == "android" ||
      (AppConstants.platform === "win" &&
        Services.sysinfo.getProperty("hasWinPackageId")),
  },
  async function test_masque_proxy() {
    await setup_http3_proxy();

    await do_ws_requests("masque");
  }
);

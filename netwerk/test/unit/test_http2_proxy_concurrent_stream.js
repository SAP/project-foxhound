/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_cache.js */
/* import-globals-from head_cookies.js */
/* import-globals-from head_channels.js */

const { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const {
  NodeHTTPServer,
  NodeHTTPSServer,
  NodeHTTP2Server,
  NodeHTTP2ProxyServer,
  with_node_servers,
} = ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

add_setup(async function () {
  Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");
  addCertFromFile(certdb, "proxy-ca.pem", "CTu,u,u");
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
    Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
  });
});

function makeChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
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

function registerServerNamePathHandler(server, path) {
  return server.registerPathHandler(path, (req, resp) => {
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    setTimeout(() => {
      resp.writeHead(200);
      resp.end(global.server_name);
    }, 1000);
  });
}

async function run_http2_proxy_test(
  maxConcurrentStreams,
  maxStreamId,
  testId = ""
) {
  Services.obs.notifyObservers(null, "net:prune-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  Services.prefs.setIntPref("network.http.http2.max_stream_id", maxStreamId);

  let proxy = new NodeHTTP2ProxyServer();
  await proxy.start(0, false, maxConcurrentStreams);
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  await with_node_servers(
    [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
    async server => {
      await server.execute(
        `global.server_name = "${server.constructor.name}";`
      );
      await registerServerNamePathHandler(server, "/test");

      await channelOpenPromise(
        makeChan(`${server.origin()}/test`),
        CL_ALLOW_UNKNOWN_CL
      );

      // Wait a bit to ensure the first proxy connection is established.
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(resolve => setTimeout(resolve, 1000));

      let promises = [];
      for (let i = 0; i < 20; i++) {
        let promise = channelOpenPromise(
          makeChan(`${server.origin()}/test?test=${testId}&id=${i}`),
          CL_ALLOW_UNKNOWN_CL
        );

        promises.push(promise);
      }

      let results = await Promise.all(promises);
      for (let [req, buff] of results) {
        equal(req.status, Cr.NS_OK);
        equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
        equal(buff, server.constructor.name);
      }
      await server.stop();
    }
  );

  await proxy.stop();
}

// Test case 1: High concurrency, high stream ID limit
add_task(async function test_high_concurrency_high_stream_id() {
  await run_http2_proxy_test(100, 0x7800000, "t1");
});

// Test case 2: Low concurrency, high stream ID limit
add_task(async function test_low_concurrency_high_stream_id() {
  await run_http2_proxy_test(3, 0x7800000, "t2");
});

// Test case 3: High concurrency, low stream ID limit
add_task(async function test_high_concurrency_low_stream_id() {
  await run_http2_proxy_test(100, 10, "t3");
});

// Test case 4: Low concurrency, low stream ID limit
add_task(async function test_low_concurrency_low_stream_id() {
  await run_http2_proxy_test(3, 10, "t4");
});

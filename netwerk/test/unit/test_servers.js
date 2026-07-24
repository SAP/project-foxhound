/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_cache.js */
/* import-globals-from head_cookies.js */
/* import-globals-from head_channels.js */

// We don't normally allow localhost channels to be proxied, but this
// is easier than updating all the certs and/or domains.
Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
});

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const {
  NodeHTTPServer,
  NodeHTTPSServer,
  NodeHTTP2Server,
  NodeHTTPProxyServer,
  NodeHTTPSProxyServer,
  NodeHTTP2ProxyServer,
  with_node_servers,
} = ChromeUtils.importESModule("resource://testing-common/NodeServer.sys.mjs");

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

function registerSimplePathHandler(server, path) {
  return server.registerPathHandler(path, (req, resp) => {
    resp.writeHead(200);
    resp.end("done");
  });
}

function regiisterServerNamePathHandler(server, path) {
  return server.registerPathHandler(path, (req, resp) => {
    resp.writeHead(200);
    resp.end(global.server_name);
  });
}

function verifyGleanValues(aDescription, aExpected) {
  info(aDescription);

  let metric = Glean.networking.connectionAddressType;
  Assert.equal(metric[aExpected.metricKey].testGetValue(), aExpected.value);
}

add_setup(async function setup() {
  Services.fog.initializeFOG();
});

add_task(async function test_dual_stack() {
  Services.fog.testResetFOG();
  let httpserv = new HttpServer();
  let content = "ok";
  httpserv.registerPathHandler("/", function handler(metadata, response) {
    response.setHeader("Content-Length", `${content.length}`);
    response.bodyOutputStream.write(content, content.length);
  });
  httpserv.start_dualStack(-1);

  let chan = makeChan(`http://127.0.0.1:${httpserv.identity.primaryPort}/`);
  let [, response] = await channelOpenPromise(chan);
  Assert.equal(response, content);

  chan = makeChan(`http://[::1]:${httpserv.identity.primaryPort}/`);
  [, response] = await channelOpenPromise(chan);
  Assert.equal(response, content);

  verifyGleanValues("Check HTTP/1 IPv4", {
    metricKey: "http_1_ipv4",
    value: 1,
  });
  verifyGleanValues("Check HTTP/1 IPv6", {
    metricKey: "http_1_ipv6",
    value: 1,
  });
  await new Promise(resolve => httpserv.stop(resolve));
});

add_task(async function test_http() {
  let server = new NodeHTTPServer();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });
  let chan = makeChan(`http://localhost:${server.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 404);
  await registerSimplePathHandler(server, "/test");
  chan = makeChan(`http://localhost:${server.port()}/test`);
  req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
  equal(req.QueryInterface(Ci.nsIHttpChannel).protocolVersion, "http/1.1");
  equal(req.QueryInterface(Ci.nsIHttpChannelInternal).isProxyUsed, false);

  await server.stop();
});

add_task(async function test_https() {
  let server = new NodeHTTPSServer();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });
  let chan = makeChan(`https://localhost:${server.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 404);
  await registerSimplePathHandler(server, "/test");
  chan = makeChan(`https://localhost:${server.port()}/test`);
  req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
  equal(req.QueryInterface(Ci.nsIHttpChannel).protocolVersion, "http/1.1");

  await server.stop();
});

add_task(async function test_http2() {
  Services.fog.testResetFOG();

  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });
  let chan = makeChan(`https://localhost:${server.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 404);
  await registerSimplePathHandler(server, "/test");
  chan = makeChan(`https://localhost:${server.port()}/test`);
  req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
  equal(req.QueryInterface(Ci.nsIHttpChannel).protocolVersion, "h2");

  verifyGleanValues("Check HTTP/2 IPv4", {
    metricKey: "http_2_ipv4",
    value: 1,
  });

  await server.stop();
});

add_task(async function test_http1_proxy() {
  let proxy = new NodeHTTPProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  let chan = makeChan(`http://localhost:${proxy.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 405);

  await with_node_servers(
    [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
    async server => {
      await server.execute(
        `global.server_name = "${server.constructor.name}";`
      );
      await regiisterServerNamePathHandler(server, "/test");
      let [req1, buff] = await channelOpenPromise(
        makeChan(`${server.origin()}/test`),
        CL_ALLOW_UNKNOWN_CL
      );
      equal(req1.status, Cr.NS_OK);
      equal(req1.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
      equal(buff, server.constructor.name);
      //Bug 1792187: Check if proxy is set to true when a proxy is used.
      equal(req1.QueryInterface(Ci.nsIHttpChannelInternal).isProxyUsed, true);
      equal(
        req1.QueryInterface(Ci.nsIHttpChannel).protocolVersion,
        server.constructor.name == "NodeHTTP2Server" ? "h2" : "http/1.1"
      );
    }
  );

  await proxy.stop();
});

add_task(async function test_https_proxy() {
  let proxy = new NodeHTTPSProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  let chan = makeChan(`https://localhost:${proxy.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 405);

  await with_node_servers(
    [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
    async server => {
      await server.execute(
        `global.server_name = "${server.constructor.name}";`
      );
      await regiisterServerNamePathHandler(server, "/test");

      let [req1, buff] = await channelOpenPromise(
        makeChan(`${server.origin()}/test`),
        CL_ALLOW_UNKNOWN_CL
      );
      equal(req1.status, Cr.NS_OK);
      equal(req1.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
      equal(buff, server.constructor.name);
    }
  );

  await proxy.stop();
});

add_task(async function test_http2_proxy() {
  let proxy = new NodeHTTP2ProxyServer();
  await proxy.start();
  registerCleanupFunction(async () => {
    await proxy.stop();
  });

  let chan = makeChan(`https://localhost:${proxy.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 405);

  await with_node_servers(
    [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
    async server => {
      await server.execute(
        `global.server_name = "${server.constructor.name}";`
      );
      await regiisterServerNamePathHandler(server, "/test");
      let [req1, buff] = await channelOpenPromise(
        makeChan(`${server.origin()}/test`),
        CL_ALLOW_UNKNOWN_CL
      );
      equal(req1.status, Cr.NS_OK);
      equal(req1.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
      equal(buff, server.constructor.name);
    }
  );

  await proxy.stop();
});

add_task(async function test_proxy_with_redirects() {
  let proxies = [
    NodeHTTPProxyServer,
    NodeHTTPSProxyServer,
    NodeHTTP2ProxyServer,
  ];
  for (let p of proxies) {
    let proxy = new p();
    await proxy.start();
    registerCleanupFunction(async () => {
      await proxy.stop();
    });

    await with_node_servers(
      [NodeHTTPServer, NodeHTTPSServer, NodeHTTP2Server],
      async server => {
        info(`Testing ${p.name} with ${server.constructor.name}`);
        await server.execute(
          `global.server_name = "${server.constructor.name}";`
        );
        await server.registerPathHandler("/redirect", (req, resp) => {
          resp.writeHead(302, {
            Location: "/test",
          });
          resp.end(global.server_name);
        });
        await server.registerPathHandler("/test", (req, resp) => {
          resp.writeHead(200);
          resp.end(global.server_name);
        });

        let chan = makeChan(`${server.origin()}/redirect`);
        let [req, buff] = await channelOpenPromise(chan, CL_ALLOW_UNKNOWN_CL);
        equal(req.status, Cr.NS_OK);
        equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
        equal(buff, server.constructor.name);
        req.QueryInterface(Ci.nsIProxiedChannel);
        ok(!!req.proxyInfo);
        notEqual(req.proxyInfo.type, "direct");
      }
    );
    await proxy.stop();
  }
});

add_task(async function test_async_event() {
  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.execute(`new Promise(r => setTimeout(r, 500))`);

  await server.stop();
});

add_task(async function test_async_state_management() {
  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });

  await server.execute(`global.asyncResults = [];`);

  await server.execute(`
    global.asyncCounter = 0;
    global.performAsyncOperation = function(delay, value) {
      return new Promise(resolve => {
        setTimeout(() => {
          global.asyncCounter++;
          global.asyncResults.push({ counter: global.asyncCounter, value });
          resolve({ counter: global.asyncCounter, value });
        }, delay);
      });
    };
  `);

  let op1 = server.execute(`performAsyncOperation(100, "first")`);
  let op2 = server.execute(`performAsyncOperation(50, "second")`);

  let result1 = await op1;
  let result2 = await op2;
  // This ran after 100 ms, so it comes in second
  equal(result1.counter, 2);
  equal(result1.value, "first");

  // this rand after 50 ms, so it comes in first.
  equal(result2.counter, 1);
  equal(result2.value, "second");

  let results = await server.execute(`global.asyncResults`);
  equal(results.length, 2);
  equal(results[0].value, "second");
  equal(results[1].value, "first");

  let counter = await server.execute(`global.asyncCounter`);
  equal(counter, 2);

  await server.stop();
});

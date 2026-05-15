/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_http3.js */

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

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

add_setup(async function setup() {
  Services.prefs.setCharPref("network.dns.localDomains", "alt1.example.com");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");
  addCertFromFile(certdb, "proxy-ca.pem", "CTu,u,u");

  // A dummy request to make sure AltSvcCache::mStorage is ready.
  let chan = makeChan(`https://localhost`);
  await channelOpenPromise(chan, CL_EXPECT_FAILURE);
});

add_task(async function test_fallback() {
  // We only need the `noResponsePort`, not the masque proxy.
  const { noResponsePort } = await create_masque_proxy_server();

  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `alt1.example.com;h3=:${noResponsePort}`
  );

  let server = new NodeHTTP2Server();
  await server.start(noResponsePort);

  Assert.equal(server.port(), noResponsePort);

  await server.registerPathHandler("/request1", (req, resp) => {
    resp.writeHead(200);
    resp.end("response1");
  });
  await server.registerPathHandler("/request2", (req, resp) => {
    resp.writeHead(200);
    resp.end("response2");
  });

  registerCleanupFunction(async () => {
    await server.stop();
  });

  let chan = makeChan(
    `${server.protocol()}://alt1.example.com:${server.port()}/request1`
  );
  let [req, buf] = await channelOpenPromise(
    chan,
    CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL
  );
  Assert.equal(req.protocolVersion, "h2");
  Assert.equal(buf, "response1");

  let chan1 = makeChan(
    `${server.protocol()}://alt1.example.com:${server.port()}/request2`
  );
  chan1.loadFlags = Ci.nsIRequest.LOAD_ANONYMOUS;
  [req, buf] = await Promise.race([
    channelOpenPromise(chan1, CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL),
    // chan1 should be completed within a short time.
    new Promise(resolve => {
      do_timeout(3000, resolve);
    }),
  ]);
  Assert.equal(req.protocolVersion, "h2");
  Assert.equal(buf, "response2");

  await server.stop();
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_http3.js */

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

let h2Port;
let h3Port;

add_setup(async function setup() {
  h2Port = Services.env.get("MOZHTTP2_PORT");
  Assert.notEqual(h2Port, null);
  Assert.notEqual(h2Port, "");

  h3Port = Services.env.get("MOZHTTP3_PORT");
  Assert.notEqual(h3Port, null);
  Assert.notEqual(h3Port, "");

  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setCharPref("network.dns.localDomains", "foo.example.com");
  Services.prefs.setBoolPref("network.dns.disableIPv6", true);
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `foo.example.com;h3=:${h3Port}`
  );

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  let chan = makeChan(`https://localhost`);
  await channelOpenPromise(chan, CL_EXPECT_FAILURE);
});

// Test non-ASCII header with HTTP/3 and HTTP/2 fallback
// Http3Session::TryActivating fails to parse the non-utf8 headers
// and returns NS_ERROR_HTTP2_FALLBACK_TO_HTTP1 so we fallback to h2.
// When bug 1999659 is fixed we should instead succeed.
add_task(async function test_non_ascii_header() {
  // First request with non-ASCII header
  let chan1 = makeChan(`https://foo.example.com:${h2Port}/100`);
  chan1.setRequestHeader("x-panel-title", "ä", false);

  let [req1, buf1] = await channelOpenPromise(
    chan1,
    CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL
  );

  let protocol1 = req1.protocolVersion;
  Assert.strictEqual(protocol1, "h3", `Using ${protocol1}`);
  Assert.equal(req1.responseStatus, 200);
  info(buf1);

  // Second request with different non-ASCII header
  let chan2 = makeChan(`https://foo.example.com:${h2Port}/100`);
  chan2.setRequestHeader("x-panel-title", "ö", false);

  let [req2] = await channelOpenPromise(
    chan2,
    CL_IGNORE_CL | CL_ALLOW_UNKNOWN_CL
  );

  let protocol2 = req2.protocolVersion;
  Assert.strictEqual(protocol2, "h3", `Using ${protocol2}`);
  Assert.equal(req2.responseStatus, 200);
});

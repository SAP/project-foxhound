/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.import("resource://gre/modules/NetUtil.jsm");

let prefs;
let h2Port;
let h3Port;
let listen;
let trrServer;

const dns = Cc["@mozilla.org/network/dns-service;1"].getService(
  Ci.nsIDNSService
);
const certOverrideService = Cc[
  "@mozilla.org/security/certoverride;1"
].getService(Ci.nsICertOverrideService);
const threadManager = Cc["@mozilla.org/thread-manager;1"].getService(
  Ci.nsIThreadManager
);
const mainThread = threadManager.currentThread;

const defaultOriginAttributes = {};

function setup() {
  let env = Cc["@mozilla.org/process/environment;1"].getService(
    Ci.nsIEnvironment
  );
  h2Port = env.get("MOZHTTP2_PORT");
  Assert.notEqual(h2Port, null);
  Assert.notEqual(h2Port, "");

  h3Port = env.get("MOZHTTP3_PORT");
  Assert.notEqual(h3Port, null);
  Assert.notEqual(h3Port, "");

  // Set to allow the cert presented by our H2 server
  do_get_profile();
  prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

  prefs.setBoolPref("network.security.esni.enabled", false);
  prefs.setBoolPref("network.http.spdy.enabled", true);
  prefs.setBoolPref("network.http.spdy.enabled.http2", true);
  // the TRR server is on 127.0.0.1
  prefs.setCharPref("network.trr.bootstrapAddress", "127.0.0.1");

  // make all native resolve calls "secretly" resolve localhost instead
  prefs.setBoolPref("network.dns.native-is-localhost", true);

  // 0 - off, 1 - race, 2 TRR first, 3 TRR only, 4 shadow
  prefs.setIntPref("network.trr.mode", 2); // TRR first
  prefs.setBoolPref("network.trr.wait-for-portal", false);
  // don't confirm that TRR is working, just go!
  prefs.setCharPref("network.trr.confirmationNS", "skip");

  // So we can change the pref without clearing the cache to check a pushed
  // record with a TRR path that fails.
  Services.prefs.setBoolPref("network.trr.clear-cache-on-pref-change", false);

  Services.prefs.setBoolPref("network.dns.upgrade_with_https_rr", true);
  Services.prefs.setBoolPref("network.dns.use_https_rr_as_altsvc", true);
  Services.prefs.setBoolPref("network.dns.echconfig.enabled", true);

  // The moz-http2 cert is for foo.example.com and is signed by http2-ca.pem
  // so add that cert to the trust list as a signing cert.  // the foo.example.com domain name.
  const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");
}

setup();
registerCleanupFunction(() => {
  prefs.clearUserPref("network.security.esni.enabled");
  prefs.clearUserPref("network.http.spdy.enabled");
  prefs.clearUserPref("network.http.spdy.enabled.http2");
  prefs.clearUserPref("network.dns.localDomains");
  prefs.clearUserPref("network.dns.native-is-localhost");
  prefs.clearUserPref("network.trr.mode");
  prefs.clearUserPref("network.trr.uri");
  prefs.clearUserPref("network.trr.credentials");
  prefs.clearUserPref("network.trr.wait-for-portal");
  prefs.clearUserPref("network.trr.allow-rfc1918");
  prefs.clearUserPref("network.trr.useGET");
  prefs.clearUserPref("network.trr.confirmationNS");
  prefs.clearUserPref("network.trr.bootstrapAddress");
  prefs.clearUserPref("network.trr.request-timeout");
  prefs.clearUserPref("network.trr.clear-cache-on-pref-change");
  prefs.clearUserPref("network.dns.upgrade_with_https_rr");
  prefs.clearUserPref("network.dns.use_https_rr_as_altsvc");
  prefs.clearUserPref("network.dns.echconfig.enabled");
  prefs.clearUserPref("network.dns.echconfig.fallback_to_origin");
  prefs.clearUserPref("network.dns.httpssvc.reset_exclustion_list");
  prefs.clearUserPref("network.http.http3.enabled");
  prefs.clearUserPref("network.dns.httpssvc.http3_fast_fallback_timeout");
  trrServer.stop();
});

class DNSListener {
  constructor() {
    this.promise = new Promise(resolve => {
      this.resolve = resolve;
    });
  }
  onLookupComplete(inRequest, inRecord, inStatus) {
    this.resolve([inRequest, inRecord, inStatus]);
  }
  // So we can await this as a promise.
  then() {
    return this.promise.then.apply(this.promise, arguments);
  }
}

DNSListener.prototype.QueryInterface = ChromeUtils.generateQI([
  "nsIDNSListener",
]);

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  return chan;
}

function channelOpenPromise(chan, flags) {
  return new Promise(resolve => {
    function finish(req, buffer) {
      resolve([req, buffer]);
    }
    let internal = chan.QueryInterface(Ci.nsIHttpChannelInternal);
    internal.setWaitForHTTPSSVCRecord();
    chan.asyncOpen(new ChannelListener(finish, null, flags));
  });
}

// Test if we can fallback to the last record sucessfully.
add_task(async function testFallbackToTheLastRecord() {
  trrServer = new TRRServer();
  await trrServer.start();

  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );

  // Only the last record is valid to use.
  await trrServer.registerDoHAnswers("test.fallback.com", "HTTPS", [
    {
      name: "test.fallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.fallback1.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "123..." },
        ],
      },
    },
    {
      name: "test.fallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 4,
        name: "foo.example.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "port", value: h2Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.fallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 3,
        name: "test.fallback3.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.fallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "test.fallback2.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.fallback.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.fallback.com:${h2Port}/server-timing`);
  let [req, resp] = await channelOpenPromise(chan);
  // Test if this request is done by h2.
  Assert.equal(req.getResponseHeader("x-connection-http2"), "yes");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

add_task(async function testFallbackToTheOrigin() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );

  // All records are not able to use to connect, so we fallback to the origin
  // one.
  await trrServer.registerDoHAnswers("test.foo.com", "HTTPS", [
    {
      name: "test.foo.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.foo1.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "123..." },
        ],
      },
    },
    {
      name: "test.foo.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 3,
        name: "test.foo3.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.foo.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "test.foo2.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  await trrServer.registerDoHAnswers("test.foo.com", "A", [
    {
      name: "test.foo.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.foo.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.foo.com:${h2Port}/server-timing`);
  let [req, resp] = await channelOpenPromise(chan);
  // Test if this request is done by h2.
  Assert.equal(req.getResponseHeader("x-connection-http2"), "yes");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

// Test when all records are failed and network.dns.echconfig.fallback_to_origin
// is false. In this case, the connection is always failed.
add_task(async function testAllRecordsFailed() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );
  Services.prefs.setBoolPref("network.dns.echconfig.fallback_to_origin", false);

  await trrServer.registerDoHAnswers("test.bar.com", "HTTPS", [
    {
      name: "test.bar.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.bar1.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "123..." },
        ],
      },
    },
    {
      name: "test.bar.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 3,
        name: "test.bar3.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.bar.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "test.bar2.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.bar.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  // This channel should be failed.
  let chan = makeChan(`https://test.bar.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan, CL_EXPECT_LATE_FAILURE | CL_ALLOW_UNKNOWN_CL);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

// Test when all records have no echConfig, we directly fallback to the origin
// one.
add_task(async function testFallbackToTheOrigin2() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );

  await trrServer.registerDoHAnswers("test.example.com", "HTTPS", [
    {
      name: "test.example.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.example1.com",
        values: [{ key: "alpn", value: "h2,h3" }],
      },
    },
    {
      name: "test.example.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 3,
        name: "test.example3.com",
        values: [{ key: "alpn", value: "h2,h3" }],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.example.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.example.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan, CL_EXPECT_LATE_FAILURE | CL_ALLOW_UNKNOWN_CL);

  await trrServer.registerDoHAnswers("test.example.com", "A", [
    {
      name: "test.example.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  chan = makeChan(`https://test.example.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

// Test when some records have echConfig and some not, we directly fallback to
// the origin one.
add_task(async function testFallbackToTheOrigin3() {
  dns.clearCache(true);

  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );

  await trrServer.registerDoHAnswers("vulnerable.com", "A", [
    {
      name: "vulnerable.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  await trrServer.registerDoHAnswers("vulnerable.com", "HTTPS", [
    {
      name: "vulnerable.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "vulnerable1.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "vulnerable.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "vulnerable2.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "vulnerable.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 3,
        name: "vulnerable3.com",
        values: [{ key: "alpn", value: "h2,h3" }],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "vulnerable.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://vulnerable.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

add_task(async function testResetExclusionList() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );
  Services.prefs.setBoolPref(
    "network.dns.httpssvc.reset_exclustion_list",
    false
  );

  await trrServer.registerDoHAnswers("test.reset.com", "HTTPS", [
    {
      name: "test.reset.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.reset1.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "port", value: h2Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.reset.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "test.reset2.com",
        values: [
          { key: "alpn", value: "h2,h3" },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.reset.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  // After this request, test.reset1.com and test.reset2.com should be both in
  // the exclusion list.
  let chan = makeChan(`https://test.reset.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan, CL_EXPECT_LATE_FAILURE | CL_ALLOW_UNKNOWN_CL);

  // This request should be also failed, because all records are excluded.
  chan = makeChan(`https://test.reset.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan, CL_EXPECT_LATE_FAILURE | CL_ALLOW_UNKNOWN_CL);

  await trrServer.registerDoHAnswers("test.reset1.com", "A", [
    {
      name: "test.reset1.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  Services.prefs.setBoolPref(
    "network.dns.httpssvc.reset_exclustion_list",
    true
  );

  // After enable network.dns.httpssvc.reset_exclustion_list and register
  // A record for test.reset1.com, this request should be succeeded.
  chan = makeChan(`https://test.reset.com:${h2Port}/server-timing`);
  await channelOpenPromise(chan);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

// Simply test if we can connect to H3 server.
add_task(async function testH3Connection() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );
  Services.prefs.setBoolPref("network.http.http3.enabled", true);

  await trrServer.registerDoHAnswers("test.h3.com", "HTTPS", [
    {
      name: "test.h3.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "www.h3.com",
        values: [
          { key: "alpn", value: "h3-27" },
          { key: "port", value: h3Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  await trrServer.registerDoHAnswers("www.h3.com", "A", [
    {
      name: "www.h3.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.h3.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.h3.com`);
  let [req, resp] = await channelOpenPromise(chan);
  Assert.equal(req.protocolVersion, "h3");
  let internal = req.QueryInterface(Ci.nsIHttpChannelInternal);
  Assert.equal(internal.remotePort, h3Port);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

add_task(async function testFastfallbackToH2() {
  trrServer = new TRRServer();
  await trrServer.start();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );
  Services.prefs.setBoolPref("network.http.http3.enabled", true);
  // Use a short timeout to make sure the fast fallback timer will be triggered.
  Services.prefs.setIntPref(
    "network.dns.httpssvc.http3_fast_fallback_timeout",
    1
  );

  await trrServer.registerDoHAnswers("test.fastfallback.com", "HTTPS", [
    {
      name: "test.fastfallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "test.fastfallback1.com",
        values: [
          { key: "alpn", value: "h3-27" },
          { key: "port", value: h3Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
    {
      name: "test.fastfallback.com",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 2,
        name: "test.fastfallback2.com",
        values: [
          { key: "alpn", value: "h2" },
          { key: "port", value: h2Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  await trrServer.registerDoHAnswers("test.fastfallback2.com", "A", [
    {
      name: "test.fastfallback2.com",
      ttl: 55,
      type: "A",
      flush: false,
      data: "127.0.0.1",
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.fastfallback.com",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.fastfallback.com/server-timing`);
  let [req, resp] = await channelOpenPromise(chan);
  Assert.equal(req.protocolVersion, "h2");
  let internal = req.QueryInterface(Ci.nsIHttpChannelInternal);
  Assert.equal(internal.remotePort, h2Port);

  // Use a longer timeout to test the case that the timer is canceled.
  Services.prefs.setIntPref(
    "network.dns.httpssvc.http3_fast_fallback_timeout",
    5000
  );

  chan = makeChan(`https://test.fastfallback.com/server-timing`);
  [req, resp] = await channelOpenPromise(chan);
  Assert.equal(req.protocolVersion, "h2");
  internal = req.QueryInterface(Ci.nsIHttpChannelInternal);
  Assert.equal(internal.remotePort, h2Port);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

// Test when we fail to establish H3 connection.
add_task(async function testFailedH3Connection() {
  trrServer = new TRRServer();
  await trrServer.start();
  dns.clearCache(true);
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port}/dns-query`
  );
  Services.prefs.setBoolPref("network.http.http3.enabled", true);
  Services.prefs.setIntPref(
    "network.dns.httpssvc.http3_fast_fallback_timeout",
    0
  );

  await trrServer.registerDoHAnswers("test.h3.org", "HTTPS", [
    {
      name: "test.h3.org",
      ttl: 55,
      type: "HTTPS",
      flush: false,
      data: {
        priority: 1,
        name: "www.h3.org",
        values: [
          { key: "alpn", value: "h3-27" },
          { key: "port", value: h3Port },
          { key: "echconfig", value: "456..." },
        ],
      },
    },
  ]);

  let listener = new DNSListener();

  let request = dns.asyncResolve(
    "test.h3.org",
    dns.RESOLVE_TYPE_HTTPSSVC,
    0,
    null, // resolverInfo
    listener,
    mainThread,
    defaultOriginAttributes
  );

  let [inRequest, inRecord, inStatus] = await listener;
  Assert.equal(inRequest, request, "correct request was used");
  Assert.equal(inStatus, Cr.NS_OK, "status OK");

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let chan = makeChan(`https://test.h3.org`);
  await channelOpenPromise(chan, CL_EXPECT_LATE_FAILURE | CL_ALLOW_UNKNOWN_CL);

  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );

  await trrServer.stop();
});

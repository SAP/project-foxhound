/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const { HTTP3Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

const mockController = Cc[
  "@mozilla.org/network/mock-network-controller;1"
].getService(Ci.nsIMockNetworkLayerController);

let h3Port;
let h3Server;
let h2Server;
let h3ServerPath;
let h3DBPath;

async function startH3Server() {
  h3Server = new HTTP3Server();
  await h3Server.start(h3ServerPath, h3DBPath);
  h3Port = h3Server.port();
}

async function stopH3Server() {
  if (h3Server) {
    await h3Server.stop();
    h3Server = null;
  }
}

add_setup(async function () {
  h3ServerPath = Services.env.get("MOZ_HTTP3_SERVER_PATH");
  h3DBPath = Services.env.get("MOZ_HTTP3_CERT_DB_PATH");

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setBoolPref("network.socket.attach_mock_network_layer", true);
  Services.prefs.setIntPref("logging.nsHttp", 5);

  h2Server = new NodeHTTP2Server();
  await h2Server.start();
  await h2Server.registerPathHandler("/", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.http.http3.enable");
    Services.prefs.clearUserPref("network.socket.attach_mock_network_layer");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    Services.prefs.clearUserPref(
      "network.http.http3.alt-svc-mapping-for-testing"
    );
    Services.prefs.clearUserPref("logging.nsHttp");
    override.clearOverrides();
    mockController.clearBlockedUDPAddr();
    mockController.clearFailedUDPAddr();
    if (h2Server) {
      await h2Server.stop();
    }
    await stopH3Server();
  });
});

async function resetConnections() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  Services.obs.notifyObservers(null, "browser:purge-session-history");
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  Services.dns.clearCache(true);
  override.clearOverrides();
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function openChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let result = await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (r, b) => resolve({ req: r, buffer: b }),
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });

  return {
    httpVersion: result.req.protocolVersion,
    status: result.req.QueryInterface(Ci.nsIHttpChannel).responseStatus,
    buffer: result.buffer,
  };
}

// Test H3 first attempt succeeds.
async function do_test_h3_succeeds(host) {
  await startH3Server();
  await resetConnections();
  mockController.clearBlockedTCPConnect();

  override.addIPOverride(host, "127.0.0.1");
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );

  // Block TCP so the H2 fallback cannot win the race against H3.
  let h2Port = h2Server.port();
  let blockedTCP = mockController.createScriptableNetAddr("127.0.0.1", h2Port);
  mockController.blockTCPConnect(blockedTCP);

  let { status, httpVersion, buffer } = await openChan(
    `https://${host}:${h2Server.port()}/`
  );

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "Hello World", "Response body should match");
  Assert.equal(httpVersion, "h3", "Should use HTTP/3");

  mockController.clearBlockedTCPConnect();
  await stopH3Server();
}

add_task(async function test_h3_succeeds_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_h3_succeeds("foo.example.com");
});

add_task(async function test_h3_succeeds_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_h3_succeeds("foo.example.com");
});

// Test H3 blocked on first IP, falls back to second IP.
async function do_test_h3_blocked_fallback(host) {
  await startH3Server();
  await resetConnections();
  mockController.clearBlockedUDPAddr();

  // Set up DNS to return both IPv6 and IPv4.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );
  Services.prefs.setBoolPref("network.http.http3.use_nspr_for_io", true);

  // Block UDP traffic on the IPv6 address so H3 on ::1 never completes.
  let blockedAddr = mockController.createScriptableNetAddr("::1", h3Port);
  mockController.blockUDPAddrIO(blockedAddr);

  let { status, httpVersion, buffer } = await openChan(
    `https://${host}:${h2Server.port()}/`
  );

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "Hello World", "Response body should match");
  Assert.equal(httpVersion, "h3", "Should use HTTP/3 via fallback IP");

  mockController.clearBlockedUDPAddr();
  await stopH3Server();
}

add_task(async function test_h3_blocked_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_h3_blocked_fallback("alt1.example.com");
});

add_task(async function test_h3_blocked_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_h3_blocked_fallback("alt1.example.com");
});

// Test all H3 and TCP attempts fail.
async function do_test_all_attempts_fail(host) {
  await startH3Server();
  await resetConnections();
  mockController.clearBlockedUDPAddr();
  mockController.clearBlockedTCPConnect();

  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );
  Services.prefs.setBoolPref("network.http.http3.use_nspr_for_io", true);

  // Make UDP sendto fail on both addresses so H3 fails.
  let failedUDP6 = mockController.createScriptableNetAddr("::1", h3Port);
  mockController.failUDPAddrIO(failedUDP6);
  let failedUDP4 = mockController.createScriptableNetAddr("127.0.0.1", h3Port);
  mockController.failUDPAddrIO(failedUDP4);

  // Block TCP on both addresses so H2 fallback also fails.
  let h2Port = h2Server.port();
  let blockedTCP6 = mockController.createScriptableNetAddr("::1", h2Port);
  mockController.blockTCPConnect(blockedTCP6);
  let blockedTCP4 = mockController.createScriptableNetAddr("127.0.0.1", h2Port);
  mockController.blockTCPConnect(blockedTCP4);

  let chan = NetUtil.newChannel({
    uri: `https://${host}:${h2Port}/`,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(() => resolve(), null, CL_EXPECT_FAILURE)
    );
  });

  Assert.equal(
    chan.status,
    Cr.NS_ERROR_CONNECTION_REFUSED,
    "Should fail with connection refused"
  );

  mockController.clearFailedUDPAddr();
  mockController.clearBlockedTCPConnect();
  await stopH3Server();
}

add_task(async function test_all_attempts_fail_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_all_attempts_fail("alt1.example.com");
});

add_task(async function test_all_attempts_fail_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_all_attempts_fail("alt1.example.com");
});

// Test H3 send fails immediately on first IP, falls back to second IP.
async function do_test_h3_failed_fallback(host) {
  await startH3Server();
  await resetConnections();
  mockController.clearFailedUDPAddr();

  // Set up DNS to return both IPv6 and IPv4.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );
  Services.prefs.setBoolPref("network.http.http3.use_nspr_for_io", true);

  // Make UDP sendto fail immediately on the IPv6 address.
  let failedAddr = mockController.createScriptableNetAddr("::1", h3Port);
  mockController.failUDPAddrIO(failedAddr);

  // Block TCP on both addresses so the H2 fallback cannot succeed,
  // forcing H3 to retry on the next IP (127.0.0.1).
  let h2Port = h2Server.port();
  let blockedTCP6 = mockController.createScriptableNetAddr("::1", h2Port);
  mockController.blockTCPConnect(blockedTCP6);
  let blockedTCP4 = mockController.createScriptableNetAddr("127.0.0.1", h2Port);
  mockController.blockTCPConnect(blockedTCP4);

  let { status, httpVersion, buffer } = await openChan(
    `https://${host}:${h2Port}/`
  );

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "Hello World", "Response body should match");
  Assert.equal(httpVersion, "h3", "Should use HTTP/3 via fallback IP");

  mockController.clearFailedUDPAddr();
  mockController.clearBlockedTCPConnect();
  await stopH3Server();
}

async function do_test_cancel_during_connection(host) {
  await startH3Server();
  await resetConnections();
  mockController.clearBlockedUDPAddr();
  mockController.clearBlockedTCPConnect();
  mockController.clearPausedTCPConnect();

  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );
  Services.prefs.setBoolPref("network.http.http3.use_nspr_for_io", true);

  // Block UDP on both addresses so H3 hangs.
  let blockedUDP6 = mockController.createScriptableNetAddr("::1", h3Port);
  mockController.blockUDPAddrIO(blockedUDP6);
  let blockedUDP4 = mockController.createScriptableNetAddr("127.0.0.1", h3Port);
  mockController.blockUDPAddrIO(blockedUDP4);

  // Pause TCP on both addresses so TCP fallback hangs.
  let h2Port = h2Server.port();
  let pausedTCP6 = mockController.createScriptableNetAddr("::1", h2Port);
  mockController.pauseTCPConnect(pausedTCP6);
  let pausedTCP4 = mockController.createScriptableNetAddr("127.0.0.1", h2Port);
  mockController.pauseTCPConnect(pausedTCP4);

  let chan = NetUtil.newChannel({
    uri: `https://${host}:${h2Port}/`,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let openPromise = new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(() => resolve(), null, CL_EXPECT_FAILURE)
    );
  });

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
  chan.cancel(Cr.NS_BINDING_ABORTED);

  await openPromise;

  Assert.equal(chan.status, Cr.NS_BINDING_ABORTED, "Should be cancelled");

  mockController.clearBlockedUDPAddr();
  mockController.clearPausedTCPConnect();
  await stopH3Server();
}

add_task(async function test_cancel_during_connection_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_cancel_during_connection("alt2.example.com");
});

add_task(async function test_cancel_during_connection_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_cancel_during_connection("alt2.example.com");
});

add_task(async function test_h3_failed_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_h3_failed_fallback("alt2.example.com");
});

add_task(async function test_h3_failed_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_h3_failed_fallback("alt2.example.com");
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

const override = Cc["@mozilla.org/network/native-dns-override;1"].getService(
  Ci.nsINativeDNSResolverOverride
);

const mockController = Cc[
  "@mozilla.org/network/mock-network-controller;1"
].getService(Ci.nsIMockNetworkLayerController);

let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);
addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

add_setup(function () {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setBoolPref("network.socket.attach_mock_network_layer", true);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.socket.attach_mock_network_layer");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    override.clearOverrides();
    mockController.clearBlockedTCPConnect();
    mockController.clearPausedTCPConnect();
  });
});

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
    addr: result.req.QueryInterface(Ci.nsIHttpChannelInternal).remoteAddress,
    status: result.req.QueryInterface(Ci.nsIHttpChannel).responseStatus,
    buffer: result.buffer,
  };
}

async function resetConnections() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  override.clearOverrides();
  mockController.clearBlockedTCPConnect();
  mockController.clearPausedTCPConnect();
  Services.dns.clearCache(true);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function do_test_first_attempt_succeeds(host) {
  await resetConnections();

  let server = new NodeHTTPSServer();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  let port = server.port();

  // Set up DNS to return both IPv6 and IPv4. IPv6 is preferred and should
  // succeed on the first attempt.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");

  let { status, buffer } = await openChan(`https://${host}:${port}/test`);

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "ok", "Response body should match");

  await server.stop();
}

// Test first connection attempt succeeds, speculative disabled.
add_task(async function test_first_attempt_succeeds_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_first_attempt_succeeds("foo.example.com");
});

// Test first connection attempt succeeds, speculative enabled.
add_task(async function test_first_attempt_succeeds_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_first_attempt_succeeds("foo.example.com");
});

async function do_test_first_attempt_fails(host) {
  await resetConnections();

  let server = new NodeHTTPSServer();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  let port = server.port();

  // Set up DNS to return both IPv6 and IPv4.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");

  // Block TCP connect on the IPv6 address to force connection refused.
  let blockedAddr = mockController.createScriptableNetAddr("::1", port);
  mockController.blockTCPConnect(blockedAddr);

  let { addr, status, buffer } = await openChan(`https://${host}:${port}/test`);

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "ok", "Response body should match");
  Assert.equal(
    addr,
    "127.0.0.1",
    "Should fall back to IPv4 after IPv6 failure"
  );

  await server.stop();
}

// Test fallback with speculative connections disabled.
add_task(async function test_first_attempt_fails_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_first_attempt_fails("alt1.example.com");
});

// Test fallback with speculative connections enabled.
add_task(async function test_first_attempt_fails_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_first_attempt_fails("alt1.example.com");
});

async function do_test_first_attempt_slow(host) {
  await resetConnections();

  let server = new NodeHTTPSServer();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  let port = server.port();

  // Set up DNS to return both IPv6 and IPv4.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");

  // Pause TCP connect on the IPv6 address so it hangs indefinitely.
  let pausedAddr = mockController.createScriptableNetAddr("::1", port);
  mockController.pauseTCPConnect(pausedAddr);

  let { addr, status, buffer } = await openChan(`https://${host}:${port}/test`);

  Assert.equal(status, 200, "Request should succeed");
  Assert.equal(buffer, "ok", "Response body should match");
  Assert.equal(addr, "127.0.0.1", "Should fall back to IPv4 after IPv6 hangs");

  await server.stop();
}

async function do_test_all_attempts_fail(host) {
  await resetConnections();

  let server = new NodeHTTPSServer();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  let port = server.port();

  // Set up DNS to return both IPv6 and IPv4.
  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");

  // Block TCP connect on both addresses so all attempts fail.
  let blockedAddr6 = mockController.createScriptableNetAddr("::1", port);
  mockController.blockTCPConnect(blockedAddr6);
  let blockedAddr4 = mockController.createScriptableNetAddr("127.0.0.1", port);
  mockController.blockTCPConnect(blockedAddr4);

  let chan = NetUtil.newChannel({
    uri: `https://${host}:${port}/test`,
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

  await server.stop();
}

// Test all attempts fail, speculative disabled.
add_task(async function test_all_attempts_fail_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_all_attempts_fail("alt1.example.com");
});

// Test all attempts fail, speculative enabled.
add_task(async function test_all_attempts_fail_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_all_attempts_fail("alt1.example.com");
});

async function do_test_cancel_during_connection(host) {
  await resetConnections();

  let server = new NodeHTTPSServer();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  let port = server.port();

  override.addIPOverride(host, "::1");
  override.addIPOverride(host, "127.0.0.1");

  // Pause TCP connect on both addresses so connections hang.
  let pausedAddr6 = mockController.createScriptableNetAddr("::1", port);
  mockController.pauseTCPConnect(pausedAddr6);
  let pausedAddr4 = mockController.createScriptableNetAddr("127.0.0.1", port);
  mockController.pauseTCPConnect(pausedAddr4);

  let chan = NetUtil.newChannel({
    uri: `https://${host}:${port}/test`,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let openPromise = new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(() => resolve(), null, CL_EXPECT_FAILURE)
    );
  });

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 100));
  chan.cancel(Cr.NS_BINDING_ABORTED);

  await openPromise;

  Assert.equal(chan.status, Cr.NS_BINDING_ABORTED, "Should be cancelled");

  await server.stop();
}

add_task(async function test_cancel_during_connection_no_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_cancel_during_connection("alt2.example.com");
});

add_task(async function test_cancel_during_connection_with_speculative() {
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_cancel_during_connection("alt2.example.com");
});

// Test fallback when first attempt hangs, speculative disabled.
// pauseTCPConnect does not work on Linux, so skip these tests there.
add_task(
  { skip_if: () => AppConstants.platform == "linux" },
  async function test_first_attempt_slow_no_speculative() {
    Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
    await do_test_first_attempt_slow("alt2.example.com");
  }
);

// Test fallback when first attempt hangs, speculative enabled.
add_task(
  { skip_if: () => AppConstants.platform == "linux" },
  async function test_first_attempt_slow_with_speculative() {
    Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
    await do_test_first_attempt_slow("alt2.example.com");
  }
);

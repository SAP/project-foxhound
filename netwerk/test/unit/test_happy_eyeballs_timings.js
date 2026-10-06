/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

let trrServer;
let h2Server;

add_setup(async function () {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);

  trrServer = new TRRServer();
  await trrServer.start();
  trr_test_setup();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  h2Server = new NodeHTTP2Server();
  await h2Server.start();
  await h2Server.registerPathHandler("/", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    trr_clear_prefs();
    if (trrServer) {
      await trrServer.stop();
    }
    if (h2Server) {
      await h2Server.stop();
    }
  });
});

async function resetConnections() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  Services.dns.clearCache(true);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function openChannelAndGetTimings(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let timedChannel = chan.QueryInterface(Ci.nsITimedChannel);
  let internalChannel = chan.QueryInterface(Ci.nsIHttpChannelInternal);

  let transportStatuses = [];
  let activityDistributor = Cc[
    "@mozilla.org/network/http-activity-distributor;1"
  ].getService(Ci.nsIHttpActivityDistributor);
  let observer = {
    observeActivity(aHttpChannel, aActivityType, aActivitySubtype) {
      if (
        aActivityType ===
        Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_SOCKET_TRANSPORT
      ) {
        try {
          let otherChan = aHttpChannel.QueryInterface(Ci.nsIChannel);
          if (otherChan.URI.spec === uri) {
            transportStatuses.push(aActivitySubtype);
          }
        } catch (e) {}
      }
    },
  };
  activityDistributor.addObserver(observer);

  await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener((_req, _buf) => resolve(), null, CL_ALLOW_UNKNOWN_CL)
    );
  });

  activityDistributor.removeObserver(observer);

  return { timedChannel, internalChannel, transportStatuses };
}

function logTimings(timedChannel) {
  info(`domainLookupStartTime=${timedChannel.domainLookupStartTime}`);
  info(`domainLookupEndTime=${timedChannel.domainLookupEndTime}`);
  info(`connectStartTime=${timedChannel.connectStartTime}`);
  info(`tcpConnectEndTime=${timedChannel.tcpConnectEndTime}`);
  info(`secureConnectionStartTime=${timedChannel.secureConnectionStartTime}`);
  info(`connectEndTime=${timedChannel.connectEndTime}`);
}

function assertTimingsSet(timedChannel) {
  Assert.greater(
    timedChannel.domainLookupStartTime,
    0,
    "domainLookupStartTime should be set"
  );
  Assert.greater(
    timedChannel.domainLookupEndTime,
    0,
    "domainLookupEndTime should be set"
  );
  Assert.greater(
    timedChannel.connectStartTime,
    0,
    "connectStartTime should be set"
  );
  Assert.greater(
    timedChannel.connectEndTime,
    0,
    "connectEndTime should be set"
  );
  Assert.greater(
    timedChannel.secureConnectionStartTime,
    0,
    "secureConnectionStartTime should be set"
  );
}

function assertTransportStatusPresent(transportStatuses, expected) {
  for (let status of expected) {
    Assert.ok(
      transportStatuses.includes(status),
      `transport status 0x${status.toString(16)} should be present`
    );
  }
}

function assertTransportStatusUnique(transportStatuses, expected) {
  for (let status of expected) {
    Assert.equal(
      transportStatuses.filter(s => s === status).length,
      1,
      `transport status 0x${status.toString(16)} should appear exactly once`
    );
  }
}

function assertTimingsOrder(timedChannel) {
  Assert.lessOrEqual(
    timedChannel.domainLookupStartTime,
    timedChannel.domainLookupEndTime,
    "domainLookupStart <= domainLookupEnd"
  );
  Assert.lessOrEqual(
    timedChannel.connectStartTime,
    timedChannel.secureConnectionStartTime,
    "connectStart <= secureConnectionStart"
  );
  Assert.lessOrEqual(
    timedChannel.secureConnectionStartTime,
    timedChannel.connectEndTime,
    "secureConnectionStart <= connectEnd"
  );
}

add_task(async function test_tcp_timings_speculative_enabled() {
  await resetConnections();
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);

  let host = "foo.example.com";
  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
  });
  await trrServer.registerDoHAnswers(host, "AAAA", {
    answers: [{ name: host, ttl: 55, type: "AAAA", flush: false, data: "::1" }],
  });

  let { timedChannel, internalChannel, transportStatuses } =
    await openChannelAndGetTimings(`https://${host}:${h2Server.port()}/`);

  logTimings(timedChannel);
  assertTimingsSet(timedChannel);
  assertTimingsOrder(timedChannel);
  Assert.ok(
    internalChannel.remoteAddress === "127.0.0.1" ||
      internalChannel.remoteAddress === "::1",
    `remoteAddress should be 127.0.0.1 or ::1, got ${internalChannel.remoteAddress}`
  );
  let expectedStatuses = [
    Ci.nsISocketTransport.STATUS_RESOLVING,
    Ci.nsISocketTransport.STATUS_RESOLVED,
    Ci.nsISocketTransport.STATUS_CONNECTING_TO,
    Ci.nsISocketTransport.STATUS_CONNECTED_TO,
  ];
  assertTransportStatusPresent(transportStatuses, expectedStatuses);
  assertTransportStatusUnique(transportStatuses, expectedStatuses);
});

add_task(async function test_tcp_timings_speculative_disabled() {
  await resetConnections();
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

  let host = "alt1.example.com";
  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
  });
  await trrServer.registerDoHAnswers(host, "AAAA", {
    answers: [{ name: host, ttl: 55, type: "AAAA", flush: false, data: "::1" }],
  });

  let { timedChannel, internalChannel, transportStatuses } =
    await openChannelAndGetTimings(`https://${host}:${h2Server.port()}/`);

  logTimings(timedChannel);
  assertTimingsSet(timedChannel);
  assertTimingsOrder(timedChannel);
  Assert.ok(
    internalChannel.remoteAddress === "127.0.0.1" ||
      internalChannel.remoteAddress === "::1",
    `remoteAddress should be 127.0.0.1 or ::1, got ${internalChannel.remoteAddress}`
  );
  let expectedStatuses = [
    Ci.nsISocketTransport.STATUS_RESOLVING,
    Ci.nsISocketTransport.STATUS_RESOLVED,
    Ci.nsISocketTransport.STATUS_CONNECTING_TO,
    Ci.nsISocketTransport.STATUS_CONNECTED_TO,
  ];
  assertTransportStatusPresent(transportStatuses, expectedStatuses);
  assertTransportStatusUnique(transportStatuses, expectedStatuses);
});

function assertH3Timings(timedChannel) {
  Assert.greater(
    timedChannel.domainLookupStartTime,
    0,
    "domainLookupStartTime should be set"
  );
  Assert.greater(
    timedChannel.domainLookupEndTime,
    0,
    "domainLookupEndTime should be set"
  );
  Assert.greater(
    timedChannel.connectStartTime,
    0,
    "connectStartTime should be set"
  );
  Assert.greater(
    timedChannel.connectEndTime,
    0,
    "connectEndTime should be set"
  );
  Assert.lessOrEqual(
    timedChannel.domainLookupStartTime,
    timedChannel.domainLookupEndTime,
    "domainLookupStart <= domainLookupEnd"
  );
  Assert.lessOrEqual(
    timedChannel.domainLookupEndTime,
    timedChannel.connectStartTime,
    "domainLookupEnd <= connectStart"
  );
  // For HTTP/3, connectStart == secureConnectionStart.
  Assert.equal(
    timedChannel.connectStartTime,
    timedChannel.secureConnectionStartTime,
    "connectStart == secureConnectionStart for HTTP/3"
  );
}

async function do_test_h3_timings(host) {
  await resetConnections();

  let { timedChannel, internalChannel, transportStatuses } =
    await openChannelAndGetTimings(`https://${host}/`);

  logTimings(timedChannel);
  assertH3Timings(timedChannel);
  Assert.equal(
    internalChannel.remoteAddress,
    "127.0.0.1",
    "remoteAddress should be 127.0.0.1 for HTTP/3"
  );
  let expectedStatuses = [
    Ci.nsISocketTransport.STATUS_RESOLVING,
    Ci.nsISocketTransport.STATUS_RESOLVED,
  ];
  assertTransportStatusPresent(transportStatuses, expectedStatuses);
  assertTransportStatusUnique(transportStatuses, expectedStatuses);
}

add_task(async function test_h3_timings() {
  let h3Port = Services.env.get("MOZHTTP3_PORT");
  Assert.notEqual(h3Port, null);
  Assert.notEqual(h3Port, "");

  await resetConnections();
  Services.prefs.setBoolPref("network.http.http3.enable", true);
  Services.prefs.setBoolPref("network.dns.disableIPv6", true);

  let host = "alt2.example.com";
  Services.prefs.setCharPref(
    "network.http.http3.alt-svc-mapping-for-testing",
    `${host};h3=:${h3Port}`
  );
  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
  });

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);
  await do_test_h3_timings(host);

  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);
  await do_test_h3_timings(host);

  Services.prefs.clearUserPref("network.http.http3.enable");
  Services.prefs.clearUserPref("network.dns.disableIPv6");
  Services.prefs.clearUserPref(
    "network.http.http3.alt-svc-mapping-for-testing"
  );
});

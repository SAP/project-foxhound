/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Verifies that a Happy Eyeballs channel reuses the speculative DNS prefetch
// instead of issuing duplicate per-family lookups. Both the channel prefetch
// and HE issue per-family A/AAAA lookups; since the prefetch now matches HE's
// af, HE's lookups hit the same cache key (cache hit or coalesce), so the TRR
// server should see exactly one A and one AAAA query (two of each without
// reuse).

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

let trrServer;
let h2Server;

// The origin host. Must differ from the TRR endpoint host below, which is
// resolved via the bootstrap address (no TRR query): only a distinct host is
// actually resolved through TRR and thus counted by the server.
const HOST = "alt1.example.com";
const TRR_HOST = "foo.example.com";

add_setup(async function () {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  // Avoid speculative connections issuing their own lookups and muddying the
  // per-host query counts.
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

  trrServer = new TRRServer();
  await trrServer.start();
  trr_test_setup();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://${TRR_HOST}:${trrServer.port()}/dns-query`
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
    Services.prefs.clearUserPref("network.dns.disableIPv6");
    trr_clear_prefs();
    if (trrServer) {
      await trrServer.stop();
    }
    if (h2Server) {
      await h2Server.stop();
    }
  });
});

async function resetState() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  let nssComponent = Cc["@mozilla.org/psm;1"].getService(Ci.nsINSSComponent);
  await nssComponent.asyncClearSSLExternalAndInternalSessionCache();
  Services.dns.clearCache(true);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Reset the TRR server's per-host request counts.
  await trrServer.execute("global.dns_query_counts = {}");
}

async function registerAnswers(aOpts = {}) {
  await trrServer.registerDoHAnswers(HOST, "A", {
    answers: [
      { name: HOST, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
    delay: aOpts.aDelay,
  });
  if (!aOpts.noAAAA) {
    await trrServer.registerDoHAnswers(HOST, "AAAA", {
      answers: [
        { name: HOST, ttl: 55, type: "AAAA", flush: false, data: "::1" },
      ],
      delay: aOpts.aaaaDelay,
    });
  }
}

async function openChannel() {
  let chan = NetUtil.newChannel({
    uri: `https://${HOST}:${h2Server.port()}/`,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let status = await new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener(
        (req, _buf) => resolve(req.status),
        null,
        CL_ALLOW_UNKNOWN_CL
      )
    );
  });
  return { chan, status };
}

// HE reuses the per-family prefetch: only one A and one AAAA query reach the
// server even though both the prefetch and HE issue per-family lookups.
add_task(async function test_he_reuses_prefetch() {
  await resetState();
  await registerAnswers();

  let { chan, status } = await openChannel();
  Assert.equal(status, Cr.NS_OK, "request should succeed");
  Assert.equal(
    chan.QueryInterface(Ci.nsIHttpChannel).responseStatus,
    200,
    "response status should be 200"
  );

  Assert.equal(
    await trrServer.requestCount(HOST, "A"),
    1,
    "HE coalesced onto the prefetch: only one A query reached the server"
  );
  Assert.equal(
    await trrServer.requestCount(HOST, "AAAA"),
    1,
    "HE coalesced onto the prefetch: only one AAAA query reached the server"
  );
});

// Per-family early start is preserved: with AAAA delayed, HE connects over the
// ready IPv4 family without waiting for IPv6, still one query per family.
add_task(async function test_early_start_preserved_with_slow_ipv6() {
  await resetState();
  await registerAnswers({ aaaaDelay: 2000 });

  let { chan, status } = await openChannel();
  Assert.equal(status, Cr.NS_OK, "request should succeed via the ready family");

  let internal = chan.QueryInterface(Ci.nsIHttpChannelInternal);
  Assert.equal(
    internal.remoteAddress,
    "127.0.0.1",
    "should connect over IPv4 without waiting for the delayed IPv6 lookup"
  );

  Assert.equal(
    await trrServer.requestCount(HOST, "A"),
    1,
    "only one A query reached the server"
  );
  Assert.equal(
    await trrServer.requestCount(HOST, "AAAA"),
    1,
    "only one AAAA query reached the server (counted on receipt)"
  );
});

// When IPv6 is disabled, the prefetch skips the AAAA family entirely, so no
// AAAA query is ever sent.
add_task(async function test_ipv6_disabled_skips_aaaa() {
  Services.prefs.setBoolPref("network.dns.disableIPv6", true);
  await resetState();
  await registerAnswers({ noAAAA: true });

  let { status } = await openChannel();
  Assert.equal(status, Cr.NS_OK, "request should succeed");

  Assert.equal(
    await trrServer.requestCount(HOST, "AAAA"),
    0,
    "no AAAA query should be sent when IPv6 is disabled"
  );
  Assert.equal(
    await trrServer.requestCount(HOST, "A"),
    1,
    "only one A query reached the server"
  );

  Services.prefs.clearUserPref("network.dns.disableIPv6");
});

// Control: with Happy Eyeballs disabled the non-HE path still connects. The
// query count isn't pinned here -- the non-HE path (DnsAndConnectSocket) may
// issue a family-specific backup lookup, so the count is timing dependent.
add_task(async function test_non_he_path_unaffected() {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", false);
  await resetState();
  await registerAnswers();

  let { status } = await openChannel();
  Assert.equal(status, Cr.NS_OK, "request should succeed on the non-HE path");

  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
});

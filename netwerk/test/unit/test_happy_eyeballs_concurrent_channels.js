/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Test that when a sibling HE attempt wins the connection race, the
// claimed transaction on the losing attempt is requeued and completes.

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTP2Server } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let trrServer;

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);

  trrServer = new TRRServer();
  await trrServer.start();
  trr_test_setup();
  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("network.http.happy_eyeballs_enabled");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    trr_clear_prefs();
    if (trrServer) {
      await trrServer.stop();
    }
  });
});

// Pause the first TCP connection at the socket level for delayMs.
// This fires before TLS, so it delays the handshake without corrupting it.
async function pauseFirstConnection(server, delayMs) {
  await server.execute(`
    global.firstConnPaused = false;
    global.server.on("connection", (socket) => {
      if (!global.firstConnPaused) {
        global.firstConnPaused = true;
        socket.pause();
        setTimeout(() => { try { socket.resume(); } catch(e) {} }, ${delayMs});
      }
    });
  `);
}

// Scenario:
// 1. Use TRR with a 500ms delay for the A record of alt1.example.com.
//    This keeps the speculative HE attempt in DNS resolution phase.
// 2. A real channel arrives and Claim()s the speculative attempt while
//    DNS is still pending. The NullTransaction is replaced with the real one.
// 3. DNS completes. MaybePassHttpTransToEstablisher sees the real transaction,
//    creates a proxy, and removes the transaction from the pending queue.
// 4. The first TCP connection is paused at socket level for 5s, delaying
//    its TLS handshake while subsequent connections complete immediately.
// 5. A second channel's HE attempt connects without delay, reports H2.
//    MakeAllDontReuseExcept -> CloseAllConnectionAttempts abandons #1.
// 6. The proxy transaction is orphaned. Without the fix, it hangs.
add_task(async function test_requeue_on_sibling_abandon() {
  Services.dns.clearCache(true);
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  let server = new NodeHTTP2Server();
  await server.start();
  await server.registerPathHandler("/test", (_req, resp) => {
    resp.writeHead(200, { "Content-Type": "text/plain" });
    resp.end("ok");
  });

  await pauseFirstConnection(server, 5000);

  let serverPort = server.port();
  let host = "alt1.example.com";

  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
    delay: 500,
  });

  let numChannels = 5;
  let promises = [];

  for (let i = 0; i < numChannels; i++) {
    let chan = NetUtil.newChannel({
      uri: `https://${host}:${serverPort}/test`,
      loadUsingSystemPrincipal: true,
    }).QueryInterface(Ci.nsIHttpChannel);
    chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

    let promise = new Promise(resolve => {
      chan.asyncOpen({
        onStartRequest() {},
        onDataAvailable(req, stream, offset, count) {
          read_stream(stream, count);
        },
        onStopRequest(req) {
          let status = 0;
          try {
            status = req.QueryInterface(Ci.nsIHttpChannel).responseStatus;
          } catch (e) {}
          resolve({ status });
        },
      });
    });

    promises.push(promise);
  }

  let results = await Promise.all(promises);

  let successCount = 0;
  for (let i = 0; i < numChannels; i++) {
    if (results[i].status === 200) {
      successCount++;
    }
  }
  Assert.equal(
    successCount,
    numChannels,
    `All channels should succeed (got ${successCount}/${numChannels})`
  );

  await server.stop();
});

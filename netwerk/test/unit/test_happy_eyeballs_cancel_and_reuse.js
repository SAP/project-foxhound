/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Test that cancelling a transaction that shares an HE connection attempt
// doesn't strand sibling transactions.
//
// Uses a TCP proxy with configurable delay between Firefox and the real
// HTTPS server. The proxy accepts connections immediately (so TCP handshake
// completes) but delays forwarding data to the backend, keeping the TLS
// handshake stalled for a controlled duration.

"use strict";

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let trrServer;

add_setup(async function () {
  Services.prefs.setBoolPref("network.http.happy_eyeballs_enabled", true);
  Services.prefs.setBoolPref("network.dns.disableIPv6", true);
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

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
    Services.prefs.clearUserPref("network.dns.disableIPv6");
    Services.prefs.clearUserPref("network.http.speculative-parallel-limit");
    trr_clear_prefs();
    if (trrServer) {
      await trrServer.stop();
    }
  });
});

// Create a TCP proxy in the Node server process that delays the first
// connection's data forwarding by delayMs. Subsequent connections are
// forwarded immediately (pass-through).
async function createDelayProxy(server, backendPort, delayMs) {
  let proxyPort = await server.execute(`
    (function() {
      const net = require("net");
      let firstConnection = true;
      function pipeToBackend(clientSocket, delay) {
        let buffered = [];
        clientSocket.on("data", (chunk) => buffered.push(chunk));
        clientSocket.on("error", () => {});

        setTimeout(() => {
          const backendSocket = net.connect(${backendPort}, "127.0.0.1", () => {
            for (const chunk of buffered) {
              backendSocket.write(chunk);
            }
            buffered = null;
            clientSocket.removeAllListeners("data");
            clientSocket.on("data", (chunk) => backendSocket.write(chunk));
            backendSocket.on("data", (chunk) => {
              try { clientSocket.write(chunk); } catch(e) {}
            });
            backendSocket.on("end", () => {
              try { clientSocket.end(); } catch(e) {}
            });
            clientSocket.on("end", () => backendSocket.end());
            backendSocket.on("error", () => clientSocket.destroy());
            clientSocket.on("error", () => backendSocket.destroy());
          });
          backendSocket.on("error", () => clientSocket.destroy());
        }, delay);
      }
      const proxy = net.createServer((clientSocket) => {
        if (firstConnection) {
          firstConnection = false;
          pipeToBackend(clientSocket, ${delayMs});
        } else {
          pipeToBackend(clientSocket, 0);
        }
      });
      return new Promise((resolve) => {
        proxy.listen(0, "127.0.0.1", () => {
          global.delayProxy = proxy;
          resolve(proxy.address().port);
        });
      });
    })()
  `);
  return proxyPort;
}

async function closeDelayProxy(server) {
  await server.execute(`
    if (global.delayProxy) {
      global.delayProxy.close();
      global.delayProxy = null;
    }
  `);
}

add_task(async function test_cancel_claimed_transaction() {
  Services.dns.clearCache(true);
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  let server = new NodeHTTPSServer();
  await server.start();

  await server.registerPathHandler("/test", (_req, resp) => {
    let body = "hello";
    resp.writeHead(200, {
      "Content-Type": "text/plain",
      "Content-Length": "" + body.length,
    });
    resp.end(body);
  });

  let backendPort = server.port();

  // Create a TCP proxy that delays 3s before forwarding to the HTTPS server.
  // Firefox connects to proxyPort; TCP handshake completes immediately, but
  // TLS handshake is stalled because the proxy holds the data for 3s.
  let proxyPort = await createDelayProxy(server, backendPort, 3000);
  info(`Proxy on port ${proxyPort} -> backend on port ${backendPort}`);

  let host = "alt1.example.com";

  await trrServer.registerDoHAnswers(host, "A", {
    answers: [
      { name: host, ttl: 55, type: "A", flush: false, data: "127.0.0.1" },
    ],
  });

  // Channel A connects to the proxy port. TCP handshake completes fast,
  // but TLS is stalled for 3s. HE creates the connection attempt.
  let chanA = NetUtil.newChannel({
    uri: `https://${host}:${proxyPort}/test`,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  chanA.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let promiseA = new Promise(resolve => {
    chanA.asyncOpen({
      onStartRequest() {},
      onDataAvailable(req, stream, offset, count) {
        read_stream(stream, count);
      },
      onStopRequest(req) {
        resolve(req.status);
      },
    });
  });

  // Wait 500ms: DNS resolves, TCP connects (fast), TLS is stalled at proxy.
  // The HE attempt exists and is in-progress.
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 500));

  // Channel B: should claim the existing HE attempt via FindConnToClaim
  let chanB = NetUtil.newChannel({
    uri: `https://${host}:${proxyPort}/test`,
    loadUsingSystemPrincipal: true,
    contentPolicyType: Ci.nsIContentPolicy.TYPE_DOCUMENT,
  }).QueryInterface(Ci.nsIHttpChannel);
  chanB.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

  let promiseB = new Promise(resolve => {
    chanB.asyncOpen({
      onStartRequest() {},
      onDataAvailable(req, stream, offset, count) {
        read_stream(stream, count);
      },
      onStopRequest(req) {
        resolve({ status: req.status });
      },
    });
  });

  // Wait for channel B to claim the attempt
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 100));

  // Cancel channel A while HE is still in TLS handshake (proxy delays 3s)
  info("Cancelling channel A");
  chanA.cancel(Cr.NS_BINDING_ABORTED);

  let statusA = await promiseA;
  info(`Channel A finished with status=0x${statusA.toString(16)}`);

  // Channel B should complete when the proxy releases data after 3s.
  // With the bug, channel B hangs forever.
  info("Waiting for channel B");
  let resultB = await Promise.race([
    promiseB,
    new Promise(resolve =>
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      setTimeout(() => resolve({ status: "TIMEOUT" }), 15000)
    ),
  ]);

  // The critical check: channel B must not hang forever. Before the fix,
  // channel B would be stranded in the pending queue and never complete.
  Assert.notEqual(
    resultB.status,
    "TIMEOUT",
    "Channel B should not hang (stranded by cancelled channel A)"
  );
  Assert.equal(resultB.status, Cr.NS_OK, "Channel B should succeed");

  try {
    await closeDelayProxy(server);
  } catch (e) {}
  try {
    await server.stop();
  } catch (e) {}
});

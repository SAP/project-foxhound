/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// When a TLS server drops the connection (sends FIN) before completing the
// handshake, NSS reports PR_END_OF_FILE_ERROR on the first read. With
// security.tls.version.min == max (set via xpcshell.toml prefs),
// rememberIntolerantAtVersion returns false immediately (intolerant <=
// minVersion), so retryDueToTLSIntolerance returns false and the raw
// PR_END_OF_FILE_ERROR propagates to nsSocketTransport2.
//
// nsSocketTransport2 now maps PR_END_OF_FILE_ERROR to NS_ERROR_NET_RESET
// (previously NS_ERROR_NET_INTERRUPT), triggering an automatic HTTP transaction
// retry that succeeds on the second connection.
//
// Regression test for Bug 2001565.

"use strict";

const { NodeHTTPServer, with_node_servers } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

// Executed in the Node.js process: creates a raw TCP server that half-closes
// the first connection (before TLS), then completes TLS and serves HTTP/1.1
// 200 OK for subsequent connections.  Returns the listening port.
function setupDropServer() {
  const net = require("net");
  const tls = require("tls");
  const fs = require("fs");
  const path = require("path");
  let connCount = 0;
  const certOptions = {
    isServer: true,
    key: fs.readFileSync(path.join(__dirname, "http2-cert.key")),
    cert: fs.readFileSync(path.join(__dirname, "http2-cert.pem")),
    ALPNProtocols: ["http/1.1"],
  };
  const dropServer = net.createServer(rawSocket => {
    if (++connCount === 1) {
      rawSocket.end();
      return;
    }
    const tlsSocket = new tls.TLSSocket(rawSocket, certOptions);
    let reqData = "";
    tlsSocket.on("data", chunk => {
      reqData += chunk.toString();
      if (reqData.includes("\r\n\r\n")) {
        tlsSocket.write(
          "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n" +
            "Content-Type: text/plain\r\n\r\nok"
        );
        tlsSocket.end();
      }
    });
    tlsSocket.on("error", () => {});
  });
  // ADB is loaded into the Node.js process by NodeHTTPServer.start().
  // listenAndForwardPort handles Android port forwarding so the test works
  // when xpcshell runs on-device via adb.
  return ADB.listenAndForwardPort(dropServer, 0); // eslint-disable-line no-undef
}

add_task(async function test_eof_retry() {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  await with_node_servers([NodeHTTPServer], async server => {
    let dropPort = await server.execute(`(${setupDropServer})()`);
    let [req] = await channelOpenPromise(
      makeChan(`https://localhost:${dropPort}/test`),
      0
    );
    equal(req.status, Cr.NS_OK);
    equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 200);
  });
});

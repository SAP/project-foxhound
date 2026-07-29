/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Tests that QUIC resumption tokens (address validation tokens) are not reused
// across first-party partition contexts. A token obtained in one first-party
// context must not allow 0-RTT resumption in a different first-party context.

var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

registerCleanupFunction(async () => {
  http3_clear_prefs();
  Services.prefs.clearUserPref("network.http.http3.enable_0rtt");
});

add_task(async function setup() {
  await http3_setup_tests("h3");
});

function makeChan(uri, partitionKey) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  if (partitionKey) {
    chan.loadInfo.originAttributes = { partitionKey };
  }
  return chan;
}

function chanPromise(chan) {
  return new Promise(resolve => {
    chan.asyncOpen({
      onStartRequest(_request) {},
      onDataAvailable(_request, stream, _offset, count) {
        read_stream(stream, count);
      },
      onStopRequest(request) {
        resolve(request);
      },
    });
  });
}

async function cancelAllAndWait() {
  Services.obs.notifyObservers(null, "net:cancel-all-connections");
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Verifies that a QUIC resumption token stored under first-party context A
// cannot be used for 0-RTT resumption in first-party context B, and that
// resumption within the same first-party context still works.
add_task(async function test_quic_token_not_reused_across_partitions() {
  Services.prefs.setBoolPref("network.http.http3.enable_0rtt", true);

  // Initial connection under partition key A. No prior token exists, so the
  // handshake is not resumed. The server sends a resumption token stored under
  // A's peerId.
  let chanA1 = makeChan("https://foo.example.com/30", "(https,a.example.com)");
  let reqA1 = await chanPromise(chanA1);
  Assert.equal(reqA1.status, Cr.NS_OK, "first A connection succeeded");
  Assert.equal(reqA1.protocolVersion, "h3", "first A connection used H3");
  Assert.equal(
    reqA1.securityInfo.resumed,
    false,
    "first A connection not resumed (no prior token)"
  );

  await cancelAllAndWait();

  // Connection under partition key B to the same server. The token stored under
  // A's peerId must not be visible under B's peerId.
  let chanB = makeChan("https://foo.example.com/30", "(https,b.example.com)");
  let reqB = await chanPromise(chanB);
  Assert.equal(reqB.status, Cr.NS_OK, "B connection succeeded");
  Assert.equal(reqB.protocolVersion, "h3", "B connection used H3");
  Assert.equal(
    reqB.securityInfo.resumed,
    false,
    "B connection not resumed (A's token must not be reused across partitions)"
  );
  Assert.notEqual(
    reqA1.securityInfo.peerId,
    reqB.securityInfo.peerId,
    "A and B use distinct peerIds confirming they run on separate QUIC sessions"
  );

  await cancelAllAndWait();

  // Reconnect under partition key A. The token from the first A connection is
  // still cached under A's peerId, so this connection must be resumed.
  let chanA2 = makeChan("https://foo.example.com/30", "(https,a.example.com)");
  let reqA2 = await chanPromise(chanA2);
  Assert.equal(reqA2.status, Cr.NS_OK, "second A connection succeeded");
  Assert.equal(reqA2.protocolVersion, "h3", "second A connection used H3");
  Assert.equal(
    reqA2.securityInfo.resumed,
    true,
    "second A connection resumed using A's own token"
  );
  Assert.equal(
    reqA1.securityInfo.peerId,
    reqA2.securityInfo.peerId,
    "A1 and A2 have the same peerId"
  );
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests that multiple server-initiated streams can be received concurrently.
// Regression test for Bug 2046262.

"use strict";

var h3Port;
var host;

registerCleanupFunction(async () => {
  Services.prefs.clearUserPref("network.dns.localDomains");
  Services.prefs.clearUserPref("network.webtransport.redirect.enabled");
});

var { NetUtil } = ChromeUtils.importESModule(
  "resource://gre/modules/NetUtil.sys.mjs"
);

function readFile(file) {
  let fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(
    Ci.nsIFileInputStream
  );
  fstream.init(file, -1, 0, 0);
  let data = NetUtil.readInputStreamToString(fstream, fstream.available());
  fstream.close();
  return data;
}

function addCertFromFile(certdb, filename, trustString) {
  let certFile = do_get_file(filename, false);
  let pem = readFile(certFile)
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/[\r\n]/g, "");
  certdb.addCertFromBase64(pem, trustString);
}

add_setup(async function setup() {
  Services.prefs.setCharPref("network.dns.localDomains", "foo.example.com");
  Services.prefs.setBoolPref("network.webtransport.redirect.enabled", true);

  h3Port = Services.env.get("MOZHTTP3_PORT");
  Assert.notEqual(h3Port, null);
  Assert.notEqual(h3Port, "");
  host = "foo.example.com:" + h3Port;
  do_get_profile();

  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(
    certdb,
    "../../../../netwerk/test/unit/http2-ca.pem",
    "CTu,u,u"
  );
});

async function read_stream_as_string(readable_stream) {
  const decoder = new (webTransportWindow().TextDecoderStream)();
  const decode_stream = readable_stream.pipeThrough(decoder);
  const reader = decode_stream.getReader();

  let chunks = "";
  while (true) {
    const { value: chunk, done } = await reader.read();
    if (done) {
      break;
    }
    chunks += chunk;
  }
  reader.releaseLock();
  return chunks;
}

add_task(async function test_multiple_incoming_unidi_streams() {
  const NUM_STREAMS = 5;
  let wt = newWebTransport(
    `https://${host}/create_unidi_streams/${NUM_STREAMS}`
  );
  await wt.ready;

  const stream_reader = wt.incomingUnidirectionalStreams.getReader();
  let received = [];
  for (let i = 0; i < NUM_STREAMS; i++) {
    const { value: recv_stream } = await stream_reader.read();
    let str = await read_stream_as_string(recv_stream);
    received.push(str);
  }
  stream_reader.releaseLock();

  received.sort();
  for (let i = 0; i < NUM_STREAMS; i++) {
    Assert.equal(received[i], `stream${i}`);
  }

  wt.close();
});

add_task(async function test_multiple_incoming_bidi_streams() {
  const NUM_STREAMS = 5;
  let wt = newWebTransport(
    `https://${host}/create_bidi_streams/${NUM_STREAMS}`
  );
  await wt.ready;

  const stream_reader = wt.incomingBidirectionalStreams.getReader();
  let received = [];
  for (let i = 0; i < NUM_STREAMS; i++) {
    const { value: bidi_stream } = await stream_reader.read();
    let str = await read_stream_as_string(bidi_stream.readable);
    received.push(str);
  }
  stream_reader.releaseLock();

  received.sort();
  for (let i = 0; i < NUM_STREAMS; i++) {
    Assert.equal(received[i], `stream${i}`);
  }

  wt.close();
});

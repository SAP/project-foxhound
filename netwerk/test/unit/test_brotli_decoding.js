/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from head_cache.js */
/* import-globals-from head_cookies.js */
/* import-globals-from head_channels.js */
/* import-globals-from head_servers.js */

let endChunk2ReceivedInTime = false;

function makeChan(uri) {
  let chan = NetUtil.newChannel({
    uri,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);
  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  return chan;
}

let channelListener = function(closure) {
  this._closure = closure;
  this._start = Date.now();
};

channelListener.prototype = {
  onStartRequest: function testOnStartRequest(request) {},

  onDataAvailable: function testOnDataAvailable(request, stream, off, cnt) {
    let data = read_stream(stream, cnt);
    let current = Date.now();
    let elapsed = current - this._start;
    dump("data:" + data.slice(-10) + "\n");
    dump("elapsed=" + elapsed + "\n");
    if (elapsed < 2500 && data[data.length - 1] == "E") {
      endChunk2ReceivedInTime = true;
    }
  },

  onStopRequest: function testOnStopRequest(request, status) {
    this._closure();
  },
};

add_task(async function test_http2() {
  let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  addCertFromFile(certdb, "http2-ca.pem", "CTu,u,u");

  let server = new NodeHTTP2Server();
  await server.start();
  registerCleanupFunction(async () => {
    await server.stop();
  });
  let chan = makeChan(`https://localhost:${server.port()}/test`);
  let req = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_ALLOW_UNKNOWN_CL));
  });
  equal(req.status, Cr.NS_OK);
  equal(req.QueryInterface(Ci.nsIHttpChannel).responseStatus, 404);
  await server.registerPathHandler("/test", (req, resp) => {
    resp.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "content-encoding": "br",
    });
    resp.write(
      Buffer.from([
        0x8b,
        0x2a,
        0x80,
        0x3c,
        0x64,
        0x69,
        0x76,
        0x3e,
        0x73,
        0x74,
        0x61,
        0x72,
        0x74,
        0x3c,
        0x2f,
        0x64,
        0x69,
        0x76,
        0x3e,
        0x3c,
        0x64,
        0x69,
        0x76,
        0x20,
        0x73,
        0x74,
        0x79,
        0x6c,
        0x65,
        0x3d,
        0x22,
        0x74,
        0x65,
        0x78,
        0x74,
        0x2d,
        0x6f,
        0x76,
        0x65,
        0x72,
        0x66,
        0x6c,
        0x6f,
        0x77,
        0x3a,
        0x20,
        0x65,
        0x6c,
        0x6c,
        0x69,
        0x70,
        0x73,
        0x69,
        0x73,
        0x3b,
        0x6f,
        0x76,
        0x65,
        0x72,
        0x66,
        0x6c,
        0x6f,
        0x77,
        0x3a,
        0x20,
        0x68,
        0x69,
        0x64,
        0x64,
        0x65,
        0x6e,
        0x3b,
        0x64,
        0x69,
        0x72,
        0x65,
        0x63,
        0x74,
        0x69,
        0x6f,
        0x6e,
        0x3a,
        0x20,
        0x72,
        0x74,
        0x6c,
        0x3b,
        0x22,
        0x3e,
      ])
    );

    // This function is handled within the httpserver where setTimeout is
    // available.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout, no-undef
    setTimeout(function() {
      resp.write(
        Buffer.from([
          0xfa,
          0xff,
          0x0b,
          0x00,
          0x80,
          0xaa,
          0xaa,
          0xaa,
          0xea,
          0x3f,
          0x72,
          0x59,
          0xd6,
          0x05,
          0x73,
          0x5b,
          0xb6,
          0x75,
          0xea,
          0xe6,
          0xfd,
          0xa8,
          0x54,
          0xc7,
          0x62,
          0xd8,
          0x18,
          0x86,
          0x61,
          0x18,
          0x86,
          0x63,
          0xa9,
          0x86,
          0x61,
          0x18,
          0x86,
          0xe1,
          0x63,
          0x8e,
          0x63,
          0xa9,
          0x86,
          0x61,
          0x18,
          0x86,
          0x61,
          0xd8,
          0xe0,
          0xbc,
          0x85,
          0x48,
          0x1f,
          0xa0,
          0x05,
          0xda,
          0x6f,
          0xef,
          0x02,
          0x00,
          0x00,
          0x00,
          0x01,
          0x00,
          0xaa,
          0xaa,
          0xaa,
          0xaa,
          0xff,
          0xc8,
          0x65,
          0x59,
          0x17,
          0xcc,
          0x6d,
          0xd9,
          0xd6,
          0xa9,
          0x9b,
          0xf7,
          0xff,
          0x0d,
          0xd5,
          0xb1,
          0x18,
          0xe6,
          0x63,
          0x18,
          0x86,
          0x61,
          0x18,
          0x8e,
          0xa5,
          0x1a,
          0x86,
          0x61,
          0x18,
          0x86,
          0x61,
          0x8e,
          0xed,
          0x57,
          0x0d,
          0xc3,
          0x30,
          0x0c,
          0xc3,
          0xb0,
          0xc1,
          0x79,
          0x0b,
          0x91,
          0x3e,
          0x40,
          0x6c,
          0x1c,
          0x00,
          0x90,
          0xd6,
          0x3b,
          0x00,
          0x50,
          0x96,
          0x31,
          0x53,
          0xe6,
          0x2c,
          0x59,
          0xb3,
          0x65,
          0xcf,
          0x91,
          0x33,
          0x57,
          0x31,
          0x03,
        ])
      );
    }, 100);

    // This function is handled within the httpserver where setTimeout is
    // available.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout, no-undef
    setTimeout(function() {
      resp.end(
        Buffer.from([
          0x98,
          0x00,
          0x08,
          0x3c,
          0x2f,
          0x64,
          0x69,
          0x76,
          0x3e,
          0x3c,
          0x64,
          0x69,
          0x76,
          0x3e,
          0x65,
          0x6e,
          0x64,
          0x3c,
          0x2f,
          0x64,
          0x69,
          0x76,
          0x3e,
          0x03,
        ])
      );
    }, 2500);
  });
  chan = makeChan(`https://localhost:${server.port()}/test`);
  await new Promise(resolve => {
    chan.asyncOpen(new channelListener(() => resolve()));
  });

  equal(
    endChunk2ReceivedInTime,
    true,
    "End of chunk 2 not received before chunk 3 was sent"
  );
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* based on netwerk/test/unit/test_retry_0rtt.js */

"use strict";

/* import-globals-from ../../../../../netwerk/test/unit/head_channels.js */
load("../../../../../netwerk/test/unit/head_channels.js");

var httpServer = null;

let handlerCallbacks = {};

function listenHandler(metadata) {
  info(metadata.path);
  handlerCallbacks[metadata.path] = (handlerCallbacks[metadata.path] || 0) + 1;
}

function handlerCount(path) {
  return handlerCallbacks[path] || 0;
}

ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");

// Bug 1805371: Tests that require FaultyServer can't currently be built
// with system NSS.
add_setup(
  {
    skip_if: () => AppConstants.MOZ_SYSTEM_NSS,
  },
  async () => {
    do_get_profile();
    Services.fog.initializeFOG();

    httpServer = new HttpServer();
    httpServer.registerPrefixHandler("/callback/", listenHandler);
    httpServer.start(-1);

    registerCleanupFunction(async () => {
      await httpServer.stop();
    });

    Services.env.set(
      "FAULTY_SERVER_CALLBACK_PORT",
      httpServer.identity.primaryPort
    );
    await asyncStartTLSTestServer("FaultyServer", "test_faulty_server");
  }
);

function makeChan(url) {
  let chan = NetUtil.newChannel({
    uri: url,
    loadUsingSystemPrincipal: true,
  }).QueryInterface(Ci.nsIHttpChannel);

  chan.loadFlags = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;
  return chan;
}

function channelOpenPromise(chan, flags) {
  return new Promise(resolve => {
    chan.asyncOpen(
      new ChannelListener((req, buffer) => resolve([req, buffer]), null, flags)
    );
  });
}

add_task(
  {
    skip_if: () => AppConstants.MOZ_SYSTEM_NSS,
  },
  async function testMlkem768x25519NoX25519Fallback() {
    const retryDomain = "mlkem768x25519-net-interrupt.example.com";

    Services.prefs.setBoolPref("security.tls.enable_kyber", true);
    Services.prefs.setCharPref("network.dns.localDomains", [retryDomain]);
    Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

    // Get the number of mlkem768x25519 and x25519 callbacks prior to making the request
    // ssl_grp_kem_mlkem768x25519 = 4588
    // ssl_grp_ec_curve25519 = 29
    let countOfMlkem = handlerCount("/callback/4588");
    let countOfX25519 = handlerCount("/callback/29");

    let chan = makeChan(`https://${retryDomain}:8443`);
    let [req] = await channelOpenPromise(chan, CL_EXPECT_FAILURE);
    // PR_END_OF_FILE_ERROR maps to NS_ERROR_NET_RESET, so the transaction retries.
    equal(req.status, Cr.NS_ERROR_NET_RESET);
    // At least one mlkem attempt was made (may be more due to retries).
    Assert.greater(
      handlerCount("/callback/4588"),
      countOfMlkem,
      "negotiated mlkem768x25519"
    );
    // x25519 was never negotiated across the original attempt or any retry.
    equal(
      handlerCount("/callback/29"),
      countOfX25519,
      "did not negotiate x25519"
    );
  }
);

add_task(
  {
    skip_if: () => AppConstants.MOZ_SYSTEM_NSS,
  },
  async function testNoRetryMlkem768x25519HandshakeFailed() {
    const retryDomain = "mlkem768x25519-alert-after-server-hello.example.com";

    Services.prefs.setBoolPref("security.tls.enable_kyber", true);
    Services.prefs.setCharPref("network.dns.localDomains", [retryDomain]);
    Services.prefs.setIntPref("network.http.speculative-parallel-limit", 0);

    // Get the number of mlkem768x25519 and x25519 callbacks prior to making
    // the request
    // ssl_grp_kem_mlkem768x25519 = 4588
    // ssl_grp_ec_curve25519 = 29
    let countOfMlkem = handlerCount("/callback/4588");
    let countOfX25519 = handlerCount("/callback/29");
    let chan = makeChan(`https://${retryDomain}:8443`);
    let [req] = await channelOpenPromise(chan, CL_EXPECT_FAILURE);
    equal(req.status, 0x805a2f4d); // psm::GetXPCOMFromNSSError(SSL_ERROR_HANDSHAKE_FAILED)
    // The server will make a mlkem768x25519 callback for the initial request and
    // the client should not retry.
    equal(
      handlerCount("/callback/4588"),
      countOfMlkem + 1,
      "negotiated mlkem768x25519"
    );
    equal(
      handlerCount("/callback/29"),
      countOfX25519,
      "did not negotiate x25519"
    );
  }
);

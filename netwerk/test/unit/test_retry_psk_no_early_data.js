/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests that when a server sends a fatal decrypt_error alert on a TLS PSK
// resumption attempt where no early data was offered (server did not advertise
// max_early_data_size), Firefox automatically retries with a full handshake.
//
// FaultyServer fires at epoch 2 read (server reading the client's Finished)
// when it detects a stateless PSK resumption without early data
// (ss->statelessResume).  The server's write epoch has already advanced past
// epoch 2 by this point, so the alert arrives as
// SSL_ERROR_RX_UNEXPECTED_RECORD_TYPE on the client rather than
// SSL_ERROR_DECRYPT_ERROR_ALERT.
//
// This exercises the Do0RTT(false) path added in Bug 2033073: Firefox sets
// mResumptionAttempted = true when resumptionTokenPresent is true but no early
// data was sent, and ShouldRestartOnResumptionError() then allows the retry.
//
// Companion to test_retry_decrypt_error.js (0-RTT / early-data path).

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const kHost = "psk-no-early-data-on-resume.example.com";

var httpServer = null;
let resumeCallbackCount = 0;

add_setup(
  {
    skip_if: () => AppConstants.MOZ_SYSTEM_NSS,
  },
  async () => {
    httpServer = new HttpServer();
    // FaultyServer calls back on /callback/2 (epoch 2) for this host.
    httpServer.registerPathHandler("/callback/2", () => {
      resumeCallbackCount++;
    });
    httpServer.start(-1);
    registerCleanupFunction(async () => {
      await httpServer.stop();
    });
    // Pass false so FaultyServer does NOT set MOZ_TLS_SERVER_0RTT — the
    // session ticket issued on the first connection will have
    // max_early_data_size = 0, ensuring Firefox never sends early data.
    await asyncSetupFaultyServer(httpServer, { use0RTT: false });
    Services.prefs.setCharPref("network.dns.localDomains", kHost);
    registerCleanupFunction(() => {
      Services.prefs.clearUserPref("network.dns.localDomains");
    });
  }
);

add_task(
  {
    skip_if: () => AppConstants.MOZ_SYSTEM_NSS,
  },
  async function test_retry_on_psk_no_early_data() {
    // First connection: no cached session ticket → full TLS 1.3 handshake.
    // The server issues a NewSessionTicket WITHOUT max_early_data_size, so
    // Firefox will offer the PSK on resumption but will NOT send early data.
    // FaultyServer does NOT fire here (no PSK, no statelessResume).
    {
      let beforeCallbacks = resumeCallbackCount;
      let chan = makeChan(`https://${kHost}:8443/`);
      let [, buf] = await channelOpenPromise(chan, CL_ALLOW_UNKNOWN_CL);
      ok(buf, "first connection succeeded");
      equal(
        resumeCallbackCount,
        beforeCallbacks,
        "FaultyServer did not fire on fresh handshake"
      );
    }

    // Second connection: Firefox finds the cached session ticket and includes
    // it as a PSK in the ClientHello — but sends NO early data because the
    // ticket has no max_early_data_size.  FaultyServer detects the stateless
    // PSK resumption at epoch 2 read and sends a fatal alert.  Firefox must
    // set mResumptionAttempted = true via Do0RTT(false), recognise the error
    // via ShouldRestartOnResumptionError(), evict the stale token, and retry
    // with a fresh handshake that succeeds.
    {
      let beforeCallbacks = resumeCallbackCount;
      let chan = makeChan(`https://${kHost}:8443/`);
      let [, buf] = await channelOpenPromise(chan, CL_ALLOW_UNKNOWN_CL);
      ok(buf, "second connection succeeded after PSK rejection retry");
      equal(
        resumeCallbackCount,
        beforeCallbacks + 1,
        "FaultyServer fired exactly once (on the PSK resumption attempt)"
      );
    }
  }
);

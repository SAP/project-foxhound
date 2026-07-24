// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
"use strict";

do_get_profile();

function run_test() {
  Services.prefs.setIntPref("security.OCSP.enabled", 1);
  add_tls_server_setup("BadCertAndPinningServer", "bad_certs");

  let fakeOCSPResponder = new HttpServer();
  fakeOCSPResponder.registerPrefixHandler("/", function (request, response) {
    response.setStatusLine(request.httpVersion, 500, "Internal Server Error");
  });
  fakeOCSPResponder.start(8888);

  // Test successful connection (both handshakeCertificates and
  // succeededCertChain should be set as expected).
  add_connection_test(
    "good.include-subdomains.pinning.example.com",
    PRErrorCodeSuccess,
    null,
    function withSecurityInfo(aSecInfo) {
      ok(
        areCertArraysEqual(
          aSecInfo.handshakeCertificates,
          build_cert_chain(["default-ee", "test-ca"])
        ),
        "handshakeCertificates for a successful connection should be as expected"
      );
      ok(
        areCertArraysEqual(
          aSecInfo.succeededCertChain,
          build_cert_chain(["default-ee", "test-ca"])
        ),
        "succeededCertChain for a successful connection should be as expected"
      );
    }
  );

  // Test failed connection (handshakeCertificates should be set as expected,
  // succeededCertChain should be null)
  add_connection_test(
    "expired.example.com",
    SEC_ERROR_EXPIRED_CERTIFICATE,
    null,
    function withSecurityInfo(aSecInfo) {
      equal(
        aSecInfo.succeededCertChain.length,
        0,
        "succeededCertChain for a failed connection should be null"
      );
      ok(
        areCertArraysEqual(
          aSecInfo.handshakeCertificates,
          build_cert_chain(["expired-ee", "test-ca"])
        ),
        "handshakeCertificates for a failed connection should be as expected"
      );
    }
  );

  // Test non-overrideable error (handshakeCertificates should be non-null).
  add_connection_test(
    "inadequatekeyusage.example.com",
    SEC_ERROR_INADEQUATE_KEY_USAGE,
    null,
    function withSecurityInfo(securityInfo) {
      ok(
        areCertArraysEqual(
          securityInfo.handshakeCertificates,
          build_cert_chain(["inadequatekeyusage-ee", "test-ca"])
        ),
        "handshakeCertificates for a non-overridable error should be as expected"
      );
    }
  );

  // Ensure the correct handshakeCertificates is set on cert error override.
  // First, add a certificate error override.
  add_cert_override_test("expired.example.com", SEC_ERROR_EXPIRED_CERTIFICATE);
  // Then, connect again and validate handshakeCertificates.
  add_connection_test(
    "expired.example.com",
    PRErrorCodeSuccess,
    null,
    function withSecurityInfo(aSecInfo) {
      equal(
        aSecInfo.succeededCertChain.length,
        0,
        "succeededCertChain for a connection with a certificate error override should be null"
      );
      ok(
        areCertArraysEqual(
          aSecInfo.handshakeCertificates,
          build_cert_chain(["expired-ee", "test-ca"])
        ),
        "handshakeCertificates for a connection with a certificate error override should be as expected"
      );
    }
  );

  run_next_test();
}

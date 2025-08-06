// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

do_get_profile(); // must be called before getting nsIX509CertDB

function add_tests_in_mode(mode) {
  add_test(function set_mode() {
    info(`setting CT to mode ${mode}`);
    Services.prefs.setIntPref(
      "security.pki.certificate_transparency.mode",
      mode
    );
    run_next_test();
  });

  add_ct_test(
    "ct-via-ocsp.example.com",
    Ci.nsITransportSecurityInfo.CERTIFICATE_TRANSPARENCY_POLICY_COMPLIANT,
    true
  );

  add_ct_test(
    "ct-via-tls.example.com",
    Ci.nsITransportSecurityInfo.CERTIFICATE_TRANSPARENCY_POLICY_COMPLIANT,
    true
  );

  // One of the presented SCTs has a signature that has been tampered with, so
  // overall there are not enough SCTs to be compliant with the policy.
  add_ct_test(
    "ct-tampered.example.com",
    Ci.nsITransportSecurityInfo.CERTIFICATE_TRANSPARENCY_POLICY_NOT_ENOUGH_SCTS,
    mode == CT_MODE_COLLECT_TELEMETRY
  );
}

function run_test() {
  // Make the test root appear to be a built-in root, so that certificate
  // transparency is checked.
  let rootCert = constructCertFromFile("test_ct/test-ca.pem");
  Services.prefs.setCharPref(
    "security.test.built_in_root_hash",
    rootCert.sha256Fingerprint
  );

  add_tls_server_setup("OCSPStaplingServer", "test_ct");
  add_tests_in_mode(CT_MODE_COLLECT_TELEMETRY);
  add_tests_in_mode(CT_MODE_ENFORCE);
  run_next_test();
}

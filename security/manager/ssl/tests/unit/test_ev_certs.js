// -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

"use strict";

// Tests that end-entity certificates that should successfully verify as EV
// (Extended Validation) do so and that end-entity certificates that should not
// successfully verify as EV do not.
//
// A quick note about the certificates in these tests: generally, an EV
// certificate chain will have an end-entity with a specific policy OID followed
// by an intermediate with the anyPolicy OID chaining to a root with no policy
// OID (since it's a trust anchor, it can be omitted). In these tests, the
// specific policy OID is 1.3.6.1.4.1.13769.666.666.666.1.500.9.1 and is
// referred to as the test OID. In order to reflect what will commonly be
// encountered, the end-entity of any given test path will have the test OID
// unless otherwise specified in the name of the test path. Similarly, the
// intermediate will have the anyPolicy OID, again unless otherwise specified.
// For example, for the path where the end-entity does not have an OCSP URI
// (referred to as "no-ocsp-ee-path-{ee,int}", the end-entity has the test OID
// whereas the intermediate has the anyPolicy OID.
// For another example, for the test OID path ("test-oid-path-{ee,int}"), both
// the end-entity and the intermediate have the test OID.

do_get_profile(); // must be called before getting nsIX509CertDB
const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.dns.localDomains");
  Services.prefs.clearUserPref("security.OCSP.enabled");
});

Services.prefs.setCharPref("network.dns.localDomains", "www.example.com");
Services.prefs.setIntPref("security.OCSP.enabled", 1);
const evroot = addCertFromFile(certdb, "test_ev_certs/evroot.pem", "CTu,,");
addCertFromFile(certdb, "test_ev_certs/non-evroot-ca.pem", "CTu,,");

const SERVER_PORT = 8888;

function failingOCSPResponder() {
  return getFailingHttpServer(SERVER_PORT, ["www.example.com"]);
}

class EVCertVerificationResult {
  constructor(
    testcase,
    expectedPRErrorCode,
    expectedEV,
    resolve,
    ocspResponder
  ) {
    this.testcase = testcase;
    this.expectedPRErrorCode = expectedPRErrorCode;
    this.expectedEV = expectedEV;
    this.resolve = resolve;
    this.ocspResponder = ocspResponder;
  }

  verifyCertFinished(prErrorCode, verifiedChain, hasEVPolicy) {
    equal(
      prErrorCode,
      this.expectedPRErrorCode,
      `${this.testcase} should have expected error code`
    );
    equal(
      hasEVPolicy,
      this.expectedEV,
      `${this.testcase} should result in expected EV status`
    );
    this.ocspResponder.stop(this.resolve);
  }
}

function asyncTestEV(
  cert,
  expectedPRErrorCode,
  expectedEV,
  expectedOCSPRequestPaths,
  ocspResponseTypes = undefined
) {
  let now = Date.now() / 1000;
  return new Promise(resolve => {
    let ocspResponder = expectedOCSPRequestPaths.length
      ? startOCSPResponder(
          SERVER_PORT,
          "www.example.com",
          "test_ev_certs",
          expectedOCSPRequestPaths,
          expectedOCSPRequestPaths.slice(),
          null,
          ocspResponseTypes
        )
      : failingOCSPResponder();
    let result = new EVCertVerificationResult(
      cert.subjectName,
      expectedPRErrorCode,
      expectedEV,
      resolve,
      ocspResponder
    );
    certdb.asyncVerifyCertAtTime(
      cert,
      Ci.nsIX509CertDB.verifyUsageTLSServer,
      0,
      "ev-test.example.com",
      now,
      [],
      result
    );
  });
}

function ensureVerifiesAsEVWithOneOCSPRequest(testcase) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  let expectedOCSPRequestPaths = [`${testcase}-ee`];
  return asyncTestEV(
    cert,
    PRErrorCodeSuccess,
    gEVExpected,
    expectedOCSPRequestPaths
  );
}

function ensureVerifiesAsEVWithNoOCSPRequests(testcase) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  return asyncTestEV(cert, PRErrorCodeSuccess, gEVExpected, []);
}

function ensureVerifiesAsDV(testcase, expectedOCSPRequestPaths = undefined) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  return asyncTestEV(
    cert,
    PRErrorCodeSuccess,
    false,
    expectedOCSPRequestPaths ? expectedOCSPRequestPaths : [`${testcase}-ee`]
  );
}

function ensureVerificationFails(testcase, expectedPRErrorCode) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  return asyncTestEV(cert, expectedPRErrorCode, false, []);
}

function ensureVerifiesAsEVWithFLAG_LOCAL_ONLY(testcase) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  let now = Date.now() / 1000;
  let expectedErrorCode = SEC_ERROR_POLICY_VALIDATION_FAILED;
  if (gEVExpected) {
    expectedErrorCode = PRErrorCodeSuccess;
  }
  return new Promise(resolve => {
    let ocspResponder = failingOCSPResponder();
    let result = new EVCertVerificationResult(
      cert.subjectName,
      expectedErrorCode,
      gEVExpected,
      resolve,
      ocspResponder
    );
    let flags =
      Ci.nsIX509CertDB.FLAG_LOCAL_ONLY | Ci.nsIX509CertDB.FLAG_MUST_BE_EV;
    certdb.asyncVerifyCertAtTime(
      cert,
      Ci.nsIX509CertDB.verifyUsageTLSServer,
      flags,
      "ev-test.example.com",
      now,
      [],
      result
    );
  });
}

function verifyWithOCSPResponseType(testcase, response, expectEV) {
  let cert = constructCertFromFile(`test_ev_certs/${testcase}-ee.pem`);
  addCertFromFile(certdb, `test_ev_certs/${testcase}-int.pem`, ",,");
  let expectedOCSPRequestPaths = [`${testcase}-ee`];
  let ocspResponseTypes = [response];
  return asyncTestEV(
    cert,
    PRErrorCodeSuccess,
    gEVExpected && expectEV,
    expectedOCSPRequestPaths,
    ocspResponseTypes
  );
}

function ensureVerifiesAsEVWithOldEndEntityOCSPResponse(testcase) {
  return verifyWithOCSPResponseType(testcase, "longvalidityalmostold", true);
}

function ensureVerifiesAsEVWithVeryOldEndEntityOCSPResponse(testcase) {
  return verifyWithOCSPResponseType(testcase, "ancientstillvalid", true);
}

// These should all verify as EV.
add_task(async function plainExpectSuccessEVTests() {
  await ensureVerifiesAsEVWithOneOCSPRequest("anyPolicy-int-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("test-oid-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("cabforum-oid-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("cabforum-and-test-oid-ee-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("test-and-cabforum-oid-ee-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("reverse-order-oids-path");
  await ensureVerifiesAsEVWithNoOCSPRequests("no-ocsp-ee-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("no-ocsp-int-path");
  // In this case, the end-entity has both the CA/B Forum OID and the test OID
  // (in that order). The intermediate has the CA/B Forum OID. Since the
  // implementation tries all EV policies it encounters, this successfully
  // verifies as EV.
  await ensureVerifiesAsEVWithOneOCSPRequest(
    "cabforum-and-test-oid-ee-cabforum-oid-int-path"
  );
  // In this case, the end-entity has both the test OID and the CA/B Forum OID
  // (in that order). The intermediate has only the CA/B Forum OID. Since the
  // implementation tries all EV policies it encounters, this successfully
  // verifies as EV.
  await ensureVerifiesAsEVWithOneOCSPRequest(
    "test-and-cabforum-oid-ee-cabforum-oid-int-path"
  );
});

// These fail for various reasons to verify as EV, but fallback to DV should
// succeed.
add_task(async function expectDVFallbackTests() {
  await ensureVerifiesAsDV("anyPolicy-ee-path");
  await ensureVerifiesAsDV("non-ev-root-path");
  // In this case, the end-entity has the test OID and the intermediate has the
  // CA/B Forum OID. Since the CA/B Forum OID is not treated the same as the
  // anyPolicy OID, this will not verify as EV.
  await ensureVerifiesAsDV("test-oid-ee-cabforum-oid-int-path");
});

// Test that removing the trust bits from an EV root causes verifications
// relying on that root to fail (and then test that adding back the trust bits
// causes the verifications to succeed again).
add_task(async function evRootTrustTests() {
  clearOCSPCache();
  info("untrusting evroot");
  certdb.setCertTrust(
    evroot,
    Ci.nsIX509Cert.CA_CERT,
    Ci.nsIX509CertDB.UNTRUSTED
  );
  await ensureVerificationFails("test-oid-path", SEC_ERROR_UNKNOWN_ISSUER);
  info("re-trusting evroot");
  certdb.setCertTrust(
    evroot,
    Ci.nsIX509Cert.CA_CERT,
    Ci.nsIX509CertDB.TRUSTED_SSL
  );
  await ensureVerifiesAsEVWithOneOCSPRequest("test-oid-path");
});

// Test that if FLAG_LOCAL_ONLY and FLAG_MUST_BE_EV are specified, that no OCSP
// requests are made.
add_task(async function expectEVWithFlagLocalOnly() {
  clearOCSPCache();
  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("anyPolicy-int-path");
  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("no-ocsp-ee-path");
  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("no-ocsp-int-path");
  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("test-oid-path");
});

// Prime the OCSP cache and then ensure that we can validate certificates as EV
// without hitting the network. There's two cases here: one where we simply
// validate like normal and then check that the network was never accessed and
// another where we use flags to mandate that the network not be used.
add_task(async function ocspCachingTests() {
  clearOCSPCache();

  await ensureVerifiesAsEVWithOneOCSPRequest("anyPolicy-int-path");
  await ensureVerifiesAsEVWithOneOCSPRequest("test-oid-path");

  await ensureVerifiesAsEVWithNoOCSPRequests("anyPolicy-int-path");
  await ensureVerifiesAsEVWithNoOCSPRequests("test-oid-path");

  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("anyPolicy-int-path");
  await ensureVerifiesAsEVWithFLAG_LOCAL_ONLY("test-oid-path");
});

// It was once the case that old-but-still-valid OCSP responses were accepted
// for intermediates but not end-entity certificates (because of OCSP soft-fail
// this would result in DV fallback). Now that OCSP is not required for EV
// status these certificates should all verify as EV.
add_task(async function oldOCSPResponseTests() {
  clearOCSPCache();

  clearOCSPCache();
  await ensureVerifiesAsEVWithOldEndEntityOCSPResponse("anyPolicy-int-path");
  await ensureVerifiesAsEVWithOldEndEntityOCSPResponse("test-oid-path");

  clearOCSPCache();
  await ensureVerifiesAsEVWithVeryOldEndEntityOCSPResponse(
    "anyPolicy-int-path"
  );
  await ensureVerifiesAsEVWithVeryOldEndEntityOCSPResponse("test-oid-path");
});

add_task(
  { skip_if: () => !AppConstants.DEBUG },
  async function expectEVUsingBuiltInRoot() {
    // security.test.built_in_root_hash only works in debug builds.
    Services.prefs.setCharPref(
      "security.test.built_in_root_hash",
      evroot.sha256Fingerprint
    );
    // When CRLite is enforced and OCSP is not required, a certificate that
    // chains to a built-in root can get EV status without an OCSP check.
    Services.prefs.setIntPref("security.pki.crlite_mode", 2);
    Services.prefs.setBoolPref("security.OCSP.require", false);

    clearOCSPCache();
    await ensureVerifiesAsEVWithNoOCSPRequests("anyPolicy-int-path");
    await ensureVerifiesAsEVWithNoOCSPRequests("test-oid-path");

    // When CRLite is disabled and OCSP is not required, we will perform an
    // OCSP request while checking these same certificates.
    Services.prefs.setIntPref("security.pki.crlite_mode", 0);
    Services.prefs.setBoolPref("security.OCSP.require", false);

    clearOCSPCache();
    await ensureVerifiesAsEVWithOneOCSPRequest("anyPolicy-int-path");
    await ensureVerifiesAsEVWithOneOCSPRequest("test-oid-path");

    // Likewise if CRLite is enforced and OCSP is required.
    Services.prefs.setIntPref("security.pki.crlite_mode", 2);
    Services.prefs.setBoolPref("security.OCSP.require", true);

    clearOCSPCache();
    await ensureVerifiesAsEVWithOneOCSPRequest("anyPolicy-int-path");
    await ensureVerifiesAsEVWithOneOCSPRequest("test-oid-path");

    Services.prefs.clearUserPref("security.test.built_in_root_hash");
    Services.prefs.clearUserPref("security.pki.crlite_mode");
    Services.prefs.clearUserPref("security.OCSP.require");
  }
);

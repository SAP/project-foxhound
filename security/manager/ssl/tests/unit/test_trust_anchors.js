// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests that use a mock builtins module.

// Ensure that the appropriate initialization has happened.
do_get_profile();
const gCertDb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

add_setup(async function load_nssckbi_testlib() {
  let moduleName = "Mock Builtins";
  let libraryName = "test_trust_anchors";

  await checkPKCS11ModuleNotPresent(moduleName, libraryName);

  let libraryFile = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  libraryFile.append("test_trust_anchors");
  libraryFile.append(ctypes.libraryName(libraryName));
  await loadPKCS11Module(libraryFile, moduleName, false);
  let testModule = await checkPKCS11ModuleExists(moduleName, libraryName);

  // Check that listing the slots for the test module works.
  let testModuleSlotNames = Array.from(
    testModule.listSlots(),
    slot => slot.name
  );
  testModuleSlotNames.sort();
  const expectedSlotNames = ["NSS Builtin Objects"];
  deepEqual(
    testModuleSlotNames,
    expectedSlotNames,
    "Actual and expected slot names should be equal"
  );
});

let gEEPreDistrustCert;

add_task(async function test_distrust_after() {
  gEEPreDistrustCert = addCertFromFile(
    gCertDb,
    "test_trust_anchors/ee-notBefore-2021.pem",
    ",,"
  );
  notEqual(gEEPreDistrustCert, null, "EE cert should have successfully loaded");

  let ee_post_distrust_cert = addCertFromFile(
    gCertDb,
    "test_trust_anchors/ee-notBefore-2023.pem",
    ",,"
  );
  notEqual(
    ee_post_distrust_cert,
    null,
    "EE cert should have successfully loaded"
  );

  let int_cert = addCertFromFile(gCertDb, "test_trust_anchors/int.pem", ",,");
  notEqual(int_cert, null, "Intermediate cert should have successfully loaded");
  let int_cert_by_ca2 = addCertFromFile(
    gCertDb,
    "test_trust_anchors/int-by-ca2.pem",
    ",,"
  );
  notEqual(
    int_cert_by_ca2,
    null,
    "Intermediate cert issued by ca2 should have successfully loaded"
  );

  // A certificate with a notBefore before the distrustAfter date
  // should verify.
  await checkCertErrorGeneric(
    gCertDb,
    gEEPreDistrustCert,
    PRErrorCodeSuccess,
    Ci.nsIX509CertDB.verifyUsageTLSServer
  );

  // A certificate with a notBefore after the distrustAfter date
  // should not verify.
  await checkCertErrorGeneric(
    gCertDb,
    ee_post_distrust_cert,
    MOZILLA_PKIX_ERROR_ISSUER_NO_LONGER_TRUSTED,
    Ci.nsIX509CertDB.verifyUsageTLSServer
  );
});

add_task(
  { skip_if: () => !AppConstants.DEBUG },
  async function test_ct_notes_distrust_after() {
    Services.prefs.setIntPref(
      "security.pki.certificate_transparency.mode",
      CT_MODE_ENFORCE
    );
    // This certificate, which has a notBefore before the distrustAfter date, has
    // an embedded SCT with a timestamp after the distrustAfter date, so this
    // should result in a CT error.
    await checkCertErrorGeneric(
      gCertDb,
      gEEPreDistrustCert,
      MOZILLA_PKIX_ERROR_INSUFFICIENT_CERTIFICATE_TRANSPARENCY,
      Ci.nsIX509CertDB.verifyUsageTLSServer
    );
  }
);

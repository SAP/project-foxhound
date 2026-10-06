// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
"use strict";

// Checks that RSA certs with key sizes below 1024 bits are rejected.
// Checks that ECC certs using curves other than the NIST P-256, P-384 or P-521
// curves are rejected.

do_get_profile(); // must be called before getting nsIX509CertDB
const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

/**
 * Tests a cert chain.
 *
 * @param {string} rootKeyType
 *        The key type of the root certificate, or the name of an elliptic
 *        curve, as output by the 'openssl ecparam -list_curves' command.
 * @param {number} rootKeySize
 * @param {string} intKeyType
 * @param {number} intKeySize
 * @param {string} eeKeyType
 * @param {number} eeKeySize
 * @param {PRErrorCode} eeExpectedError
 * @param {bool} makeRootBuiltIn
          Whether or not to make the root a built-in. Defaults to false.
 * @returns {Promise} a promise that will resolve when the verification has
 *                   completed
 */
async function checkChain(
  rootKeyType,
  rootKeySize,
  intKeyType,
  intKeySize,
  eeKeyType,
  eeKeySize,
  eeExpectedError,
  makeRootBuiltIn = false
) {
  let rootName = "root_" + rootKeyType + "_" + rootKeySize;
  let intName = "int_" + intKeyType + "_" + intKeySize;
  let eeName = "ee_" + eeKeyType + "_" + eeKeySize;

  let intFullName = intName + "-" + rootName;
  let eeFullName = eeName + "-" + intName + "-" + rootName;

  addCertFromFile(certdb, `test_keysize/${rootName}.pem`, "CTu,CTu,CTu");
  addCertFromFile(certdb, `test_keysize/${intFullName}.pem`, ",,");
  let eeCert = constructCertFromFile(`test_keysize/${eeFullName}.pem`);

  if (makeRootBuiltIn) {
    let root = constructCertFromFile(`test_keysize/${rootName}.pem`);
    Services.prefs.setCharPref(
      "security.test.built_in_root_hash",
      root.sha256Fingerprint
    );
  }

  info("end-entity: " + eeCert.commonName);
  info("issuer: " + eeCert.issuerCommonName);
  let result = await checkCertErrorGeneric(
    certdb,
    eeCert,
    eeExpectedError,
    Ci.nsIX509CertDB.verifyUsageTLSServer
  );

  if (makeRootBuiltIn) {
    Services.prefs.clearUserPref("security.test.built_in_root_hash");
  }

  return result;
}

/**
 * Tests various RSA chains.
 *
 * @param {number} inadequateKeySize
 * @param {number} adequateKeySize
 * @param {bool} makeRootBuiltIn
 */
async function checkRSAChains(
  inadequateKeySize,
  adequateKeySize,
  makeRootBuiltIn
) {
  // Chain with certs that have adequate sizes for DV
  await checkChain(
    "rsa",
    adequateKeySize,
    "rsa",
    adequateKeySize,
    "rsa",
    adequateKeySize,
    PRErrorCodeSuccess,
    makeRootBuiltIn
  );

  // Chain with a root cert that has an inadequate size for DV
  await checkChain(
    "rsa",
    inadequateKeySize,
    "rsa",
    adequateKeySize,
    "rsa",
    adequateKeySize,
    MOZILLA_PKIX_ERROR_INADEQUATE_KEY_SIZE,
    makeRootBuiltIn
  );

  // Chain with an intermediate cert that has an inadequate size for DV
  await checkChain(
    "rsa",
    adequateKeySize,
    "rsa",
    inadequateKeySize,
    "rsa",
    adequateKeySize,
    MOZILLA_PKIX_ERROR_INADEQUATE_KEY_SIZE,
    makeRootBuiltIn
  );

  // Chain with an end entity cert that has an inadequate size for DV
  await checkChain(
    "rsa",
    adequateKeySize,
    "rsa",
    adequateKeySize,
    "rsa",
    inadequateKeySize,
    MOZILLA_PKIX_ERROR_INADEQUATE_KEY_SIZE,
    makeRootBuiltIn
  );
}

async function checkECCChains() {
  await checkChain(
    "secp256r1",
    256,
    "secp384r1",
    384,
    "secp521r1",
    521,
    PRErrorCodeSuccess
  );
  await checkChain(
    "secp256r1",
    256,
    "secp224r1",
    224,
    "secp256r1",
    256,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
  await checkChain(
    "secp256r1",
    256,
    "secp256r1",
    256,
    "secp224r1",
    224,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
  await checkChain(
    "secp224r1",
    224,
    "secp256r1",
    256,
    "secp256r1",
    256,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
  await checkChain(
    "secp256r1",
    256,
    "secp256r1",
    256,
    "secp256k1",
    256,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
  await checkChain(
    "secp256k1",
    256,
    "secp256r1",
    256,
    "secp256r1",
    256,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
}

async function checkCombinationChains() {
  await checkChain(
    "rsa",
    2048,
    "secp256r1",
    256,
    "secp384r1",
    384,
    PRErrorCodeSuccess
  );
  await checkChain(
    "rsa",
    2048,
    "secp256r1",
    256,
    "secp224r1",
    224,
    SEC_ERROR_UNSUPPORTED_ELLIPTIC_CURVE
  );
  await checkChain(
    "secp256r1",
    256,
    "rsa",
    1016,
    "secp256r1",
    256,
    MOZILLA_PKIX_ERROR_INADEQUATE_KEY_SIZE
  );
}

add_task(async function () {
  // When the root is not a built-in, 1024 bits is accepted.
  await checkRSAChains(1016, 1024, false);
  // When the root is a built-in, 2048 bits is the minimum.
  // Unfortunately, this can currently only be tested in debug builds.
  if (gIsDebugBuild) {
    await checkRSAChains(1024, 2048, true);
  }
  await checkECCChains();
  await checkCombinationChains();
});

/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

do_get_profile(); // must be called before getting nsIX509CertDB
const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

const nssErrors = Cc["@mozilla.org/nss_errors_service;1"].getService(
  Ci.nsINSSErrorsService
);

// If resolved, asyncVerifyPKCS7Object(pkcs7, data, signatureType) will return an array consisting
// of 3 elements for each SignerInfo of the PKCS7 message:
// - signatureResult - which describes the result of verifying the hash of data against the signature
// stored in pkcs7
// - certificateResult - which describes the result of certificate verification
// If the signature verification has failed, certificate verification is not run.
// - signerCertificate - which returns the signerCertificate from the pkcs7 message
// signerCertificate is null if the signature verification has failed (not equal to NS_OK).

// Empty PKCS7 message should return resolved promise with NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
add_task(async function () {
  info("Running PDF verification service test with empty input");
  let pkcs7 = new Uint8Array();
  let data = [new Uint8Array(0x10)];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);

  equal(result.length, 1);
  let firstSignatureResult = result[0];
  equal(
    firstSignatureResult.signatureResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// Empty data message should return resolved promise with NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
add_task(async function () {
  info("Running PDF verification service test with empty input");
  let pkcs7 = new Uint8Array(0x10);
  let data = [new Uint8Array()];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);

  equal(result.length, 1);
  let firstSignatureResult = result[0];
  equal(
    firstSignatureResult.signatureResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// ADBE_PKCS7_SHA1 is not supported
add_task(async function () {
  info("Running PDF verification service test with unsupported signature type");
  let pkcs7 = new Uint8Array(0x10);
  let data = [new Uint8Array(0x10)];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_SHA1;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);

  equal(result.length, 1);
  let firstSignatureResult = result[0];
  equal(
    firstSignatureResult.signatureResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(firstSignatureResult.signerCertificate, null);
});

function pkcs7FromFile(certName) {
  let certFile = do_get_file(`test_pdf_verification/${certName}.p7s`, false);
  let certBytes = readFile(certFile);
  let certBytesClean = certBytes
    .replace("-----BEGIN PKCS7-----", "")
    .replace("-----END PKCS7-----", "")
    .replace(/\n/g, "");
  const binary = atob(certBytesClean);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function readBinFromFile(dataName) {
  let dataFile = do_get_file(`test_pdf_verification/${dataName}.bin`, false);

  let fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(
    Ci.nsIFileInputStream
  );
  fstream.init(dataFile, -1, 0, 0);
  let available = fstream.available();
  let data = available > 0 ? NetUtil.readInputStream(fstream, available) : "";
  fstream.close();

  return new Uint8Array(data);
}

// PKCS7 CMS message with the correct signature should return resolve promise
// with signatureResult to be equal to NS_OK
// and the signerCertificate being not null.
add_task(async function () {
  info("Running PDF verification service test with a correct signature");
  let pkcs7 = pkcs7FromFile("cert_correct");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  let firstSignatureResult = result[0];

  equal(result.length, 1);
  equal(firstSignatureResult.signatureResult, Cr.NS_OK);

  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );
  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
});

// PKCS7 CMS message with the correct signature should return resolve promise
// with signatureResult to be equal to NS_OK
// and the signerCertificate being not null.
add_task(async function () {
  info("Running PDF verification service test with a correct signature");
  let pkcs7 = pkcs7FromFile("certificate_two_data_inputs");
  // each dataPortion here is an Uint8Array
  let dataPortion = readBinFromFile("data_correct");
  let data = [dataPortion, dataPortion];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);

  equal(result.length, 1);
  let firstSignatureResult = result[0];
  equal(firstSignatureResult.signatureResult, Cr.NS_OK);

  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );

  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
});

// PKCS7 CMS message contains one SignerInfo with an incorrect signature.
add_task(async function () {
  info("Running PDF verification service test with a incorrect signature");
  let pkcs7 = pkcs7FromFile("cert_with_incorrect_signature");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(
    firstSignatureResult.signatureResult,
    getXPCOMStatusFromNSS(SEC_ERROR_PKCS7_BAD_SIGNATURE)
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// MD5 signatures are not supported.
add_task(async function () {
  info("Running PDF verification service test with a md5 signature");
  let pkcs7 = pkcs7FromFile("md5_signer_info");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(
    firstSignatureResult.signatureResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_SIGNED
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// PKCS7 CMS message has 2 SignerInfo, both have correct signature (sha1/sha2)
add_task(async function () {
  info(
    "Running PDF verification service test with the CMS message containing two different SignerInfo, both have correct signatures"
  );
  let pkcs7 = pkcs7FromFile("two_correct_signatures");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  // 2 SignerInfo results into 2 signature results
  equal(result.length, 2);
  let firstSignatureResult = result[0];
  let secondSignatureResult = result[1];

  equal(firstSignatureResult.signatureResult, Cr.NS_OK);
  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );
  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );

  equal(secondSignatureResult.signatureResult, Cr.NS_OK);
  equal(
    secondSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );
  ok(
    secondSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
});

// PKCS7 CMS message has 2 SignerInfo, one SignerInfo has a wrong digest
// We consider that the signature is verified iff all the SignerInfo contain the correct signature.
add_task(async function () {
  info(
    "Running PDF verification service test with the CMS message containing two different SignerInfo, only one has a correct signature"
  );
  let pkcs7 = pkcs7FromFile("one_correct_one_incorrect_hash");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 2);
  let firstSignatureResult = result[0];
  let secondSignatureResult = result[1];

  equal(firstSignatureResult.signatureResult, Cr.NS_OK);
  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );
  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );

  equal(
    secondSignatureResult.signatureResult,
    getXPCOMStatusFromNSS(SEC_ERROR_PKCS7_BAD_SIGNATURE)
  );
  equal(
    secondSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED
  );
  equal(secondSignatureResult.signerCertificate, null);
});

// PKCS7 CMS message has 2 SignerInfo, one SignerInfo has a correct digest, but an incorrect signature
add_task(async function () {
  info(
    "Running PDF verification service test with the CMS message containing two different SignerInfo, only one has a correct signature"
  );
  let pkcs7 = pkcs7FromFile("one_correct_one_incorrect_signature");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  let firstSignatureResult = result[0];
  let secondSignatureResult = result[1];

  equal(firstSignatureResult.signatureResult, Cr.NS_OK);
  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );
  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );

  equal(
    secondSignatureResult.signatureResult,
    getXPCOMStatusFromNSS(SEC_ERROR_PKCS7_BAD_SIGNATURE)
  );
  equal(
    secondSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED
  );
  equal(secondSignatureResult.signerCertificate, null);
});

// PKCS7 CMS message with no SignerInfo
add_task(async function () {
  info("Running PDF verification service test with no SignerInfo");
  let pkcs7 = pkcs7FromFile("no_signer_info");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(
    firstSignatureResult.signatureResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_ERROR_PROCESSING
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// PKCS7 CMS message with no certificates
add_task(async function () {
  info("Running PDF verification service test with an empty certificate list");
  let pkcs7 = pkcs7FromFile("no_certificate");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(firstSignatureResult.signatureResult, Cr.NS_ERROR_CMS_VERIFY_NOCERT);
  equal(
    firstSignatureResult.certificateResult,
    Cr.NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED
  );
  equal(firstSignatureResult.signerCertificate, null);
});

// Test vector used in Poppler to test their implementation
// SignerCertificate subject name is "CN=RSA2048 test key for pdfsig"
add_task(async function () {
  info("Running PDF verification service test with the Poppler TV");
  let pkcs7 = pkcs7FromFile("poppler_signature");
  let data = [readBinFromFile("poppler_data")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(firstSignatureResult.signatureResult, Cr.NS_OK);

  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );

  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
  info(
    "Certificate Subject Name: " +
      firstSignatureResult.signerCertificate.subjectName
  );
  Assert.equal(
    firstSignatureResult.signerCertificate.subjectName,
    "CN=RSA2048 test key for pdfsig"
  );
});

// Checking some of the properties of the returned certificate
// The certificate was generated to have the Issuer "Test" and the subjectName "Test"
add_task(async function () {
  info("Running PDF verification service test with a correct signature");
  let pkcs7 = pkcs7FromFile("cert_correct");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  equal(result.length, 1);
  let firstSignatureResult = result[0];

  equal(firstSignatureResult.signatureResult, Cr.NS_OK);
  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_UNKNOWN_ISSUER)
  );

  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );

  info(
    "Certificate Subject Name: " +
      firstSignatureResult.signerCertificate.subjectName
  );
  Assert.equal(firstSignatureResult.signerCertificate.subjectName, "CN=Test");

  info(
    "Certificate Issuer Name: " +
      firstSignatureResult.signerCertificate.issuerName
  );
  Assert.equal(firstSignatureResult.signerCertificate.issuerName, "CN=Test");
});

add_task(async function () {
  info(
    "Running PDF verification service test with a correct signature and certificate"
  );
  let pkcs7 = pkcs7FromFile("correct_with_ca");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  let firstSignatureResult = result[0];

  equal(result.length, 1);
  equal(firstSignatureResult.signatureResult, Cr.NS_OK);
  equal(firstSignatureResult.certificateResult, Cr.NS_OK);

  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
});

// PKCS7 CMS message with the correct signature should return resolve promise
// with signatureResult to be equal to NS_OK
// and the signerCertificate being not null.
add_task(async function () {
  info(
    "Running PDF verification service test with a correct signature and expired certificate"
  );
  let pkcs7 = pkcs7FromFile("ca_expired");
  let data = [readBinFromFile("data_correct")];
  let signatureType = Ci.nsIX509CertDB.ADBE_PKCS7_DETACHED;

  let result = await certdb.asyncVerifyPKCS7Object(pkcs7, data, signatureType);
  let firstSignatureResult = result[0];

  equal(result.length, 1);
  equal(firstSignatureResult.signatureResult, Cr.NS_OK);

  equal(
    firstSignatureResult.certificateResult,
    nssErrors.getXPCOMFromNSSError(SEC_ERROR_EXPIRED_ISSUER_CERTIFICATE)
  );
  ok(
    firstSignatureResult.signerCertificate,
    "Signer certificate should not be null/undefined"
  );
});

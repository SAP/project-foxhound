/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstddef>
#include <cstdint>

#include "cert.h"
#include "nss_scoped_ptrs.h"
#include "ocsp.h"
#include "prtime.h"
#include "prtypes.h"
#include "seccomon.h"
#include "utilrename.h"

#include "asn1/mutators.h"
#include "base/database.h"

// Fixed time to ensure deterministic behavior across runs.
const PRTime kFixedTime = 1234;

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  static NSSDatabase db = NSSDatabase();

  ScopedCERTCertificate cert(
      CERT_DecodeCertFromPackage((char*)data, (int)size));
  if (!cert) {
    return 0;
  }

  // Basic properties.
  SECItem der;
  (void)CERT_GetCertificateDer(cert.get(), &der);

  PRTime notBefore, notAfter;
  (void)CERT_GetCertTimes(cert.get(), &notBefore, &notAfter);

  CERTCertTrust trust;
  (void)CERT_GetCertTrust(cert.get(), &trust);

  // Verification.
  CERTVerifyLog log;
  log.arena = PORT_NewArena(512);
  log.head = log.tail = NULL;
  log.count = 0;

  SECCertificateUsage usage;
  (void)CERT_VerifyCertificate(CERT_GetDefaultCertDB(), cert.get(), PR_TRUE,
                               certificateUsageCheckAllUsages, kFixedTime,
                               nullptr, &log, &usage);
  (void)CERT_VerifyCertName(cert.get(), "fuzz.host");
  (void)CERT_CheckCertValidTimes(cert.get(), kFixedTime, PR_FALSE);
  (void)CERT_CheckCertUsage(cert.get(), KU_CRL_SIGN);

  // Key and chain.
  ScopedSECKEYPublicKey pubk(CERT_ExtractPublicKey(cert.get()));
  ScopedCERTCertList chain(
      CERT_GetCertChainFromCert(cert.get(), kFixedTime, certUsageEmailSigner));
  ScopedCERTCertificateList certList(CERT_CertListFromCert(cert.get()));

  SECItem spkDigest = {siBuffer, nullptr, 0};
  (void)CERT_GetSubjectPublicKeyDigest(cert->arena, cert.get(), SEC_OID_SHA256,
                                       &spkDigest);

  // Extensions.
  CERTBasicConstraints basicConstraints;
  (void)CERT_FindBasicConstraintExten(cert.get(), &basicConstraints);

  StackSECItem keyUsageItem;
  (void)CERT_FindKeyUsageExtension(cert.get(), &keyUsageItem);

  StackSECItem subjectKeyID;
  (void)CERT_FindSubjectKeyIDExtension(cert.get(), &subjectKeyID);

  StackSECItem nsCertType;
  (void)CERT_FindNSCertTypeExtension(cert.get(), &nsCertType);

  // SEC_OID_NS_CERT_EXT_COMMENT is the only OID used with this function
  // in production code (lib/certdb/polcyxtn.c).
  char* nsString =
      CERT_FindNSStringExtension(cert.get(), SEC_OID_NS_CERT_EXT_COMMENT);
  PORT_Free(nsString);

  (void)CERT_FindAuthKeyIDExten(cert->arena, cert.get());

  CERTNameConstraints* constraints = nullptr;
  (void)CERT_FindNameConstraintsExten(cert->arena, cert.get(), &constraints);

  (void)CERT_FindCRLDistributionPoints(cert.get());

  // Generic extension parsing with OIDs used in production code.
  StackSECItem sanItem;
  (void)CERT_FindCertExtension(cert.get(), SEC_OID_X509_SUBJECT_ALT_NAME,
                               &sanItem);

  StackSECItem policiesItem;
  (void)CERT_FindCertExtension(cert.get(), SEC_OID_X509_CERTIFICATE_POLICIES,
                               &policiesItem);

  StackSECItem ekuItem;
  (void)CERT_FindCertExtension(cert.get(), SEC_OID_X509_EXT_KEY_USAGE,
                               &ekuItem);

  // Names and OCSP.
  const char* emailAddr = CERT_GetFirstEmailAddress(cert.get());
  while (emailAddr) {
    emailAddr = CERT_GetNextEmailAddress(cert.get(), emailAddr);
  }

  CERTCertNicknames* patterns = CERT_GetValidDNSPatternsFromCert(cert.get());
  if (patterns && patterns->arena) {
    PORT_FreeArena(patterns->arena, PR_FALSE);
  }

  char* aiaLoc = CERT_GetOCSPAuthorityInfoAccessLocation(cert.get());
  PORT_Free(aiaLoc);

  // Clean up verify log entries.
  for (CERTVerifyLogNode* node = log.head; node; node = node->next) {
    if (node->cert) {
      CERT_DestroyCertificate(node->cert);
    }
  }

  PORT_FreeArena(log.arena, PR_FALSE);

  return 0;
}

extern "C" size_t LLVMFuzzerCustomMutator(uint8_t* data, size_t size,
                                          size_t maxSize, unsigned int seed) {
  return ASN1Mutators::CustomMutator(data, size, maxSize, seed);
}

extern "C" size_t LLVMFuzzerCustomCrossOver(const uint8_t* data1, size_t size1,
                                            const uint8_t* data2, size_t size2,
                                            uint8_t* out, size_t maxOutSize,
                                            unsigned int seed) {
  return ASN1Mutators::CustomCrossOver(data1, size1, data2, size2, out,
                                       maxOutSize, seed);
}

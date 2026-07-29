/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <vector>

#include "certt.h"
#include "keythi.h"
#include "secdert.h"
#include "secport.h"

#include "asn1/mutators.h"

const std::vector<const SEC_ASN1Template*> kTemplates = {
    CERT_AttributeTemplate,
    CERT_CertExtensionTemplate,
    CERT_CertificateRequestTemplate,
    CERT_CertificateTemplate,
    CERT_CrlTemplate,
    CERT_IssuerAndSNTemplate,
    CERT_NameTemplate,
    CERT_PublicKeyAndChallengeTemplate,
    CERT_RDNTemplate,
    CERT_SequenceOfCertExtensionTemplate,
    CERT_SetOfAttributeTemplate,
    CERT_SetOfSignedCrlTemplate,
    CERT_SignedCrlTemplate,
    CERT_SignedDataTemplate,
    CERT_SubjectPublicKeyInfoTemplate,
    CERT_TimeChoiceTemplate,
    CERT_ValidityTemplate,
    SEC_AnyTemplate,
    SEC_BitStringTemplate,
    SEC_BMPStringTemplate,
    SEC_BooleanTemplate,
    SEC_CertSequenceTemplate,
    SEC_EnumeratedTemplate,
    SEC_GeneralizedTimeTemplate,
    SEC_IA5StringTemplate,
    SEC_IntegerTemplate,
    SEC_NullTemplate,
    SEC_ObjectIDTemplate,
    SEC_OctetStringTemplate,
    SEC_PointerToAnyTemplate,
    SEC_PointerToEnumeratedTemplate,
    SEC_PointerToGeneralizedTimeTemplate,
    SEC_PointerToOctetStringTemplate,
    SEC_PrintableStringTemplate,
    SEC_SequenceOfAnyTemplate,
    SEC_SequenceOfObjectIDTemplate,
    SEC_SetOfAnyTemplate,
    SEC_SetOfEnumeratedTemplate,
    SEC_SignedCertificateTemplate,
    SEC_SkipTemplate,
    SEC_T61StringTemplate,
    SEC_UniversalStringTemplate,
    SEC_UTCTimeTemplate,
    SEC_UTF8StringTemplate,
    SEC_VisibleStringTemplate,
    SECKEY_DHParamKeyTemplate,
    SECKEY_DHPublicKeyTemplate,
    SECKEY_DSAPrivateKeyExportTemplate,
    SECKEY_DSAPublicKeyTemplate,
    SECKEY_EncryptedPrivateKeyInfoTemplate,
    SECKEY_PQGParamsTemplate,
    SECKEY_PointerToEncryptedPrivateKeyInfoTemplate,
    SECKEY_PointerToPrivateKeyInfoTemplate,
    SECKEY_PrivateKeyInfoTemplate,
    SECKEY_RSAPSSParamsTemplate,
    SECKEY_RSAPublicKeyTemplate,
    SECOID_AlgorithmIDTemplate};

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  alignas(std::max_align_t) static char dest[2048 * sizeof(void*)];

  for (auto tpl : kTemplates) {
    memset(dest, 0, sizeof(dest));

    PORTCheapArenaPool pool;
    PORT_InitCheapArena(&pool, DER_DEFAULT_CHUNKSIZE);

    SECItem buf = {siBuffer, (unsigned char*)data, (unsigned int)size};
    (void)SEC_QuickDERDecodeItem(&pool.arena, dest, tpl, &buf);

    PORT_DestroyCheapArena(&pool);
  }

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

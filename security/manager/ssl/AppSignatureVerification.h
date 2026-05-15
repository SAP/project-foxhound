/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef AppSignatureVerification_h
#define AppSignatureVerification_h

#include "mozpkix/pkix.h"
#include "mozpkix/pkixnss.h"
#include "mozpkix/pkixutil.h"

// From the list of collectedCerts it gets the SignerCertificate based on
// issuerAndSN.
mozilla::Span<const uint8_t> GetPKCS7SignerCert(
    NSSCMSSignerInfo* signerInfo,
    nsTArray<mozilla::Span<const uint8_t>>& collectedCerts);

// Checks that the ContentType is PKCS7 and returns a pointer to inner content.
NSSCMSSignedData* GetSignedDataContent(NSSCMSMessage* cmsg);

// Gets a list of certificates from the CMS message
void CollectCertificates(
    NSSCMSSignedData* signedData,
    /* out */ nsTArray<mozilla::Span<const uint8_t>>& collectedCerts);

nsresult VerifySignatureFromCertificate(
    mozilla::Span<const uint8_t> signerCertSpan, NSSCMSSignerInfo* signerInfo,
    SECItem* detachedDigest);

// The function returns prioritized list of (signerInfo, digestAlgorithm
// [used to compute the signature digest of the message in signedInfo]).
// The returned signerInfo is owned by signedData, so the caller must ensure
// that the lifetime of the signerInfo is contained by the lifetime of the
// signedData.
// supportedDigestAlgorithms 1st algorithm has the highest priority, i.e.
// the function will first check if there is any SignerInfo
// with the highest priority digest algorithm.
void GetAllSignerInfosForSupportedDigestAlgorithms(
    NSSCMSSignedData* signedData,
    /* out */ nsTArray<std::tuple<NSSCMSSignerInfo*, SECOidTag>>& signerInfos);
#endif  // AppSignatureVerification_h

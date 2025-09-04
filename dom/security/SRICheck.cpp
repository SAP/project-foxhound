/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SRICheck.h"

#include "mozilla/Base64.h"
#include "mozilla/LoadTainting.h"
#include "mozilla/Logging.h"
#include "mozilla/dom/SRILogHelper.h"
#include "mozilla/dom/SRIMetadata.h"
#include "nsContentUtils.h"
#include "nsIChannel.h"
#include "nsIConsoleReportCollector.h"
#include "nsIHttpChannel.h"
#include "nsIScriptError.h"
#include "nsIURI.h"
#include "nsNetUtil.h"
#include "nsWhitespaceTokenizer.h"

#define SRIVERBOSE(args) \
  MOZ_LOG(SRILogHelper::GetSriLog(), mozilla::LogLevel::Verbose, args)
#define SRILOG(args) \
  MOZ_LOG(SRILogHelper::GetSriLog(), mozilla::LogLevel::Debug, args)
#define SRIERROR(args) \
  MOZ_LOG(SRILogHelper::GetSriLog(), mozilla::LogLevel::Error, args)

namespace mozilla::dom {

static void GetChannelRequestURI(nsIChannel* aChannel, nsACString& aSourceUri) {
  nsCOMPtr<nsIURI> originalURI;
  aChannel->GetOriginalURI(getter_AddRefs(originalURI));
  if (originalURI) {
    originalURI->GetAsciiSpec(aSourceUri);
  }
}

static void GetReferrerSpec(nsIChannel* aChannel, nsACString& aReferrer) {
  nsCOMPtr<nsIHttpChannel> httpChan = do_QueryInterface(aChannel);
  if (!httpChan) {
    return;
  }
  nsCOMPtr<nsIReferrerInfo> referrer = httpChan->GetReferrerInfo();
  if (!referrer) {
    return;
  }
  nsCOMPtr<nsIURI> original = referrer->GetOriginalReferrer();
  if (!original) {
    return;
  }
  original->GetSpec(aReferrer);
}

/**
 * Returns whether or not the sub-resource about to be loaded is eligible
 * for integrity checks. If it's not, the checks will be skipped and the
 * sub-resource will be loaded.
 */
static nsresult IsEligible(nsIChannel* aChannel,
                           mozilla::LoadTainting aTainting,
                           nsIConsoleReportCollector* aReporter) {
  NS_ENSURE_ARG_POINTER(aReporter);

  if (!aChannel) {
    SRILOG(("SRICheck::IsEligible, null channel"));
    return NS_ERROR_SRI_NOT_ELIGIBLE;
  }

  // Was the sub-resource loaded via CORS?
  if (aTainting == LoadTainting::CORS) {
    SRILOG(("SRICheck::IsEligible, CORS mode"));
    return NS_OK;
  }

  // Is the sub-resource same-origin?
  if (aTainting == LoadTainting::Basic) {
    SRILOG(("SRICheck::IsEligible, same-origin"));
    return NS_OK;
  }
  SRILOG(("SRICheck::IsEligible, NOT same-origin"));

  nsAutoCString requestSpec;
  GetChannelRequestURI(aChannel, requestSpec);
  nsAutoCString referrer;
  GetReferrerSpec(aChannel, referrer);
  aReporter->AddConsoleReport(
      nsIScriptError::errorFlag, "Sub-resource Integrity"_ns,
      nsContentUtils::eSECURITY_PROPERTIES, referrer, 0, 0,
      "IneligibleResource"_ns, {NS_ConvertUTF8toUTF16(requestSpec)});
  return NS_ERROR_SRI_NOT_ELIGIBLE;
}

/* static */
nsresult SRICheck::IntegrityMetadata(const nsAString& aMetadataList,
                                     const nsACString& aSourceFileURI,
                                     nsIConsoleReportCollector* aReporter,
                                     SRIMetadata* outMetadata) {
  NS_ENSURE_ARG_POINTER(outMetadata);
  NS_ENSURE_ARG_POINTER(aReporter);
  MOZ_ASSERT(outMetadata->IsEmpty());  // caller must pass empty metadata

  NS_ConvertUTF16toUTF8 metadataList(aMetadataList);
  SRILOG(("SRICheck::IntegrityMetadata, metadataList=%s", metadataList.get()));

  // the integrity attribute is a list of whitespace-separated hashes
  // and options so we need to look at them one by one and pick the
  // strongest (valid) one
  nsCWhitespaceTokenizer tokenizer(metadataList);
  nsAutoCString token;
  while (tokenizer.hasMoreTokens()) {
    token = tokenizer.nextToken();

    SRIMetadata metadata(token);
    if (metadata.IsMalformed()) {
      aReporter->AddConsoleReport(
          nsIScriptError::warningFlag, "Sub-resource Integrity"_ns,
          nsContentUtils::eSECURITY_PROPERTIES, aSourceFileURI, 0, 0,
          "MalformedIntegrityHash"_ns, {NS_ConvertUTF8toUTF16(token)});
    } else if (!metadata.IsAlgorithmSupported()) {
      nsAutoCString alg;
      metadata.GetAlgorithm(&alg);
      aReporter->AddConsoleReport(
          nsIScriptError::warningFlag, "Sub-resource Integrity"_ns,
          nsContentUtils::eSECURITY_PROPERTIES, aSourceFileURI, 0, 0,
          "UnsupportedHashAlg"_ns, {NS_ConvertUTF8toUTF16(alg)});
    }

    nsAutoCString alg1, alg2;
    if (MOZ_LOG_TEST(SRILogHelper::GetSriLog(), mozilla::LogLevel::Debug)) {
      outMetadata->GetAlgorithm(&alg1);
      metadata.GetAlgorithm(&alg2);
    }
    if (*outMetadata == metadata) {
      SRILOG(("SRICheck::IntegrityMetadata, alg '%s' is the same as '%s'",
              alg1.get(), alg2.get()));
      *outMetadata += metadata;  // add new hash to strongest metadata
    } else if (*outMetadata < metadata) {
      SRILOG(("SRICheck::IntegrityMetadata, alg '%s' is weaker than '%s'",
              alg1.get(), alg2.get()));
      *outMetadata = metadata;  // replace strongest metadata with current
    }
  }

  outMetadata->mIntegrityString = aMetadataList;

  if (MOZ_LOG_TEST(SRILogHelper::GetSriLog(), mozilla::LogLevel::Debug)) {
    if (outMetadata->IsValid()) {
      nsAutoCString alg;
      outMetadata->GetAlgorithm(&alg);
      SRILOG(("SRICheck::IntegrityMetadata, using a '%s' hash", alg.get()));
    } else if (outMetadata->IsEmpty()) {
      SRILOG(("SRICheck::IntegrityMetadata, no metadata"));
    } else {
      SRILOG(("SRICheck::IntegrityMetadata, no valid metadata found"));
    }
  }
  return NS_OK;
}

//////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////
SRICheckDataVerifier::SRICheckDataVerifier(const SRIMetadata& aMetadata,
                                           nsIChannel* aChannel,
                                           nsIConsoleReportCollector* aReporter)
    : mCryptoHash(nullptr),
      mBytesHashed(0),
      mHashLength(0),
      mHashType('\0'),
      mInvalidMetadata(false),
      mComplete(false) {
  MOZ_ASSERT(!aMetadata.IsEmpty());  // should be checked by caller
  MOZ_ASSERT(aReporter);

  if (!aMetadata.IsValid()) {
    nsAutoCString referrer;
    GetReferrerSpec(aChannel, referrer);
    aReporter->AddConsoleReport(nsIScriptError::warningFlag,
                                "Sub-resource Integrity"_ns,
                                nsContentUtils::eSECURITY_PROPERTIES, referrer,
                                0, 0, "NoValidMetadata"_ns, {});
    mInvalidMetadata = true;
    return;  // ignore invalid metadata for forward-compatibility
  }

  aMetadata.GetHashType(&mHashType, &mHashLength);
}

nsresult SRICheckDataVerifier::EnsureCryptoHash() {
  MOZ_ASSERT(!mInvalidMetadata);

  if (mCryptoHash) {
    return NS_OK;
  }

  nsCOMPtr<nsICryptoHash> cryptoHash;
  nsresult rv = NS_NewCryptoHash(mHashType, getter_AddRefs(cryptoHash));
  NS_ENSURE_SUCCESS(rv, rv);

  mCryptoHash = cryptoHash;
  return NS_OK;
}

nsresult SRICheckDataVerifier::Update(Span<const uint8_t> aBytes) {
  return Update(aBytes.size(), aBytes.data());
}

nsresult SRICheckDataVerifier::Update(uint32_t aStringLen,
                                      const uint8_t* aString) {
  NS_ENSURE_ARG_POINTER(aString);
  if (mInvalidMetadata) {
    return NS_OK;  // ignoring any data updates, see mInvalidMetadata usage
  }

  nsresult rv;
  rv = EnsureCryptoHash();
  NS_ENSURE_SUCCESS(rv, rv);

  mBytesHashed += aStringLen;

  return mCryptoHash->Update(aString, aStringLen);
}

nsresult SRICheckDataVerifier::Finish() {
  if (mInvalidMetadata || mComplete) {
    return NS_OK;  // already finished or invalid metadata
  }

  nsresult rv;
  rv = EnsureCryptoHash();  // we need computed hash even for 0-length data
  NS_ENSURE_SUCCESS(rv, rv);

  rv = mCryptoHash->Finish(false, mComputedHash);
  mCryptoHash = nullptr;
  mComplete = true;
  return rv;
}

nsresult SRICheckDataVerifier::VerifyHash(
    nsIChannel* aChannel, const SRIMetadata& aMetadata, uint32_t aHashIndex,
    nsIConsoleReportCollector* aReporter) {
  NS_ENSURE_ARG_POINTER(aReporter);

  nsAutoCString base64Hash;
  aMetadata.GetHash(aHashIndex, &base64Hash);
  SRILOG(("SRICheckDataVerifier::VerifyHash, hash[%u]=%s", aHashIndex,
          base64Hash.get()));

  nsAutoCString binaryHash;

  // We're decoding the supplied hash twice. Trying base64 first.
  nsresult rv = Base64Decode(base64Hash, binaryHash);

  if (NS_FAILED(rv)) {
    SRILOG(
        ("SRICheckDataVerifier::VerifyHash, base64 decoding failed. Trying "
         "base64url next."));
    FallibleTArray<uint8_t> decoded;
    rv = Base64URLDecode(base64Hash, Base64URLDecodePaddingPolicy::Ignore,
                         decoded);
    if (NS_FAILED(rv)) {
      SRILOG(
          ("SRICheckDataVerifier::VerifyHash, base64url decoding failed too. "
           "Bailing out."));
      nsAutoCString referrer;
      GetReferrerSpec(aChannel, referrer);
      // if neither succeeded, we can bail out and warn
      aReporter->AddConsoleReport(
          nsIScriptError::errorFlag, "Sub-resource Integrity"_ns,
          nsContentUtils::eSECURITY_PROPERTIES, referrer, 0, 0,
          "InvalidIntegrityBase64"_ns, {});
      return NS_ERROR_SRI_CORRUPT;
    }
    binaryHash.Assign(reinterpret_cast<const char*>(decoded.Elements()),
                      decoded.Length());
    SRILOG(
        ("SRICheckDataVerifier::VerifyHash, decoded supplied base64url hash "
         "successfully."));
  } else {
    SRILOG(
        ("SRICheckDataVerifier::VerifyHash, decoded supplied base64 hash "
         "successfully."));
  }

  uint32_t hashLength;
  int8_t hashType;
  aMetadata.GetHashType(&hashType, &hashLength);
  if (binaryHash.Length() != hashLength) {
    SRILOG(
        ("SRICheckDataVerifier::VerifyHash, supplied base64(url) hash was "
         "incorrect length after decoding."));
    nsAutoCString referrer;
    GetReferrerSpec(aChannel, referrer);
    aReporter->AddConsoleReport(nsIScriptError::errorFlag,
                                "Sub-resource Integrity"_ns,
                                nsContentUtils::eSECURITY_PROPERTIES, referrer,
                                0, 0, "InvalidIntegrityLength"_ns, {});
    return NS_ERROR_SRI_CORRUPT;
  }

  // the decoded supplied hash should match our computed binary hash.
  if (!binaryHash.Equals(mComputedHash)) {
    SRILOG(("SRICheckDataVerifier::VerifyHash, hash[%u] did not match",
            aHashIndex));
    return NS_ERROR_SRI_CORRUPT;
  }

  SRILOG(("SRICheckDataVerifier::VerifyHash, hash[%u] verified successfully",
          aHashIndex));
  return NS_OK;
}

nsresult SRICheckDataVerifier::Verify(const SRIMetadata& aMetadata,
                                      nsIChannel* aChannel,
                                      nsIConsoleReportCollector* aReporter) {
  MOZ_ASSERT(aChannel);
  nsCOMPtr loadInfo = aChannel->LoadInfo();
  return Verify(aMetadata, aChannel, loadInfo->GetTainting(), aReporter);
}

nsresult SRICheckDataVerifier::Verify(const SRIMetadata& aMetadata,
                                      nsIChannel* aChannel,
                                      LoadTainting aLoadTainting,
                                      nsIConsoleReportCollector* aReporter) {
  NS_ENSURE_ARG_POINTER(aReporter);

  if (MOZ_LOG_TEST(SRILogHelper::GetSriLog(), mozilla::LogLevel::Debug)) {
    nsAutoCString requestURL;
    aChannel->GetName(requestURL);
    SRILOG(("SRICheckDataVerifier::Verify, url=%s (length=%zu)",
            requestURL.get(), mBytesHashed));
  }

  nsresult rv = Finish();
  NS_ENSURE_SUCCESS(rv, rv);

  if (NS_FAILED(IsEligible(aChannel, aLoadTainting, aReporter))) {
    return NS_ERROR_SRI_NOT_ELIGIBLE;
  }

  if (mInvalidMetadata) {
    return NS_OK;  // ignore invalid metadata for forward-compatibility
  }

  for (uint32_t i = 0; i < aMetadata.HashCount(); i++) {
    if (NS_SUCCEEDED(VerifyHash(aChannel, aMetadata, i, aReporter))) {
      return NS_OK;  // stop at the first valid hash
    }
  }

  nsAutoCString alg;
  aMetadata.GetAlgorithm(&alg);

  nsCOMPtr<nsIURI> originalURI;
  rv = aChannel->GetOriginalURI(getter_AddRefs(originalURI));
  NS_ENSURE_SUCCESS(rv, rv);
  nsAutoCString requestSpec;
  rv = originalURI->GetSpec(requestSpec);
  NS_ENSURE_SUCCESS(rv, rv);

  nsAutoCString encodedHash;
  rv = Base64Encode(mComputedHash, encodedHash);
  NS_ENSURE_SUCCESS(rv, rv);

  nsAutoCString referrer;
  GetReferrerSpec(aChannel, referrer);

  aReporter->AddConsoleReport(
      nsIScriptError::errorFlag, "Sub-resource Integrity"_ns,
      nsContentUtils::eSECURITY_PROPERTIES, referrer, 0, 0,
      "IntegrityMismatch3"_ns,
      {NS_ConvertUTF8toUTF16(alg), NS_ConvertUTF8toUTF16(requestSpec),
       NS_ConvertUTF8toUTF16(encodedHash)});

  return NS_ERROR_SRI_CORRUPT;
}

uint32_t SRICheckDataVerifier::DataSummaryLength() {
  MOZ_ASSERT(!mInvalidMetadata);
  return sizeof(mHashType) + sizeof(mHashLength) + mHashLength;
}

uint32_t SRICheckDataVerifier::EmptyDataSummaryLength() {
  return sizeof(int8_t) + sizeof(uint32_t);
}

nsresult SRICheckDataVerifier::DataSummaryLength(uint32_t aDataLen,
                                                 const uint8_t* aData,
                                                 uint32_t* length) {
  *length = 0;
  NS_ENSURE_ARG_POINTER(aData);

  // we expect to always encode an SRI, even if it is empty or incomplete
  if (aDataLen < EmptyDataSummaryLength()) {
    SRILOG(
        ("SRICheckDataVerifier::DataSummaryLength, encoded length[%u] is too "
         "small",
         aDataLen));
    return NS_ERROR_SRI_IMPORT;
  }

  // decode the content of the buffer
  size_t offset = sizeof(mHashType);
  decltype(mHashLength) len = 0;
  memcpy(&len, &aData[offset], sizeof(mHashLength));
  offset += sizeof(mHashLength);

  SRIVERBOSE(
      ("SRICheckDataVerifier::DataSummaryLength, header {%x, %x, %x, %x, %x, "
       "...}",
       aData[0], aData[1], aData[2], aData[3], aData[4]));

  if (offset + len > aDataLen) {
    SRILOG(
        ("SRICheckDataVerifier::DataSummaryLength, encoded length[%u] overflow "
         "the buffer size",
         aDataLen));
    SRIVERBOSE(("SRICheckDataVerifier::DataSummaryLength, offset[%u], len[%u]",
                uint32_t(offset), uint32_t(len)));
    return NS_ERROR_SRI_IMPORT;
  }
  *length = uint32_t(offset + len);
  return NS_OK;
}

nsresult SRICheckDataVerifier::ImportDataSummary(uint32_t aDataLen,
                                                 const uint8_t* aData) {
  MOZ_ASSERT(!mInvalidMetadata);  // mHashType and mHashLength should be valid
  MOZ_ASSERT(!mCryptoHash);  // EnsureCryptoHash should not have been called
  NS_ENSURE_ARG_POINTER(aData);
  if (mInvalidMetadata) {
    return NS_OK;  // ignoring any data updates, see mInvalidMetadata usage
  }

  // we expect to always encode an SRI, even if it is empty or incomplete
  if (aDataLen < DataSummaryLength()) {
    SRILOG(
        ("SRICheckDataVerifier::ImportDataSummary, encoded length[%u] is too "
         "small",
         aDataLen));
    return NS_ERROR_SRI_IMPORT;
  }

  SRIVERBOSE(
      ("SRICheckDataVerifier::ImportDataSummary, header {%x, %x, %x, %x, %x, "
       "...}",
       aData[0], aData[1], aData[2], aData[3], aData[4]));

  // decode the content of the buffer
  size_t offset = 0;
  decltype(mHashType) hashType;
  memcpy(&hashType, &aData[offset], sizeof(mHashType));
  if (hashType != mHashType) {
    SRILOG(
        ("SRICheckDataVerifier::ImportDataSummary, hash type[%d] does not "
         "match[%d]",
         hashType, mHashType));
    return NS_ERROR_SRI_UNEXPECTED_HASH_TYPE;
  }
  offset += sizeof(mHashType);

  decltype(mHashLength) hashLength;
  memcpy(&hashLength, &aData[offset], sizeof(mHashLength));
  if (hashLength != mHashLength) {
    SRILOG(
        ("SRICheckDataVerifier::ImportDataSummary, hash length[%d] does not "
         "match[%d]",
         hashLength, mHashLength));
    return NS_ERROR_SRI_UNEXPECTED_HASH_TYPE;
  }
  offset += sizeof(mHashLength);

  // copy the hash to mComputedHash, as-if we had finished streaming the bytes
  mComputedHash.Assign(reinterpret_cast<const char*>(&aData[offset]),
                       mHashLength);
  mCryptoHash = nullptr;
  mComplete = true;
  return NS_OK;
}

nsresult SRICheckDataVerifier::ExportDataSummary(uint32_t aDataLen,
                                                 uint8_t* aData) {
  MOZ_ASSERT(!mInvalidMetadata);  // mHashType and mHashLength should be valid
  MOZ_ASSERT(mComplete);          // finished streaming
  NS_ENSURE_ARG_POINTER(aData);
  NS_ENSURE_TRUE(aDataLen >= DataSummaryLength(), NS_ERROR_INVALID_ARG);

  // serialize the hash in the buffer
  size_t offset = 0;
  memcpy(&aData[offset], &mHashType, sizeof(mHashType));
  offset += sizeof(mHashType);
  memcpy(&aData[offset], &mHashLength, sizeof(mHashLength));
  offset += sizeof(mHashLength);

  SRIVERBOSE(
      ("SRICheckDataVerifier::ExportDataSummary, header {%x, %x, %x, %x, %x, "
       "...}",
       aData[0], aData[1], aData[2], aData[3], aData[4]));

  // copy the hash to mComputedHash, as-if we had finished streaming the bytes
  nsCharTraits<char>::copy(reinterpret_cast<char*>(&aData[offset]),
                           mComputedHash.get(), mHashLength);
  return NS_OK;
}

nsresult SRICheckDataVerifier::ExportEmptyDataSummary(uint32_t aDataLen,
                                                      uint8_t* aData) {
  NS_ENSURE_ARG_POINTER(aData);
  NS_ENSURE_TRUE(aDataLen >= EmptyDataSummaryLength(), NS_ERROR_INVALID_ARG);

  // serialize an unknown hash in the buffer, to be able to skip it later
  size_t offset = 0;
  memset(&aData[offset], 0, sizeof(mHashType));
  offset += sizeof(mHashType);
  memset(&aData[offset], 0, sizeof(mHashLength));

  SRIVERBOSE(
      ("SRICheckDataVerifier::ExportEmptyDataSummary, header {%x, %x, %x, %x, "
       "%x, ...}",
       aData[0], aData[1], aData[2], aData[3], aData[4]));

  return NS_OK;
}

}  // namespace mozilla::dom

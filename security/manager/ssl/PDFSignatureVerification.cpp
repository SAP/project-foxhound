/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "cms.h"
#include "nsNSSCertificateDB.h"
#include "nsNSSCertificate.h"
#include "AppSignatureVerification.h"
#include "CryptoTask.h"
#include "PDFTrustDomain.h"

#include "mozpkix/pkix.h"
#include "mozpkix/pkixnss.h"
#include "mozpkix/pkixtypes.h"
#include "mozpkix/pkixutil.h"

#include "mozilla/dom/Promise.h"

using namespace mozilla;
using namespace mozilla::pkix;
using namespace mozilla::psm;

using dom::Promise;

nsresult ComputeDigest(SECOidTag digestAlgorithm,
                       const nsTArray<nsTArray<uint8_t>>& ins,
                       /* out */ nsTArray<uint8_t>& calculatedDigest) {
  Digest digest;
  nsresult rv = digest.Begin(digestAlgorithm);
  if (NS_FAILED(rv)) {
    return rv;
  }

  for (auto& in : ins) {
    rv = digest.Update(in.Elements(), in.Length());
    if (NS_FAILED(rv)) {
      return rv;
    }
  }
  return digest.End(calculatedDigest);
}

struct VerifySignatureResult {
  nsresult signatureVerificationResult;
  nsTArray<uint8_t> signerCert;
  Time time;

  VerifySignatureResult(nsresult result, Span<const uint8_t> certSpan, Time t)
      : signatureVerificationResult(result), time(t) {
    signerCert.AppendElements(certSpan.data(), certSpan.Length());
  }
};

void VerifySignature(
    NSSCMSSignedData* signedData, const nsTArray<nsTArray<uint8_t>>& data,
    /* out */ nsTArray<VerifySignatureResult>& signatureVerificationResults,
    /* out */ nsTArray<Span<const uint8_t>>& collectedCerts) {
  nsTArray<std::tuple<NSSCMSSignerInfo*, SECOidTag>> signerInfos;
  // Returns a prioritized list of signerInfos.
  GetAllSignerInfosForSupportedDigestAlgorithms(signedData, signerInfos);

  Span<const uint8_t> signerCertSpan;
  if (signerInfos.Length() == 0) {
    signatureVerificationResults.AppendElement(
        VerifySignatureResult(NS_ERROR_CMS_VERIFY_NOT_SIGNED,
                              /* no certificate */ signerCertSpan,
                              /* default time */ Time(Time::uninitialized)));
    return;
  }

  CollectCertificates(signedData, collectedCerts);
  if (collectedCerts.Length() == 0) {
    signatureVerificationResults.AppendElement(
        VerifySignatureResult(NS_ERROR_CMS_VERIFY_NOCERT,
                              /* no certificate */ signerCertSpan,
                              /* default time */ Time(Time::uninitialized)));
    return;
  }

  for (const auto& pair : signerInfos) {
    Time defaultTime(Time::uninitialized);

    SECOidTag digestAlgorithm = std::get<1>(pair);
    signerCertSpan = Span<const uint8_t>();

    nsTArray<uint8_t> calculatedDigest;
    nsresult rv = ComputeDigest(digestAlgorithm, data, calculatedDigest);
    if (NS_FAILED(rv)) {
      signatureVerificationResults.AppendElement(VerifySignatureResult(
          rv,
          /* no certificate */ signerCertSpan, defaultTime));
      continue;
    }

    NSSCMSSignerInfo* signerInfo = std::get<0>(pair);
    signerCertSpan = GetPKCS7SignerCert(signerInfo, collectedCerts);

    if (signerCertSpan.IsEmpty()) {
      signatureVerificationResults.AppendElement(VerifySignatureResult(
          NS_ERROR_CMS_VERIFY_NOCERT,
          /* no certificate */ signerCertSpan, defaultTime));
      continue;
    }

    SECItem detachedDigest = {
        siBuffer, calculatedDigest.Elements(),
        static_cast<unsigned int>(calculatedDigest.Length())};

    rv = VerifySignatureFromCertificate(signerCertSpan, signerInfo,
                                        &detachedDigest);

    PRTime signingTime;
    if (NSS_CMSSignerInfo_GetSigningTime(signerInfo, &signingTime) ==
        SECSuccess) {
      signatureVerificationResults.AppendElement(VerifySignatureResult(
          rv, signerCertSpan,
          TimeFromEpochInSeconds((uint64_t)(signingTime / 1000000))));
    } else {
      signatureVerificationResults.AppendElement(
          VerifySignatureResult(rv, signerCertSpan, Now()));
    }
  }
}

static mozilla::pkix::Result BuildCertChainForDocumentSigningKeyUsage(
    TrustDomain& trustDomain, Input certDER, Time time) {
  mozilla::pkix::Result rv = BuildCertChain(
      trustDomain, certDER, time, EndEntityOrCA::MustBeEndEntity,
      KeyUsage::digitalSignature, KeyPurposeId::id_kp_documentSigning,
      CertPolicyId::anyPolicy, nullptr /*stapledOCSPResponse*/);
  if (rv == mozilla::pkix::Result::ERROR_INADEQUATE_CERT_TYPE) {
    rv = BuildCertChain(
        trustDomain, certDER, time, EndEntityOrCA::MustBeEndEntity,
        KeyUsage::digitalSignature, KeyPurposeId::id_kp_documentSigningAdobe,
        CertPolicyId::anyPolicy, nullptr /*stapledOCSPResponse*/);
    if (rv == mozilla::pkix::Result::ERROR_INADEQUATE_CERT_TYPE) {
      rv = BuildCertChain(
          trustDomain, certDER, time, EndEntityOrCA::MustBeEndEntity,
          KeyUsage::digitalSignature,
          KeyPurposeId::id_kp_documentSigningMicrosoft, CertPolicyId::anyPolicy,
          nullptr /*stapledOCSPResponse*/);
      if (rv != Success) {
        rv = mozilla::pkix::Result::ERROR_INADEQUATE_CERT_TYPE;
      }
    }
  }

  return rv;
}

nsresult VerifyCertificate(PDFTrustDomain& trustDomain,
                           Span<const uint8_t> signerCert, Time time) {
  Input certDER;
  mozilla::pkix::Result result =
      certDER.Init(signerCert.Elements(), signerCert.Length());
  if (result != Success) {
    return mozilla::psm::GetXPCOMFromNSSError(MapResultToPRErrorCode(result));
  }

  result = BuildCertChainForDocumentSigningKeyUsage(trustDomain, certDER, time);
  if (result != Success) {
    return mozilla::psm::GetXPCOMFromNSSError(MapResultToPRErrorCode(result));
  }

  return NS_OK;
}

class PDFVerificationResultImpl final : public nsIPDFVerificationResult {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIPDFVERIFICATIONRESULT

  PDFVerificationResultImpl(nsresult sigResult, nsresult certResult,
                            nsIX509Cert* cert)
      : mSignatureResult(sigResult),
        mCertificateResult(certResult),
        mSignerCertificate(cert) {}

 private:
  ~PDFVerificationResultImpl() = default;

  nsresult mSignatureResult;
  nsresult mCertificateResult;
  nsCOMPtr<nsIX509Cert> mSignerCertificate;
};

NS_IMPL_ISUPPORTS(PDFVerificationResultImpl, nsIPDFVerificationResult)

NS_IMETHODIMP
PDFVerificationResultImpl::GetSignatureResult(nsresult* aResult) {
  *aResult = mSignatureResult;
  return NS_OK;
}

NS_IMETHODIMP
PDFVerificationResultImpl::GetCertificateResult(nsresult* aResult) {
  *aResult = mCertificateResult;
  return NS_OK;
}

NS_IMETHODIMP
PDFVerificationResultImpl::GetSignerCertificate(nsIX509Cert** aCert) {
  NS_IF_ADDREF(*aCert = mSignerCertificate);
  return NS_OK;
}

void VerifyPKCS7Object(
    const nsTArray<uint8_t>& pkcs7, const nsTArray<nsTArray<uint8_t>>& data,
    nsIX509CertDB::PDFSignatureAlgorithm signatureType,
    /* out */ nsTArray<RefPtr<PDFVerificationResultImpl>>& pdfVerifResults) {
  if (signatureType !=
      nsIX509CertDB::PDFSignatureAlgorithm::ADBE_PKCS7_DETACHED) {
    pdfVerifResults.AppendElement(new PDFVerificationResultImpl(
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING,
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING, nullptr));
    return;
  }

  if (pkcs7.Length() == 0 || data.Length() == 0) {
    pdfVerifResults.AppendElement(new PDFVerificationResultImpl(
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING,
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING, nullptr));
    return;
  }

  SECItem certificateItem = {siBuffer, const_cast<uint8_t*>(pkcs7.Elements()),
                             static_cast<unsigned int>(pkcs7.Length())};

  UniqueNSSCMSMessage cmsMsg(
      NSS_CMSMessage_CreateFromDER(&certificateItem,
                                   /* NSSCMSContentCallback */ nullptr,
                                   /* cb_arg */ nullptr,
                                   /* PK11PasswordFunc */ nullptr,
                                   /* pwfn_args */ nullptr,
                                   /* NSSCMSGetDecryptKeyCallback */ nullptr,
                                   /* decrypt_key_cb_arg */ nullptr));

  NSSCMSSignedData* signedData = GetSignedDataContent(cmsMsg.get());
  if (!signedData) {
    pdfVerifResults.AppendElement(new PDFVerificationResultImpl(
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING,
        NS_ERROR_CMS_VERIFY_ERROR_PROCESSING, nullptr));
    return;
  }

  nsTArray<VerifySignatureResult> signatureVerificationResults;
  nsTArray<Span<const uint8_t>> collectedCerts;
  VerifySignature(signedData, data, signatureVerificationResults,
                  collectedCerts);

  PDFTrustDomain trustDomain(std::move(collectedCerts));

  for (auto& result : signatureVerificationResults) {
    if (result.signatureVerificationResult != NS_OK) {
      pdfVerifResults.AppendElement(new PDFVerificationResultImpl(
          result.signatureVerificationResult,
          NS_ERROR_CMS_VERIFY_NOT_YET_ATTEMPTED, nullptr));
    } else {
      nsresult certChainVerifResult =
          VerifyCertificate(trustDomain, result.signerCert, result.time);

      nsCOMPtr<nsIX509Cert> cert(
          new nsNSSCertificate(std::move(result.signerCert)));

      pdfVerifResults.AppendElement(new PDFVerificationResultImpl(
          result.signatureVerificationResult, certChainVerifResult, cert));
    }
  }
}

class VerifyPKCS7ObjectTask : public CryptoTask {
 public:
  VerifyPKCS7ObjectTask(const nsTArray<uint8_t>& aPkcs7,
                        const nsTArray<nsTArray<uint8_t>>& aData,
                        nsIX509CertDB::PDFSignatureAlgorithm aSignatureType,
                        RefPtr<Promise>& aPromise)
      : mPkcs7(aPkcs7.Clone()),
        mSignatureType(aSignatureType),
        mPromise(new nsMainThreadPtrHolder<Promise>(
            "VerifyPKCS7ObjectTask::mPromise", aPromise)) {
    for (auto& n : aData) {
      mData.AppendElement(n.Clone());
    }
  }

 private:
  virtual nsresult CalculateResult() override;
  virtual void CallCallback(nsresult rv) override;

  const nsTArray<uint8_t> mPkcs7;
  nsTArray<nsTArray<uint8_t>> mData;
  nsIX509CertDB::PDFSignatureAlgorithm mSignatureType;
  nsTArray<RefPtr<PDFVerificationResultImpl>> mPdfVerifResults;  // out
  nsMainThreadPtrHandle<Promise> mPromise;
};

NS_IMETHODIMP
nsNSSCertificateDB::AsyncVerifyPKCS7Object(
    const nsTArray<uint8_t>& pkcs7, const nsTArray<nsTArray<uint8_t>>& data,
    nsIX509CertDB::PDFSignatureAlgorithm signatureType, JSContext* aCx,
    mozilla::dom::Promise** aPromise) {
  NS_ENSURE_ARG_POINTER(aCx);

  nsIGlobalObject* globalObject = xpc::CurrentNativeGlobal(aCx);
  if (NS_WARN_IF(!globalObject)) {
    return NS_ERROR_UNEXPECTED;
  }

  ErrorResult result;
  RefPtr<Promise> promise = Promise::Create(globalObject, result);
  if (NS_WARN_IF(result.Failed())) {
    return result.StealNSResult();
  }

  RefPtr<VerifyPKCS7ObjectTask> task(
      new VerifyPKCS7ObjectTask(pkcs7, data, signatureType, promise));
  nsresult rv = task->Dispatch();
  if (NS_FAILED(rv)) {
    return rv;
  }

  promise.forget(aPromise);
  return NS_OK;
}

nsresult VerifyPKCS7ObjectTask::CalculateResult() {
  VerifyPKCS7Object(mPkcs7, mData, mSignatureType, mPdfVerifResults);
  return NS_OK;
}

void VerifyPKCS7ObjectTask::CallCallback(nsresult rv) {
  if (NS_FAILED(rv)) {
    mPromise->MaybeReject(rv);
  } else {
    mPromise->MaybeResolve(mPdfVerifResults);
  }
}

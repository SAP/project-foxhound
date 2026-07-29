/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VerifySSLServerCertParent.h"

#include "cert.h"
#include "nsNSSComponent.h"
#include "secerr.h"
#include "SharedCertVerifier.h"
#include "NSSCertDBTrustDomain.h"
#include "SSLServerCertVerification.h"
#include "nsNSSIOLayer.h"
#include "nsISocketProvider.h"
#include "mozilla/Components.h"
#include "mozilla/psm/EnabledSignatureSchemes.h"

extern mozilla::LazyLogModule gPIPNSSLog;

using namespace mozilla::pkix;

namespace mozilla {
namespace psm {

namespace {

SSLSignatureScheme FromIPCSignatureScheme(EnabledSignatureScheme aScheme) {
  switch (aScheme) {
#define CASE_IPC_TO_SSL_SCHEME(NAME, _) \
  case EnabledSignatureScheme::NAME:    \
    return NAME;
    FOR_EACH_ENABLED_SIGNATURE_SCHEME(CASE_IPC_TO_SSL_SCHEME)
#undef CASE_IPC_TO_SSL_SCHEME
  }
  MOZ_CRASH("Unexpected EnabledSignatureScheme value");
}

}  // namespace

VerifySSLServerCertParent::VerifySSLServerCertParent() = default;

void VerifySSLServerCertParent::OnVerifiedSSLServerCert(
    const nsTArray<ByteArray>& aBuiltCertChain,
    uint16_t aCertificateTransparencyStatus, EVStatus aEVStatus,
    bool aSucceeded, PRErrorCode aFinalError,
    nsITransportSecurityInfo::OverridableErrorCategory
        aOverridableErrorCategory,
    bool aIsBuiltCertChainRootBuiltInRoot, bool aMadeOCSPRequests) {
  if (!CanSend()) {
    return;
  }

  (void)SendOnVerifySSLServerCertFinished(
      aBuiltCertChain, aCertificateTransparencyStatus, aEVStatus, aSucceeded,
      aFinalError, aOverridableErrorCategory, aIsBuiltCertChainRootBuiltInRoot,
      aMadeOCSPRequests);

  Close();
}

namespace {

class IPCServerCertVerificationResult final
    : public BaseSSLServerCertVerificationResult {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(IPCServerCertVerificationResult,
                                        override)

  IPCServerCertVerificationResult(nsIEventTarget* aTarget,
                                  VerifySSLServerCertParent* aParent)
      : mTarget(aTarget), mParent(aParent) {}

  [[nodiscard]] nsresult Dispatch(
      nsTArray<nsTArray<uint8_t>>&& aBuiltChain,
      nsTArray<nsTArray<uint8_t>>&& aPeerCertChain,
      uint16_t aCertificateTransparencyStatus, EVStatus aEVStatus,
      bool aSucceeded, PRErrorCode aFinalError,
      nsITransportSecurityInfo::OverridableErrorCategory
          aOverridableErrorCategory,
      bool aIsBuiltCertChainRootBuiltInRoot, uint32_t aProviderFlags,
      bool aMadeOCSPRequests) override;

 private:
  ~IPCServerCertVerificationResult() = default;

  nsCOMPtr<nsIEventTarget> mTarget;
  RefPtr<VerifySSLServerCertParent> mParent;
};

nsresult IPCServerCertVerificationResult::Dispatch(
    nsTArray<nsTArray<uint8_t>>&& aBuiltChain,
    nsTArray<nsTArray<uint8_t>>&& aPeerCertChain,
    uint16_t aCertificateTransparencyStatus, EVStatus aEVStatus,
    bool aSucceeded, PRErrorCode aFinalError,
    nsITransportSecurityInfo::OverridableErrorCategory
        aOverridableErrorCategory,
    bool aIsBuiltCertChainRootBuiltInRoot, uint32_t aProviderFlags,
    bool aMadeOCSPRequests) {
  nsTArray<ByteArray> builtCertChain;
  if (aSucceeded) {
    for (auto& cert : aBuiltChain) {
      builtCertChain.AppendElement(ByteArray(cert));
    }
  }

  nsresult rv = mTarget->Dispatch(
      NS_NewRunnableFunction(
          "psm::VerifySSLServerCertParent::OnVerifiedSSLServerCert",
          [parent(mParent), builtCertChain{std::move(builtCertChain)},
           aCertificateTransparencyStatus, aEVStatus, aSucceeded, aFinalError,
           aOverridableErrorCategory, aIsBuiltCertChainRootBuiltInRoot,
           aMadeOCSPRequests]() {
            parent->OnVerifiedSSLServerCert(
                builtCertChain, aCertificateTransparencyStatus, aEVStatus,
                aSucceeded, aFinalError, aOverridableErrorCategory,
                aIsBuiltCertChainRootBuiltInRoot, aMadeOCSPRequests);
          }),
      NS_DISPATCH_NORMAL);
  MOZ_DIAGNOSTIC_ASSERT(NS_SUCCEEDED(rv));
  return rv;
}

}  // anonymous namespace

bool VerifySSLServerCertParent::Dispatch(
    nsTArray<ByteArray>&& aPeerCertChain, const nsACString& aHostName,
    const int32_t& aPort, const OriginAttributes& aOriginAttributes,
    const Maybe<ByteArray>& aStapledOCSPResponse,
    const Maybe<ByteArray>& aSctsFromTLSExtension,
    const Maybe<DelegatedCredentialInfoArg>& aDcInfo,
    const uint32_t& aProviderFlags, const uint32_t& aCertVerifierFlags) {
  MOZ_LOG(gPIPNSSLog, LogLevel::Debug, ("VerifySSLServerCertParent::Dispatch"));

  nsCOMPtr<nsIEventTarget> sts = components::SocketTransport::Service();
  if (!sts) {
    return false;
  }

  mBackgroundThread = GetCurrentSerialEventTarget();

  nsTArray<nsTArray<uint8_t>> peerCertBytes;
  for (auto& certBytes : aPeerCertChain) {
    nsTArray<uint8_t> bytes;
    peerCertBytes.AppendElement(std::move(certBytes.data()));
  }

  Maybe<nsTArray<uint8_t>> stapledOCSPResponse;
  if (aStapledOCSPResponse) {
    stapledOCSPResponse.emplace(aStapledOCSPResponse->data().Clone());
  }

  Maybe<nsTArray<uint8_t>> sctsFromTLSExtension;
  if (aSctsFromTLSExtension) {
    sctsFromTLSExtension.emplace(aSctsFromTLSExtension->data().Clone());
  }

  Maybe<DelegatedCredentialInfo> dcInfo;
  if (aDcInfo) {
    dcInfo.emplace();
    dcInfo->scheme = FromIPCSignatureScheme(aDcInfo->scheme());
    dcInfo->authKeyBits = aDcInfo->authKeyBits();
  }

  RefPtr resultTask =
      MakeRefPtr<IPCServerCertVerificationResult>(mBackgroundThread, this);

  nsresult rv = sts->Dispatch(NS_NewRunnableFunction(
      "VerifySSLServerCertParent::Dispatch",
      [peerCertBytes = std::move(peerCertBytes),
       hostName = nsCString(aHostName), aPort, aOriginAttributes,
       stapledOCSPResponse = std::move(stapledOCSPResponse),
       sctsFromTLSExtension = std::move(sctsFromTLSExtension),
       dcInfo = std::move(dcInfo), aProviderFlags, aCertVerifierFlags,
       resultTask = std::move(resultTask)]() mutable {
        SECStatus status = SSLServerCertVerificationJob::Dispatch(
            0, nullptr, std::move(peerCertBytes), hostName, aPort,
            aOriginAttributes, stapledOCSPResponse, sctsFromTLSExtension,
            dcInfo, aProviderFlags, Now(), aCertVerifierFlags, resultTask);
        if (status != SECWouldBlock) {
          MOZ_LOG(gPIPNSSLog, LogLevel::Debug,
                  ("VerifySSLServerCertParent::Dispatch - "
                   "SSLServerCertVerificationJob::Dispatch failed on STS"));
        }
      }));
  if (NS_FAILED(rv)) {
    MOZ_LOG(
        gPIPNSSLog, LogLevel::Debug,
        ("VerifySSLServerCertParent::Dispatch - failed to dispatch to STS"));
    return false;
  }

  return true;
}

void VerifySSLServerCertParent::ActorDestroy(ActorDestroyReason aWhy) {}

VerifySSLServerCertParent::~VerifySSLServerCertParent() = default;

}  // namespace psm
}  // namespace mozilla

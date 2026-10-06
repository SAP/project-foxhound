/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MFCDMProxy.h"

#include <mferror.h>

#include "MFCDMParent.h"
#include "MFMediaEngineUtils.h"

namespace mozilla {

using Microsoft::WRL::ComPtr;

#define LOG(msg, ...)                                                    \
  MOZ_LOG_FMT(gMFMediaEngineLog, LogLevel::Debug, "MFCDMProxy={}, " msg, \
              fmt::ptr(this), ##__VA_ARGS__)

MFCDMProxy::MFCDMProxy(IMFContentDecryptionModule* aCDM, uint64_t aCDMParentId)
    : mCDM(aCDM), mCDMParentId(aCDMParentId) {
  LOG("MFCDMProxy created, created by {} MFCDMParent", mCDMParentId);
}

MFCDMProxy::~MFCDMProxy() { LOG("MFCDMProxy destroyed"); }

void MFCDMProxy::Shutdown() {
  OnHardwareContextReset();
  LOG("MFCDMProxy Shutdowned");
}

HRESULT MFCDMProxy::GetPMPServer(REFIID aRiid, LPVOID* aPMPServerOut) {
  ComPtr<IMFGetService> cdmServices;
  RETURN_IF_FAILED(mCDM.As(&cdmServices));
  RETURN_IF_FAILED(cdmServices->GetService(MF_CONTENTDECRYPTIONMODULE_SERVICE,
                                           aRiid, aPMPServerOut));
  return S_OK;
}

HRESULT MFCDMProxy::GetInputTrustAuthority(uint32_t aStreamId,
                                           const uint8_t* aContentInitData,
                                           uint32_t aContentInitDataSize,
                                           REFIID aRiid,
                                           IUnknown** aInputTrustAuthorityOut) {
  if (mInputTrustAuthorities.count(aStreamId)) {
    RETURN_IF_FAILED(
        mInputTrustAuthorities[aStreamId].CopyTo(aInputTrustAuthorityOut));
    return S_OK;
  }

  if (!mTrustedInput) {
    if (!mCDM) {
      return MF_E_SHUTDOWN;
    }
    RETURN_IF_FAILED(mCDM->CreateTrustedInput(
        aContentInitData, aContentInitDataSize, &mTrustedInput));
    LOG("Created a trust input for stream {}", aStreamId);
  }

  // GetInputTrustAuthority takes IUnknown* as the output. Using
  // other COM interface will have a v-table mismatch issue.
  ComPtr<IUnknown> unknown;
  RETURN_IF_FAILED(
      mTrustedInput->GetInputTrustAuthority(aStreamId, aRiid, &unknown));

  ComPtr<IMFInputTrustAuthority> inputTrustAuthority;
  RETURN_IF_FAILED(unknown.As(&inputTrustAuthority));
  RETURN_IF_FAILED(unknown.CopyTo(aInputTrustAuthorityOut));

  mInputTrustAuthorities[aStreamId] = inputTrustAuthority;
  return S_OK;
}

HRESULT MFCDMProxy::SetContentEnabler(IUnknown* aRequest,
                                      IMFAsyncResult* aResult) {
  LOG("SetContentEnabler");
  if (!mCDM) {
    return MF_E_SHUTDOWN;
  }
  ComPtr<IMFContentEnabler> contentEnabler;
  RETURN_IF_FAILED(aRequest->QueryInterface(IID_PPV_ARGS(&contentEnabler)));
  return mCDM->SetContentEnabler(contentEnabler.Get(), aResult);
}

void MFCDMProxy::ResetTrustedInput() {
  LOG("ResetTrustedInput");
  mTrustedInput = nullptr;
  mInputTrustAuthorities.clear();
}

void MFCDMProxy::OnHardwareContextReset() {
  LOG("OnHardwareContextReset");
  // Hardware context reset invalidates all crypto sessions and
  // the CDM's hardware DRM context. Shut down ITAs and release
  // the CDM reference so the stale COM object does not block a
  // new CDM from acquiring TEE resources.
  for (auto& inputAuthorities : mInputTrustAuthorities) {
    SHUTDOWN_IF_POSSIBLE(inputAuthorities.second);
  }
  ResetTrustedInput();
  mCDM = nullptr;
}

#undef LOG

}  // namespace mozilla

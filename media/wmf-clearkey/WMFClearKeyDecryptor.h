/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_PLATFORM_WMF_CLEARKEY_WMFCLEARKEYDECRYPTOR_H
#define DOM_MEDIA_PLATFORM_WMF_CLEARKEY_WMFCLEARKEYDECRYPTOR_H

#include <mfidl.h>
#include <mutex>
#include <windows.h>
#include <wrl.h>

#include "RefCounted.h"
#include "WMFClearKeyUtils.h"

namespace mozilla {

class SessionManagerWrapper;

// IMFTransform that decrypts CENC-encrypted samples using the keys held by
// a SessionManagerWrapper. One instance is created per stream (audio or video)
// and is returned from WMFClearKeyInputTrustAuthority::GetDecrypter.
class WMFClearKeyDecryptor final
    : public Microsoft::WRL::RuntimeClass<
          Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>,
          IMFTransform, Microsoft::WRL::FtmBase> {
 public:
  WMFClearKeyDecryptor() = default;
  ~WMFClearKeyDecryptor();
  WMFClearKeyDecryptor(const WMFClearKeyDecryptor&) = delete;
  WMFClearKeyDecryptor& operator=(const WMFClearKeyDecryptor&) = delete;

  HRESULT RuntimeClassInitialize(SessionManagerWrapper* aSessionManager);

  // IMFTransform
  STDMETHODIMP GetStreamLimits(DWORD* aInputMin, DWORD* aInputMax,
                               DWORD* aOutputMin, DWORD* aOutputMax) override;
  STDMETHODIMP GetStreamCount(DWORD* aInputStreams,
                              DWORD* aOutputStreams) override;
  STDMETHODIMP GetStreamIDs(DWORD aInputSize, DWORD* aInputIDs,
                            DWORD aOutputSize, DWORD* aOutputIDs) override;
  STDMETHODIMP GetInputStreamInfo(DWORD aInputStreamID,
                                  MFT_INPUT_STREAM_INFO* aStreamInfo) override;
  STDMETHODIMP GetOutputStreamInfo(
      DWORD aOutputStreamID, MFT_OUTPUT_STREAM_INFO* aStreamInfo) override;
  STDMETHODIMP GetAttributes(IMFAttributes** aAttributes) override;
  STDMETHODIMP GetInputStreamAttributes(DWORD aInputStreamID,
                                        IMFAttributes** aAttributes) override;
  STDMETHODIMP GetOutputStreamAttributes(DWORD aOutputStreamID,
                                         IMFAttributes** aAttributes) override;
  STDMETHODIMP DeleteInputStream(DWORD aStreamID) override;
  STDMETHODIMP AddInputStreams(DWORD aStreams, DWORD* aStreamIDs) override;
  STDMETHODIMP GetInputAvailableType(DWORD aInputStreamID, DWORD aTypeIndex,
                                     IMFMediaType** aType) override;
  STDMETHODIMP GetOutputAvailableType(DWORD aOutputStreamID, DWORD aTypeIndex,
                                      IMFMediaType** aType) override;
  STDMETHODIMP SetInputType(DWORD aInputStreamID, IMFMediaType* aType,
                            DWORD aFlags) override;
  STDMETHODIMP SetOutputType(DWORD aOutputStreamID, IMFMediaType* aType,
                             DWORD aFlags) override;
  STDMETHODIMP GetInputCurrentType(DWORD aInputStreamID,
                                   IMFMediaType** aType) override;
  STDMETHODIMP GetOutputCurrentType(DWORD aOutputStreamID,
                                    IMFMediaType** aType) override;
  STDMETHODIMP GetInputStatus(DWORD aInputStreamID, DWORD* aFlags) override;
  STDMETHODIMP GetOutputStatus(DWORD* aFlags) override;
  STDMETHODIMP SetOutputBounds(LONGLONG aLowerBound,
                               LONGLONG aUpperBound) override;
  STDMETHODIMP ProcessEvent(DWORD aInputStreamID,
                            IMFMediaEvent* aEvent) override;
  STDMETHODIMP ProcessMessage(MFT_MESSAGE_TYPE aMessage,
                              ULONG_PTR aParam) override;
  STDMETHODIMP ProcessInput(DWORD aInputStreamID, IMFSample* aSample,
                            DWORD aFlags) override;
  STDMETHODIMP ProcessOutput(DWORD aFlags, DWORD aOutputBufferCount,
                             MFT_OUTPUT_DATA_BUFFER* aOutputSamples,
                             DWORD* aStatus) override;

 private:
  HRESULT DecryptSample(IMFSample* aEncryptedSample,
                        IMFSample** aDecryptedSample);

  RefPtr<SessionManagerWrapper> mSessionManager;

  std::mutex mMutex;
  Microsoft::WRL::ComPtr<IMFSample> mInputSample;
  Microsoft::WRL::ComPtr<IMFMediaType> mInputType;
  Microsoft::WRL::ComPtr<IMFMediaType> mOutputType;
};

}  // namespace mozilla

#endif  // DOM_MEDIA_PLATFORM_WMF_CLEARKEY_WMFCLEARKEYDECRYPTOR_H

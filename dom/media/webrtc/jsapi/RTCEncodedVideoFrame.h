/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDVIDEOFRAME_H_
#define MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDVIDEOFRAME_H_

#include "mozilla/RefPtr.h"
#include "mozilla/dom/RTCEncodedFrameBase.h"
#include "mozilla/dom/RTCEncodedVideoFrameBinding.h"
#include "nsIGlobalObject.h"

namespace mozilla::dom {

class RTCRtpScriptTransformer;
class StructuredCloneHolder;
struct RTCEncodedVideoFrameOptions;

struct RTCEncodedVideoFrameData : RTCEncodedFrameState {
  RTCEncodedVideoFrameType mType;
  RTCEncodedVideoFrameMetadata mMetadata;
  Maybe<nsCString> mRid;

  [[nodiscard]] RTCEncodedVideoFrameData Clone() const;
};

// Wraps a libwebrtc frame, allowing the frame buffer to be modified, and
// providing read-only access to various metadata. After the libwebrtc frame is
// extracted (with RTCEncodedFrameBase::TakeFrame), the frame buffer is
// detached, but the metadata remains accessible.
class RTCEncodedVideoFrame final : public RTCEncodedVideoFrameData,
                                   public RTCEncodedFrameBase {
 public:
  explicit RTCEncodedVideoFrame(
      nsIGlobalObject* aGlobal,
      std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
      uint64_t aCounter, RTCRtpScriptTransformer* aOwner);

  explicit RTCEncodedVideoFrame(nsIGlobalObject* aGlobal,
                                RTCEncodedVideoFrameData&& aData);

  // nsISupports
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(RTCEncodedVideoFrame,
                                                         RTCEncodedFrameBase)

  // webidl (timestamp and data accessors live in base class)
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<RTCEncodedVideoFrame> Constructor(
      const GlobalObject& aGlobal, const RTCEncodedVideoFrame& aOriginalFrame,
      const RTCEncodedVideoFrameOptions& aOptions, ErrorResult& aRv);

  nsIGlobalObject* GetParentObject() const;

  RTCEncodedVideoFrameType Type() const;

  void InitMetadata();

  void GetMetadata(RTCEncodedVideoFrameMetadata& aMetadata);

  bool CheckOwner(RTCRtpScriptTransformer* aOwner) const override;

  bool IsVideo() const override { return true; }

  // Not in webidl right now. Might change.
  // https://github.com/w3c/webrtc-encoded-transform/issues/147
  Maybe<nsCString> Rid() const;

  static JSObject* ReadStructuredClone(JSContext* aCx, nsIGlobalObject* aGlobal,
                                       JSStructuredCloneReader* aReader,
                                       RTCEncodedVideoFrameData& aData);
  bool WriteStructuredClone(JSStructuredCloneWriter* aWriter,
                            StructuredCloneHolder* aHolder) const;

 private:
  virtual ~RTCEncodedVideoFrame();

  // forbid copy/move to keep mState member in base valid
  RTCEncodedVideoFrame(const RTCEncodedVideoFrame&) = delete;
  RTCEncodedVideoFrame& operator=(const RTCEncodedVideoFrame&) = delete;
  RTCEncodedVideoFrame(RTCEncodedVideoFrame&&) = delete;
  RTCEncodedVideoFrame& operator=(RTCEncodedVideoFrame&&) = delete;

  // RTCEncodedVideoFrame can run on either main thread or worker thread.
  void AssertIsOnOwningThread() const {
    NS_ASSERT_OWNINGTHREAD(RTCEncodedVideoFrame);
  }

  RefPtr<RTCRtpScriptTransformer> mOwner;
};

}  // namespace mozilla::dom
#endif  // MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDVIDEOFRAME_H_

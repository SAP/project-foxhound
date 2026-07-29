/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDAUDIOFRAME_H_
#define MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDAUDIOFRAME_H_

#include "mozilla/dom/RTCEncodedAudioFrameBinding.h"
#include "mozilla/dom/RTCEncodedFrameBase.h"
#include "nsIGlobalObject.h"

namespace mozilla::dom {

class RTCStatsTimestampMaker;
class StructuredCloneHolder;
struct RTCEncodedAudioFrameOptions;

struct RTCEncodedAudioFrameData : RTCEncodedFrameState {
  RTCEncodedAudioFrameMetadata mMetadata;

  [[nodiscard]] RTCEncodedAudioFrameData Clone() const;
};

// Wraps a libwebrtc frame, allowing the frame buffer to be modified, and
// providing read-only access to various metadata. After the libwebrtc frame is
// extracted (with RTCEncodedFrameBase::TakeFrame), the frame buffer is
// detached, but the metadata remains accessible.
class RTCEncodedAudioFrame final : public RTCEncodedAudioFrameData,
                                   public RTCEncodedFrameBase {
 public:
  explicit RTCEncodedAudioFrame(
      nsIGlobalObject* aGlobal,
      std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
      uint64_t aCounter, RTCRtpScriptTransformer* aOwner,
      const Maybe<RTCStatsTimestampMaker>& aTimestampMaker);

  explicit RTCEncodedAudioFrame(nsIGlobalObject* aGlobal,
                                RTCEncodedAudioFrameData&& aData);

  // forbid copy/move to keep mState member in base valid
  RTCEncodedAudioFrame(const RTCEncodedAudioFrame&) = delete;
  RTCEncodedAudioFrame& operator=(const RTCEncodedAudioFrame&) = delete;
  RTCEncodedAudioFrame(RTCEncodedAudioFrame&&) = delete;
  RTCEncodedAudioFrame& operator=(RTCEncodedAudioFrame&&) = delete;

  // webidl (timestamp and data accessors live in base class)
  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<RTCEncodedAudioFrame> Constructor(
      const GlobalObject& aGlobal, const RTCEncodedAudioFrame& aOriginalFrame,
      const RTCEncodedAudioFrameOptions& aOptions, ErrorResult& aRv);

  void GetMetadata(RTCEncodedAudioFrameMetadata& aMetadata) const;

  bool CheckOwner(RTCRtpScriptTransformer* aOwner) const override;

  bool IsVideo() const override { return false; }

  static JSObject* ReadStructuredClone(JSContext* aCx, nsIGlobalObject* aGlobal,
                                       JSStructuredCloneReader* aReader,
                                       RTCEncodedAudioFrameData& aData);
  bool WriteStructuredClone(JSStructuredCloneWriter* aWriter,
                            StructuredCloneHolder* aHolder) const;

 private:
  virtual ~RTCEncodedAudioFrame() = default;

  // RTCEncodedAudioFrame can run on either main thread or worker thread.
  void AssertIsOnOwningThread() const {
    NS_ASSERT_OWNINGTHREAD(RTCEncodedAudioFrame);
  }
};

}  // namespace mozilla::dom
#endif  // MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDAUDIOFRAME_H_

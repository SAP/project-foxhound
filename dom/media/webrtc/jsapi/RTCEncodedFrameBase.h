/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDFRAMEBASE_H_
#define MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDFRAMEBASE_H_

#include <memory>

#include "js/TypeDecls.h"
#include "mozilla/dom/TypedArray.h"  // ArrayBuffer

class nsIGlobalObject;

namespace webrtc {
class TransformableFrameInterface;
}

namespace mozilla::dom {

struct RTCEncodedFrameState {
  std::unique_ptr<webrtc::TransformableFrameInterface> mFrame;
  uint64_t mCounter = 0;
  unsigned long mTimestamp = 0;

  explicit RTCEncodedFrameState(
      std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
      uint64_t aCounter = 0, unsigned long aTimestamp = 0);

  // work around only having forward-declared TransformableFrameInterface
  ~RTCEncodedFrameState();

  // avoid "move got disabled by a user-declared destructor” trap
  RTCEncodedFrameState() = default;
  RTCEncodedFrameState(RTCEncodedFrameState&&) noexcept = default;
  RTCEncodedFrameState& operator=(RTCEncodedFrameState&&) noexcept = default;
  RTCEncodedFrameState(const RTCEncodedFrameState&) = delete;
  RTCEncodedFrameState& operator=(const RTCEncodedFrameState&) = delete;
};

class RTCRtpScriptTransformer;

class RTCEncodedFrameBase : public nsISupports, public nsWrapperCache {
 public:
  explicit RTCEncodedFrameBase(nsIGlobalObject* aGlobal,
                               RTCEncodedFrameState& aState);

  // nsISupports
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(RTCEncodedFrameBase)

  // Common webidl for RTCEncodedVideoFrame/RTCEncodedAudioFrame
  unsigned long Timestamp() const;

  void SetData(const ArrayBuffer& aData);

  void GetData(JSContext* aCx, JS::Rooted<JSObject*>* aObj) const;

  uint64_t GetCounter() const;

  virtual bool CheckOwner(RTCRtpScriptTransformer* aOwner) const = 0;

  std::unique_ptr<webrtc::TransformableFrameInterface> TakeFrame();

  virtual bool IsVideo() const = 0;

 protected:
  virtual ~RTCEncodedFrameBase();
  void DetachData();

  // forbid copy/move to protect mState
  RTCEncodedFrameBase(const RTCEncodedFrameBase&) = delete;
  RTCEncodedFrameBase& operator=(const RTCEncodedFrameBase&) = delete;
  RTCEncodedFrameBase(RTCEncodedFrameBase&&) = delete;
  RTCEncodedFrameBase& operator=(RTCEncodedFrameBase&&) = delete;

  RefPtr<nsIGlobalObject> mGlobal;

  // Keep serializable state separate in this base and its subclasses
  // in a manner that avoids diamond inheritance. Subclasses must pass
  // in *this, to ensure it's constructed before and destroyed after
  // this base; copy and move are deleted.
  RTCEncodedFrameState& mState;
  JS::Heap<JSObject*> mData;
};

}  // namespace mozilla::dom
#endif  // MOZILLA_DOM_MEDIA_WEBRTC_JSAPI_RTCENCODEDFRAMEBASE_H_

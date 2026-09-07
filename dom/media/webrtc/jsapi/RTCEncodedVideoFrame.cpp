/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "jsapi/RTCEncodedVideoFrame.h"

#include <stdint.h>

#include <memory>
#include <utility>

#include "api/frame_transformer_factory.h"
#include "api/frame_transformer_interface.h"
#include "js/RootingAPI.h"
#include "jsapi/RTCEncodedFrameBase.h"
#include "jsapi/RTCStatsReport.h"
#include "mozilla/Maybe.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/RTCEncodedVideoFrameBinding.h"
#include "mozilla/dom/RTCRtpScriptTransformer.h"
#include "mozilla/dom/StructuredCloneHolder.h"
#include "mozilla/dom/StructuredCloneTags.h"
#include "mozilla/fallible.h"
#include "nsContentUtils.h"
#include "nsIGlobalObject.h"

namespace mozilla::dom {

RTCEncodedVideoFrame::RTCEncodedVideoFrame(
    nsIGlobalObject* aGlobal,
    std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
    uint64_t aCounter, RTCRtpScriptTransformer* aOwner,
    const Maybe<RTCStatsTimestampMaker>& aTimestampMaker)
    : RTCEncodedVideoFrameData{RTCEncodedFrameState{std::move(aFrame), aCounter,
                                                    /*timestamp*/ 0}},
      RTCEncodedFrameBase(aGlobal, static_cast<RTCEncodedFrameState&>(*this),
                          aOwner) {
  InitMetadata();
  const DebugOnly<bool> isReceived =
      mFrame->GetDirection() ==
      webrtc::TransformableFrameInterface::Direction::kReceiver;
  MOZ_ASSERT_IF(isReceived, aTimestampMaker);
  MOZ_ASSERT_IF(isReceived, mFrame->ReceiveTime());
  if (aTimestampMaker) {
    if (const auto receiveTime = mFrame->ReceiveTime()) {
      mMetadata.mReceiveTime.Construct(
          RTCStatsTimestamp::FromRealtime(*aTimestampMaker, *receiveTime)
              .ToDomNoTimeOrigin());
    }
  }
}

RTCEncodedVideoFrame::RTCEncodedVideoFrame(nsIGlobalObject* aGlobal,
                                           RTCEncodedVideoFrameData&& aData)
    : RTCEncodedVideoFrameData{RTCEncodedFrameState{std::move(aData.mFrame),
                                                    aData.mCounter,
                                                    aData.mTimestamp},
                               aData.mType, std::move(aData.mMetadata),
                               aData.mRid},
      RTCEncodedFrameBase(aGlobal, static_cast<RTCEncodedFrameState&>(*this),
                          nullptr) {}

void RTCEncodedVideoFrame::InitMetadata() {
  const auto& videoFrame(
      static_cast<webrtc::TransformableVideoFrameInterface&>(*mFrame));
  mType = videoFrame.IsKeyFrame() ? RTCEncodedVideoFrameType::Key
                                  : RTCEncodedVideoFrameType::Delta;
  auto metadata = videoFrame.Metadata();

  if (metadata.GetFrameId().has_value()) {
    mMetadata.mFrameId.Construct(*metadata.GetFrameId());
  }
  mMetadata.mDependencies.Construct();
  for (const auto dep : metadata.GetFrameDependencies()) {
    (void)mMetadata.mDependencies.Value().AppendElement(
        static_cast<unsigned long long>(dep), fallible);
  }
  mMetadata.mWidth.Construct(metadata.GetWidth());
  mMetadata.mHeight.Construct(metadata.GetHeight());
  if (metadata.GetSpatialIndex() >= 0) {
    mMetadata.mSpatialIndex.Construct(metadata.GetSpatialIndex());
  }
  if (metadata.GetTemporalIndex() >= 0) {
    mMetadata.mTemporalIndex.Construct(metadata.GetTemporalIndex());
  }
  mMetadata.mSynchronizationSource.Construct(videoFrame.GetSsrc());
  mMetadata.mPayloadType.Construct(videoFrame.GetPayloadType());
  mMetadata.mMimeType.Construct(NS_ConvertASCIItoUTF16(mFrame->GetMimeType()));
  mMetadata.mRtpTimestamp.Construct(videoFrame.GetTimestamp());
  mMetadata.mContributingSources.Construct();
  for (const auto csrc : metadata.GetCsrcs()) {
    (void)mMetadata.mContributingSources.Value().AppendElement(csrc, fallible);
  }

  // The metadata timestamp is different, and not presently present in the
  // libwebrtc types
  if (videoFrame.Rid().has_value() && !videoFrame.Rid()->empty()) {
    mRid = Some(videoFrame.Rid()->c_str());
  }
}

JSObject* RTCEncodedVideoFrame::WrapObject(JSContext* aCx,
                                           JS::Handle<JSObject*> aGivenProto) {
  return RTCEncodedVideoFrame_Binding::Wrap(aCx, this, aGivenProto);
}

// https://w3c.github.io/webrtc-encoded-transform/#RTCEncodedVideoFrame-constructor
/* static */
already_AddRefed<RTCEncodedVideoFrame> RTCEncodedVideoFrame::Constructor(
    const GlobalObject& aGlobal, const RTCEncodedVideoFrame& aOriginalFrame,
    const RTCEncodedVideoFrameOptions& aOptions, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }
  auto frame = MakeRefPtr<RTCEncodedVideoFrame>(global, aOriginalFrame.Clone());

  if (aOptions.mMetadata.WasPassed()) {
    const auto& src = aOptions.mMetadata.Value();
    auto& dst = frame->mMetadata;

    auto set_if = [](auto& dst, const auto& src) {
      if (src.WasPassed()) dst.Value() = src.Value();
    };
    set_if(dst.mFrameId, src.mFrameId);
    set_if(dst.mDependencies, src.mDependencies);
    set_if(dst.mWidth, src.mWidth);
    set_if(dst.mHeight, src.mHeight);
    set_if(dst.mSpatialIndex, src.mSpatialIndex);
    set_if(dst.mTemporalIndex, src.mTemporalIndex);
    set_if(dst.mSynchronizationSource, src.mSynchronizationSource);
    set_if(dst.mPayloadType, src.mPayloadType);
    set_if(dst.mMimeType, src.mMimeType);
    set_if(dst.mRtpTimestamp, src.mRtpTimestamp);
    set_if(dst.mReceiveTime, src.mReceiveTime);
    set_if(dst.mContributingSources, src.mContributingSources);
    set_if(dst.mTimestamp, src.mTimestamp);
  }
  return frame.forget();
}

RTCEncodedVideoFrameData RTCEncodedVideoFrameData::Clone() const {
  return RTCEncodedVideoFrameData{
      RTCEncodedFrameState{
          webrtc::CloneVideoFrame(
              static_cast<webrtc::TransformableVideoFrameInterface*>(
                  mFrame.get())),
          mCounter, mTimestamp},
      mType, RTCEncodedVideoFrameMetadata(mMetadata), mRid};
}

RTCEncodedVideoFrameType RTCEncodedVideoFrame::Type() const { return mType; }

void RTCEncodedVideoFrame::GetMetadata(
    RTCEncodedVideoFrameMetadata& aMetadata) {
  aMetadata = mMetadata;
}

bool RTCEncodedVideoFrame::CheckOwner(RTCRtpScriptTransformer* aOwner) const {
  return aOwner == mOwner;
}

Maybe<nsCString> RTCEncodedVideoFrame::Rid() const { return mRid; }

// https://www.w3.org/TR/webrtc-encoded-transform/#RTCEncodedVideoFrame-serialization
/* static */
JSObject* RTCEncodedVideoFrame::ReadStructuredClone(
    JSContext* aCx, nsIGlobalObject* aGlobal, JSStructuredCloneReader* aReader,
    RTCEncodedVideoFrameData& aData) {
  JS::Rooted<JS::Value> value(aCx, JS::NullValue());
  // To avoid a rooting hazard error from returning a raw JSObject* before
  // running the RefPtr destructor, RefPtr needs to be destructed before
  // returning the raw JSObject*, which is why the RefPtr<RTCEncodedVideoFrame>
  // is created in the scope below. Otherwise, the static analysis infers the
  // RefPtr cannot be safely destructed while the unrooted return JSObject* is
  // on the stack.
  {
    auto frame = MakeRefPtr<RTCEncodedVideoFrame>(aGlobal, std::move(aData));
    if (!GetOrCreateDOMReflector(aCx, frame, &value) || !value.isObject()) {
      return nullptr;
    }
  }
  return value.toObjectOrNull();
}

bool RTCEncodedVideoFrame::WriteStructuredClone(
    JSStructuredCloneWriter* aWriter, StructuredCloneHolder* aHolder) const {
  AssertIsOnOwningThread();

  // Indexing the chunk and send the index to the receiver.
  const uint32_t index =
      static_cast<uint32_t>(aHolder->RtcEncodedVideoFrames().Length());
  // The serialization is limited to the same process scope so it's ok to
  // hand over a (copy of a) webrtc internal object here.
  //
  // TODO: optimize later once encoded source API materializes
  // .AppendElement(aHolder->IsTransferred(mData) ? Take() : Clone())
  aHolder->RtcEncodedVideoFrames().AppendElement(Clone());
  return !NS_WARN_IF(
      !JS_WriteUint32Pair(aWriter, SCTAG_DOM_RTCENCODEDVIDEOFRAME, index));
}

}  // namespace mozilla::dom

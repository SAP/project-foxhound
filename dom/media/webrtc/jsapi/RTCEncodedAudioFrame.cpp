/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "jsapi/RTCEncodedAudioFrame.h"

#include <stdint.h>

#include <memory>
#include <utility>

#include "api/frame_transformer_factory.h"
#include "api/frame_transformer_interface.h"
#include "js/RootingAPI.h"
#include "jsapi/RTCEncodedFrameBase.h"
#include "jsapi/RTCRtpScriptTransform.h"
#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/RTCEncodedAudioFrameBinding.h"
#include "mozilla/dom/RTCRtpScriptTransformer.h"
#include "mozilla/dom/StructuredCloneHolder.h"
#include "mozilla/dom/StructuredCloneTags.h"
#include "mozilla/fallible.h"
#include "nsContentUtils.h"
#include "nsCycleCollectionParticipant.h"
#include "nsIGlobalObject.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_CLASS(RTCEncodedAudioFrame)
NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(RTCEncodedAudioFrame,
                                                RTCEncodedFrameBase)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mOwner)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(RTCEncodedAudioFrame,
                                                  RTCEncodedFrameBase)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mOwner)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END
NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN_INHERITED(RTCEncodedAudioFrame,
                                               RTCEncodedFrameBase)
  NS_IMPL_CYCLE_COLLECTION_TRACE_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_TRACE_END
NS_IMPL_ADDREF_INHERITED(RTCEncodedAudioFrame, RTCEncodedFrameBase)
NS_IMPL_RELEASE_INHERITED(RTCEncodedAudioFrame, RTCEncodedFrameBase)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(RTCEncodedAudioFrame)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
NS_INTERFACE_MAP_END_INHERITING(RTCEncodedFrameBase)

RTCEncodedAudioFrame::RTCEncodedAudioFrame(
    nsIGlobalObject* aGlobal,
    std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
    uint64_t aCounter, RTCRtpScriptTransformer* aOwner)
    : RTCEncodedAudioFrameData{RTCEncodedFrameState{std::move(aFrame), aCounter,
                                                    /*timestamp*/ 0}},
      RTCEncodedFrameBase(aGlobal, static_cast<RTCEncodedFrameState&>(*this)),
      mOwner(aOwner) {
  mMetadata.mSynchronizationSource.Construct(mFrame->GetSsrc());
  mMetadata.mPayloadType.Construct(mFrame->GetPayloadType());
  const auto& audioFrame(
      static_cast<webrtc::TransformableAudioFrameInterface&>(*mFrame));
  mMetadata.mContributingSources.Construct();
  for (const auto csrc : audioFrame.GetContributingSources()) {
    (void)mMetadata.mContributingSources.Value().AppendElement(csrc, fallible);
  }
  if (const auto optionalSeqNum = audioFrame.SequenceNumber()) {
    mMetadata.mSequenceNumber.Construct(*optionalSeqNum);
  }

  // Base class needs this, but can't do it itself because of an assertion in
  // the cycle-collector.
  mozilla::HoldJSObjects(this);
}

RTCEncodedAudioFrame::RTCEncodedAudioFrame(nsIGlobalObject* aGlobal,
                                           RTCEncodedAudioFrameData&& aData)
    : RTCEncodedAudioFrameData{RTCEncodedFrameState{std::move(aData.mFrame),
                                                    aData.mCounter,
                                                    aData.mTimestamp},
                               std::move(aData.mMetadata)},
      RTCEncodedFrameBase(aGlobal, static_cast<RTCEncodedFrameState&>(*this)),
      mOwner(nullptr) {
  // Base class needs this, but can't do it itself because of an assertion in
  // the cycle-collector.
  mozilla::HoldJSObjects(this);
}

RTCEncodedAudioFrame::~RTCEncodedAudioFrame() {
  // Clear JS::Heap<> members before unregistering as a script holder,
  // so their destructors don't barrier against a finalized JS object.
  mData = nullptr;  // from RTCEncodedFrameBase (protected)
  // Base class needs this, but can't do it itself because of an assertion in
  // the cycle-collector.
  mozilla::DropJSObjects(this);
}

JSObject* RTCEncodedAudioFrame::WrapObject(JSContext* aCx,
                                           JS::Handle<JSObject*> aGivenProto) {
  return RTCEncodedAudioFrame_Binding::Wrap(aCx, this, aGivenProto);
}

// https://w3c.github.io/webrtc-encoded-transform/#RTCEncodedAudioFrame-constructor
/* static */
already_AddRefed<RTCEncodedAudioFrame> RTCEncodedAudioFrame::Constructor(
    const GlobalObject& aGlobal, const RTCEncodedAudioFrame& aOriginalFrame,
    const RTCEncodedAudioFrameOptions& aOptions, ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }
  auto frame = MakeRefPtr<RTCEncodedAudioFrame>(global, aOriginalFrame.Clone());

  if (aOptions.mMetadata.WasPassed()) {
    const auto& src = aOptions.mMetadata.Value();
    auto& dst = frame->mMetadata;

    auto set_if = [](auto& dst, const auto& src) {
      if (src.WasPassed()) dst.Value() = src.Value();
    };
    set_if(dst.mSynchronizationSource, src.mSynchronizationSource);
    set_if(dst.mPayloadType, src.mPayloadType);
    set_if(dst.mContributingSources, src.mContributingSources);
    set_if(dst.mSequenceNumber, src.mSequenceNumber);
  }
  return frame.forget();
}

RTCEncodedAudioFrameData RTCEncodedAudioFrameData::Clone() const {
  return RTCEncodedAudioFrameData{
      RTCEncodedFrameState{webrtc::CloneAudioFrame(
          static_cast<webrtc::TransformableAudioFrameInterface*>(
              mFrame.get()))},
      RTCEncodedAudioFrameMetadata(mMetadata)};
}

nsIGlobalObject* RTCEncodedAudioFrame::GetParentObject() const {
  return mGlobal;
}

void RTCEncodedAudioFrame::GetMetadata(
    RTCEncodedAudioFrameMetadata& aMetadata) const {
  aMetadata = mMetadata;
}

bool RTCEncodedAudioFrame::CheckOwner(RTCRtpScriptTransformer* aOwner) const {
  return aOwner == mOwner;
}

// https://www.w3.org/TR/webrtc-encoded-transform/#RTCEncodedAudioFrame-serialization
/* static */
JSObject* RTCEncodedAudioFrame::ReadStructuredClone(
    JSContext* aCx, nsIGlobalObject* aGlobal, JSStructuredCloneReader* aReader,
    RTCEncodedAudioFrameData& aData) {
  JS::Rooted<JS::Value> value(aCx, JS::NullValue());
  // To avoid a rooting hazard error from returning a raw JSObject* before
  // running the RefPtr destructor, RefPtr needs to be destructed before
  // returning the raw JSObject*, which is why the RefPtr<RTCEncodedAudioFrame>
  // is created in the scope below. Otherwise, the static analysis infers the
  // RefPtr cannot be safely destructed while the unrooted return JSObject* is
  // on the stack.
  {
    auto frame = MakeRefPtr<RTCEncodedAudioFrame>(aGlobal, std::move(aData));
    if (!GetOrCreateDOMReflector(aCx, frame, &value) || !value.isObject()) {
      return nullptr;
    }
  }
  return value.toObjectOrNull();
}

bool RTCEncodedAudioFrame::WriteStructuredClone(
    JSStructuredCloneWriter* aWriter, StructuredCloneHolder* aHolder) const {
  AssertIsOnOwningThread();

  // Indexing the chunk and send the index to the receiver.
  const uint32_t index =
      static_cast<uint32_t>(aHolder->RtcEncodedAudioFrames().Length());
  // The serialization is limited to the same process scope so it's ok to
  // hand over a (copy of a) webrtc internal object here.
  //
  // TODO: optimize later once encoded source API materializes
  // .AppendElement(aHolder->IsTransferred(mData) ? Take() : Clone())
  aHolder->RtcEncodedAudioFrames().AppendElement(Clone());
  return !NS_WARN_IF(
      !JS_WriteUint32Pair(aWriter, SCTAG_DOM_RTCENCODEDAUDIOFRAME, index));
}

}  // namespace mozilla::dom

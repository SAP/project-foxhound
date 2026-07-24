/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "jsapi/RTCEncodedFrameBase.h"

#include "api/frame_transformer_interface.h"
#include "js/ArrayBuffer.h"
#include "js/GCAPI.h"
#include "mozilla/dom/ScriptSettings.h"
#include "nsIGlobalObject.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_CLASS(RTCEncodedFrameBase)
NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(RTCEncodedFrameBase)
  using ::ImplCycleCollectionUnlink;
  tmp->DetachData();
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mGlobal)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mData)
NS_IMPL_CYCLE_COLLECTION_UNLINK_END
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(RTCEncodedFrameBase)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mGlobal)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END
NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(RTCEncodedFrameBase)
  NS_IMPL_CYCLE_COLLECTION_TRACE_JS_MEMBERS(mData)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(RTCEncodedFrameBase)
NS_IMPL_CYCLE_COLLECTING_RELEASE(RTCEncodedFrameBase)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(RTCEncodedFrameBase)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

RTCEncodedFrameBase::RTCEncodedFrameBase(nsIGlobalObject* aGlobal,
                                         RTCEncodedFrameState& aState)
    : mGlobal(aGlobal), mState(aState), mData(nullptr) {
  mState.mTimestamp = mState.mFrame->GetTimestamp();
  AutoJSAPI jsapi;
  if (NS_WARN_IF(!jsapi.Init(mGlobal))) {
    return;
  }

  // Avoid a copy
  mData = JS::NewArrayBufferWithUserOwnedContents(
      jsapi.cx(), mState.mFrame->GetData().size(),
      (void*)(mState.mFrame->GetData().data()));
}

RTCEncodedFrameState::RTCEncodedFrameState(
    std::unique_ptr<webrtc::TransformableFrameInterface> aFrame,
    uint64_t aCounter, unsigned long aTimestamp)
    : mFrame(std::move(aFrame)), mCounter(aCounter), mTimestamp(aTimestamp) {}

RTCEncodedFrameBase::~RTCEncodedFrameBase() { DetachData(); }

void RTCEncodedFrameBase::DetachData() {
  // We might have handled this in unlink already
  if (mGlobal) {
    AutoJSAPI jsapi;
    if (NS_WARN_IF(!jsapi.Init(mGlobal))) {
      return;
    }

    JS::Rooted<JSObject*> rootedData(jsapi.cx(), mData);
    if (rootedData) {
      JS::DetachArrayBuffer(jsapi.cx(), rootedData);
    }
  }
}

unsigned long RTCEncodedFrameBase::Timestamp() const {
  return mState.mTimestamp;
}

void RTCEncodedFrameBase::SetData(const ArrayBuffer& aData) {
  DetachData();
  mData.set(aData.Obj());
  if (mState.mFrame) {
    aData.ProcessData([&](const Span<uint8_t>& aData, JS::AutoCheckCannotGC&&) {
      mState.mFrame->SetData(
          webrtc::ArrayView<const uint8_t>(aData.Elements(), aData.Length()));
    });
  }
}

void RTCEncodedFrameBase::GetData(JSContext* aCx,
                                  JS::Rooted<JSObject*>* aObj) const {
  aObj->set(mData);
}

uint64_t RTCEncodedFrameBase::GetCounter() const { return mState.mCounter; }

std::unique_ptr<webrtc::TransformableFrameInterface>
RTCEncodedFrameBase::TakeFrame() {
  DetachData();
  return std::move(mState.mFrame);
}

RTCEncodedFrameState::~RTCEncodedFrameState() = default;

}  // namespace mozilla::dom

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/Pose.h"

#include "js/experimental/TypedData.h"  // JS_GetFloat32ArrayData
#include "mozilla/ErrorResult.h"
#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/dom/TypedArray.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_WITH_JS_MEMBERS(
    Pose, (mParent),
    (mPosition, mLinearVelocity, mLinearAcceleration, mOrientation,
     mAngularVelocity, mAngularAcceleration))

Pose::Pose(nsISupports* aParent)
    : mParent(aParent),
      mPosition(nullptr),
      mLinearVelocity(nullptr),
      mLinearAcceleration(nullptr),
      mOrientation(nullptr),
      mAngularVelocity(nullptr),
      mAngularAcceleration(nullptr) {
  mozilla::HoldJSObjects(this);
}

Pose::~Pose() { mozilla::DropJSObjects(this); }

nsISupports* Pose::GetParentObject() const { return mParent; }

void Pose::SetFloat32Array(JSContext* aJSContext, nsWrapperCache* creator,
                           JS::MutableHandle<JSObject*> aRetVal,
                           JS::Heap<JSObject*>& aObj, float* aVal,
                           uint32_t aValLength, ErrorResult& aRv) {
  if (!aVal || aValLength == 0) {
    // Array can be erased by passing a nullptr or a zero length as the source.
    aObj = nullptr;
  } else if (!aObj || JS_GetTypedArrayLength(aObj) != aValLength) {
    // If the array doesn't exist or is the wrong length, create a new one and
    // copy the source into it.
    aObj =
        Float32Array::Create(aJSContext, creator, Span(aVal, aValLength), aRv);
  } else {
    // Array exists and is the correct length. Just copy source into it.
    JS::AutoCheckCannotGC nogc;
    bool isShared = false;
    float* data = JS_GetFloat32ArrayData(aObj, &isShared, nogc);
    MOZ_ASSERT(data);
    memcpy(data, aVal, aValLength * sizeof(float));
  }

  if (!aRv.Failed()) {
    aRetVal.set(aObj);
  }
}

}  // namespace mozilla::dom

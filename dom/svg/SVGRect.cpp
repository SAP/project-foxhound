/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SVGRect.h"

#include "SVGAnimatedViewBox.h"
#include "mozilla/dom/SVGRectBinding.h"
#include "mozilla/dom/SVGSVGElement.h"
#include "nsWrapperCache.h"

using namespace mozilla::gfx;

namespace mozilla::dom {

//----------------------------------------------------------------------
// nsISupports methods:

NS_SVG_VAL_IMPL_CYCLE_COLLECTION_WRAPPERCACHED(SVGRect, mParent)

//----------------------------------------------------------------------
// implementation:

SVGRect::SVGRect(SVGSVGElement* aSVGElement)
    : mVal(nullptr), mParent(aSVGElement), mType(RectType::CreatedValue) {
  MOZ_ASSERT(mParent);
  mRect = gfx::Rect(0, 0, 0, 0);
}

JSObject* SVGRect::WrapObject(JSContext* aCx,
                              JS::Handle<JSObject*> aGivenProto) {
  MOZ_ASSERT(mParent);
  return SVGRect_Binding::Wrap(aCx, this, aGivenProto);
}

float SVGRect::X() {
  switch (mType) {
    case RectType::AnimValue:
      static_cast<SVGElement*>(mParent.get())->FlushAnimations();
      return mVal->GetAnimValue().x;
    case RectType::BaseValue:
      return mVal->GetBaseValue().x;
    default:
      return mRect.x;
  }
}

float SVGRect::Y() {
  switch (mType) {
    case RectType::AnimValue:
      static_cast<SVGElement*>(mParent.get())->FlushAnimations();
      return mVal->GetAnimValue().y;
    case RectType::BaseValue:
      return mVal->GetBaseValue().y;
    default:
      return mRect.y;
  }
}

float SVGRect::Width() {
  switch (mType) {
    case RectType::AnimValue:
      static_cast<SVGElement*>(mParent.get())->FlushAnimations();
      return mVal->GetAnimValue().width;
    case RectType::BaseValue:
      return mVal->GetBaseValue().width;
    default:
      return mRect.width;
  }
}

float SVGRect::Height() {
  switch (mType) {
    case RectType::AnimValue:
      static_cast<SVGElement*>(mParent.get())->FlushAnimations();
      return mVal->GetAnimValue().height;
    case RectType::BaseValue:
      return mVal->GetBaseValue().height;
    default:
      return mRect.height;
  }
}

void SVGRect::SetX(float aX, ErrorResult& aRv) {
  switch (mType) {
    case RectType::AnimValue:
      aRv.ThrowNoModificationAllowedError("Animated values cannot be set");
      return;
    case RectType::BaseValue:
      mVal->SetBaseX(aX, static_cast<SVGElement*>(mParent.get()));
      return;
    default:
      mRect.x = aX;
  }
}

void SVGRect::SetY(float aY, ErrorResult& aRv) {
  switch (mType) {
    case RectType::AnimValue:
      aRv.ThrowNoModificationAllowedError("Animated values cannot be set");
      return;
    case RectType::BaseValue:
      mVal->SetBaseY(aY, static_cast<SVGElement*>(mParent.get()));
      return;
    default:
      mRect.y = aY;
  }
}

void SVGRect::SetWidth(float aWidth, ErrorResult& aRv) {
  switch (mType) {
    case RectType::AnimValue:
      aRv.ThrowNoModificationAllowedError("Animated values cannot be set");
      return;
    case RectType::BaseValue: {
      mVal->SetBaseWidth(aWidth, static_cast<SVGElement*>(mParent.get()));
      return;
    }
    default:
      mRect.width = aWidth;
  }
}

void SVGRect::SetHeight(float aHeight, ErrorResult& aRv) {
  switch (mType) {
    case RectType::AnimValue:
      aRv.ThrowNoModificationAllowedError("Animated values cannot be set");
      return;
    case RectType::BaseValue:
      mVal->SetBaseHeight(aHeight, static_cast<SVGElement*>(mParent.get()));
      return;
    default:
      mRect.height = aHeight;
  }
}

}  // namespace mozilla::dom

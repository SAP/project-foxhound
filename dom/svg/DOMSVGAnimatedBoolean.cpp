/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DOMSVGAnimatedBoolean.h"

#include "SVGAnimatedBoolean.h"
#include "mozilla/dom/SVGAnimatedBooleanBinding.h"

namespace mozilla::dom {

NS_SVG_VAL_IMPL_CYCLE_COLLECTION_WRAPPERCACHED(DOMSVGAnimatedBoolean,
                                               mSVGElement)

JSObject* DOMSVGAnimatedBoolean::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return SVGAnimatedBoolean_Binding::Wrap(aCx, this, aGivenProto);
}

bool DOMSVGAnimatedBoolean::BaseVal() const { return mVal->GetBaseValue(); }

void DOMSVGAnimatedBoolean::SetBaseVal(bool aValue) {
  mVal->SetBaseValue(aValue, mSVGElement);
}

bool DOMSVGAnimatedBoolean::AnimVal() const {
  mSVGElement->FlushAnimations();
  return mVal->GetAnimValue();
}

}  // namespace mozilla::dom

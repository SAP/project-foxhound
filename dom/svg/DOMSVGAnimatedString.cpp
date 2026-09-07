/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DOMSVGAnimatedString.h"

#include "mozilla/SVGAnimatedClassOrString.h"
#include "mozilla/dom/SVGAnimatedStringBinding.h"

namespace mozilla::dom {

NS_SVG_VAL_IMPL_CYCLE_COLLECTION_WRAPPERCACHED(DOMSVGAnimatedString,
                                               mSVGElement)

JSObject* DOMSVGAnimatedString::WrapObject(JSContext* aCx,
                                           JS::Handle<JSObject*> aGivenProto) {
  return SVGAnimatedString_Binding::Wrap(aCx, this, aGivenProto);
}

DOMSVGAnimatedString::~DOMSVGAnimatedString() { mVal->RemoveTearoff(); }

void DOMSVGAnimatedString::GetBaseVal(OwningTrustedScriptURLOrString& aResult) {
  mVal->GetBaseValue(aResult, mSVGElement);
}

void DOMSVGAnimatedString::SetBaseVal(const TrustedScriptURLOrString& aValue,
                                      nsIPrincipal* aSubjectPrincipal,
                                      ErrorResult& aRv) {
  RefPtr<SVGElement> svgElement = mSVGElement;
  mVal->SetBaseValue(aValue, svgElement, true, aSubjectPrincipal, aRv);
}

void DOMSVGAnimatedString::GetAnimVal(nsAString& aResult) {
  mSVGElement->FlushAnimations();
  mVal->GetAnimValue(aResult, mSVGElement);
}

}  // namespace mozilla::dom

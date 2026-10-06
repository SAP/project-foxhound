/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SVG_DOMSVGANIMATEDSTRING_H_
#define DOM_SVG_DOMSVGANIMATEDSTRING_H_

#include "mozilla/dom/SVGElement.h"

class nsIPrincipal;

namespace mozilla {
class SVGAnimatedClassOrString;
namespace dom {

class OwningTrustedScriptURLOrString;
class TrustedScriptURLOrString;

class DOMSVGAnimatedString final : public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_NATIVE_CLASS(DOMSVGAnimatedString)
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(DOMSVGAnimatedString)

  DOMSVGAnimatedString(SVGAnimatedClassOrString* aVal, SVGElement* aSVGElement)
      : mVal(aVal), mSVGElement(aSVGElement) {}

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // WebIDL
  SVGElement* GetParentObject() const { return mSVGElement; }

  void GetBaseVal(OwningTrustedScriptURLOrString& aResult);
  MOZ_CAN_RUN_SCRIPT void SetBaseVal(const TrustedScriptURLOrString& aValue,
                                     nsIPrincipal* aSubjectPrincipal,
                                     ErrorResult& aRv);
  void GetAnimVal(nsAString& aResult);

 private:
  ~DOMSVGAnimatedString();

  SVGAnimatedClassOrString* mVal;  // kept alive because it belongs to content
  RefPtr<SVGElement> mSVGElement;
};

}  // namespace dom
}  // namespace mozilla

#endif  // DOM_SVG_DOMSVGANIMATEDSTRING_H_

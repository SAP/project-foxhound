/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSSKEWY_H_
#define LAYOUT_STYLE_TYPEDOM_CSSSKEWY_H_

#include "js/TypeDecls.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "mozilla/dom/CSSTransformComponent.h"
#include "nsCycleCollectionParticipant.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;
struct StyleNumericValue;
using StyleSkewYComponent = StyleNumericValue;

namespace dom {

class GlobalObject;

class CSSSkewY final : public CSSTransformComponent {
 public:
  CSSSkewY(nsCOMPtr<nsISupports> aParent, bool aIs2D,
           RefPtr<CSSNumericValue> aAy);

  static RefPtr<CSSSkewY> Create(nsCOMPtr<nsISupports> aParent,
                                 const StyleSkewYComponent& aSkewYComponent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSSkewY, CSSTransformComponent)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSSkewY Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskewy-cssskewy
  static already_AddRefed<CSSSkewY> Constructor(const GlobalObject& aGlobal,
                                                CSSNumericValue& aAy,
                                                ErrorResult& aRv);

  CSSNumericValue* Ay() const;

  void SetAy(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSSkewY Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSSkewY() = default;

  RefPtr<CSSNumericValue> mAy;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSSKEWY_H_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_
#define LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_

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
struct StyleSkewComponent;

namespace dom {

class GlobalObject;

class CSSSkew final : public CSSTransformComponent {
 public:
  CSSSkew(nsCOMPtr<nsISupports> aParent, bool aIs2D, RefPtr<CSSNumericValue> aX,
          RefPtr<CSSNumericValue> aY);

  static RefPtr<CSSSkew> Create(nsCOMPtr<nsISupports> aParent,
                                const StyleSkewComponent& aSkewComponent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSSkew, CSSTransformComponent)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSSkew Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskew-cssskew
  static already_AddRefed<CSSSkew> Constructor(const GlobalObject& aGlobal,
                                               CSSNumericValue& aAx,
                                               CSSNumericValue& aAy,
                                               ErrorResult& aRv);

  CSSNumericValue* Ax() const;

  void SetAx(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* Ay() const;

  void SetAy(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSSkew Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSSkew() = default;

  RefPtr<CSSNumericValue> mAx;
  RefPtr<CSSNumericValue> mAy;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSSKEW_H_

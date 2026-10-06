/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSSKEWX_H_
#define LAYOUT_STYLE_TYPEDOM_CSSSKEWX_H_

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
using StyleSkewXComponent = StyleNumericValue;

namespace dom {

class GlobalObject;

class CSSSkewX final : public CSSTransformComponent {
 public:
  CSSSkewX(nsCOMPtr<nsISupports> aParent, bool aIs2D,
           RefPtr<CSSNumericValue> aAx);

  static RefPtr<CSSSkewX> Create(nsCOMPtr<nsISupports> aParent,
                                 const StyleSkewXComponent& aSkewXComponent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSSkewX, CSSTransformComponent)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSSkewX Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssskewx-cssskewx
  static already_AddRefed<CSSSkewX> Constructor(const GlobalObject& aGlobal,
                                                CSSNumericValue& aAx,
                                                ErrorResult& aRv);

  CSSNumericValue* Ax() const;

  void SetAx(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSSkewX Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSSkewX() = default;

  RefPtr<CSSNumericValue> mAx;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSSKEWX_H_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSPerspectiveBinding.h"
#include "mozilla/dom/CSSPerspectiveBindingFwd.h"
#include "mozilla/dom/CSSTransformComponent.h"
#include "nsCycleCollectionParticipant.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;
struct StylePerspectiveComponent;

namespace dom {

class GlobalObject;

class CSSPerspective final : public CSSTransformComponent {
 public:
  CSSPerspective(nsCOMPtr<nsISupports> aParent, bool aIs2D,
                 OwningCSSPerspectiveValue aLength);

  static RefPtr<CSSPerspective> Create(
      nsCOMPtr<nsISupports> aParent,
      const StylePerspectiveComponent& aPerspectiveComponent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSPerspective,
                                           CSSTransformComponent)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSPerspective Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssperspective-cssperspective
  static already_AddRefed<CSSPerspective> Constructor(
      const GlobalObject& aGlobal, const CSSPerspectiveValue& aLength,
      ErrorResult& aRv);

  void GetLength(OwningCSSPerspectiveValue& aRetVal) const;

  void SetLength(const CSSPerspectiveValue& aArg, ErrorResult& aRv);

  // end of CSSPerspective Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSPerspective() = default;

  OwningCSSPerspectiveValue mLength;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSPERSPECTIVE_H_

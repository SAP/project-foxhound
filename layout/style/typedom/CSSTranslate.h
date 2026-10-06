/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_

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
struct StyleTranslateComponent;

namespace dom {

class GlobalObject;
template <typename T>
class NonNull;
template <typename T>
class Optional;

class CSSTranslate final : public CSSTransformComponent {
 public:
  CSSTranslate(nsCOMPtr<nsISupports> aParent, bool aIs2D,
               RefPtr<CSSNumericValue> aX, RefPtr<CSSNumericValue> aY,
               RefPtr<CSSNumericValue> aZ);

  static RefPtr<CSSTranslate> Create(
      nsCOMPtr<nsISupports> aParent,
      const StyleTranslateComponent& aTranslateComponent);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSTranslate, CSSTransformComponent)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSTranslate Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csstranslate-csstranslate
  static already_AddRefed<CSSTranslate> Constructor(
      const GlobalObject& aGlobal, CSSNumericValue& aX, CSSNumericValue& aY,
      const Optional<NonNull<CSSNumericValue>>& aZ, ErrorResult& aRv);

  CSSNumericValue* X() const;

  void SetX(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* Y() const;

  void SetY(CSSNumericValue& aArg, ErrorResult& aRv);

  CSSNumericValue* Z() const;

  void SetZ(CSSNumericValue& aArg, ErrorResult& aRv);

  // end of CSSTranslate Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSTranslate() = default;

  RefPtr<CSSNumericValue> mX;
  RefPtr<CSSNumericValue> mY;
  RefPtr<CSSNumericValue> mZ;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSTRANSLATE_H_

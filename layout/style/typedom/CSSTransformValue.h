/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMVALUE_H_

#include <stdint.h>

#include "js/TypeDecls.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/CSSTransformComponentBindingFwd.h"
#include "mozilla/dom/DOMMatrixBindingFwd.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupportsImpl.h"
#include "nsTArray.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;
template <class T>
class OwningNonNull;

namespace dom {

class GlobalObject;
template <typename T>
class Sequence;

class CSSTransformValue final : public CSSStyleValue {
 public:
  CSSTransformValue(nsCOMPtr<nsISupports> aParent,
                    nsTArray<RefPtr<CSSTransformComponent>> aValues);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSTransformValue, CSSStyleValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSTransformValue Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csstransformvalue-csstransformvalue
  static already_AddRefed<CSSTransformValue> Constructor(
      const GlobalObject& aGlobal,
      const Sequence<OwningNonNull<CSSTransformComponent>>& aTransforms,
      ErrorResult& aRv);

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csstransformvalue-length
  uint32_t Length() const;

  bool Is2D() const;

  already_AddRefed<DOMMatrix> ToMatrix(ErrorResult& aRv);

  CSSTransformComponent* IndexedGetter(uint32_t aIndex, bool& aFound);

  void IndexedSetter(uint32_t aIndex, CSSTransformComponent& aVal,
                     ErrorResult& aRv);

  // end of CSSTransformValue Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 private:
  virtual ~CSSTransformValue() = default;

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-csstransformvalue-values-slot
  nsTArray<RefPtr<CSSTransformComponent>> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMVALUE_H_

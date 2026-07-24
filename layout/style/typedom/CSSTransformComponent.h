/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMCOMPONENT_H_
#define LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMCOMPONENT_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/DOMMatrixBindingFwd.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
#include "nsWrapperCache.h"

template <class T>
struct already_AddRefed;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;

namespace dom {

class CSSTranslate;
class CSSRotate;
class CSSScale;
class CSSSkew;
class CSSSkewX;
class CSSSkewY;
class CSSPerspective;
class CSSMatrixComponent;

class CSSTransformComponent : public nsISupports, public nsWrapperCache {
 public:
  enum class TransformComponentType {
    Translate,
    Rotate,
    Scale,
    Skew,
    SkewX,
    SkewY,
    Perspective,
    MatrixComponent
  };

  CSSTransformComponent(nsCOMPtr<nsISupports> aParent,
                        TransformComponentType aTransformComponentType);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(CSSTransformComponent)

  nsISupports* GetParentObject() const;

  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSTransformComponent Web IDL declarations

  bool Is2D() const;

  void SetIs2D(bool aArg);

  already_AddRefed<DOMMatrix> ToMatrix(ErrorResult& aRv);

  void Stringify(nsACString&);

  // end of CSSTransformComponent Web IDL declarations

  TransformComponentType GetTransformComponentType() const {
    return mTransformComponentType;
  }

  bool IsCSSTranslate() const;

  // Defined in CSSTranslate.cpp
  const CSSTranslate& GetAsCSSTranslate() const;

  // Defined in CSSTranslate.cpp
  CSSTranslate& GetAsCSSTranslate();

  bool IsCSSRotate() const;

  // Defined in CSSRotate.cpp
  const CSSRotate& GetAsCSSRotate() const;

  // Defined in CSSRotate.cpp
  CSSRotate& GetAsCSSRotate();

  bool IsCSSScale() const;

  // Defined in CSSScale.cpp
  const CSSScale& GetAsCSSScale() const;

  // Defined in CSSScale.cpp
  CSSScale& GetAsCSSScale();

  bool IsCSSSkew() const;

  // Defined in CSSSkew.cpp
  const CSSSkew& GetAsCSSSkew() const;

  // Defined in CSSSkew.cpp
  CSSSkew& GetAsCSSSkew();

  bool IsCSSSkewX() const;

  // Defined in CSSSkewX.cpp
  const CSSSkewX& GetAsCSSSkewX() const;

  // Defined in CSSSkewX.cpp
  CSSSkewX& GetAsCSSSkewX();

  bool IsCSSSkewY() const;

  // Defined in CSSSkewY.cpp
  const CSSSkewY& GetAsCSSSkewY() const;

  // Defined in CSSSkewY.cpp
  CSSSkewY& GetAsCSSSkewY();

  bool IsCSSPerspective() const;

  // Defined in CSSPerspective.cpp
  const CSSPerspective& GetAsCSSPerspective() const;

  // Defined in CSSPerspective.cpp
  CSSPerspective& GetAsCSSPerspective();

  bool IsCSSMatrixComponent() const;

  // Defined in CSSMatrixComponent.cpp
  const CSSMatrixComponent& GetAsCSSMatrixComponent() const;

  // Defined in CSSMatrixComponent.cpp
  CSSMatrixComponent& GetAsCSSMatrixComponent();

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSTransformComponent() = default;

  nsCOMPtr<nsISupports> mParent;
  const TransformComponentType mTransformComponentType;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSTRANSFORMCOMPONENT_H_

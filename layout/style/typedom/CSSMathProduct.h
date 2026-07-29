/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHPRODUCT_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHPRODUCT_H_

#include "js/TypeDecls.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSMathValue.h"
#include "mozilla/dom/CSSNumericArrayBindingFwd.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupportsImpl.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;
struct StyleNumericValue;
using StyleMathProduct = CopyableTArray<StyleNumericValue>;

namespace dom {

class CSSNumericArray;
class GlobalObject;
template <typename T>
class Sequence;

class CSSMathProduct final : public CSSMathValue {
 public:
  CSSMathProduct(nsCOMPtr<nsISupports> aParent,
                 RefPtr<CSSNumericArray> aValues);

  static RefPtr<CSSMathProduct> Create(nsCOMPtr<nsISupports> aParent,
                                       const StyleMathProduct& aMathProduct);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathProduct, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathProduct Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathproduct-cssmathproduct
  static already_AddRefed<CSSMathProduct> Constructor(
      const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
      ErrorResult& aRv);

  CSSNumericArray* Values() const;

  // end of CSSMathProduct Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             const SerializationContext& aContext,
                             nsACString& aDest) const;

  StyleMathProduct ToStyleMathProduct() const;

 private:
  virtual ~CSSMathProduct() = default;

  RefPtr<CSSNumericArray> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHPRODUCT_H_

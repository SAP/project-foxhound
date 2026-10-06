/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_

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
using StyleMathMin = CopyableTArray<StyleNumericValue>;

namespace dom {

class GlobalObject;
template <typename T>
class Sequence;

class CSSMathMin final : public CSSMathValue {
 public:
  CSSMathMin(nsCOMPtr<nsISupports> aParent, RefPtr<CSSNumericArray> aValues);

  static RefPtr<CSSMathMin> Create(nsCOMPtr<nsISupports> aParent,
                                   const StyleMathMin& aMathMin);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathMin, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathMin Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathmin-cssmathmin
  static already_AddRefed<CSSMathMin> Constructor(
      const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
      ErrorResult& aRv);

  CSSNumericArray* Values() const;

  // end of CSSMathMin Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             const SerializationContext& aContext,
                             nsACString& aDest) const;

  StyleMathMin ToStyleMathMin() const;

 private:
  virtual ~CSSMathMin() = default;

  RefPtr<CSSNumericArray> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHMIN_H_

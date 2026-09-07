/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHMAX_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHMAX_H_

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
using StyleMathMax = CopyableTArray<StyleNumericValue>;

namespace dom {

class GlobalObject;
template <typename T>
class Sequence;

class CSSMathMax final : public CSSMathValue {
 public:
  explicit CSSMathMax(nsCOMPtr<nsISupports> aParent,
                      RefPtr<CSSNumericArray> aValues);

  static RefPtr<CSSMathMax> Create(nsCOMPtr<nsISupports> aParent,
                                   const StyleMathMax& aMathMax);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathMax, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathMax Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathmax-cssmathmax
  static already_AddRefed<CSSMathMax> Constructor(
      const GlobalObject& aGlobal, const Sequence<OwningCSSNumberish>& aArgs,
      ErrorResult& aRv);

  CSSNumericArray* Values() const;

  // end of CSSMathMax Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             const SerializationContext& aContext,
                             nsACString& aDest) const;

  StyleMathMax ToStyleMathMax() const;

 private:
  virtual ~CSSMathMax() = default;

  RefPtr<CSSNumericArray> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHMAX_H_

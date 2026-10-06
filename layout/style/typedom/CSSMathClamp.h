/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_

#include "js/TypeDecls.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/CSSMathValue.h"
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
template <typename T, size_t N>
struct StyleOwnedArray;
using StyleMathClamp = StyleOwnedArray<StyleNumericValue, 3>;

namespace dom {

class GlobalObject;

class CSSMathClamp final : public CSSMathValue {
 public:
  CSSMathClamp(nsCOMPtr<nsISupports> aParent, RefPtr<CSSNumericValue> aLower,
               RefPtr<CSSNumericValue> aValue, RefPtr<CSSNumericValue> aUpper);

  static RefPtr<CSSMathClamp> Create(nsCOMPtr<nsISupports> aParent,
                                     const StyleMathClamp& aMathClamp);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathClamp, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathClamp Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathclamp-cssmathclamp
  static already_AddRefed<CSSMathClamp> Constructor(const GlobalObject& aGlobal,
                                                    const CSSNumberish& aLower,
                                                    const CSSNumberish& aValue,
                                                    const CSSNumberish& aUpper,
                                                    ErrorResult& aRv);

  CSSNumericValue* Lower() const;

  CSSNumericValue* Value() const;

  CSSNumericValue* Upper() const;

  // end of CSSMathClamp Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             const SerializationContext& aContext,
                             nsACString& aDest) const;

  StyleMathClamp ToStyleMathClamp() const;

 private:
  virtual ~CSSMathClamp() = default;

  RefPtr<CSSNumericValue> mLower;
  RefPtr<CSSNumericValue> mValue;
  RefPtr<CSSNumericValue> mUpper;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHCLAMP_H_

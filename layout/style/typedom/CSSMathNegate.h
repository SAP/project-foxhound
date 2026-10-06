/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSMATHNEGATE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSMATHNEGATE_H_

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
template <typename T>
struct StyleBox;
struct StyleNumericValue;
using StyleMathNegate = StyleBox<StyleNumericValue>;

namespace dom {

class GlobalObject;

class CSSMathNegate final : public CSSMathValue {
 public:
  CSSMathNegate(nsCOMPtr<nsISupports> aParent, RefPtr<CSSNumericValue> aValue);

  static RefPtr<CSSMathNegate> Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleMathNegate& aMathNegate);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSMathNegate, CSSMathValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSMathNegate Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssmathnegate-cssmathnegate
  static already_AddRefed<CSSMathNegate> Constructor(
      const GlobalObject& aGlobal, const CSSNumberish& aArg);

  CSSNumericValue* Value() const;

  // end of CSSMathNegate Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             const SerializationContext& aContext,
                             nsACString& aDest) const;

  StyleMathNegate ToStyleMathNegate() const;

 private:
  virtual ~CSSMathNegate() = default;

  RefPtr<CSSNumericValue> mValue;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSMATHNEGATE_H_

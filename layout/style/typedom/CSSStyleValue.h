/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSSTYLEVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSSTYLEVALUE_H_

#include "js/TypeDecls.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
#include "nsTArrayForwardDeclare.h"
#include "nsWrapperCache.h"

template <class T>
class RefPtr;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;
struct StylePropertyTypedValueList;
struct URLExtraData;

namespace dom {

class GlobalObject;
class CSSImageValue;
class CSSKeywordValue;
class CSSUnparsedValue;
class CSSUnsupportedValue;
class CSSNumericValue;
class CSSTransformValue;

class CSSStyleValue : public nsISupports, public nsWrapperCache {
 public:
  enum class StyleValueType {
    Uninitialized,  // TODO: Remove once the implementation is complete.
    UnsupportedValue,
    UnparsedValue,
    KeywordValue,
    NumericValue,
    TransformValue,
    ImageValue,
  };

  explicit CSSStyleValue(nsCOMPtr<nsISupports> aParent);

  CSSStyleValue(nsCOMPtr<nsISupports> aParent, StyleValueType aStyleValueType);

  static void Create(nsCOMPtr<nsISupports> aParent,
                     const CSSPropertyId& aPropertyId,
                     StylePropertyTypedValueList&& aTypedValueList,
                     nsTArray<RefPtr<CSSStyleValue>>& aRetVal);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(CSSStyleValue)

  nsISupports* GetParentObject() const;

  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSStyleValue Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssstylevalue-parse
  [[nodiscard]] static RefPtr<CSSStyleValue> Parse(const GlobalObject& aGlobal,
                                                   const nsACString& aProperty,
                                                   const nsACString& aCssText,
                                                   ErrorResult& aRv);

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssstylevalue-parseall
  static void ParseAll(const GlobalObject& aGlobal, const nsACString& aProperty,
                       const nsACString& aCssText,
                       nsTArray<RefPtr<CSSStyleValue>>& aRetVal,
                       ErrorResult& aRv);

  void Stringify(nsACString& aRetVal) const;

  // end of CSSStyleValue Web IDL declarations

  static RefPtr<CSSStyleValue> ParseStyleValue(
      nsCOMPtr<nsISupports>, const nsACString& aProperty,
      const nsACString& aCssText, URLExtraData* aURLExtraData,
      nsTArray<RefPtr<CSSStyleValue>>* aStyleValues, ErrorResult& aRv);

  StyleValueType GetStyleValueType() const { return mStyleValueType; }

  bool IsCSSUnsupportedValue() const;

  // Defined in CSSUnsupportedValue.cpp
  const CSSUnsupportedValue& GetAsCSSUnsupportedValue() const;

  // Defined in CSSUnsupportedValue.cpp
  CSSUnsupportedValue& GetAsCSSUnsupportedValue();

  // Returns nullptr if this value is not a CSSUnsupportedValue, caller must
  // null check.
  //
  // Defined in CSSUnsupportedValue.cpp
  const CSSPropertyId* GetPropertyId() const;

  // Defined in CSSUnsupportedValue.cpp
  CSSPropertyId* GetPropertyId();

  bool IsCSSUnparsedValue() const;

  // Defined in CSSUnparsedValue.cpp
  const CSSUnparsedValue& GetAsCSSUnparsedValue() const;

  // Defined in CSSUnparsedValue.cpp
  CSSUnparsedValue& GetAsCSSUnparsedValue();

  bool IsCSSKeywordValue() const;

  // Defined in CSSKeywordValue.cpp
  const CSSKeywordValue& GetAsCSSKeywordValue() const;

  // Defined in CSSKeywordValue.cpp
  CSSKeywordValue& GetAsCSSKeywordValue();

  bool IsCSSNumericValue() const;

  // Defined in CSSNumericValue.cpp
  const CSSNumericValue& GetAsCSSNumericValue() const;

  // Defined in CSSNumericValue.cpp
  CSSNumericValue& GetAsCSSNumericValue();

  bool IsCSSTransformValue() const;

  // Defined in CSSTransformValue.cpp
  const CSSTransformValue& GetAsCSSTransformValue() const;

  // Defined in CSSTransformValue.cpp
  CSSTransformValue& GetAsCSSTransformValue();

  bool IsCSSImageValue() const;

  // Defined in CSSImageValue.cpp
  const CSSImageValue& GetAsCSSImageValue() const;

  // Defined in CSSImageValue.cpp
  CSSImageValue& GetAsCSSImageValue();

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 protected:
  virtual ~CSSStyleValue() = default;

  nsCOMPtr<nsISupports> mParent;
  const StyleValueType mStyleValueType;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSSTYLEVALUE_H_

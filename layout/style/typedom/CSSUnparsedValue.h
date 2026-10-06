/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_

#include <stdint.h>

#include "js/TypeDecls.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/CSSUnparsedValueBindingFwd.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
#include "nsTHashSet.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
class ErrorResult;
struct StyleUnparsedSegment;
using StyleUnparsedValue = CopyableTArray<StyleUnparsedSegment>;

namespace dom {

class GlobalObject;

class CSSUnparsedValue final : public CSSStyleValue {
 public:
  CSSUnparsedValue(nsCOMPtr<nsISupports> aParent,
                   Sequence<OwningCSSUnparsedSegment> aTokens);

  static RefPtr<CSSUnparsedValue> Create(
      nsCOMPtr<nsISupports> aParent, const StyleUnparsedValue& aUnparsedValue);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSUnparsedValue, CSSStyleValue)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSUnparsedValue Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssunparsedvalue-cssunparsedvalue
  static already_AddRefed<CSSUnparsedValue> Constructor(
      const GlobalObject& aGlobal,
      const Sequence<OwningCSSUnparsedSegment>& aMembers);

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssunparsedvalue-length
  uint32_t Length() const;

  // https://www.w3.org/publications/spec-generator/#cssunparsedvalue-indexed-property-getter
  void IndexedGetter(uint32_t aIndex, bool& aFound,
                     OwningCSSUnparsedSegment& aRetVal);

  // https://www.w3.org/publications/spec-generator/#cssunparsedvalue-indexed-property-setter
  void IndexedSetter(uint32_t aIndex, const CSSUnparsedSegment& aVal,
                     ErrorResult& aRv);

  // end of CSSUnparsedValue Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 private:
  virtual ~CSSUnparsedValue() = default;

  bool ToCssTextWithPropertyInternal(
      const CSSPropertyId& aPropertyId, nsACString& aDest,
      nsTHashSet<const CSSUnparsedValue*>& aValues) const;

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssunparsedvalue-tokens-slot
  Sequence<OwningCSSUnparsedSegment> mTokens;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/StylePropertyMapReadOnly.h"

#include "CSSUnsupportedValue.h"
#include "mozilla/Assertions.h"
#include "mozilla/ComputedStyle.h"
#include "mozilla/DeclarationBlock.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/StyleSheet.h"
#include "mozilla/dom/CSSStyleRule.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/StylePropertyMapReadOnlyBinding.h"
#include "nsCSSProps.h"
#include "nsComputedDOMStyle.h"
#include "nsCycleCollectionParticipant.h"
#include "nsReadableUtils.h"
#include "nsStyledElement.h"

namespace mozilla::dom {

namespace {

template <typename Source>
struct DeclarationTraits;

// Specialization for inline style (specified values)
struct InlineStyleDeclarations {};

template <>
struct DeclarationTraits<InlineStyleDeclarations> {
  static StylePropertyTypedValueList GetAll(nsStyledElement* aStyledElement,
                                            const CSSPropertyId& aPropertyId,
                                            ErrorResult& aRv) {
    MOZ_ASSERT(aStyledElement);

    auto valueList = StylePropertyTypedValueList::None();

    RefPtr block = aStyledElement->GetInlineStyleDeclaration();
    if (!block) {
      return valueList;
    }

    if (!Servo_DeclarationBlock_GetPropertyTypedValueList(block, &aPropertyId,
                                                          &valueList)) {
      aRv.ThrowTypeError("Invalid property");
      return valueList;
    }

    return valueList;
  }

  static URLExtraData* GetURLExtraData(nsStyledElement* aStyledElement) {
    MOZ_ASSERT(aStyledElement);

    return aStyledElement->OwnerDoc()->DefaultStyleAttrURLData();
  }
};

// Specialization for computed style (computed values)
struct ComputedStyleDeclarations {};

template <>
struct DeclarationTraits<ComputedStyleDeclarations> {
  static StylePropertyTypedValueList GetAll(Element* aElement,
                                            const CSSPropertyId& aPropertyId,
                                            ErrorResult& aRv) {
    MOZ_ASSERT(aElement);

    auto valueList = StylePropertyTypedValueList::None();

    RefPtr<const ComputedStyle> style =
        nsComputedDOMStyle::GetComputedStyle(aElement);
    if (!style) {
      return valueList;
    }

    if (!style->GetPropertyTypedValueList(aPropertyId, valueList)) {
      aRv.ThrowTypeError("Invalid property");
      return valueList;
    }

    return valueList;
  }

  static URLExtraData* GetURLExtraData(Element* aElement) {
    MOZ_ASSERT(aElement);

    return aElement->OwnerDoc()->DefaultStyleAttrURLData();
  }
};

// Specialization for style rule
struct StyleRuleDeclarations {};
template <>
struct DeclarationTraits<StyleRuleDeclarations> {
  static StylePropertyTypedValueList GetAll(const CSSStyleRule* aRule,
                                            const CSSPropertyId& aPropertyId,
                                            ErrorResult& aRv) {
    MOZ_ASSERT(aRule);

    auto valueList = StylePropertyTypedValueList::None();

    StyleLockedDeclarationBlock& block = aRule->GetDeclarationBlock();
    if (!Servo_DeclarationBlock_GetPropertyTypedValueList(&block, &aPropertyId,
                                                          &valueList)) {
      aRv.ThrowTypeError("Invalid property");
      return valueList;
    }

    return valueList;
  }

  static URLExtraData* GetURLExtraData(const CSSStyleRule* aRule) {
    MOZ_ASSERT(aRule);

    StyleSheet* sheet = aRule->GetStyleSheet();
    if (!sheet) {
      return nullptr;
    }

    return sheet->URLData();
  }
};

}  // namespace

StylePropertyMapReadOnly::StylePropertyMapReadOnly(
    nsStyledElement* aStyledElement)
    : mParent(aStyledElement), mDeclarations(aStyledElement) {
  MOZ_ASSERT(mParent);
}

StylePropertyMapReadOnly::StylePropertyMapReadOnly(Element* aElement)
    : mParent(aElement), mDeclarations(aElement) {
  MOZ_ASSERT(mParent);
}

StylePropertyMapReadOnly::StylePropertyMapReadOnly(CSSStyleRule* aRule)
    : mParent(aRule), mDeclarations(aRule) {
  MOZ_ASSERT(mParent);
}

NS_IMPL_CYCLE_COLLECTING_ADDREF(StylePropertyMapReadOnly)
NS_IMPL_CYCLE_COLLECTING_RELEASE(StylePropertyMapReadOnly)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(StylePropertyMapReadOnly)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(StylePropertyMapReadOnly)
NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(StylePropertyMapReadOnly)
  // Clear out our weak pointers.
  tmp->mDeclarations.Unlink();

  NS_IMPL_CYCLE_COLLECTION_UNLINK(mParent)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(StylePropertyMapReadOnly)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mParent)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

nsISupports* StylePropertyMapReadOnly::GetParentObject() const {
  return mParent;
}

JSObject* StylePropertyMapReadOnly::WrapObject(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return StylePropertyMapReadOnly_Binding::Wrap(aCx, this, aGivenProto);
}

// start of StylePropertyMapReadOnly Web IDL implementation

// https://drafts.css-houdini.org/css-typed-om-1/#dom-stylepropertymapreadonly-get
//
// XXX This is not yet fully implemented and optimized!
void StylePropertyMapReadOnly::Get(const nsACString& aProperty,
                                   OwningUndefinedOrCSSStyleValue& aRetVal,
                                   ErrorResult& aRv) const {
  if (!mParent) {
    aRv.Throw(NS_ERROR_UNEXPECTED);
    return;
  }

  // Step 2.
  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aProperty);
  if (id == eCSSProperty_UNKNOWN) {
    aRv.ThrowTypeError("Invalid property: "_ns + aProperty);
    return;
  }

  auto propertyId = CSSPropertyId::FromIdOrCustomProperty(id, aProperty);

  // Step 3.
  const Declarations& declarations = mDeclarations;

  // Step 4.
  auto valueList = declarations.GetAll(propertyId, aRv);
  if (aRv.Failed()) {
    return;
  }

  nsTArray<RefPtr<CSSStyleValue>> styleValues;
  CSSStyleValue::Create(mParent, propertyId, std::move(valueList), styleValues);

  if (!styleValues.IsEmpty()) {
    aRetVal.SetAsCSSStyleValue() = styleValues[0];
  } else {
    aRetVal.SetUndefined();
  }
}

// https://drafts.css-houdini.org/css-typed-om-1/#dom-stylepropertymapreadonly-getall
//
// XXX This is not yet fully implemented and optimized!
void StylePropertyMapReadOnly::GetAll(const nsACString& aProperty,
                                      nsTArray<RefPtr<CSSStyleValue>>& aRetVal,
                                      ErrorResult& aRv) const {
  if (!mParent) {
    aRv.Throw(NS_ERROR_UNEXPECTED);
    return;
  }

  // Step 2.
  NonCustomCSSPropertyId id = nsCSSProps::LookupProperty(aProperty);
  if (id == eCSSProperty_UNKNOWN) {
    aRv.ThrowTypeError("Invalid property: "_ns + aProperty);
    return;
  }

  auto propertyId = CSSPropertyId::FromIdOrCustomProperty(id, aProperty);

  // Step 3.
  const Declarations& declarations = mDeclarations;

  // Step 4.
  auto valueList = declarations.GetAll(propertyId, aRv);
  if (aRv.Failed()) {
    return;
  }

  CSSStyleValue::Create(mParent,
                        CSSPropertyId::FromIdOrCustomProperty(id, aProperty),
                        std::move(valueList), aRetVal);
}

bool StylePropertyMapReadOnly::Has(const nsACString& aProperty,
                                   ErrorResult& aRv) const {
  aRv.Throw(NS_ERROR_NOT_IMPLEMENTED);
  return false;
}

uint32_t StylePropertyMapReadOnly::Size() const { return 0; }

uint32_t StylePropertyMapReadOnly::GetIterableLength() const { return 0; }

const nsACString& StylePropertyMapReadOnly::GetKeyAtIndex(
    uint32_t aIndex) const {
  return EmptyCString();
}

nsTArray<RefPtr<CSSStyleValue>> StylePropertyMapReadOnly::GetValueAtIndex(
    uint32_t aIndex) const {
  return nsTArray<RefPtr<CSSStyleValue>>();
}

// end of StylePropertyMapReadOnly Web IDL implementation

size_t StylePropertyMapReadOnly::SizeOfExcludingThis(
    MallocSizeOf aMallocSizeOf) const {
  return 0;
}

size_t StylePropertyMapReadOnly::SizeOfIncludingThis(
    MallocSizeOf aMallocSizeOf) const {
  return SizeOfExcludingThis(aMallocSizeOf) + aMallocSizeOf(this);
}

StylePropertyTypedValueList StylePropertyMapReadOnly::Declarations::GetAll(
    const CSSPropertyId& aPropertyId, ErrorResult& aRv) const {
  switch (mKind) {
    case Kind::Inline:
      return DeclarationTraits<InlineStyleDeclarations>::GetAll(
          mStyledElement, aPropertyId, aRv);

    case Kind::Computed:
      return DeclarationTraits<ComputedStyleDeclarations>::GetAll(
          mElement, aPropertyId, aRv);

    case Kind::Rule:
      return DeclarationTraits<StyleRuleDeclarations>::GetAll(mRule,
                                                              aPropertyId, aRv);
  }
  MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE("Bad kind value!");
}

URLExtraData* StylePropertyMapReadOnly::Declarations::GetURLExtraData() const {
  switch (mKind) {
    case Kind::Inline:
      return DeclarationTraits<InlineStyleDeclarations>::GetURLExtraData(
          mStyledElement);

    case Kind::Computed:
      return DeclarationTraits<ComputedStyleDeclarations>::GetURLExtraData(
          mElement);

    case Kind::Rule:
      return DeclarationTraits<StyleRuleDeclarations>::GetURLExtraData(mRule);
  }
  MOZ_MAKE_COMPILER_ASSUME_IS_UNREACHABLE("Bad kind value!");
}

void StylePropertyMapReadOnly::Declarations::Unlink() {
  switch (mKind) {
    case Kind::Inline:
      mStyledElement = nullptr;
      break;

    case Kind::Computed:
      mElement = nullptr;
      break;

    case Kind::Rule:
      mRule = nullptr;
      break;
  }
}

}  // namespace mozilla::dom

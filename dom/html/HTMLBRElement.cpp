/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/HTMLBRElement.h"

#include "mozilla/MappedDeclarationsBuilder.h"
#include "mozilla/dom/HTMLBRElementBinding.h"
#include "nsAttrValueInlines.h"
#include "nsStyleConsts.h"

NS_IMPL_NS_NEW_HTML_ELEMENT(BR)

namespace mozilla::dom {

HTMLBRElement::HTMLBRElement(already_AddRefed<mozilla::dom::NodeInfo> aNodeInfo)
    : nsGenericHTMLElement(std::move(aNodeInfo)) {}

HTMLBRElement::~HTMLBRElement() = default;

NS_IMPL_ELEMENT_CLONE(HTMLBRElement)

enum class ClearKeyword : uint8_t { Left = 1, Right, All, Both };

static constexpr nsAttrValue::EnumTableEntry kClearTable[] = {
    {"left", ClearKeyword::Left},
    {"right", ClearKeyword::Right},
    {"all", ClearKeyword::All},
    {"both", ClearKeyword::Both},
};

bool HTMLBRElement::ParseAttribute(int32_t aNamespaceID, nsAtom* aAttribute,
                                   const nsAString& aValue,
                                   nsIPrincipal* aMaybeScriptedPrincipal,
                                   nsAttrValue& aResult) {
  if (aAttribute == nsGkAtoms::clear && aNamespaceID == kNameSpaceID_None) {
    return aResult.ParseEnumValue(aValue, kClearTable, false);
  }

  return nsGenericHTMLElement::ParseAttribute(aNamespaceID, aAttribute, aValue,
                                              aMaybeScriptedPrincipal, aResult);
}

static StyleClear ClearKeywordToStyleClear(ClearKeyword aAttrVal) {
  switch (aAttrVal) {
    case ClearKeyword::Left:
      return StyleClear::Left;
    case ClearKeyword::Right:
      return StyleClear::Right;
    case ClearKeyword::All:
    case ClearKeyword::Both:
      // clear=all and clear=both are aliases
      return StyleClear::Both;
  }
  NS_WARNING("Invalid ClearKeyword value");
  return StyleClear::None;
}

void HTMLBRElement::MapAttributesIntoRule(MappedDeclarationsBuilder& aBuilder) {
  if (!aBuilder.PropertyIsSet(eCSSProperty_clear)) {
    const nsAttrValue* value = aBuilder.GetAttr(nsGkAtoms::clear);
    if (value && value->Type() == nsAttrValue::eEnum) {
      ClearKeyword enumValue = static_cast<ClearKeyword>(value->GetEnumValue());
      StyleClear styleClear = ClearKeywordToStyleClear(enumValue);
      aBuilder.SetKeywordValue(eCSSProperty_clear, styleClear);
    }
  }
  nsGenericHTMLElement::MapCommonAttributesInto(aBuilder);
}

NS_IMETHODIMP_(bool)
HTMLBRElement::IsAttributeMapped(const nsAtom* aAttribute) const {
  static const MappedAttributeEntry attributes[] = {{nsGkAtoms::clear},
                                                    {nullptr}};

  static const MappedAttributeEntry* const map[] = {
      attributes,
      sCommonAttributeMap,
  };

  return FindAttributeDependence(aAttribute, map);
}

nsMapRuleToAttributesFunc HTMLBRElement::GetAttributeMappingFunction() const {
  return &MapAttributesIntoRule;
}

JSObject* HTMLBRElement::WrapNode(JSContext* aCx,
                                  JS::Handle<JSObject*> aGivenProto) {
  return HTMLBRElement_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom

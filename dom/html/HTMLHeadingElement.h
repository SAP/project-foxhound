/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_HTMLHeadingElement_h
#define mozilla_dom_HTMLHeadingElement_h

#include <cstdint>

#include "nsGenericHTMLElement.h"

namespace mozilla::dom {

class HTMLHeadingElement final : public nsGenericHTMLElement {
 public:
  explicit HTMLHeadingElement(
      already_AddRefed<mozilla::dom::NodeInfo> aNodeInfo)
      : nsGenericHTMLElement(std::move(aNodeInfo)) {
    MOZ_ASSERT(IsHTMLHeadingElement());
    UpdateLevel(false);
  }

  nsresult BindToTree(BindContext& aContext, nsINode& aParent) override {
    nsresult rv = nsGenericHTMLElement::BindToTree(aContext, aParent);
    UpdateLevel(true);
    return rv;
  }

  bool ParseAttribute(int32_t aNamespaceID, nsAtom* aAttribute,
                      const nsAString& aValue,
                      nsIPrincipal* aMaybeScriptedPrincipal,
                      nsAttrValue& aResult) override;
  NS_IMETHOD_(bool) IsAttributeMapped(const nsAtom* aAttribute) const override;
  nsMapRuleToAttributesFunc GetAttributeMappingFunction() const override;
  nsresult Clone(dom::NodeInfo*, nsINode** aResult) const override;

  void SetAlign(const nsAString& aAlign, ErrorResult& aError) {
    return SetHTMLAttr(nsGkAtoms::align, aAlign, aError);
  }
  void GetAlign(DOMString& aAlign) const {
    return GetHTMLAttr(nsGkAtoms::align, aAlign);
  }

  // https://html.spec.whatwg.org/#get-an-element's-computed-heading-level
  uint32_t ComputedLevel() const;

  // https://html.spec.whatwg.org/#get-an-element's-computed-heading-offset
  uint32_t GetComputedHeadingOffset(uint32_t aMax) const;

  void UpdateLevel(bool aNotify);

  NS_IMPL_FROMNODE_HELPER(HTMLHeadingElement, IsHTMLHeadingElement())

 protected:
  virtual ~HTMLHeadingElement();

  JSObject* WrapNode(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

 private:
  static void MapAttributesIntoRule(MappedDeclarationsBuilder&);
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_HTMLHeadingElement_h

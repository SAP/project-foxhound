/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef XULTextElement_h_
#define XULTextElement_h_

#include "nsXULElement.h"

namespace mozilla::dom {

class XULTextElement final : public nsXULElement {
 public:
  explicit XULTextElement(already_AddRefed<mozilla::dom::NodeInfo> aNodeInfo)
      : nsXULElement(std::move(aNodeInfo)) {}

  bool Disabled() { return IsDisabled(); }
  MOZ_CAN_RUN_SCRIPT void SetDisabled(bool aValue) {
    SetBoolAttr(nsGkAtoms::disabled, aValue);
  }
  void GetValue(DOMString& aValue) const { GetAttr(nsGkAtoms::value, aValue); }
  MOZ_CAN_RUN_SCRIPT void SetValue(const nsAString& aValue) {
    SetAttr(kNameSpaceID_None, nsGkAtoms::value, aValue, true);
  }
  void GetAccessKey(DOMString& aValue) const {
    GetAttr(nsGkAtoms::accesskey, aValue);
  }
  MOZ_CAN_RUN_SCRIPT void SetAccessKey(const nsAString& aValue) {
    SetAttr(kNameSpaceID_None, nsGkAtoms::accesskey, aValue, true);
  }

  nsChangeHint GetAttributeChangeHint(const nsAtom* aAttribute,
                                      AttrModType aModType) const override;

  void AfterSetAttr(int32_t aNamespaceID, nsAtom* aName,
                    const nsAttrValue* aValue, const nsAttrValue* aOldValue,
                    nsIPrincipal* aSubjectPrincipal, bool aNotify) override;

  NS_IMPL_FROMNODE_HELPER(XULTextElement,
                          IsAnyOfXULElements(nsGkAtoms::label,
                                             nsGkAtoms::description));

 protected:
  virtual ~XULTextElement() = default;
  JSObject* WrapNode(JSContext* aCx, JS::Handle<JSObject*> aGivenProto) final;
};

}  // namespace mozilla::dom

#endif  // XULTextElement_h

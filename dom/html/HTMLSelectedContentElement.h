/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_HTMLSelectedContentElement_h
#define mozilla_dom_HTMLSelectedContentElement_h

#include "nsGenericHTMLElement.h"

namespace mozilla::dom {

class HTMLSelectedContentElement final : public nsGenericHTMLElement {
 public:
  explicit HTMLSelectedContentElement(
      already_AddRefed<class NodeInfo> aNodeInfo);

  NS_IMPL_FROMNODE_HELPER(HTMLSelectedContentElement,
                          IsSelectedContentElement())

  bool IsSelectedContentElement() const final { return true; }

  nsresult Clone(class NodeInfo* aNodeInfo, nsINode** aResult) const override;

  bool IsDisabled() const { return mDisabled; }

  MOZ_CAN_RUN_SCRIPT void ClearContent();

  // https://html.spec.whatwg.org/#the-selectedcontent-element
  nsresult BindToTree(BindContext& aContext, nsINode& aParent) override;

 protected:
  virtual ~HTMLSelectedContentElement();

  JSObject* WrapNode(JSContext* aCx,
                     JS::Handle<JSObject*> aGivenProto) override;

 private:
  void SetDisabled(bool aDisabled) { mDisabled = aDisabled; }

  bool mDisabled = false;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_HTMLSelectedContentElement_h

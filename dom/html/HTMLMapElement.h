/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_HTMLMapElement_h
#define mozilla_dom_HTMLMapElement_h

#include "nsGenericHTMLElement.h"
#include "nsGkAtoms.h"

namespace mozilla::dom {

class ContentList;

class HTMLMapElement final : public nsGenericHTMLElement {
 public:
  explicit HTMLMapElement(already_AddRefed<mozilla::dom::NodeInfo> aNodeInfo);

  // nsISupports
  NS_DECL_ISUPPORTS_INHERITED

  virtual nsresult Clone(dom::NodeInfo*, nsINode** aResult) const override;

  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(HTMLMapElement, nsGenericHTMLElement)

  void GetName(nsAString& aValue) { GetHTMLAttr(nsGkAtoms::name, aValue); }
  void SetName(const nsAString& aName, ErrorResult& aError) {
    SetHTMLAttr(nsGkAtoms::name, aName, aError);
  }
  HTMLCollection* Areas();

  JSObject* WrapNode(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

 protected:
  ~HTMLMapElement() = default;

  RefPtr<ContentList> mAreas;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_HTMLMapElement_h

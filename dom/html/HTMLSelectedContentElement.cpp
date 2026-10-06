/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HTMLSelectedContentElement.h"

#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BindContext.h"
#include "mozilla/dom/HTMLOptionElement.h"
#include "mozilla/dom/HTMLSelectElement.h"
#include "mozilla/dom/HTMLSelectedContentElementBinding.h"
#include "nsGenericHTMLElement.h"

nsGenericHTMLElement* NS_NewHTMLSelectedContentElement(
    already_AddRefed<mozilla::dom::NodeInfo> aNodeInfo,
    mozilla::dom::FromParser aFromParser) {
  if (!mozilla::StaticPrefs::dom_select_customizable_select_enabled()) {
    return NS_NewHTMLElement(std::move(aNodeInfo), aFromParser);
  }
  RefPtr<mozilla::dom::NodeInfo> nodeInfo(aNodeInfo);
  auto* nim = nodeInfo->NodeInfoManager();
  MOZ_ASSERT(nim);
  return new (nim) mozilla::dom::HTMLSelectedContentElement(nodeInfo.forget());
}

namespace mozilla::dom {

HTMLSelectedContentElement::HTMLSelectedContentElement(
    already_AddRefed<class NodeInfo> aNodeInfo)
    : nsGenericHTMLElement(std::move(aNodeInfo)) {}

HTMLSelectedContentElement::~HTMLSelectedContentElement() = default;

NS_IMPL_ELEMENT_CLONE(HTMLSelectedContentElement)

JSObject* HTMLSelectedContentElement::WrapNode(
    JSContext* aCx, JS::Handle<JSObject*> aGivenProto) {
  return HTMLSelectedContentElement_Binding::Wrap(aCx, this, aGivenProto);
}

// https://html.spec.whatwg.org/#clear-a-selectedcontent
void HTMLSelectedContentElement::ClearContent() {
  // 1. If selectedcontent is disabled, then return.
  if (mDisabled) {
    return;
  }
  // 2. Replace all with null within selectedcontent.
  ReplaceChildren(nullptr, IgnoreErrors());
}

// https://html.spec.whatwg.org/#the-selectedcontent-element
nsresult HTMLSelectedContentElement::BindToTree(BindContext& aContext,
                                                nsINode& aParent) {
  nsresult rv = nsGenericHTMLElement::BindToTree(aContext, aParent);
  NS_ENSURE_SUCCESS(rv, rv);

  // The selectedcontent HTML element insertion steps, given selectedcontent:

  // 1. Let nearestSelectAncestor be null.
  HTMLSelectElement* nearestSelectAncestor = nullptr;

  // 2. Set selectedcontent's disabled to false.
  SetDisabled(false);

  // 3. For each ancestor of selectedcontent's ancestors, in reverse tree order:
  for (nsINode* ancestor = &aParent; ancestor;
       ancestor = ancestor->GetParent()) {
    // 3.1 If ancestor is a select element:
    if (auto* select = HTMLSelectElement::FromNode(ancestor)) {
      // 3.1.1 If nearestSelectAncestor is null, then set
      //       nearestSelectAncestor to select and continue.
      if (!nearestSelectAncestor) {
        nearestSelectAncestor = select;
        continue;
      }
      // 3.1.2 Set selectedcontent's disabled to true and break.
      SetDisabled(true);
      break;
    }

    // 3.2 If ancestor is an option element or a selectedcontent element, then
    //     set selectedcontent's disabled to true and break.
    if (ancestor->IsAnyOfHTMLElements(nsGkAtoms::option,
                                      nsGkAtoms::selectedcontent)) {
      SetDisabled(true);
      break;
    }
  }

  // The selectedcontent HTML element post-connection steps, given
  // selectedcontent.
  // Note: nearestSelectAncestor is already computed above so we
  // skip the ancestor walk (PR #12263 steps 1-2 of post-connection repeat it).

  // 3. If selectedcontent's disabled is true, nearestSelectAncestor is null, or
  //    nearestSelectAncestor has the multiple attribute, then return.
  // 4. Update a selectedcontent given nearestSelectAncestor and
  // selectedcontent.
  if (aContext.InComposedDoc() && nearestSelectAncestor && !mDisabled &&
      !nearestSelectAncestor->Multiple()) {
    nearestSelectAncestor->ScheduleSelectedContentUpdateScriptRunner();
  }

  return NS_OK;
}

}  // namespace mozilla::dom

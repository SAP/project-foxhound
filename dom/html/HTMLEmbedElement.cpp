/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "mozilla/dom/BindContext.h"
#include "mozilla/dom/HTMLEmbedElement.h"
#include "mozilla/dom/HTMLEmbedElementBinding.h"
#include "mozilla/dom/ElementInlines.h"

#include "mozilla/dom/Document.h"
#include "nsObjectLoadingContent.h"
#include "nsThreadUtils.h"
#include "nsIWidget.h"
#include "nsContentUtils.h"
#include "nsFrameLoader.h"
#include "nsTaintingUtils.h"
#ifdef XP_MACOSX
#  include "mozilla/EventDispatcher.h"
#  include "mozilla/dom/Event.h"
#endif

NS_IMPL_NS_NEW_HTML_ELEMENT_CHECK_PARSER(Embed)

namespace mozilla::dom {

HTMLEmbedElement::HTMLEmbedElement(
    already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo,
    FromParser aFromParser)
    : nsGenericHTMLElement(std::move(aNodeInfo)) {
  SetIsNetworkCreated(aFromParser == FROM_PARSER_NETWORK);
}

HTMLEmbedElement::~HTMLEmbedElement() = default;

NS_IMPL_CYCLE_COLLECTION_CLASS(HTMLEmbedElement)

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(HTMLEmbedElement,
                                                  nsGenericHTMLElement)
  nsObjectLoadingContent::Traverse(tmp, cb);
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(HTMLEmbedElement,
                                                nsGenericHTMLElement)
  nsObjectLoadingContent::Unlink(tmp);
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED(
    HTMLEmbedElement, nsGenericHTMLElement, nsIRequestObserver,
    nsIStreamListener, nsFrameLoaderOwner, nsIObjectLoadingContent,
    nsIChannelEventSink)

NS_IMPL_ELEMENT_CLONE(HTMLEmbedElement)

nsresult HTMLEmbedElement::BindToTree(BindContext& aContext, nsINode& aParent) {
  nsresult rv = nsGenericHTMLElement::BindToTree(aContext, aParent);
  NS_ENSURE_SUCCESS(rv, rv);

  if (IsInComposedDoc()) {
    void (HTMLEmbedElement::*start)() = &HTMLEmbedElement::StartObjectLoad;
    nsContentUtils::AddScriptRunner(
        NewRunnableMethod("dom::HTMLEmbedElement::BindToTree", this, start));
  }

  return NS_OK;
}

void HTMLEmbedElement::UnbindFromTree(UnbindContext& aContext) {
  nsObjectLoadingContent::UnbindFromTree();
  nsGenericHTMLElement::UnbindFromTree(aContext);
}

nsresult HTMLEmbedElement::CheckTaintSinkSetAttr(int32_t aNamespaceID, nsAtom* aName,
                                                 const nsAString& aValue) {
  if (aNamespaceID == kNameSpaceID_None && aName == nsGkAtoms::src) {
    ReportTaintSink(aValue, "embed.src", this);
  }

  return nsGenericHTMLElement::CheckTaintSinkSetAttr(aNamespaceID, aName, aValue);
}

void HTMLEmbedElement::AfterSetAttr(int32_t aNamespaceID, nsAtom* aName,
                                    const nsAttrValue* aValue,
                                    const nsAttrValue* aOldValue,
                                    nsIPrincipal* aSubjectPrincipal,
                                    bool aNotify) {
  if (aValue) {
    AfterMaybeChangeAttr(aNamespaceID, aName, aNotify);
  }

  if (aNamespaceID == kNameSpaceID_None &&
      aName == nsGkAtoms::allowfullscreen && mFrameLoader) {
    if (auto* bc = mFrameLoader->GetExtantBrowsingContext()) {
      MOZ_ALWAYS_SUCCEEDS(bc->SetFullscreenAllowedByOwner(AllowFullscreen()));
    }
  }

  return nsGenericHTMLElement::AfterSetAttr(
      aNamespaceID, aName, aValue, aOldValue, aSubjectPrincipal, aNotify);
}

void HTMLEmbedElement::OnAttrSetButNotChanged(int32_t aNamespaceID,
                                              nsAtom* aName,
                                              const nsAttrValueOrString& aValue,
                                              bool aNotify) {
  AfterMaybeChangeAttr(aNamespaceID, aName, aNotify);
  return nsGenericHTMLElement::OnAttrSetButNotChanged(aNamespaceID, aName,
                                                      aValue, aNotify);
}

void HTMLEmbedElement::AfterMaybeChangeAttr(int32_t aNamespaceID, nsAtom* aName,
                                            bool aNotify) {
  if (aNamespaceID != kNameSpaceID_None || aName != nsGkAtoms::src) {
    return;
  }
  // If aNotify is false, we are coming from the parser or some such place;
  // we'll get bound after all the attributes have been set, so we'll do the
  // object load from BindToTree.
  // Skip the LoadObject call in that case.
  // We also don't want to start loading the object when we're not yet in
  // a document, just in case that the caller wants to set additional
  // attributes before inserting the node into the document.
  if (!aNotify || !IsInComposedDoc() || BlockEmbedOrObjectContentLoading()) {
    return;
  }
  nsContentUtils::AddScriptRunner(NS_NewRunnableFunction(
      "HTMLEmbedElement::LoadObject",
      [self = RefPtr<HTMLEmbedElement>(this), aNotify]() {
        if (self->IsInComposedDoc()) {
          self->LoadObject(aNotify, true);
        }
      }));
}

int32_t HTMLEmbedElement::TabIndexDefault() {
  // Only when we loaded a sub-document, <embed> should be tabbable by default
  // because it's a navigable containers mentioned in 6.6.3 The tabindex
  // attribute in the standard (see "If the value is null" section).
  // https://html.spec.whatwg.org/#the-tabindex-attribute
  // Otherwise, the default tab-index of <embed> is expected as -1 in a WPT:
  // https://searchfox.org/mozilla-central/rev/7d98e651953f3135d91e98fa6d33efa131aec7ea/testing/web-platform/tests/html/interaction/focus/sequential-focus-navigation-and-the-tabindex-attribute/tabindex-getter.html#63
  return Type() == ObjectType::Document ? 0 : -1;
}

bool HTMLEmbedElement::IsHTMLFocusable(bool aWithMouse, bool* aIsFocusable,
                                       int32_t* aTabIndex) {
  // Has non-plugin content: let the plugin decide what to do in terms of
  // internal focus from mouse clicks
  if (aTabIndex) {
    *aTabIndex = TabIndex();
  }

  *aIsFocusable = true;

  // Let the plugin decide, so override.
  return true;
}

bool HTMLEmbedElement::ParseAttribute(int32_t aNamespaceID, nsAtom* aAttribute,
                                      const nsAString& aValue,
                                      nsIPrincipal* aMaybeScriptedPrincipal,
                                      nsAttrValue& aResult) {
  if (aNamespaceID == kNameSpaceID_None) {
    if (aAttribute == nsGkAtoms::align) {
      return ParseAlignValue(aValue, aResult);
    }
    if (aAttribute == nsGkAtoms::width || aAttribute == nsGkAtoms::height ||
        aAttribute == nsGkAtoms::hspace || aAttribute == nsGkAtoms::vspace) {
      return aResult.ParseHTMLDimension(aValue);
    }
  }

  return nsGenericHTMLElement::ParseAttribute(aNamespaceID, aAttribute, aValue,
                                              aMaybeScriptedPrincipal, aResult);
}

static void MapAttributesIntoRuleBase(MappedDeclarationsBuilder& aBuilder) {
  nsGenericHTMLElement::MapImageMarginAttributeInto(aBuilder);
  nsGenericHTMLElement::MapImageSizeAttributesInto(aBuilder);
  nsGenericHTMLElement::MapImageAlignAttributeInto(aBuilder);
}

static void MapAttributesIntoRuleExceptHidden(
    MappedDeclarationsBuilder& aBuilder) {
  MapAttributesIntoRuleBase(aBuilder);
  nsGenericHTMLElement::MapCommonAttributesIntoExceptHidden(aBuilder);
}

void HTMLEmbedElement::MapAttributesIntoRule(
    MappedDeclarationsBuilder& aBuilder) {
  MapAttributesIntoRuleBase(aBuilder);
  nsGenericHTMLElement::MapCommonAttributesInto(aBuilder);
}

NS_IMETHODIMP_(bool)
HTMLEmbedElement::IsAttributeMapped(const nsAtom* aAttribute) const {
  static const MappedAttributeEntry* const map[] = {
      sCommonAttributeMap,
      sImageMarginSizeAttributeMap,
      sImageBorderAttributeMap,
      sImageAlignAttributeMap,
  };

  return FindAttributeDependence(aAttribute, map);
}

nsMapRuleToAttributesFunc HTMLEmbedElement::GetAttributeMappingFunction()
    const {
  return &MapAttributesIntoRuleExceptHidden;
}

void HTMLEmbedElement::StartObjectLoad(bool aNotify, bool aForceLoad) {
  // BindToTree can call us asynchronously, and we may be removed from the tree
  // in the interim
  if (!IsInComposedDoc() || !OwnerDoc()->IsActive() ||
      BlockEmbedOrObjectContentLoading()) {
    return;
  }

  LoadObject(aNotify, aForceLoad);
  SetIsNetworkCreated(false);
}

uint32_t HTMLEmbedElement::GetCapabilities() const {
  return eAllowPluginSkipChannel | eSupportImages | eSupportDocuments;
}

void HTMLEmbedElement::DestroyContent() {
  nsObjectLoadingContent::Destroy();
  nsGenericHTMLElement::DestroyContent();
}

nsresult HTMLEmbedElement::CopyInnerTo(HTMLEmbedElement* aDest) {
  nsresult rv = nsGenericHTMLElement::CopyInnerTo(aDest);
  NS_ENSURE_SUCCESS(rv, rv);

  if (aDest->OwnerDoc()->IsStaticDocument()) {
    CreateStaticClone(aDest);
  }

  return rv;
}

JSObject* HTMLEmbedElement::WrapNode(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return HTMLEmbedElement_Binding::Wrap(aCx, this, aGivenProto);
}

nsContentPolicyType HTMLEmbedElement::GetContentPolicyType() const {
  return nsIContentPolicy::TYPE_INTERNAL_EMBED;
}

}  // namespace mozilla::dom

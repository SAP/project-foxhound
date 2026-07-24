/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/Assertions.h"
#include "mozilla/dom/CustomElementRegistry.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/NodeInfo.h"
#include "nsContentCreatorFunctions.h"
#include "nsError.h"
#include "nsGenericHTMLElement.h"
#include "nsHTMLTags.h"
#include "nsNodeInfoManager.h"

using namespace mozilla;
using namespace mozilla::dom;

//----------------------------------------------------------------------

nsGenericHTMLElement* NS_NewHTMLNOTUSEDElement(
    already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo,
    FromParser aFromParser) {
  MOZ_ASSERT_UNREACHABLE("The element ctor should never be called");
  return nullptr;
}

#define HTML_TAG(_tag, _classname, _interfacename) \
  NS_NewHTML##_classname##Element,
#define HTML_OTHER(_tag) NS_NewHTMLNOTUSEDElement,
static const HTMLContentCreatorFunction sHTMLContentCreatorFunctions[] = {
    NS_NewHTMLUnknownElement,
#include "nsHTMLTagList.inc"
#undef HTML_TAG
#undef HTML_OTHER
    NS_NewHTMLUnknownElement};

nsresult NS_NewHTMLElement(Element** aResult,
                           already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo,
                           FromParser aFromParser, nsAtom* aIsAtom,
                           mozilla::dom::CustomElementDefinition* aDefinition) {
  RefPtr<mozilla::dom::NodeInfo> nodeInfo = aNodeInfo;

  MOZ_ASSERT(
      nodeInfo->NamespaceEquals(kNameSpaceID_XHTML),
      "Trying to create HTML elements that don't have the XHTML namespace");

  return nsContentUtils::NewXULOrHTMLElement(aResult, nodeInfo, aFromParser,
                                             aIsAtom, aDefinition);
}

already_AddRefed<nsGenericHTMLElement> CreateHTMLElement(
    uint32_t aNodeType, already_AddRefed<mozilla::dom::NodeInfo>&& aNodeInfo,
    FromParser aFromParser) {
  MOZ_ASSERT(aNodeType <= NS_HTML_TAG_MAX || aNodeType == eHTMLTag_userdefined,
             "aNodeType is out of bounds");

  HTMLContentCreatorFunction cb = sHTMLContentCreatorFunctions[aNodeType];

  MOZ_ASSERT(cb != NS_NewHTMLNOTUSEDElement,
             "Don't know how to construct tag element!");

  RefPtr<nsGenericHTMLElement> result = cb(std::move(aNodeInfo), aFromParser);

  return result.forget();
}

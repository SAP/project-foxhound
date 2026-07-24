/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ExecutionTracerIntegration.h"

#include "mozilla/dom/Attr.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/DocumentFragment.h"
#include "mozilla/dom/DOMException.h"
#include "mozilla/dom/DOMExceptionBinding.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/Location.h"
#include "nsDOMAttributeMap.h"
#include "nsQueryObject.h"

#ifdef MOZ_EXECUTION_TRACING

using namespace mozilla;
using namespace mozilla::dom;

template <prototypes::ID PrototypeID>
bool DOMClassHasInterface(const DOMJSClass* aDomClass) {
  return aDomClass->mInterfaceChain[PrototypeTraits<PrototypeID>::Depth] ==
         PrototypeID;
}

bool ExecutionTracerIntegration::WriteNodeSummary(
    JSContext* aCx, nsINode* aNode, bool aNested,
    JS_TracerSummaryWriter* aWriter) {
  uint16_t nodeType = aNode->NodeType();
  const nsString& nodeName = aNode->NodeName();
  bool isConnected = aNode->IsInComposedDoc();

  aWriter->writeUint8(uint8_t(SummaryKind::Node));
  aWriter->writeUint16(nodeType);
  aWriter->writeTwoByteString(nodeName.get());

  if (RefPtr<Element> el = do_QueryObject(aNode)) {
    aWriter->writeUint8(uint8_t(isConnected) << 7 |
                        uint8_t(NodeSubkind::Element));

    nsDOMAttributeMap* attributes = el->Attributes();
    uint32_t attributesLength = attributes->Length();

    aWriter->writeUint32(attributesLength);
    for (uint32_t i = 0;
         i < attributesLength && i < JS::ValueSummary::MAX_COLLECTION_VALUES;
         ++i) {
      nsAutoString attrName;
      attributes->Item(i)->GetName(attrName);
      aWriter->writeTwoByteString(attrName.get());

      nsAutoString attrValue;
      attributes->Item(i)->GetValue(attrValue);
      aWriter->writeTwoByteString(attrValue.get());
    }
  } else if (RefPtr<Document> doc = do_QueryObject(aNode)) {
    aWriter->writeUint8(uint8_t(isConnected) << 7 |
                        uint8_t(NodeSubkind::Document));
    RefPtr<Location> location = doc->GetLocation();
    nsAutoCString href;
    if (location->GetHref(href) != NS_OK) {
      JS_ReportErrorASCII(aCx, "Failed to get document location's href");
      return false;
    }
    aWriter->writeUTF8String(href.get());
  } else if (Attr* attr = Attr::FromNode(aNode)) {
    aWriter->writeUint8(uint8_t(isConnected) << 7 | uint8_t(NodeSubkind::Attr));
    nsAutoString value;
    attr->GetValue(value);
    aWriter->writeTwoByteString(value.get());
  } else if (aNode->IsDocumentFragment()) {
    aWriter->writeUint8(uint8_t(isConnected) << 7 |
                        uint8_t(NodeSubkind::DocumentFragment));

    nsCOMPtr<nsINodeList> children = aNode->ChildNodes();
    if (!children) {
      JS_ReportErrorASCII(aCx, "OOM getting node's children");
      return false;
    }

    uint32_t numChildren = children->Length();
    aWriter->writeUint32(numChildren);

    if (!aNested) {
      for (uint32_t i = 0;
           i < numChildren && i < JS::ValueSummary::MAX_COLLECTION_VALUES;
           ++i) {
        nsCOMPtr<nsINode> child = children->Item(i);
        if (!child) {
          JS_ReportErrorASCII(aCx, "Failed getting child node");
          return false;
        }

        JS::Rooted<JS::Value> childValue(aCx);
        if (!ToJSValue(aCx, child.get(), &childValue)) {
          return false;
        }

        if (!aWriter->writeValue(aCx, childValue)) {
          return false;
        }
      }
    }
  } else if (aNode->IsText() || aNode->IsComment()) {
    if (aNode->IsText()) {
      aWriter->writeUint8(uint8_t(isConnected) << 7 |
                          uint8_t(NodeSubkind::Text));
    } else {
      aWriter->writeUint8(uint8_t(isConnected) << 7 |
                          uint8_t(NodeSubkind::Comment));
    }
    nsAutoString content;
    ErrorResult rv;
    aNode->GetTextContent(content, IgnoreErrors());
    aWriter->writeTwoByteString(content.get());
  } else {
    aWriter->writeUint8(uint8_t(isConnected) << 7 |
                        uint8_t(NodeSubkind::Other));
  }

  return true;
}

bool ExecutionTracerIntegration::WriteExceptionSummary(
    JSContext* aCx, JS::Handle<JSObject*> aObj, bool aNested,
    JS_TracerSummaryWriter* aWriter) {
  RefPtr<DOMException> domException;
  RefPtr<Exception> exception;
  UNWRAP_OBJECT(DOMException, aObj, domException);
  if (domException) {
    exception = domException;
  } else {
    // Not a DOM Exception, try XPC Exception.
    UNWRAP_OBJECT(Exception, aObj, exception);
    if (!exception) {
      return false;
    }
  }
  aWriter->writeUint8(uint8_t(SummaryKind::Exception));

  nsAutoString name;
  exception->GetName(name);
  aWriter->writeTwoByteString(name.get());

  nsAutoString message;
  exception->GetMessageMoz(message);
  aWriter->writeTwoByteString(message.get());

  if (domException) {
    uint16_t code = domException->Code();
    aWriter->writeUint16(code);
  } else {
    aWriter->writeUint16(0);
  }

  uint32_t result = exception->Result();
  aWriter->writeUint32(result);

  nsAutoCString fileName;
  exception->GetFilename(aCx, fileName);
  aWriter->writeUTF8String(fileName.get());

  uint32_t line = exception->LineNumber(aCx);
  aWriter->writeUint32(line);

  uint32_t column = exception->ColumnNumber(aCx);
  aWriter->writeUint32(column);

  nsCOMPtr<nsIStackFrame> stack = exception->GetLocation();
  nsAutoString stackString;
  if (stack) {
    stack->GetFormattedStack(aCx, stackString);
    aWriter->writeTwoByteString(stackString.get());
  } else {
    aWriter->writeTwoByteString(u"");
  }

  return true;
}

// static
bool ExecutionTracerIntegration::Callback(JSContext* aCx,
                                          JS::Handle<JSObject*> aObj,
                                          bool aNested,
                                          JS_TracerSummaryWriter* aWriter) {
  aWriter->writeUint8(uint8_t(VERSION));

  const DOMJSClass* domClass = GetDOMClass(aObj);
  if (!domClass) {
    aWriter->writeUint8(uint8_t(SummaryKind::Other));
    return true;
  }

  if (DOMClassHasInterface<prototypes::id::Node>(domClass)) {
    nsINode* node = UnwrapDOMObject<nsINode>(aObj);
    if (!WriteNodeSummary(aCx, node, aNested, aWriter)) {
      return false;
    }
    return true;
  }

  if (DOMClassHasInterface<prototypes::id::DOMException>(domClass) ||
      DOMClassHasInterface<prototypes::id::Exception>(domClass)) {
    if (!WriteExceptionSummary(aCx, aObj, aNested, aWriter)) {
      return false;
    }
    return true;
  }

  aWriter->writeUint8(uint8_t(SummaryKind::Other));
  return true;
}

#endif

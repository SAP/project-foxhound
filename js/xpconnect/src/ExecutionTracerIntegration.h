/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ExecutionTracerIntegration_h_
#define ExecutionTracerIntegration_h_

#ifdef MOZ_EXECUTION_TRACING

#  include <stdint.h>
#  include "jsapi.h"

#  include "nsINode.h"

namespace mozilla {

// ExecutionTracerIntegration is responsible for producing object summaries for
// various DOM types. ExecutionTracerIntegration::Callback is called from the
// JS Execution Tracer where it writes to the Execution Tracer's ring buffer
// using the JS_TracerSummaryWriter interface.
//
// NOTE - See "Value Summary Types" in js/public/Debug.h for information about
// types used but not listed here. All values listed below use little-endian
// byte ordering.
//
// - ExternalObjectSummary
//
//    Each object summary produced by our callback will have the following form
//    at its base:
//
//      version:            uint8_t
//      kind:               uint8_t
//      payload:            determined by kind (see below)
//
//    The structure of `payload` is determined by the value of kind, which must
//    be a valid SummaryKind:
//
//    SummaryKind::Other ->   nothing
//    SummaryKind::Node ->
//      nodeType:               uint16_t
//      nodeName:               SmallString
//      subkindAndIsConnected:  uint8_t (isConnected << 7 | subkind)
//      subkindData:            see below
//
//      The structure of subkindData is as follows, based on the subkind:
//
//        NodeSubkind::Other ->   nothing
//        NodeSubkind::Element ->
//          attributes:           List<Pair<SmallString,SmallString>>
//        NodeSubkind::Attr ->
//          value:                SmallString
//        NodeSubkind::Document ->
//          location:             SmallString
//        NodeSubkind::DocumentFragment ->
//          childNodes:           NestedList<ValueSummary>
//        NodeSubkind::Text ->
//          textContent:          SmallString
//        NodeSubkind::Comment ->
//          textContent:          SmallString
//    SummaryKind::Exception ->
//      name:                     SmallString
//      message:                  SmallString
//      code:                     uint16_t
//                                Only defined for DOM Exceptions, otherwise set
//                                to 0.
//      result:                   uint16_t
//      filename:                 SmallString
//      lineNumber:               uint32_t
//      columnNumber:             uint32_t
//      stack:                    SmallString
class ExecutionTracerIntegration {
 public:
  // This version will be baked into each entry, and should be incremented
  // every time we make a breaking change to the format. Adding new
  // SummaryKinds for example should not be considered breaking, as the
  // reader can simply skip over SummaryKinds it doesn't know about.
  static const uint8_t VERSION = 1;

  enum class SummaryKind : uint8_t {
    Other,
    Node,
    Exception,
    // TODO: more SummaryKinds will be implemented soon.
  };

  enum class NodeSubkind : uint8_t {
    Other,
    Element,
    Attr,
    Document,
    DocumentFragment,
    Text,
    Comment,
  };

  static bool Callback(JSContext* aCx, JS::Handle<JSObject*> aObj, bool aNested,
                       JS_TracerSummaryWriter* aWriter);

  static bool WriteNodeSummary(JSContext* aCx, nsINode* aNode, bool aNested,
                               JS_TracerSummaryWriter* aWriter);

  static bool WriteExceptionSummary(JSContext* aCx, JS::Handle<JSObject*> aObj,
                                    bool aNested,
                                    JS_TracerSummaryWriter* aWriter);
};
}  // namespace mozilla
#endif
#endif /* ExecutionTracerIntegration_h_ */

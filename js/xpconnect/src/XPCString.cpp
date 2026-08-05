/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

/*
 * Infrastructure for sharing DOMString data with JSStrings.
 *
 * Importing an nsAString into JS:
 * If possible (GetSharedBufferHandle works) use the external string support in
 * JS to create a JSString that points to the readable's buffer.  We keep a
 * reference to the buffer handle until the JSString is finalized.
 *
 * Exporting a JSString as an nsAReadable:
 * Wrap the JSString with a root-holding XPCJSReadableStringWrapper, which roots
 * the string and exposes its buffer via the nsAString interface, as
 * well as providing refcounting support.
 */

#include "xpcpublic.h"

using namespace JS;

const XPCStringConvert::LiteralExternalString
    XPCStringConvert::sLiteralExternalString;

void XPCStringConvert::LiteralExternalString::finalize(
    JS::Latin1Char* aChars) const {
  // Nothing to do.
}

void XPCStringConvert::LiteralExternalString::finalize(char16_t* aChars) const {
  // Nothing to do.
}

size_t XPCStringConvert::LiteralExternalString::sizeOfBuffer(
    const JS::Latin1Char* aChars, mozilla::MallocSizeOf aMallocSizeOf) const {
  // This string's buffer is not heap-allocated, so its malloc size is 0.
  return 0;
}

size_t XPCStringConvert::LiteralExternalString::sizeOfBuffer(
    const char16_t* aChars, mozilla::MallocSizeOf aMallocSizeOf) const {
  // This string's buffer is not heap-allocated, so its malloc size is 0.
  return 0;
}


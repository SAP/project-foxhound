/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * vim: set ts=8 sts=4 et sw=4 tw=99:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef jstaint_h
#define jstaint_h

#include "Taint.h"
#include "jsapi.h"

//
// Taint related helper functions.
//

namespace js {

// Converts a JS string into the argument type for a taint operation.
std::u16string taintarg(ExclusiveContext* cx, JS::HandleString str);

// Stringifies a JS object for use as a taint argument.
std::u16string taintarg(JSContext* cx, JS::HandleObject obj);

// Converts a JS value into an argument string for a taint operation.
std::u16string taintarg(JSContext* cx, JS::HandleValue str);

// Converts an integer to a taint argument string.
std::u16string taintarg(JSContext* cx, int32_t num);

// Mark all tainted arguments of a function call.
// This is mainly useful for tracing tainted arguments through the code.
void MarkTaintedFunctionArguments(JSContext* cx, const JSFunction* function, const CallArgs& args);

// Print a message to stdout.
void TaintFoxReport(const char* msg);

}

#endif

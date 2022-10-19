
/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * vim: set ts=8 sts=4 et sw=4 tw=99:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef jstaint_h
#define jstaint_h

#include "md5_utils.h"
#include "NamespaceImports.h"
#include "Taint.h"

//
// Taint related helper functions.
//

namespace JS {

// Converts a char into the argument type for a taint operation.
std::u16string taintarg_char(JSContext* cx, const char16_t str);

// Converts a raw char pointer into the argument type for a taint operation.
std::u16string taintarg(JSContext* cx, const char16_t* str);

// Converts a JS string into the argument type for a taint operation.
std::u16string taintarg(JSContext* cx, JS::HandleString str);

// Converts a JS string into the argument type for a taint operation.
std::u16string taintarg_full(JSContext* cx, JS::HandleString str);

std::u16string taintarg_jsstring(JSContext* cx, JSString* const& str);

std::u16string taintarg_jsstring_full(JSContext* cx, JSString* const& str);

// Stringifies a JS object for use as a taint argument.
std::u16string taintarg(JSContext* cx, JS::HandleObject obj);

// Converts a JS value into an argument string for a taint operation.
std::u16string taintarg(JSContext* cx, JS::HandleValue str);

// Converts an integer to a taint argument string.
std::u16string taintarg(JSContext* cx, int32_t num);

// Converts a JS Handle to a taint argument string.
std::vector<std::u16string> taintargs(JSContext* cx, JS::HandleValue str);

std::vector<std::u16string> taintargs(JSContext* cx, JS::HandleString str);

std::vector<std::u16string> taintargs_jsstring(JSContext* cx, JSString* const& str);

std::vector<std::u16string> taintargs(JSContext* cx, HandleString str1, HandleString str2);

std::vector<std::u16string> taintargs_jsstring(JSContext* cx, JSString* const& str1, JSString* const& str2);

std::string convertDigestToHexString(const TaintMd5& digest);

// Extracts the current filename, linenumber and function from the JSContext
TaintLocation TaintLocationFromContext(JSContext* cx);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleValue args);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg);

  TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg1, JS::HandleString arg2);

TaintOperation TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native, JSString* const& str);

TaintOperation TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native,
                                                 JSString* const& str1, JSString* const& str2);

TaintOperation TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                         JS::HandleString str1, JS::HandleString str2);

TaintOperation TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                         JSString* const& str1, JSString* const& str2);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native);

// Mark all tainted arguments of a function call.
// This is mainly useful for tracing tainted arguments through the code.
void MarkTaintedFunctionArguments(JSContext* cx, JSFunction* function, const JS::CallArgs& args);

// Check if the argument value is a tainted number object.
bool isTaintedNumber(const JS::Value& val);

// Extract the taint information from a number.
TaintFlow getNumberTaint(const JS::Value& val);

// Check if any of the argument values is a tainted number object.
// TODO make this accept a variable amount of arguments using variadic templates
bool isAnyTaintedNumber(const JS::Value& val1, const JS::Value& val2);

// Extract the taint information from the first tainted number argument.
// TODO make this accept a variable amount of arguments using variadic templates
TaintFlow getAnyNumberTaint(const JS::Value& val1, const JS::Value& val2);

// Print a message to stdout.
void TaintFoxReport(JSContext* cx, const char* msg);

}

#endif

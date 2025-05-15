
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

std::u16string taintarg_jsstring(JSContext* cx, const JSLinearString* const& str);

std::u16string taintarg_jsstring_full(JSContext* cx, JSString* const& str);

// Stringifies a JS object for use as a taint argument.
std::u16string taintarg(JSContext* cx, JS::HandleObject obj);

// Converts a JS value into an argument string for a taint operation.
std::u16string taintarg(JSContext* cx, JS::HandleValue val, bool fullArgs = false);

// Converts an integer to a taint argument string.
std::u16string taintarg(JSContext* cx, int32_t num);

// Converts a JS Handle to a taint argument string.
std::vector<std::u16string> taintargs(JSContext* cx, JS::HandleValue str, bool fullArgs);

std::vector<std::u16string> taintargs(JSContext* cx, JS::HandleString str);

std::vector<std::u16string> taintargs_jsstring(JSContext* cx, JSString* const& str);

std::vector<std::u16string> taintargs(JSContext* cx, HandleString str1, HandleString str2);

std::vector<std::u16string> taintargs_jsstring(JSContext* cx, JSString* const& str1, JSString* const& str2);

std::vector<std::u16string> taintargs_jsstring(JSContext* cx, const JSLinearString* const& str1, const JSLinearString* const& str2);

std::string convertDigestToHexString(const TaintMd5& digest);

// Extracts the current filename, linenumber and function from the JSContext
TaintLocation TaintLocationFromContext(JSContext* cx);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleValue args, bool fullArgs = false);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native, JS::HandleString arg1, JS::HandleString arg2);

TaintOperation TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native, JSString* const& str);

TaintOperation TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native,
                                                 JSString* const& str1, JSString* const& str2);

TaintOperation TaintOperationFromContextJSString(JSContext* cx, const char* name, bool is_native,
                                                 const JSLinearString* const& str1, const JSLinearString* const& str2);

TaintOperation TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                         JS::HandleString str1, JS::HandleString str2);

TaintOperation TaintOperationConcat(JSContext* cx, const char* name, bool is_native,
                                         JSString* const& str1, JSString* const& str2);

TaintOperation TaintOperationFromContext(JSContext* cx, const char* name, bool is_native);

// Mark all tainted arguments of a function call.
// This is mainly useful for tracing tainted arguments through the code.
void MarkTaintedFunctionArguments(JSContext* cx, JSFunction* function, const JS::CallArgs& args);

// Write the taint information to a StructuredSpewer
// To enable this, set the 
//     ac_add_options --enable-jitspew
// flag in the .mozconfig build file
// and the environment variable
//     SPEW=TaintFlowSpewer,AtStartup
#ifdef JS_JITSPEW
void MaybeSpewStringTaint(JSContext* cx, JSString* str, HandleValue location);
#endif

// Write taint information from a string to file
// This can be set by the TAINT_FILE environment variable or defaults to taint_output in the current directory
// One file is produced per taint report call
// Writing to file is enable by the compilation flag
//    ac_add_options --enable-taintspew
#ifdef JS_TAINTSPEW
void WriteTaintToFile(JSContext* cx, JSString* str, HandleValue location);
#endif

#if defined(JS_JITSPEW) || defined(JS_TAINTSPEW)
// Write a string and its taint information to JSON
void PrintJsonTaint(JSContext* cx, JSString* str, HandleValue location, js::JSONPrinter& json);

// Write a simple version of an object to JSON
void PrintJsonObject(JSContext* cx, JSObject* obj, js::JSONPrinter& json);
#endif

// Write a message to stderr and the spewer if enabled
void MaybeSpewMessage(JSContext* cx, JSString* str);

// Print a message to stdout.
void TaintFoxReport(JSContext* cx, const char* msg);

}

#endif

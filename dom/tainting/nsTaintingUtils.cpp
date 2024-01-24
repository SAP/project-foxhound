/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#include "nsTaintingUtils.h"

#include <string>
#include <utility>
#include "jsfriendapi.h"
#include "mozilla/dom/ToJSValue.h"
#include "XPathGenerator.h"
#include "nsContentUtils.h"
#include "nsString.h"
#include "mozilla/Logging.h"
#include "mozilla/Preferences.h"

#if !defined(DEBUG) && !defined(MOZ_ENABLE_JS_DUMP)
#  include "mozilla/StaticPrefs_browser.h"
#endif

using namespace mozilla;
using namespace mozilla::dom;

#define PREFERENCES_TAINTING "tainting."
#define PREFERENCES_TAINTING_ACTIVE PREFERENCES_TAINTING "active"
#define PREFERENCES_TAINTING_SOURCE PREFERENCES_TAINTING "source."
#define PREFERENCES_TAINTING_SINK PREFERENCES_TAINTING "sink."

static LazyLogModule gTaintLog("Taint");

inline bool isActive(const char* name) {
  return Preferences::GetBool(PREFERENCES_TAINTING_ACTIVE, true) && Preferences::GetBool(name, true);
}

inline bool isSinkActive(const char* name) {
  std::string s(PREFERENCES_TAINTING_SINK);
  s.append(name);
  return isActive(s.c_str());
}

inline bool isSourceActive(const char* name) {
  std::string s(PREFERENCES_TAINTING_SOURCE);
  s.append(name);
  return isActive(s.c_str());
}


static TaintOperation GetTaintOperation(JSContext *cx, const char* name)
{
  if (cx) {
    return JS_GetTaintOperation(cx, name);
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsAString& arg)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::RootedValue argval(cx);
    if (mozilla::dom::ToJSValue(cx, arg, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsTArray<nsString> &args)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::RootedValue argval(cx);

    if (mozilla::dom::ToJSValue(cx, args, &argval)) {
      return JS_GetTaintOperationFullArgs(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static void DescribeElement(const mozilla::dom::Element* element, nsAString& aInput)
{
  aInput.Truncate();
  if (element) {
    // Disable any taint sources for elements to prevent recursion
    XPathGenerator::Generate(element, aInput, false);
    if (aInput.IsEmpty()) {
      element->Describe(aInput);
    }
  }
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const mozilla::dom::Element* element)
{
  if (element) {
    nsTArray<nsString> args;
    nsAutoString elementDesc;

    DescribeElement(element, elementDesc);
    args.AppendElement(elementDesc);

    return GetTaintOperation(cx, name, args);
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const mozilla::dom::Element* element,
                                        const nsAString &str, const nsAString &attr)
{
  if (element) {
    nsTArray<nsString> args;

    nsAutoString elementDesc;
    DescribeElement(element, elementDesc);
    args.AppendElement(elementDesc);

    nsAutoString attributeName;
    attributeName.Append(attr);
    attributeName.AppendLiteral("=\"");
    nsAutoString value;
    value.Append(str);
    for (uint32_t i = value.Length(); i > 0; --i) {
      if (value[i - 1] == char16_t('"')) value.Insert(char16_t('\\'), i - 1);
    }
    attributeName.Append(value);
    attributeName.Append('"');
    args.AppendElement(attributeName);

    return GetTaintOperation(cx, name, args);
  }

  return TaintOperation(name);
}

TaintOperation GetTaintOperation(const char* name)
{
  return GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name);
}

nsresult MarkTaintOperation(StringTaint& aTaint, const char* name) {
  JSContext *cx = nsContentUtils::GetCurrentJSContext();
  auto op = GetTaintOperation(cx, name);
  op.set_native();
  aTaint.extend(op);
  return NS_OK;
}

static nsresult MarkTaintOperation(JSContext *cx, nsACString &str, const char* name)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name);
    op.set_native();
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsACString &str, const char* name)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name);
}

static nsresult MarkTaintOperation(JSContext *cx, nsAString &str, const char* name)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name);
    op.set_native();
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsAString &str, const char* name)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name);
}

static nsresult MarkTaintOperation(JSContext *cx, nsAString &str, const char* name, const nsTArray<nsString> &args)
{
  if (str.isTainted()) {
    auto op = GetTaintOperation(cx, name, args);
    op.set_native();
    str.Taint().extend(op);
  }
  return NS_OK;
}

nsresult MarkTaintOperation(nsAString &str, const char* name, const nsTArray<nsString> &args)
{
  return MarkTaintOperation(nsContentUtils::GetCurrentJSContext(), str, name, args);
}

static nsresult MarkTaintSource(nsAString &str, TaintOperation operation) {
  operation.setSource();
  operation.set_native();
  str.Taint().overlay(0, str.Length(), operation);
  return NS_OK;
}

static nsresult MarkTaintSource(mozilla::dom::DOMString &str, TaintOperation operation) {
  operation.setSource();
  operation.set_native();
  str.Taint().overlay(0, str.Length(), operation);
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JSString* str, const char* name)
{
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name);
    op.setSource();
    op.set_native();
    JS_MarkTaintSource(cx, str, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name)
{
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name);
    op.setSource();
    op.set_native();
    JS_MarkTaintSource(cx, aValue, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    TaintOperation op = GetTaintOperation(cx, name, arg);
    op.setSource();
    op.set_native();
    JS_MarkTaintSource(cx, aValue, op);
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsTArray<nsString> &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSourceElement(nsAString &str, const char* name, const mozilla::dom::Element* element)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsAString &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsTArray<nsString> &arg)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
  }
  return NS_OK;
}

nsresult MarkTaintSourceElement(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element));
  }
  return NS_OK;
}

nsresult MarkTaintSourceAttribute(nsAString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  if (isSourceActive(name)) {
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, str, attr));
  }
  return NS_OK;
}

nsresult MarkTaintSourceAttribute(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  if (isSourceActive(name)) {
    nsAutoString nsStr;
    str.ToString(nsStr);
    return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, nsStr, attr));
  }
  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name, const nsAString &arg)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::RootedValue argval(cx);
  if (!mozilla::dom::ToJSValue(cx, arg, &argval))
    return NS_ERROR_FAILURE;

  JS::RootedValue strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval))
    return NS_ERROR_FAILURE;

  JS_ReportTaintSink(cx, strval, name, argval);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::RootedValue strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval)) {
    return NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, strval, name);

  return NS_OK;
}

nsresult ReportTaintSink(JSContext *cx, const nsACString &str, const char* name)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  if (!cx) {
    return NS_ERROR_FAILURE;
  }

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS::RootedValue strval(cx);
  if (!mozilla::dom::ToJSValue(cx, str, &strval)) {
    return NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, strval, name);

  return NS_OK;
}

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsAString &arg)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name, arg);
}

nsresult ReportTaintSink(const nsAString &str, const char* name, const mozilla::dom::Element* element)
{
  if (!str.isTainted()) {
    return NS_OK;
  }

  nsAutoString elementDesc;
  if (element) {
    DescribeElement(element, elementDesc);
  }

  return ReportTaintSink(str, name, elementDesc);
}

nsresult ReportTaintSink(const nsAString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(const nsACString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name)
{
  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  if (!isSinkActive(name)) {
    return NS_OK;
  }

  JS_ReportTaintSink(cx, aValue, name);

  return NS_OK;
}

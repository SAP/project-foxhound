/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

/**
 * This is not a generated file. It contains common utility functions
 * invoked from the JavaScript code generated from IDL interfaces.
 * The goal of the utility functions is to cut down on the size of
 * the generated code itself.
 */

#include "nsJSUtils.h"

#include <utility>
#include "MainThreadUtils.h"
#include "js/ComparisonOperators.h"
#include "js/CompilationAndEvaluation.h"
#include "js/CompileOptions.h"
#include "js/Date.h"
#include "js/GCVector.h"
#include "js/HeapAPI.h"
#include "js/Modules.h"
#include "js/RootingAPI.h"
#include "js/SourceText.h"
#include "js/TypeDecls.h"
#include "jsfriendapi.h"
#include "mozilla/CycleCollectedJSContext.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/DOMString.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/fallible.h"
#include "mozilla/ProfilerLabels.h"
#include "nsContentUtils.h"
#include "nsDebug.h"
#include "nsGlobalWindowInner.h"
#include "nsINode.h"
#include "nsString.h"
#include "nsTPromiseFlatString.h"
#include "nscore.h"
#include "prenv.h"

#if !defined(DEBUG) && !defined(MOZ_ENABLE_JS_DUMP)
#  include "mozilla/StaticPrefs_browser.h"
#endif

using namespace mozilla;
using namespace mozilla::dom;

bool nsJSUtils::GetCallingLocation(JSContext* aContext, nsACString& aFilename,
                                   uint32_t* aLineno, uint32_t* aColumn) {
  JS::AutoFilename filename;
  if (!JS::DescribeScriptedCaller(aContext, &filename, aLineno, aColumn)) {
    return false;
  }

  return aFilename.Assign(filename.get(), fallible);
}

bool nsJSUtils::GetCallingLocation(JSContext* aContext, nsAString& aFilename,
                                   uint32_t* aLineno, uint32_t* aColumn) {
  JS::AutoFilename filename;
  if (!JS::DescribeScriptedCaller(aContext, &filename, aLineno, aColumn)) {
    return false;
  }

  return aFilename.Assign(NS_ConvertUTF8toUTF16(filename.get()), fallible);
}

uint64_t nsJSUtils::GetCurrentlyRunningCodeInnerWindowID(JSContext* aContext) {
  if (!aContext) return 0;

  nsGlobalWindowInner* win = xpc::CurrentWindowOrNull(aContext);
  return win ? win->WindowID() : 0;
}

nsresult nsJSUtils::UpdateFunctionDebugMetadata(
    AutoJSAPI& jsapi, JS::Handle<JSObject*> aFun, JS::CompileOptions& aOptions,
    JS::Handle<JSString*> aElementAttributeName,
    JS::Handle<JS::Value> aPrivateValue) {
  JSContext* cx = jsapi.cx();

  JS::Rooted<JSFunction*> fun(cx, JS_GetObjectFunction(aFun));
  if (!fun) {
    return NS_ERROR_FAILURE;
  }

  JS::Rooted<JSScript*> script(cx, JS_GetFunctionScript(cx, fun));
  if (!script) {
    return NS_OK;
  }

  JS::InstantiateOptions instantiateOptions(aOptions);
  if (!JS::UpdateDebugMetadata(cx, script, instantiateOptions, aPrivateValue,
                               aElementAttributeName, nullptr, nullptr)) {
    return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

nsresult nsJSUtils::CompileFunction(AutoJSAPI& jsapi,
                                    JS::HandleVector<JSObject*> aScopeChain,
                                    JS::CompileOptions& aOptions,
                                    const nsACString& aName, uint32_t aArgCount,
                                    const char** aArgArray,
                                    const nsAString& aBody,
                                    JSObject** aFunctionObject) {
  JSContext* cx = jsapi.cx();
  MOZ_ASSERT(js::GetContextRealm(cx));
  MOZ_ASSERT_IF(aScopeChain.length() != 0,
                js::IsObjectInContextCompartment(aScopeChain[0], cx));

  // Do the junk Gecko is supposed to do before calling into JSAPI.
  for (size_t i = 0; i < aScopeChain.length(); ++i) {
    JS::ExposeObjectToActiveJS(aScopeChain[i]);
  }

  // Compile.
  const nsPromiseFlatString& flatBody = PromiseFlatString(aBody);

  JS::SourceText<char16_t> source;
  if (!source.init(cx, flatBody.get(), flatBody.Length(),
                   JS::SourceOwnership::Borrowed)) {
    return NS_ERROR_FAILURE;
  }

  JS::Rooted<JSFunction*> fun(
      cx, JS::CompileFunction(cx, aScopeChain, aOptions,
                              PromiseFlatCString(aName).get(), aArgCount,
                              aArgArray, source));
  if (!fun) {
    return NS_ERROR_FAILURE;
  }

  *aFunctionObject = JS_GetFunctionObject(fun);
  return NS_OK;
}

/* static */
bool nsJSUtils::IsScriptable(JS::Handle<JSObject*> aEvaluationGlobal) {
  return xpc::Scriptability::AllowedIfExists(aEvaluationGlobal);
}

static bool AddScopeChainItem(JSContext* aCx, nsINode* aNode,
                              JS::MutableHandleVector<JSObject*> aScopeChain) {
  JS::Rooted<JS::Value> val(aCx);
  if (!GetOrCreateDOMReflector(aCx, aNode, &val)) {
    return false;
  }

  if (!aScopeChain.append(&val.toObject())) {
    return false;
  }

  return true;
}

/* static */
bool nsJSUtils::GetScopeChainForElement(
    JSContext* aCx, Element* aElement,
    JS::MutableHandleVector<JSObject*> aScopeChain) {
  for (nsINode* cur = aElement; cur; cur = cur->GetScopeChainParent()) {
    if (!AddScopeChainItem(aCx, cur, aScopeChain)) {
      return false;
    }
  }

  return true;
}

/* static */
void nsJSUtils::ResetTimeZone() { JS::ResetTimeZone(); }

/* static */
bool nsJSUtils::DumpEnabled() {
#ifdef FUZZING
  static bool mozFuzzDebug = !!PR_GetEnv("MOZ_FUZZ_DEBUG");
  return mozFuzzDebug;
#endif

#if defined(DEBUG) || defined(MOZ_ENABLE_JS_DUMP)
  return true;
#else
  return StaticPrefs::browser_dom_window_dump_enabled();
#endif
}

//
// nsDOMJSUtils.h
//

template <typename T>
bool nsTAutoJSString<T>::init(const JS::Value& v) {
  // Note: it's okay to use danger::GetJSContext here instead of AutoJSAPI,
  // because the init() call below is careful not to run script (for instance,
  // it only calls JS::ToString for non-object values).
  JSContext* cx = danger::GetJSContext();
  if (!init(cx, v)) {
    JS_ClearPendingException(cx);
    return false;
  }
  return true;
}

template bool nsTAutoJSString<char16_t>::init(const JS::Value&);
template bool nsTAutoJSString<char>::init(const JS::Value&);

LazyLogModule gTaintLog("Taint");

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
      return JS_GetTaintOperation(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const nsTArray<nsString> &args)
{
  if (cx && JS::CurrentGlobalOrNull(cx)) {
    JS::RootedValue argval(cx);

    if (mozilla::dom::ToJSValue(cx, args, &argval)) {
      return JS_GetTaintOperation(cx, name, argval);
    }
  }

  return TaintOperation(name);
}

static TaintOperation GetTaintOperation(JSContext *cx, const char* name, const mozilla::dom::Element* element)
{
  if (element) {
    nsTArray<nsString> args;
    nsAutoString elementDesc;

    element->Describe(elementDesc);
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
    element->Describe(elementDesc);
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
  TaintOperation op = GetTaintOperation(cx, name);
  op.setSource();
  op.set_native();
  JS_MarkTaintSource(cx, str, op);
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name)
{
  TaintOperation op = GetTaintOperation(cx, name);
  op.setSource();
  op.set_native();
  JS_MarkTaintSource(cx, aValue, op);
  return NS_OK;
}

nsresult MarkTaintSource(JSContext* cx, JS::MutableHandle<JS::Value> aValue, const char* name, const nsAString &arg)
{
  TaintOperation op = GetTaintOperation(cx, name, arg);
  op.setSource();
  op.set_native();
  JS_MarkTaintSource(cx, aValue, op);
  return NS_OK;
}

nsresult MarkTaintSource(nsAString &str, const char* name)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsAString &arg)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
}

nsresult MarkTaintSource(nsAString &str, const char* name, const nsTArray<nsString> &arg)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
}

nsresult MarkTaintSourceElement(nsAString &str, const char* name, const mozilla::dom::Element* element)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element));
}

nsresult MarkTaintSourceAttribute(nsAString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, str, attr));
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsAString &arg)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
}

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsTArray<nsString> &arg)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, arg));
}

nsresult MarkTaintSourceElement(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element));
}

nsresult MarkTaintSourceAttribute(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr)
{
  nsAutoString nsStr;
  str.ToString(nsStr);
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name, element, nsStr, attr));
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

nsresult ReportTaintSink(const nsAString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(const nsACString &str, const char* name)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name);
}

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name) {

  if (!nsContentUtils::IsSafeToRunScript() || !JS::CurrentGlobalOrNull(cx)) {
    return NS_ERROR_FAILURE;
  }

  JS_ReportTaintSink(cx, aValue, name);

  return NS_OK;
}

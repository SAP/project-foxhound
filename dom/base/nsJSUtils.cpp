/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This is not a generated file. It contains common utility functions
 * invoked from the JavaScript code generated from IDL interfaces.
 * The goal of the utility functions is to cut down on the size of
 * the generated code itself.
 */

#include "nsJSUtils.h"
#include "jsapi.h"
#include "jsfriendapi.h"
#include "js/CompilationAndEvaluation.h"
#include "js/Date.h"
#include "js/Modules.h"  // JS::CompileModule, JS::GetModuleScript, JS::Module{Instantiate,Evaluate}
#include "js/OffThreadScriptCompilation.h"
#include "js/SourceText.h"
#include "nsIScriptContext.h"
#include "nsIScriptElement.h"
#include "nsIScriptGlobalObject.h"
#include "nsCOMPtr.h"
#include "nsPIDOMWindow.h"
#include "GeckoProfiler.h"
#include "nsJSPrincipals.h"
#include "xpcpublic.h"
#include "nsContentUtils.h"
#include "nsGlobalWindow.h"
#include "mozilla/CycleCollectedJSContext.h"
#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/DOMString.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/Utf8.h"  // mozilla::Utf8Unit

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

static nsresult EvaluationExceptionToNSResult(JSContext* aCx) {
  if (JS_IsExceptionPending(aCx)) {
    return NS_SUCCESS_DOM_SCRIPT_EVALUATION_THREW;
  }
  return NS_SUCCESS_DOM_SCRIPT_EVALUATION_THREW_UNCATCHABLE;
}

nsJSUtils::ExecutionContext::ExecutionContext(JSContext* aCx,
                                              JS::Handle<JSObject*> aGlobal)
    :
#ifdef MOZ_GECKO_PROFILER
      mAutoProfilerLabel("nsJSUtils::ExecutionContext",
                         /* dynamicStr */ nullptr,
                         JS::ProfilingCategoryPair::JS),
#endif
      mCx(aCx),
      mRealm(aCx, aGlobal),
      mRetValue(aCx),
      mScopeChain(aCx),
      mScript(aCx),
      mRv(NS_OK),
      mSkip(false),
      mCoerceToString(false),
      mEncodeBytecode(false)
#ifdef DEBUG
      ,
      mWantsReturnValue(false),
      mExpectScopeChain(false),
      mScriptUsed(false)
#endif
{
  MOZ_ASSERT(aCx == nsContentUtils::GetCurrentJSContext());
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(CycleCollectedJSContext::Get() &&
             CycleCollectedJSContext::Get()->MicroTaskLevel());
  MOZ_ASSERT(mRetValue.isUndefined());

  MOZ_ASSERT(JS_IsGlobalObject(aGlobal));
  if (MOZ_UNLIKELY(!xpc::Scriptability::Get(aGlobal).Allowed())) {
    mSkip = true;
    mRv = NS_OK;
  }
}

void nsJSUtils::ExecutionContext::SetScopeChain(
    JS::HandleVector<JSObject*> aScopeChain) {
  if (mSkip) {
    return;
  }

#ifdef DEBUG
  mExpectScopeChain = true;
#endif
  // Now make sure to wrap the scope chain into the right compartment.
  if (!mScopeChain.reserve(aScopeChain.length())) {
    mSkip = true;
    mRv = NS_ERROR_OUT_OF_MEMORY;
    return;
  }

  for (size_t i = 0; i < aScopeChain.length(); ++i) {
    JS::ExposeObjectToActiveJS(aScopeChain[i]);
    mScopeChain.infallibleAppend(aScopeChain[i]);
    if (!JS_WrapObject(mCx, mScopeChain[i])) {
      mSkip = true;
      mRv = NS_ERROR_OUT_OF_MEMORY;
      return;
    }
  }
}

nsresult nsJSUtils::ExecutionContext::JoinCompile(
    JS::OffThreadToken** aOffThreadToken) {
  if (mSkip) {
    return mRv;
  }

  MOZ_ASSERT(!mWantsReturnValue);
  MOZ_ASSERT(!mExpectScopeChain);
  MOZ_ASSERT(!mScript);

  if (mEncodeBytecode) {
    mScript.set(JS::FinishOffThreadScriptAndStartIncrementalEncoding(
        mCx, *aOffThreadToken));
  } else {
    mScript.set(JS::FinishOffThreadScript(mCx, *aOffThreadToken));
  }
  *aOffThreadToken = nullptr;  // Mark the token as having been finished.
  if (!mScript) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

  return NS_OK;
}

template <typename Unit>
nsresult nsJSUtils::ExecutionContext::InternalCompile(
    JS::CompileOptions& aCompileOptions, JS::SourceText<Unit>& aSrcBuf) {
  if (mSkip) {
    return mRv;
  }

  MOZ_ASSERT(aSrcBuf.get());
  MOZ_ASSERT(mRetValue.isUndefined());
#ifdef DEBUG
  mWantsReturnValue = !aCompileOptions.noScriptRval;
#endif

  MOZ_ASSERT(!mScript);

  if (mScopeChain.length() != 0) {
    aCompileOptions.setNonSyntacticScope(true);
  }

  if (mEncodeBytecode) {
    mScript =
        JS::CompileAndStartIncrementalEncoding(mCx, aCompileOptions, aSrcBuf);
  } else {
    mScript = JS::Compile(mCx, aCompileOptions, aSrcBuf);
  }

  if (!mScript) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

  return NS_OK;
}

nsresult nsJSUtils::ExecutionContext::Compile(
    JS::CompileOptions& aCompileOptions, JS::SourceText<char16_t>& aSrcBuf) {
  return InternalCompile(aCompileOptions, aSrcBuf);
}

nsresult nsJSUtils::ExecutionContext::Compile(
    JS::CompileOptions& aCompileOptions, JS::SourceText<Utf8Unit>& aSrcBuf) {
  return InternalCompile(aCompileOptions, aSrcBuf);
}

nsresult nsJSUtils::ExecutionContext::Compile(
    JS::CompileOptions& aCompileOptions, const nsAString& aScript) {
  if (mSkip) {
    return mRv;
  }

  const nsPromiseFlatString& flatScript = PromiseFlatString(aScript);
  JS::SourceText<char16_t> srcBuf;
  if (!srcBuf.init(mCx, flatScript.get(), flatScript.Length(),
                   JS::SourceOwnership::Borrowed)) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

  return Compile(aCompileOptions, srcBuf);
}

nsresult nsJSUtils::ExecutionContext::Decode(
    JS::CompileOptions& aCompileOptions, mozilla::Vector<uint8_t>& aBytecodeBuf,
    size_t aBytecodeIndex) {
  if (mSkip) {
    return mRv;
  }

  MOZ_ASSERT(!mWantsReturnValue);
  JS::TranscodeResult tr = JS::DecodeScriptMaybeStencil(
      mCx, aCompileOptions, aBytecodeBuf, &mScript, aBytecodeIndex);
  // These errors are external parameters which should be handled before the
  // decoding phase, and which are the only reasons why you might want to
  // fallback on decoding failures.
  MOZ_ASSERT(tr != JS::TranscodeResult_Failure_BadBuildId &&
             tr != JS::TranscodeResult_Failure_WrongCompileOption);
  if (tr != JS::TranscodeResult_Ok) {
    mSkip = true;
    mRv = NS_ERROR_DOM_JS_DECODING_ERROR;
    return mRv;
  }

  return mRv;
}

nsresult nsJSUtils::ExecutionContext::JoinDecode(
    JS::OffThreadToken** aOffThreadToken) {
  if (mSkip) {
    return mRv;
  }

  MOZ_ASSERT(!mWantsReturnValue);
  MOZ_ASSERT(!mExpectScopeChain);
  mScript.set(JS::FinishOffThreadScriptDecoder(mCx, *aOffThreadToken));
  *aOffThreadToken = nullptr;  // Mark the token as having been finished.
  if (!mScript) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

  return NS_OK;
}

nsresult nsJSUtils::ExecutionContext::JoinDecodeBinAST(
    JS::OffThreadToken** aOffThreadToken) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

nsresult nsJSUtils::ExecutionContext::DecodeBinAST(
    JS::CompileOptions& aCompileOptions, const uint8_t* aBuf, size_t aLength) {
  return NS_ERROR_NOT_IMPLEMENTED;
}

JSScript* nsJSUtils::ExecutionContext::GetScript() {
#ifdef DEBUG
  MOZ_ASSERT(!mSkip);
  MOZ_ASSERT(mScript);
  mScriptUsed = true;
#endif

  return MaybeGetScript();
}

JSScript* nsJSUtils::ExecutionContext::MaybeGetScript() { return mScript; }

nsresult nsJSUtils::ExecutionContext::ExecScript() {
  if (mSkip) {
    return mRv;
  }

  MOZ_ASSERT(mScript);

  if (!JS_ExecuteScript(mCx, mScopeChain, mScript)) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

  return NS_OK;
}

static bool IsPromiseValue(JSContext* aCx, JS::Handle<JS::Value> aValue) {
  if (!aValue.isObject()) {
    return false;
  }

  // We only care about Promise here, so CheckedUnwrapStatic is fine.
  JS::Rooted<JSObject*> obj(aCx, js::CheckedUnwrapStatic(&aValue.toObject()));
  if (!obj) {
    return false;
  }

  return JS::IsPromiseObject(obj);
}

nsresult nsJSUtils::ExecutionContext::ExecScript(
    JS::MutableHandle<JS::Value> aRetValue) {
  if (mSkip) {
    aRetValue.setUndefined();
    return mRv;
  }

  MOZ_ASSERT(mScript);
  MOZ_ASSERT(mWantsReturnValue);

  if (!JS_ExecuteScript(mCx, mScopeChain, mScript, aRetValue)) {
    mSkip = true;
    mRv = EvaluationExceptionToNSResult(mCx);
    return mRv;
  }

#ifdef DEBUG
  mWantsReturnValue = false;
#endif
  if (mCoerceToString && IsPromiseValue(mCx, aRetValue)) {
    // We're a javascript: url and we should treat Promise return values as
    // undefined.
    //
    // Once bug 1477821 is fixed this code might be able to go away, or will
    // become enshrined in the spec, depending.
    aRetValue.setUndefined();
  }

  if (mCoerceToString && !aRetValue.isUndefined()) {
    JSString* str = JS::ToString(mCx, aRetValue);
    if (!str) {
      // ToString can be a function call, so an exception can be raised while
      // executing the function.
      mSkip = true;
      return EvaluationExceptionToNSResult(mCx);
    }
    aRetValue.set(JS::StringValue(str));
  }

  return NS_OK;
}

template <typename Unit>
static nsresult CompileJSModule(JSContext* aCx, JS::SourceText<Unit>& aSrcBuf,
                                JS::Handle<JSObject*> aEvaluationGlobal,
                                JS::CompileOptions& aCompileOptions,
                                JS::MutableHandle<JSObject*> aModule) {
  AUTO_PROFILER_LABEL("nsJSUtils::CompileModule", JS);
  MOZ_ASSERT(aCx == nsContentUtils::GetCurrentJSContext());
  MOZ_ASSERT(aSrcBuf.get());
  MOZ_ASSERT(JS_IsGlobalObject(aEvaluationGlobal));
  MOZ_ASSERT(JS::CurrentGlobalOrNull(aCx) == aEvaluationGlobal);
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(CycleCollectedJSContext::Get() &&
             CycleCollectedJSContext::Get()->MicroTaskLevel());

  NS_ENSURE_TRUE(xpc::Scriptability::Get(aEvaluationGlobal).Allowed(), NS_OK);

  JSObject* module = JS::CompileModule(aCx, aCompileOptions, aSrcBuf);
  if (!module) {
    return NS_ERROR_FAILURE;
  }

  aModule.set(module);
  return NS_OK;
}

nsresult nsJSUtils::CompileModule(JSContext* aCx,
                                  JS::SourceText<char16_t>& aSrcBuf,
                                  JS::Handle<JSObject*> aEvaluationGlobal,
                                  JS::CompileOptions& aCompileOptions,
                                  JS::MutableHandle<JSObject*> aModule) {
  return CompileJSModule(aCx, aSrcBuf, aEvaluationGlobal, aCompileOptions,
                         aModule);
}

nsresult nsJSUtils::CompileModule(JSContext* aCx,
                                  JS::SourceText<Utf8Unit>& aSrcBuf,
                                  JS::Handle<JSObject*> aEvaluationGlobal,
                                  JS::CompileOptions& aCompileOptions,
                                  JS::MutableHandle<JSObject*> aModule) {
  return CompileJSModule(aCx, aSrcBuf, aEvaluationGlobal, aCompileOptions,
                         aModule);
}

nsresult nsJSUtils::ModuleInstantiate(JSContext* aCx,
                                      JS::Handle<JSObject*> aModule) {
  AUTO_PROFILER_LABEL("nsJSUtils::ModuleInstantiate", JS);

  MOZ_ASSERT(aCx == nsContentUtils::GetCurrentJSContext());
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(CycleCollectedJSContext::Get() &&
             CycleCollectedJSContext::Get()->MicroTaskLevel());

  NS_ENSURE_TRUE(xpc::Scriptability::Get(aModule).Allowed(), NS_OK);

  if (!JS::ModuleInstantiate(aCx, aModule)) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

nsresult nsJSUtils::ModuleEvaluate(JSContext* aCx,
                                   JS::Handle<JSObject*> aModule) {
  AUTO_PROFILER_LABEL("nsJSUtils::ModuleEvaluate", JS);

  MOZ_ASSERT(aCx == nsContentUtils::GetCurrentJSContext());
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(CycleCollectedJSContext::Get() &&
             CycleCollectedJSContext::Get()->MicroTaskLevel());

  NS_ENSURE_TRUE(xpc::Scriptability::Get(aModule).Allowed(), NS_OK);

  if (!JS::ModuleEvaluate(aCx, aModule)) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

static bool AddScopeChainItem(JSContext* aCx, nsINode* aNode,
                              JS::MutableHandleVector<JSObject*> aScopeChain) {
  JS::RootedValue val(aCx);
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

nsresult MarkTaintSource(nsAString &str, const char* name)
{
  return MarkTaintSource(str, GetTaintOperation(nsContentUtils::GetCurrentJSContext(), name));
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

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsAString &arg)
{
  return ReportTaintSink(nsContentUtils::GetCurrentJSContext(), str, name, arg);
}

nsresult ReportTaintSink(const nsAString &str, const char* name)
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

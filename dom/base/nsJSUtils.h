/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef nsJSUtils_h__
#define nsJSUtils_h__

/**
 * This is not a generated file. It contains common utility functions
 * invoked from the JavaScript code generated from IDL interfaces.
 * The goal of the utility functions is to cut down on the size of
 * the generated code itself.
 */

#include "mozilla/Assertions.h"
#include "mozilla/dom/DOMString.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/Utf8.h"  // mozilla::Utf8Unit

#include "jsapi.h"
#include "js/CompileOptions.h"
#include "js/Conversions.h"
#include "js/SourceText.h"
#include "js/String.h"  // JS::{,Lossy}CopyLinearStringChars, JS::CopyStringChars, JS::Get{,Linear}StringLength, JS::MaxStringLength, JS::StringHasLatin1Chars
#include "nsString.h"
#include "xpcpublic.h"

class nsIScriptContext;
class nsIScriptElement;
class nsIScriptGlobalObject;
class nsXBLPrototypeBinding;

namespace mozilla {
union Utf8Unit;

namespace dom {
class AutoJSAPI;
class Element;
}  // namespace dom
}  // namespace mozilla

class nsJSUtils {
 public:
  static bool GetCallingLocation(JSContext* aContext, nsACString& aFilename,
                                 uint32_t* aLineno = nullptr,
                                 uint32_t* aColumn = nullptr);
  static bool GetCallingLocation(JSContext* aContext, nsAString& aFilename,
                                 uint32_t* aLineno = nullptr,
                                 uint32_t* aColumn = nullptr);

  /**
   * Retrieve the inner window ID based on the given JSContext.
   *
   * @param JSContext aContext
   *        The JSContext from which you want to find the inner window ID.
   *
   * @returns uint64_t the inner window ID.
   */
  static uint64_t GetCurrentlyRunningCodeInnerWindowID(JSContext* aContext);

  static nsresult CompileFunction(mozilla::dom::AutoJSAPI& jsapi,
                                  JS::HandleVector<JSObject*> aScopeChain,
                                  JS::CompileOptions& aOptions,
                                  const nsACString& aName, uint32_t aArgCount,
                                  const char** aArgArray,
                                  const nsAString& aBody,
                                  JSObject** aFunctionObject);

  static nsresult UpdateFunctionDebugMetadata(
      mozilla::dom::AutoJSAPI& jsapi, JS::Handle<JSObject*> aFun,
      JS::CompileOptions& aOptions, JS::Handle<JSString*> aElementAttributeName,
      JS::Handle<JS::Value> aPrivateValue);

  static bool IsScriptable(JS::Handle<JSObject*> aEvaluationGlobal);

  // Returns false if an exception got thrown on aCx.  Passing a null
  // aElement is allowed; that wil produce an empty aScopeChain.
  static bool GetScopeChainForElement(
      JSContext* aCx, mozilla::dom::Element* aElement,
      JS::MutableHandleVector<JSObject*> aScopeChain);

  static void ResetTimeZone();

  static bool DumpEnabled();
};

inline void AssignFromStringBuffer(nsStringBuffer* buffer, size_t len,
                                   nsAString& dest) {
  buffer->ToString(len, dest);
}

template <typename T, typename std::enable_if_t<std::is_same<
                          typename T::char_type, char16_t>::value>* = nullptr>
inline bool AssignJSString(JSContext* cx, T& dest, JSString* s) {
  size_t len = JS::GetStringLength(s);
  static_assert(JS::MaxStringLength < (1 << 30),
                "Shouldn't overflow here or in SetCapacity");

  const char16_t* chars;
  if (XPCStringConvert::MaybeGetDOMStringChars(s, &chars)) {
    // The characters represent an existing string buffer that we shared with
    // JS.  We can share that buffer ourselves if the string corresponds to the
    // whole buffer; otherwise we have to copy.
    if (chars[len] == '\0') {
      AssignFromStringBuffer(
          nsStringBuffer::FromData(const_cast<char16_t*>(chars)), len, dest);
      return true;
    }
  } else if (XPCStringConvert::MaybeGetLiteralStringChars(s, &chars)) {
    // The characters represent a literal char16_t string constant
    // compiled into libxul; we can just use it as-is.
    dest.AssignLiteral(chars, len);
    return true;
  }

  // We don't bother checking for a dynamic-atom external string, because we'd
  // just need to copy out of it anyway.

  if (MOZ_UNLIKELY(!dest.SetLength(len, mozilla::fallible))) {
    JS_ReportOutOfMemory(cx);
    return false;
  }

  // TaintFox: copy taint when converting between JavaScript and Gecko strings.
  dest.AssignTaint(JS_GetStringTaint(s));

  return JS::CopyStringChars(cx, dest.BeginWriting(), s, len);
}

// Specialization for UTF8String.
template <typename T, typename std::enable_if_t<std::is_same<
                          typename T::char_type, char>::value>* = nullptr>
inline bool AssignJSString(JSContext* cx, T& dest, JSString* s) {
  using namespace mozilla;
  CheckedInt<size_t> bufLen(JS::GetStringLength(s));
  // From the contract for JS_EncodeStringToUTF8BufferPartial, to guarantee that
  // the whole string is converted.
  if (JS::StringHasLatin1Chars(s)) {
    bufLen *= 2;
  } else {
    bufLen *= 3;
  }

  if (MOZ_UNLIKELY(!bufLen.isValid())) {
    JS_ReportOutOfMemory(cx);
    return false;
  }

  // Shouldn't really matter, but worth being safe.
  const bool kAllowShrinking = true;

  auto handleOrErr = dest.BulkWrite(bufLen.value(), 0, kAllowShrinking);
  if (MOZ_UNLIKELY(handleOrErr.isErr())) {
    JS_ReportOutOfMemory(cx);
    return false;
  }

  auto handle = handleOrErr.unwrap();

  auto maybe = JS_EncodeStringToUTF8BufferPartial(cx, s, handle.AsSpan());
  if (MOZ_UNLIKELY(!maybe)) {
    JS_ReportOutOfMemory(cx);
    return false;
  }

  size_t read;
  size_t written;
  Tie(read, written) = *maybe;

  MOZ_ASSERT(read == JS::GetStringLength(s));
  handle.Finish(written, kAllowShrinking);
  return true;
}

inline void AssignJSLinearString(nsAString& dest, JSLinearString* s) {
  size_t len = JS::GetLinearStringLength(s);
  static_assert(JS::MaxStringLength < (1 << 30),
                "Shouldn't overflow here or in SetCapacity");
  dest.SetLength(len);

  // TaintFox: copy taint when converting between JavaScript and Gecko strings.
  dest.AssignTaint(JS_GetStringTaint(s));

  JS::CopyLinearStringChars(dest.BeginWriting(), s, len);
}

inline void AssignJSLinearString(nsACString& dest, JSLinearString* s) {
  size_t len = JS::GetLinearStringLength(s);
  static_assert(JS::MaxStringLength < (1 << 30),
                "Shouldn't overflow here or in SetCapacity");
  dest.SetLength(len);
  JS::LossyCopyLinearStringChars(dest.BeginWriting(), s, len);
}

template <typename T>
class nsTAutoJSLinearString : public nsTAutoString<T> {
 public:
  explicit nsTAutoJSLinearString(JSLinearString* str) {
    AssignJSLinearString(*this, str);
  }
};

using nsAutoJSLinearString = nsTAutoJSLinearString<char16_t>;
using nsAutoJSLinearCString = nsTAutoJSLinearString<char>;

template <typename T>
class nsTAutoJSString : public nsTAutoString<T> {
 public:
  /**
   * nsTAutoJSString should be default constructed, which leaves it empty
   * (this->IsEmpty()), and initialized with one of the init() methods below.
   */
  nsTAutoJSString() = default;

  bool init(JSContext* aContext, JSString* str) {
    return AssignJSString(aContext, *this, str);
  }

  bool init(JSContext* aContext, const JS::Value& v) {
    if (v.isString()) {
      return init(aContext, v.toString());
    }

    // Stringify, making sure not to run script.
    JS::Rooted<JSString*> str(aContext);
    if (v.isObject()) {
      str = JS_NewStringCopyZ(aContext, "[Object]");
    } else {
      JS::Rooted<JS::Value> rootedVal(aContext, v);
      str = JS::ToString(aContext, rootedVal);
    }

    return str && init(aContext, str);
  }

  bool init(JSContext* aContext, jsid id) {
    JS::Rooted<JS::Value> v(aContext);
    return JS_IdToValue(aContext, id, &v) && init(aContext, v);
  }

  bool init(const JS::Value& v);

  ~nsTAutoJSString() = default;
};

using nsAutoJSString = nsTAutoJSString<char16_t>;

// Note that this is guaranteed to be UTF-8.
using nsAutoJSCString = nsTAutoJSString<char>;

// Get a taint operation
TaintOperation GetTaintOperation(const char* name);

// Extend the taintflow
nsresult MarkTaintOperation(nsAString &str, const char* name);
nsresult MarkTaintOperation(nsACString &str, const char* name);
nsresult MarkTaintOperation(nsAString &str, const char* name, const nsTArray<nsString> &arg);
nsresult MarkTaintOperation(StringTaint& aTaint, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(nsAString &str, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(nsAString &str, const char* name, const nsAString &arg);

nsresult MarkTaintSource(nsAString &str, const char* name, const nsTArray<nsString> &arg);

nsresult MarkTaintSourceElement(nsAString &str, const char* name, const mozilla::dom::Element* element);

nsresult MarkTaintSourceAttribute(nsAString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsAString &arg);

nsresult MarkTaintSource(mozilla::dom::DOMString &str, const char* name, const nsTArray<nsString> &arg);

nsresult MarkTaintSourceElement(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element);

// TaintFox: Add taint source information to a string
nsresult MarkTaintSourceAttribute(mozilla::dom::DOMString &str, const char* name, const mozilla::dom::Element* element,
                                  const nsAString &attr);

nsresult MarkTaintSource(JSContext* aCx, JS::MutableHandle<JS::Value> aValue, const char* name);

nsresult MarkTaintSource(JSContext* aCx, JS::MutableHandle<JS::Value> aValue, const char* name, const nsAString &arg);

nsresult MarkTaintSource(JSContext* aCx, JSString* str, const char* name);

// TaintFox: Report taint flows into DOM related sinks.
nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name);

// TaintFox: Report taint flows into DOM related sinks.
nsresult ReportTaintSink(const nsAString &str, const char* name);

nsresult ReportTaintSink(const nsACString &str, const char* name);

nsresult ReportTaintSink(JSContext *cx, const nsAString &str, const char* name, const nsAString &arg);

nsresult ReportTaintSink(const nsAString &str, const char* name, const nsAString &arg);

nsresult ReportTaintSink(JSContext* cx, JS::Handle<JS::Value> aValue, const char* name);

#endif /* nsJSUtils_h__ */

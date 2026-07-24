/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "JSIPCValueUtils.h"

#include <stdint.h>

#include <utility>

#include "js/Array.h"
#include "js/Class.h"  // ESClass
#include "js/Id.h"
#include "js/Object.h"
#include "js/Object.h"  // JS::GetBuiltinClass
#include "js/RootingAPI.h"
#include "js/String.h"
#include "js/Value.h"
#include "js/friend/DumpFunctions.h"
#include "js/friend/StackLimits.h"  // js::AutoCheckRecursionLimit
#include "jsapi.h"
#include "mozilla/Assertions.h"
#include "mozilla/CycleCollectedJSRuntime.h"  // OOMReported
#include "mozilla/Logging.h"
#include "mozilla/NotNull.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/DOMRect.h"
#include "mozilla/dom/DOMRectBinding.h"
#include "mozilla/dom/MessagePort.h"
#include "mozilla/dom/StructuredCloneHolderBinding.h"
#include "nsContentUtils.h"
#include "nsFrameMessageManager.h"
#include "nsJSUtils.h"
#include "xpcpublic.h"  // Logging of nsIPrincipal being unhandled.

using js::ESClass;
using JS::GetBuiltinClass;

namespace mozilla::dom {

bool JSActorSupportsTypedSend(const nsACString& aName) {
  if (!StaticPrefs::dom_jsipc_send_typed()) {
    return false;
  }

  // The Conduits and ProcessConduits actors send arguments for WebExtension
  // calls in JS arrays, which means that WebExtensions are exposed to the
  // idiosyncracies of nsFrameMessageManager::GetParamsForMessage(). There is
  // even a subtest in browser_ext_sessions_window_tab_value.js that checks some
  // specific behavior of the JSON serializer fallback. See 1960449 bug for
  // details. Therefore, for now we don't want to use the typed serializer for
  // those actors to reduce compatibility risk.
  if (aName == "Conduits" || aName == "ProcessConduits") {
    return false;
  }

  // Using the new serializer for the devtools DAMP tests causes performance
  // regressions. Devtools uses complex messages that are difficult to type, so
  // we're probably not losing much by giving up entirely on typing it.
  // See bug 2007393.
  if (aName == "DevToolsProcess" || aName == "BrowserToolboxDevToolsProcess") {
    return false;
  }

  // Send messages from these actors untyped. Their messages are complex, so
  // using IPDL serialization might cause problems, and the actors have a lot
  // of privilege, so type checking won't add much safety.
  return aName != "SpecialPowers" && aName != "MarionetteCommands";
}

using Context = JSIPCValueUtils::Context;

static mozilla::LazyLogModule sSerializerLogger("JSIPCSerializer");

#define MOZ_LOG_SERIALIZE_WARN(_arg) \
  MOZ_LOG(sSerializerLogger, mozilla::LogLevel::Warning, (_arg))

static JSIPCValue NoteJSAPIFailure(Context& aCx, ErrorResult& aError,
                                   const char* aWarning) {
  MOZ_LOG(sSerializerLogger, mozilla::LogLevel::Warning, ("%s", aWarning));
  aError.NoteJSContextException(aCx);
  return JSIPCValue(void_t());
}

/*
 * Conversion from JS values to JSIPCValues.
 */

static JSIPCValue FromJSObject(Context& aCx, JS::Handle<JSObject*> aObj,
                               ErrorResult& aError) {
  JS::RootedVector<JS::PropertyKey> idv(aCx);

  // As with TryAppendNativeProperties from StructuredClone.cpp, this ignores
  // symbols by not having the JSITER_SYMBOLS flag.
  if (!js::GetPropertyKeys(aCx, aObj, JSITER_OWNONLY, &idv)) {
    return NoteJSAPIFailure(aCx, aError, "GetPropertyKeys failed");
  }

  nsTArray<JSIPCProperty> properties;
  JS::Rooted<JS::PropertyKey> id(aCx);
  JS::Rooted<Maybe<JS::PropertyDescriptor>> desc(aCx);
  JS::Rooted<JS::Value> val(aCx);
  for (size_t i = 0; i < idv.length(); ++i) {
    id = idv[i];
    nsString stringName;
    bool isSymbol = false;
    if (!ConvertIdToString(aCx, id, stringName, isSymbol)) {
      return NoteJSAPIFailure(aCx, aError,
                              "FromJSObject id string conversion failed");
    }
    MOZ_ASSERT(!isSymbol);

    if (!JS_GetPropertyById(aCx, aObj, id, &val)) {
      return NoteJSAPIFailure(aCx, aError, "FromJSObject get property failed");
    }
    auto ipcVal = JSIPCValueUtils::TypedFromJSVal(aCx, val, aError);
    if (aError.Failed()) {
      MOZ_LOG_SERIALIZE_WARN("FromJSObject value conversion failed");
      return ipcVal;
    }

    // If the property value has failed to serialize in non-strict mode, we want
    // to drop the property entirely. Introducing a property with the value
    // undefined in an object doesn't help anything, and this is also the
    // behavior of GetParamsForMessage() in this situation, so this should
    // increase compatibility.
    //
    // We always serialize to undefined when failing to serialize in non-strict
    // mode. We also serialize to undefined if there was an error, but we've
    // already checked aError.Failed() above. The original value could also have
    // been undefined, so we must check !val.isUndefined().
    if (ipcVal.type() == JSIPCValue::Tvoid_t && !val.isUndefined()) {
      MOZ_ASSERT(!aCx.mStrict, "serialized to undefined with non-strict");
      continue;
    }

    properties.EmplaceBack(JSIPCProperty(stringName, std::move(ipcVal)));
  }

  return JSIPCValue(std::move(properties));
}

static JSIPCValue FromJSArray(Context& aCx, JS::Handle<JSObject*> aObj,
                              ErrorResult& aError) {
  uint32_t len = 0;
  if (!JS::GetArrayLength(aCx, aObj, &len)) {
    return NoteJSAPIFailure(aCx, aError, "FromJSArray GetArrayLength failed");
  }

  JS::Rooted<JS::Value> elt(aCx);
  nsTArray<JSIPCValue> elements(len);

  for (uint32_t i = 0; i < len; i++) {
    if (!JS_GetElement(aCx, aObj, i, &elt)) {
      return NoteJSAPIFailure(aCx, aError, "FromJSArray GetElement failed");
    }

    auto ipcElt = JSIPCValueUtils::TypedFromJSVal(aCx, elt, aError);
    if (aError.Failed()) {
      MOZ_LOG_SERIALIZE_WARN("FromJSArray element conversion failed");
      return ipcElt;
    }
    elements.AppendElement(std::move(ipcElt));
  }
  return JSIPCValue(JSIPCArray(std::move(elements)));
}

// This is based on JSStructuredCloneWriter::traverseSet().
static JSIPCValue FromJSSet(Context& aCx, JS::Handle<JSObject*> aObj,
                            ErrorResult& aError) {
  JS::Rooted<JS::GCVector<JS::Value>> elements(
      aCx, JS::GCVector<JS::Value>(aCx.mCx));
  if (!js::GetSetObjectKeys(aCx, aObj, &elements)) {
    return NoteJSAPIFailure(aCx, aError, "FromJSSet GetSetObjectKeys failed");
  }

  nsTArray<JSIPCValue> ipcElements(elements.length());
  for (size_t i = 0; i < elements.length(); ++i) {
    JSIPCValue ipcElement =
        JSIPCValueUtils::TypedFromJSVal(aCx, elements[i], aError);
    if (aError.Failed()) {
      MOZ_LOG_SERIALIZE_WARN("FromJSSet element conversion failed");
      return ipcElement;
    }
    ipcElements.AppendElement(std::move(ipcElement));
  }

  return JSIPCValue(JSIPCSet(std::move(ipcElements)));
}

static JSIPCValue FromJSMap(Context& aCx, JS::Handle<JSObject*> aObj,
                            ErrorResult& aError) {
  JS::Rooted<JS::GCVector<JS::Value>> entries(aCx,
                                              JS::GCVector<JS::Value>(aCx.mCx));
  if (!js::GetMapObjectKeysAndValuesInterleaved(aCx, aObj, &entries)) {
    return NoteJSAPIFailure(aCx, aError,
                            "GetMapObjectKeysAndValuesInterleaved failed");
  }

  // The entries vector contains a sequence of key/value pairs for each entry
  // in the map, and always has a length that is a multiple of 2.
  MOZ_ASSERT(entries.length() % 2 == 0);
  nsTArray<JSIPCMapEntry> ipcEntries(entries.length() / 2);
  for (size_t i = 0; i < entries.length(); i += 2) {
    auto ipcKey = JSIPCValueUtils::TypedFromJSVal(aCx, entries[i], aError);
    if (aError.Failed()) {
      MOZ_LOG_SERIALIZE_WARN("FromJSMap key conversion failed");
      return ipcKey;
    }
    auto ipcVal = JSIPCValueUtils::TypedFromJSVal(aCx, entries[i + 1], aError);
    if (aError.Failed()) {
      MOZ_LOG_SERIALIZE_WARN("FromJSMap value conversion failed");
      return ipcVal;
    }
    ipcEntries.AppendElement(
        JSIPCMapEntry(std::move(ipcKey), std::move(ipcVal)));
  }

  return JSIPCValue(std::move(ipcEntries));
}

// Log information about the JS value that we had trouble serializing.
// This can be useful when debugging why IPDL serialization is failing on
// specific objects.
static void FallbackLogging(Context& aCx, JS::Handle<JS::Value> aVal) {
  if (!MOZ_LOG_TEST(sSerializerLogger, LogLevel::Info)) {
    return;
  }

  // For investigating certain kinds of problems, it is useful to also call
  // js::DumpValue(aVal) here. Unfortunately it is not as helpful as you'd hope
  // because it only gives information about the top level value.

  nsAutoString json;
  if (!nsContentUtils::StringifyJSON(aCx, aVal, json,
                                     UndefinedIsNullStringLiteral)) {
    JS_ClearPendingException(aCx);
    return;
  }
  MOZ_LOG(sSerializerLogger, mozilla::LogLevel::Info,
          ("JSON serialization to: %s", NS_ConvertUTF16toUTF8(json).get()));
}

// Use structured clone to serialize the JS value without type information.
// If aTopLevel is false, then this method is being called as a fallback in the
// middle of a fully typed IPDL serialization, so we may want to do some extra
// logging to understand any serialization failures.
static JSIPCValue UntypedFromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                                   ErrorResult& aError,
                                   bool aTopLevel = false) {
  js::AssertSameCompartment(aCx, aVal);

  if (!aTopLevel) {
    FallbackLogging(aCx, aVal);
  }

  auto data = MakeNotNull<RefPtr<ipc::StructuredCloneData>>();
  IgnoredErrorResult rv;
  data->Write(aCx, aVal, JS::UndefinedHandleValue, JS::CloneDataPolicy(), rv);
  if (!rv.Failed()) {
    return JSIPCValue(std::move(data));
  }

  JS_ClearPendingException(aCx);

  if (!aTopLevel) {
    MOZ_LOG_SERIALIZE_WARN("structured clone failed");
  }

  if (aCx.mStrict) {
    aError.ThrowInvalidStateError(
        "structured clone failed for strict serialization");
    return JSIPCValue(void_t());
  }

  // Unlike in nsFrameMessageManager::GetParamsForMessage(), we are probably
  // right at whatever value can't be serialized, so return a dummy value in
  // order to usefully serialize the rest of the value.
  //
  // The fallback serializer for GetParamsForMessage() does the equivalent of
  // structuredClone(JSON.parse(JSON.stringify(v))), which can result in some
  // odd behavior for parts of a value that are structured clonable but not
  // representable in JSON.
  //
  // We are deliberately not fully compatible with the odd behavior of
  // GetParamsForMessage(). See bug 1960449 for an example of how that can cause
  // problems. Also see the second half of browser_jsat_serialize.js for
  // examples of various corner cases with GetParamsForMessage() and how that
  // compares to the behavior of this serializer.
  return JSIPCValue(void_t());
}

#define MOZ_LOG_UNTYPED_FALLBACK_WARN(_str)              \
  MOZ_LOG(sSerializerLogger, mozilla::LogLevel::Warning, \
          ("UntypedFromJSVal fallback: %s", _str))

// Try to serialize an ESClass::Other JS Object in a typeable way.
static JSIPCValue TypedFromOther(Context& aCx, JS::Handle<JS::Value> aVal,
                                 ErrorResult& aError) {
  if (!aVal.isObject()) {
    MOZ_LOG_UNTYPED_FALLBACK_WARN("non-object ESClass::Other");
    return UntypedFromJSVal(aCx, aVal, aError);
  }

  JS::Rooted<JSObject*> obj(aCx, &aVal.toObject());
  if (!xpc::IsReflector(obj, aCx)) {
    MOZ_LOG_UNTYPED_FALLBACK_WARN("ESClass::Other without reflector");
    return UntypedFromJSVal(aCx, aVal, aError);
  }

  // Checking for BrowsingContext. Based on
  // StructuredCloneHolder::CustomWriteHandler().
  {
    BrowsingContext* holder = nullptr;
    if (NS_SUCCEEDED(UNWRAP_OBJECT(BrowsingContext, &obj, holder))) {
      return JSIPCValue(MaybeDiscardedBrowsingContext(holder));
    }
  }
  // Checking for nsIPrincipal. Based on
  // StructuredCloneHolder::WriteFullySerializableObjects().
  {
    nsCOMPtr<nsISupports> base = xpc::ReflectorToISupportsStatic(obj);
    nsCOMPtr<nsIPrincipal> principal = do_QueryInterface(base);
    if (principal) {
      // Warning: If you pass in principal directly, it gets silently converted
      // to a bool.
      return JSIPCValue(WrapNotNull<nsIPrincipal*>(principal));
    }
  }
  {
    DOMRect* holder = nullptr;
    if (NS_SUCCEEDED(UNWRAP_OBJECT(DOMRect, &obj, holder))) {
      return JSIPCValue(JSIPCDOMRect(holder->X(), holder->Y(), holder->Width(),
                                     holder->Height()));
    }
  }

  // TODO: In the case of a StructuredCloneHolder, it should be possible to
  // avoid the copy of the StructuredCloneHolder's buffer list into the wrapping
  // structured clone.

  // Don't warn if this is a StructuredCloneBlob: in that case, doing a
  // structured clone is the preferred outcome.
  if (MOZ_LOG_TEST(sSerializerLogger, LogLevel::Warning) &&
      !IS_INSTANCE_OF(StructuredCloneHolder, obj)) {
    MOZ_LOG_UNTYPED_FALLBACK_WARN(
        nsPrintfCString("ESClass::Other %s", JS::GetClass(obj)->name).get());
  }

  return UntypedFromJSVal(aCx, aVal, aError);
}

JSIPCValue JSIPCValueUtils::TypedFromJSVal(Context& aCx,
                                           JS::Handle<JS::Value> aVal,
                                           ErrorResult& aError) {
  js::AutoCheckRecursionLimit recursion(aCx);
  if (!recursion.check(aCx)) {
    return NoteJSAPIFailure(aCx, aError, "TypedFromJSVal recursion");
  }
  js::AssertSameCompartment(aCx, aVal);

  switch (aVal.type()) {
    case JS::ValueType::Undefined:
      return JSIPCValue(void_t());

    case JS::ValueType::Null:
      return JSIPCValue(null_t());

    case JS::ValueType::String: {
      nsAutoJSString stringVal;
      if (!stringVal.init(aCx, aVal.toString())) {
        return NoteJSAPIFailure(aCx, aError, "String init failed");
      }
      return JSIPCValue(stringVal);
    }

    case JS::ValueType::Boolean:
      return JSIPCValue(aVal.toBoolean());

    case JS::ValueType::Double:
      return JSIPCValue(aVal.toDouble());

    case JS::ValueType::Int32:
      return JSIPCValue(aVal.toInt32());

    case JS::ValueType::Object: {
      JS::Rooted<JSObject*> obj(aCx, &aVal.toObject());
      js::ESClass cls;
      if (!JS::GetBuiltinClass(aCx, obj, &cls)) {
        return NoteJSAPIFailure(aCx, aError, "GetBuiltinClass failed");
      }

      switch (cls) {
        case ESClass::Object:
          return FromJSObject(aCx, obj, aError);

        case ESClass::Array:
          return FromJSArray(aCx, obj, aError);

        case ESClass::Set:
          return FromJSSet(aCx, obj, aError);

        case ESClass::Map:
          return FromJSMap(aCx, obj, aError);

        case ESClass::Other:
          return TypedFromOther(aCx, aVal, aError);

        default:
          MOZ_LOG_UNTYPED_FALLBACK_WARN("Unhandled ESClass");
          return UntypedFromJSVal(aCx, aVal, aError);
      }
    }

    default:
      MOZ_LOG_UNTYPED_FALLBACK_WARN("Unhandled JS::ValueType");
      return UntypedFromJSVal(aCx, aVal, aError);
  }
}

// If we are trying to structured clone an entire JS value, we need the JSON
// serialization fallback implemented by GetParamsForMessage(). There are some
// places that attempt to send, for instance, an object where one property is a
// function, and they want the object to be sent with the function property
// removed. This behavior is (hopefully) not needed when we are doing a deeper
// serialization using JSIPCValue, because that supports only sending the
// parts of the object that are serializable, when in non-strict mode.
static JSIPCValue UntypedFromJSValWithJSONFallback(
    Context& aCx, JS::Handle<JS::Value> aVal, JS::Handle<JS::Value> aTransfer,
    ErrorResult& aError) {
  auto scd = MakeNotNull<RefPtr<ipc::StructuredCloneData>>();
  if (!nsFrameMessageManager::GetParamsForMessage(aCx, aVal, aTransfer, scd)) {
    aError.ThrowDataCloneError("UntypedFromJSValWithJSONFallback");
    return JSIPCValue(void_t());
  }
  return JSIPCValue(std::move(scd));
}

JSIPCValue JSIPCValueUtils::FromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                                      bool aSendTyped, ErrorResult& aError) {
  aError.MightThrowJSException();
  if (aSendTyped) {
    return TypedFromJSVal(aCx, aVal, aError);
  }
  if (aCx.mStrict) {
    return UntypedFromJSVal(aCx, aVal, aError, /* aTopLevel = */ true);
  }
  return UntypedFromJSValWithJSONFallback(aCx, aVal, JS::UndefinedHandleValue,
                                          aError);
}

JSIPCValue JSIPCValueUtils::FromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                                      JS::Handle<JS::Value> aTransferable,
                                      bool aSendTyped, ErrorResult& aError) {
  aError.MightThrowJSException();
  bool hasTransferable =
      !aTransferable.isNull() && !aTransferable.isUndefined();
  if (!aSendTyped || hasTransferable) {
    if (hasTransferable) {
      // We might be able to make this case more typeable, but as of November
      // 2024, we never send a message with a transferable that we care about
      // typing from child to parent, outside of testing. Support for
      // transferables may be required in the future if we start typing JSActor
      // messages from trusted processes.
      MOZ_LOG_SERIALIZE_WARN(
          "Falling back to structured clone due to transferable");
    }
    MOZ_ASSERT(!aCx.mStrict, "We could support this, but we don't");
    return UntypedFromJSValWithJSONFallback(aCx, aVal, aTransferable, aError);
  }
  return TypedFromJSVal(aCx, aVal, aError);
}

static void ToJSObject(JSContext* aCx, nsTArray<JSIPCProperty>&& aProperties,
                       JS::MutableHandle<JS::Value> aOut, ErrorResult& aError) {
  JS::Rooted<JSObject*> obj(aCx, JS_NewPlainObject(aCx));
  if (!obj) {
    aError.NoteJSContextException(aCx);
    return;
  }
  JS::Rooted<JS::PropertyKey> id(aCx);
  JS::Rooted<JS::Value> jsStringName(aCx);
  JS::Rooted<JS::Value> newVal(aCx);

  for (auto&& prop : aProperties) {
    if (!xpc::NonVoidStringToJsval(aCx, prop.name(), &jsStringName)) {
      aError.NoteJSContextException(aCx);
      return;
    }
    if (!JS_ValueToId(aCx, jsStringName, &id)) {
      aError.NoteJSContextException(aCx);
      return;
    }
    JSIPCValueUtils::ToJSVal(aCx, std::move(prop.value()), &newVal, aError);
    if (aError.Failed()) {
      return;
    }
    if (!JS_DefinePropertyById(aCx, obj, id, newVal, JSPROP_ENUMERATE)) {
      aError.NoteJSContextException(aCx);
      return;
    }
  }

  aOut.setObject(*obj);
}

static void ToJSArray(JSContext* aCx, nsTArray<JSIPCValue>&& aElements,
                      JS::MutableHandle<JS::Value> aOut, ErrorResult& aError) {
  JS::Rooted<JSObject*> array(aCx, JS::NewArrayObject(aCx, aElements.Length()));
  if (!array) {
    aError.NoteJSContextException(aCx);
    return;
  }

  JS::Rooted<JS::Value> value(aCx);
  for (uint32_t i = 0; i < aElements.Length(); i++) {
    JSIPCValueUtils::ToJSVal(aCx, std::move(aElements.ElementAt(i)), &value,
                             aError);
    if (aError.Failed()) {
      return;
    }
    if (!JS_DefineElement(aCx, array, i, value, JSPROP_ENUMERATE)) {
      aError.NoteJSContextException(aCx);
      return;
    }
  }

  aOut.setObject(*array);
}

static void ToJSSet(JSContext* aCx, nsTArray<JSIPCValue>&& aElements,
                    JS::MutableHandle<JS::Value> aOut, ErrorResult& aError) {
  JS::Rooted<JSObject*> setObject(aCx, JS::NewSetObject(aCx));
  if (!setObject) {
    aError.NoteJSContextException(aCx);
    return;
  }

  JS::Rooted<JS::Value> value(aCx);
  for (auto&& e : aElements) {
    JSIPCValueUtils::ToJSVal(aCx, std::move(e), &value, aError);
    if (aError.Failed()) {
      return;
    }
    if (!JS::SetAdd(aCx, setObject, value)) {
      aError.NoteJSContextException(aCx);
      return;
    }
  }

  aOut.setObject(*setObject);
}

static void ToJSMap(JSContext* aCx, nsTArray<JSIPCMapEntry>&& aEntries,
                    JS::MutableHandle<JS::Value> aOut, ErrorResult& aError) {
  JS::Rooted<JSObject*> mapObject(aCx, JS::NewMapObject(aCx));
  if (!mapObject) {
    aError.NoteJSContextException(aCx);
    return;
  }

  JS::Rooted<JS::Value> key(aCx);
  JS::Rooted<JS::Value> value(aCx);
  for (auto&& e : aEntries) {
    JSIPCValueUtils::ToJSVal(aCx, std::move(e.key()), &key, aError);
    if (aError.Failed()) {
      return;
    }
    JSIPCValueUtils::ToJSVal(aCx, std::move(e.value()), &value, aError);
    if (aError.Failed()) {
      return;
    }
    if (!JS::MapSet(aCx, mapObject, key, value)) {
      aError.NoteJSContextException(aCx);
      return;
    }
  }

  aOut.setObject(*mapObject);
}

// Copied from JSActorManager.cpp.
#define CHILD_DIAGNOSTIC_ASSERT(test, msg) \
  do {                                     \
    if (XRE_IsParentProcess()) {           \
      MOZ_ASSERT(test, msg);               \
    } else {                               \
      MOZ_DIAGNOSTIC_ASSERT(test, msg);    \
    }                                      \
  } while (0)

static void UntypedToJSVal(JSContext* aCx, ipc::StructuredCloneData& aData,
                           JS::MutableHandle<JS::Value> aOut,
                           ErrorResult& aError) {
  JS::Rooted<JS::Value> dataValue(aCx);
  aData.Read(aCx, &dataValue, aError);
  // StructuredCloneHolder populates an array of ports for MessageEvent.ports
  // which we don't need, but which StructuredCloneHolder's destructor will
  // assert on for thread safety reasons (that do not apply in this case) if
  // we do not consume the array.  It's possible for the Read call above to
  // populate this array even in event of an error, so we must consume the
  // array before processing the error.
  nsTArray<RefPtr<MessagePort>> ports = aData.TakeTransferredPorts();
  // Cast to void so that the ports will actually be moved, and then
  // discarded.
  (void)ports;
  if (aError.Failed()) {
    CHILD_DIAGNOSTIC_ASSERT(CycleCollectedJSRuntime::Get()->OOMReported(),
                            "Should not receive non-decodable data");
    return;
  }

  aOut.set(dataValue);
}

void JSIPCValueUtils::ToJSVal(JSContext* aCx, JSIPCValue&& aIn,
                              JS::MutableHandle<JS::Value> aOut,
                              ErrorResult& aError) {
  aError.MightThrowJSException();

  js::AutoCheckRecursionLimit recursion(aCx);
  if (!recursion.check(aCx)) {
    aError.NoteJSContextException(aCx);
    return;
  }

  switch (aIn.type()) {
    case JSIPCValue::Tvoid_t:
      aOut.setUndefined();
      return;

    case JSIPCValue::Tnull_t:
      aOut.setNull();
      return;

    case JSIPCValue::TnsString: {
      JS::Rooted<JS::Value> stringVal(aCx);
      if (!xpc::StringToJsval(aCx, aIn.get_nsString(), &stringVal)) {
        aError.NoteJSContextException(aCx);
        return;
      }
      aOut.set(stringVal);
      return;
    }

    case JSIPCValue::Tbool:
      aOut.setBoolean(aIn.get_bool());
      return;

    case JSIPCValue::Tdouble:
      aOut.set(JS_NumberValue(aIn.get_double()));
      return;

    case JSIPCValue::Tint32_t:
      aOut.setInt32(aIn.get_int32_t());
      return;

    case JSIPCValue::TnsIPrincipal: {
      JS::Rooted<JS::Value> result(aCx);
      nsCOMPtr<nsIPrincipal> principal = aIn.get_nsIPrincipal();
      if (!ToJSValue(aCx, principal, &result)) {
        aError.NoteJSContextException(aCx);
        return;
      }
      aOut.set(result);
      return;
    }

    case JSIPCValue::TMaybeDiscardedBrowsingContext: {
      JS::Rooted<JS::Value> result(aCx, JS::NullValue());
      const MaybeDiscardedBrowsingContext& bc =
          aIn.get_MaybeDiscardedBrowsingContext();

      // Succeed with the value null if the BC is discarded, to match the
      // behavior of BrowsingContext::ReadStructuredClone().
      if (!bc.IsNullOrDiscarded()) {
        if (!ToJSValue(aCx, bc.get(), &result)) {
          aError.NoteJSContextException(aCx);
          return;
        }
        if (!result.isObject()) {
          aError.ThrowInvalidStateError(
              "Non-object when wrapping BrowsingContext");
          return;
        }
      }
      aOut.set(result);
      return;
    }

    case JSIPCValue::TJSIPCDOMRect: {
      nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
      if (!global) {
        aError.ThrowInvalidStateError("No global");
        return;
      }
      const JSIPCDOMRect& idr = aIn.get_JSIPCDOMRect();
      RefPtr<DOMRect> domRect =
          new DOMRect(global, idr.x(), idr.y(), idr.width(), idr.height());
      JS::Rooted<JS::Value> result(aCx, JS::NullValue());
      if (!ToJSValue(aCx, domRect, &result)) {
        aError.NoteJSContextException(aCx);
        return;
      }
      aOut.set(result);
      return;
    }

    case JSIPCValue::TArrayOfJSIPCProperty:
      return ToJSObject(aCx, std::move(aIn.get_ArrayOfJSIPCProperty()), aOut,
                        aError);

    case JSIPCValue::TJSIPCArray:
      return ToJSArray(aCx, std::move(aIn.get_JSIPCArray().elements()), aOut,
                       aError);

    case JSIPCValue::TJSIPCSet:
      return ToJSSet(aCx, std::move(aIn.get_JSIPCSet().elements()), aOut,
                     aError);

    case JSIPCValue::TArrayOfJSIPCMapEntry:
      return ToJSMap(aCx, std::move(aIn.get_ArrayOfJSIPCMapEntry()), aOut,
                     aError);

    case JSIPCValue::TStructuredCloneData: {
      return UntypedToJSVal(aCx, *aIn.get_StructuredCloneData(), aOut, aError);
    }

    default:
      MOZ_ASSERT_UNREACHABLE("Invalid unhandled case");
      aError.ThrowInvalidStateError("Invalid unhandled case");
      return;
  }
}

}  // namespace mozilla::dom

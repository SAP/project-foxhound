/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_DOM_IPC_JSACTOR_JSIPCVALUEUTILS_H_
#define MOZILLA_DOM_IPC_JSACTOR_JSIPCVALUEUTILS_H_

#include "js/RootingAPI.h"
#include "js/Value.h"
#include "jstypes.h"
#include "mozilla/Maybe.h"
#include "mozilla/dom/JSActor.h"
#include "mozilla/dom/JSIPCValue.h"

// This file contains a number of useful methods for JSIPCValue, mostly dealing
// with turning it to and from a JS value.

namespace mozilla::dom {

// Return true if a message for an actor with the given name should be
// sent typed.
bool JSActorSupportsTypedSend(const nsACString& aName);

class JSIPCValueUtils {
 public:
  struct Context {
    explicit Context(JSContext* aCx, bool aStrict = true)
        : mCx(aCx), mStrict(aStrict) {}

    MOZ_IMPLICIT operator JSContext*() const { return mCx; }

    JSContext* mCx;

    // If we encounter a JS value that can't be directly serialized to
    // JSIPCValue, we fall back to using structured cloning. mStrict
    // determines the behavior if this structured cloning fails. If mStrict is
    // true, then the entire serialization will fail. If it is false, we'll
    // instead serialize to a fallback value. See UntypedFromJSVal for details.
    bool mStrict;
  };

  // Convert a JS value to an IPDL representation of that value, or return
  // Nothing if the value isn't supported. If aSendTyped is false, the result
  // will always just be a wrapper around a StructuredCloneData.
  static JSIPCValue FromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                              bool aSendTyped, ErrorResult& aError);

  // Same as the above, except with support for a transfers object, if needed.
  static JSIPCValue FromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                              JS::Handle<JS::Value> aTransferable,
                              bool aSendTyped, ErrorResult& aError);

  // This is equivalent to calling FromJSVal with aSendTyped equal to true.
  static JSIPCValue TypedFromJSVal(Context& aCx, JS::Handle<JS::Value> aVal,
                                   ErrorResult& aError);

  // Convert the IPDL representation of a JS value back into the equivalent
  // JS value. This will return false on failure.
  static void ToJSVal(JSContext* aCx, JSIPCValue&& aIn,
                      JS::MutableHandle<JS::Value> aOut, ErrorResult& aError);
};

}  // namespace mozilla::dom

#endif  // MOZILLA_DOM_IPC_JSACTOR_JSIPCVALUEUTILS_H_

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "JSActorTypeUtils.h"

#include "mozilla/ErrorResult.h"
#include "mozilla/dom/JSIPCValue.h"
#include "mozilla/dom/JSIPCValueUtils.h"

namespace mozilla::dom {

void JSActorTypeUtils::SerializeDeserialize(
    const GlobalObject& aGlobal, bool aStrict, JS::Handle<JS::Value> aVal,
    JS::MutableHandle<JS::Value> aRetVal, ErrorResult& aError) {
  JSIPCValueUtils::Context cx(aGlobal.Context(), aStrict);
  auto ipcValue = JSIPCValueUtils::TypedFromJSVal(cx, aVal, aError);
  if (aError.Failed()) {
    return;
  }

  JSIPCValueUtils::ToJSVal(cx, std::move(ipcValue), aRetVal, aError);
}

}  // namespace mozilla::dom

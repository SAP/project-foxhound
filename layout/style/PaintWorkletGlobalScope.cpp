/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PaintWorkletGlobalScope.h"

#include "mozilla/dom/PaintWorkletGlobalScopeBinding.h"
#include "mozilla/dom/FunctionBinding.h"
#include "PaintWorkletImpl.h"

namespace mozilla::dom {

PaintWorkletGlobalScope::PaintWorkletGlobalScope(PaintWorkletImpl* aImpl)
    : WorkletGlobalScope(aImpl) {}

PaintWorkletImpl* PaintWorkletGlobalScope::Impl() const {
  return static_cast<PaintWorkletImpl*>(mImpl.get());
}

bool PaintWorkletGlobalScope::WrapGlobalObject(
    JSContext* aCx, JS::MutableHandle<JSObject*> aReflector) {
  JS::RealmOptions options;

  options.behaviors().setShouldResistFingerprinting(
      ShouldResistFingerprinting());

  // The SharedArrayBuffer global constructor property should not be present in
  // a fresh global object when shared memory objects aren't allowed (because
  // COOP/COEP support isn't enabled, or because COOP/COEP don't act to isolate
  // this worker to a separate process).
  options.creationOptions().setDefineSharedArrayBufferConstructor(
      IsSharedMemoryAllowed());

  return PaintWorkletGlobalScope_Binding::Wrap(
      aCx, this, this, options, nsJSPrincipals::get(mImpl->Principal()), true,
      aReflector);
}

void PaintWorkletGlobalScope::RegisterPaint(const nsAString& aType,
                                            VoidFunction& aProcessorCtor) {
  // Nothing to do here, yet.
}

}  // namespace mozilla::dom

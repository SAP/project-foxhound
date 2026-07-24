/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GPU_PROMISE_HELPERS_H_
#define GPU_PROMISE_HELPERS_H_

#include "mozilla/dom/Promise.h"

// Promise's `MaybeResolve*` & `MaybeReject*` methods call into the JS runtime
// and might execute handlers attached by user code. The user code can contain
// calls to the WebGPU API potentially causing us to re-enter the same function
// that called one of Promise's methods in the first place. Rather than adapting
// our code to cope with situations like this, it seems beneficial not to have
// to deal with reentrancy when reading and debugging code in general.
//
// We therefore defer promise resolution to prevent reentrancy.
//
// The only exception to this is in functions that create, resolve/reject and
// return the promise. This is ok because there was no opportunity for JS user
// code to attach handlers to the promise. The WebGPU specification also
// requires us to settle the promise before returning it in some cases (ex:
// `Buffer::mapAsync`).

namespace mozilla::webgpu::promise {

void MaybeRejectWithTypeError(RefPtr<dom::Promise>&& promise,
                              nsCString&& aMessage);
void MaybeRejectWithOperationError(RefPtr<dom::Promise>&& promise,
                                   nsCString&& aMessage);
void MaybeRejectWithAbortError(RefPtr<dom::Promise>&& promise,
                               nsCString&& aMessage);
void MaybeRejectWithNotSupportedError(RefPtr<dom::Promise>&& promise,
                                      nsCString&& aMessage);
void MaybeRejectWithInvalidStateError(RefPtr<dom::Promise>&& promise,
                                      nsCString&& aMessage);
void MaybeRejectWithPipelineError(RefPtr<dom::Promise>&& promise,
                                  RefPtr<PipelineError>&& aError);

void MaybeResolveWithUndefined(RefPtr<dom::Promise>&& promise);
void MaybeResolveWithNull(RefPtr<dom::Promise>&& promise);

template <typename T>
void MaybeResolve(RefPtr<dom::Promise>&& promise, RefPtr<T>&& aArg) {
  NS_DispatchToCurrentThread(NewCancelableRunnableMethod<RefPtr<T>>(
      "webgpu::PromiseHelpers::MaybeResolve", std::move(promise),
      &dom::Promise::MaybeResolve<RefPtr<T>>, std::move(aArg)));
}

}  // namespace mozilla::webgpu::promise

#endif  // GPU_PROMISE_HELPERS_H_

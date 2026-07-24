/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PromiseHelpers.h"

#include "mozilla/dom/Promise.h"
#include "mozilla/webgpu/PipelineError.h"

// We use the cancelable versions of the functions since the WebGPU API is
// available in workers.

namespace mozilla::webgpu::promise {

void MaybeRejectWithTypeError(RefPtr<dom::Promise>&& promise,
                              nsCString&& aMessage) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithTypeError",
      [promise = std::move(promise), aMessage = std::move(aMessage)] {
        promise->MaybeRejectWithTypeError(aMessage);
      }));
}

void MaybeRejectWithOperationError(RefPtr<dom::Promise>&& promise,
                                   nsCString&& aMessage) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithOperationError",
      [promise = std::move(promise), aMessage = std::move(aMessage)] {
        promise->MaybeRejectWithOperationError(aMessage);
      }));
}

void MaybeRejectWithAbortError(RefPtr<dom::Promise>&& promise,
                               nsCString&& aMessage) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithAbortError",
      [promise = std::move(promise), aMessage = std::move(aMessage)] {
        promise->MaybeRejectWithAbortError(aMessage);
      }));
}

void MaybeRejectWithNotSupportedError(RefPtr<dom::Promise>&& promise,
                                      nsCString&& aMessage) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithNotSupportedError",
      [promise = std::move(promise), aMessage = std::move(aMessage)] {
        promise->MaybeRejectWithNotSupportedError(aMessage);
      }));
}

void MaybeRejectWithInvalidStateError(RefPtr<dom::Promise>&& promise,
                                      nsCString&& aMessage) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithInvalidStateError",
      [promise = std::move(promise), aMessage = std::move(aMessage)] {
        promise->MaybeRejectWithInvalidStateError(aMessage);
      }));
}

void MaybeRejectWithPipelineError(RefPtr<dom::Promise>&& promise,
                                  RefPtr<PipelineError>&& aError) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeRejectWithPipelineError",
      [promise = std::move(promise), aError = std::move(aError)] {
        promise->MaybeReject(aError);
      }));
}

void MaybeResolveWithUndefined(RefPtr<dom::Promise>&& promise) {
  NS_DispatchToCurrentThread(NewCancelableRunnableMethod(
      "webgpu::PromiseHelpers::MaybeResolveWithUndefined", std::move(promise),
      &dom::Promise::MaybeResolveWithUndefined));
}

void MaybeResolveWithNull(RefPtr<dom::Promise>&& promise) {
  NS_DispatchToCurrentThread(NS_NewCancelableRunnableFunction(
      "webgpu::PromiseHelpers::MaybeResolveWithNull",
      [promise = std::move(promise)] {
        promise->MaybeResolve(JS::NullHandleValue);
      }));
}

}  // namespace mozilla::webgpu::promise

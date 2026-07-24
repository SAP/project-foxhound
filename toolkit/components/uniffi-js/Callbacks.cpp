/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsPrintfCString.h"
#include "nsString.h"
#include "nsThreadUtils.h"
#include "mozilla/uniffi/OwnedRustBuffer.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/UniFFIBinding.h"
#include "mozilla/uniffi/Callbacks.h"
#include "mozilla/Atomics.h"
#include "mozilla/Logging.h"
#include "mozilla/RefPtr.h"
#include "mozilla/UniquePtr.h"

namespace mozilla::uniffi {
extern mozilla::LazyLogModule gUniffiLogger;

// Type we'll be using to store callback handle ref counts
//
// 32-bits should never overflow and ReleaseAcquire is the recommended memory
// ordering for reference counts:
// https://searchfox.org/firefox-main/rev/f26084f2dfc00c1e10377d4433cfea594f7ea8c2/mfbt/Atomics.h#114-119
using HandleRefCount = Atomic<uint32_t, MemoryOrdering::ReleaseAcquire>;

uint64_t CallbackHandleCreate() {
  // This allocates an atomic u32 that stores the ref count.
  // We cast the address to a `u64`, which will be the handle.
  //
  // Another approach would be to create a HashMap that maps handles to their
  // refcounts. However, that would require a lock and global initialization.
  // This works in a similar way, but instead of generating a handle and
  // inserting it into the map, we call `new` to allocate a memory location and
  // use the address as the handle.
  //
  // This will safely fit in a JS integer as long as pointers only set the lower
  // 53 bits or so. This is okay since the JS code itself assumes only the lower
  // 48 bits of the pointer are set:
  // https://searchfox.org/firefox-main/rev/20a1fb35a4d5c2f2ea6c865ecebc8e4bee6f86c9/js/public/Value.h#61-66
  //
  // Finally, we always set the lowest bit on the handle.  This allows UniFFI to
  // tell if trait interface handles came from JS or Rust.
  HandleRefCount* handlePointer = new HandleRefCount(1);
  return reinterpret_cast<uint64_t>(handlePointer) | 1;
}

uint32_t CallbackHandleAddRef(uint64_t aHandle) {
  HandleRefCount* handlePointer =
      reinterpret_cast<HandleRefCount*>(aHandle & ~1);
  return ++(*handlePointer);
}

uint32_t CallbackHandleRelease(uint64_t aHandle) {
  HandleRefCount* handlePointer =
      reinterpret_cast<HandleRefCount*>(aHandle & ~1);
  auto refCount = --(*handlePointer);
  if (refCount == 0) {
    delete handlePointer;
  }
  return refCount;
}

void AsyncCallbackMethodHandlerBase::ScheduleAsyncCall(
    UniquePtr<AsyncCallbackMethodHandlerBase> aHandler,
    StaticRefPtr<dom::UniFFICallbackHandler>* aJsHandler) {
  nsresult dispatchResult = NS_DispatchToMainThread(NS_NewRunnableFunction(
      "UniFFI callback", [handler = std::move(aHandler),
                          aJsHandler]() MOZ_CAN_RUN_SCRIPT_BOUNDARY mutable {
        auto reportError = MakeScopeExit([&handler] {
          dom::RootedDictionary<dom::UniFFIScaffoldingCallResult> callResult(
              dom::RootingCx());
          callResult.mCode = dom::UniFFIScaffoldingCallCode::Internal_error;
          handler->HandleReturn(callResult, IgnoreErrors());
        });

        // Take our own reference to the callback handler to ensure that it
        // stays alive for the duration of this call
        RefPtr<dom::UniFFICallbackHandler> jsHandler = *aJsHandler;
        if (!jsHandler) {
          MOZ_LOG(gUniffiLogger, LogLevel::Error,
                  ("[%s] called, but JS handler not registered",
                   handler->mUniffiMethodName));
          return;
        }

        JSObject* global = jsHandler->CallbackGlobalOrNull();
        if (!global) {
          MOZ_LOG(
              gUniffiLogger, LogLevel::Error,
              ("[%s] JS handler has null global", handler->mUniffiMethodName));
          return;
        }

        dom::AutoEntryScript aes(global, handler->mUniffiMethodName);

        IgnoredErrorResult error;
        RefPtr<dom::Promise> promise =
            handler->MakeCall(aes.cx(), jsHandler, error);
        if (error.Failed()) {
          MOZ_LOG(
              gUniffiLogger, LogLevel::Error,
              ("[%s] Error invoking JS handler", handler->mUniffiMethodName));
          return;
        }

        reportError.release();
        if (promise) {
          auto promiseHandler = MakeRefPtr<PromiseHandler>(std::move(handler));
          promise->AppendNativeHandler(promiseHandler);
        }
      }));

  if (NS_FAILED(dispatchResult)) {
    MOZ_LOG(gUniffiLogger, LogLevel::Error,
            ("[UniFFI] Error dispatching UniFFI callback task"));
  }
}

MOZ_CAN_RUN_SCRIPT
already_AddRefed<dom::Promise> CallbackFreeHandler::MakeCall(
    JSContext* aCx, dom::UniFFICallbackHandler* aJsHandler,
    ErrorResult& aError) {
  aJsHandler->Destroy(mUniffiHandle.IntoRust(), aError);
  // CallbackFreeHandler works like a fire-and-forget callback and returns
  // nullptr.  There's no Rust code that's awaiting this result.
  return nullptr;
}

NS_IMPL_ISUPPORTS0(AsyncCallbackMethodHandlerBase::PromiseHandler);

void AsyncCallbackMethodHandlerBase::PromiseHandler::ResolvedCallback(
    JSContext* aCx, JS::Handle<JS::Value> aValue, ErrorResult& aRv) {
  dom::RootedDictionary<dom::UniFFIScaffoldingCallResult> callResult(aCx);
  if (!callResult.Init(aCx, aValue)) {
    JS_ClearPendingException(aCx);
    MOZ_LOG(
        gUniffiLogger, LogLevel::Error,
        ("[%s] callback method did not return a UniFFIScaffoldingCallResult",
         mHandler->mUniffiMethodName));
    callResult.mCode = dom::UniFFIScaffoldingCallCode::Internal_error;
  }
  mHandler->HandleReturn(callResult, aRv);
}

void AsyncCallbackMethodHandlerBase::PromiseHandler::RejectedCallback(
    JSContext* aCx, JS::Handle<JS::Value>, ErrorResult& aRv) {
  dom::RootedDictionary<dom::UniFFIScaffoldingCallResult> callResult(aCx);
  callResult.mCode = dom::UniFFIScaffoldingCallCode::Internal_error;
  mHandler->HandleReturn(callResult, aRv);
}

}  // namespace mozilla::uniffi

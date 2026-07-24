/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 *
 * Copyright 2020 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#ifndef wasm_context_h
#define wasm_context_h

#ifdef ENABLE_WASM_JSPI
#  include "gc/Barrier.h"
#endif  // ENABLE_WASM_JSPI

#include "js/NativeStackLimits.h"

#ifdef _WIN32
struct _NT_TIB;
#endif

namespace js::wasm {

#ifdef ENABLE_WASM_JSPI
class SuspenderObject;
using SuspenderObjectSet =
    HashSet<SuspenderObject*, PointerHasher<SuspenderObject*>,
            SystemAllocPolicy>;
#endif  // ENABLE_WASM_JSPI

// wasm::Context lives in JSContext and contains the wasm-related per-context
// state.

class Context {
 public:
  Context();
  ~Context();

  static constexpr size_t offsetOfStackLimit() {
    return offsetof(Context, stackLimit);
  }
  static constexpr size_t offsetOfMainStackLimit() {
    return offsetof(Context, mainStackLimit);
  }

  void initStackLimit(JSContext* cx);

#ifdef ENABLE_WASM_JSPI
  static constexpr size_t offsetOfActiveSuspender() {
    return offsetof(Context, activeSuspender_);
  }
#  ifdef _WIN32
  static constexpr size_t offsetOfTib() { return offsetof(Context, tib_); }
  static constexpr size_t offsetOfTibStackBase() {
    return offsetof(Context, tibStackBase_);
  }
  static constexpr size_t offsetOfTibStackLimit() {
    return offsetof(Context, tibStackLimit_);
  }
#  endif

  SuspenderObject* activeSuspender() { return activeSuspender_; }
  bool onSuspendableStack() const { return activeSuspender_ != nullptr; }

  void enterSuspendableStack(JSContext* cx, SuspenderObject* suspender);
  void leaveSuspendableStack(JSContext* cx);

  SuspenderObject* findSuspenderForStackAddress(const void* stackAddress);

  void trace(JSTracer* trc);
  void traceRoots(JSTracer* trc);
#endif

  // Used by wasm::EnsureThreadSignalHandlers(cx) to install thread signal
  // handlers once per JSContext/thread.
  bool triedToInstallSignalHandlers;
  bool haveSignalHandlers;

  // Like JSContext::jitStackLimit but used for wasm code. Wasm code doesn't
  // use the stack limit for interrupts, but it does update it for stack
  // switching.
  JS::NativeStackLimit stackLimit;
  // The original stack limit before any stack switches. Cached for easy
  // restoration.
  JS::NativeStackLimit mainStackLimit;

#ifdef ENABLE_WASM_JSPI
#  if defined(_WIN32)
  // On WIN64, the Thread Information Block stack limits must be updated on
  // stack switches to avoid failures on SP checks during vectored exeption
  // handling for traps. We store the original limits and the TIB here for
  // easy restoration.
  _NT_TIB* tib_ = nullptr;
  void* tibStackBase_ = nullptr;
  void* tibStackLimit_ = nullptr;
#  endif

  // The currently active suspender object. Null if we're executing on the
  // system stack, otherwise we're on a wasm suspendable stack.
  HeapPtr<SuspenderObject*> activeSuspender_;

  // All of the allocated suspender objects.
  SuspenderObjectSet suspenders_;
#endif
};

}  // namespace js::wasm

#endif  // wasm_context_h

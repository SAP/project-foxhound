/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 *
 * Copyright 2016 Mozilla Foundation
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

#include "wasm/WasmPI.h"

#include "builtin/Promise.h"
#include "debugger/DebugAPI.h"
#include "debugger/Debugger.h"
#include "jit/MIRGenerator.h"
#include "js/CallAndConstruct.h"
#include "js/Printf.h"
#include "vm/Iteration.h"
#include "vm/JSContext.h"
#include "vm/JSObject.h"
#include "vm/NativeObject.h"
#include "vm/PromiseObject.h"
#include "wasm/WasmConstants.h"
#include "wasm/WasmContext.h"
#include "wasm/WasmFeatures.h"
#include "wasm/WasmGenerator.h"
#include "wasm/WasmIonCompile.h"  // IonPlatformSupport
#include "wasm/WasmValidate.h"

#include "vm/JSObject-inl.h"
#include "wasm/WasmGcObject-inl.h"
#include "wasm/WasmInstance-inl.h"

using namespace js;
using namespace js::jit;

#ifdef ENABLE_WASM_JSPI
namespace js::wasm {

void SuspenderObject::releaseStackMemory() {
  void* memory = stackMemory();
  MOZ_ASSERT(isMoribund() == !memory);
  if (memory) {
    js_free(memory);
    setStackMemory(nullptr);
    setState(SuspenderState::Moribund);
  }
}

// Slots that used in various JSFunctionExtended below.
const size_t SUSPENDER_SLOT = 0;
const size_t WRAPPED_FN_SLOT = 1;
const size_t CONTINUE_ON_SUSPENDABLE_SLOT = 1;
const size_t PROMISE_SLOT = 2;

static JitActivation* FindSuspendableStackActivation(
    JSTracer* trc, SuspenderObject* suspender) {
  // The jitActivation.refNoCheck() can be used since during trace/marking
  // the main thread will be paused.
  JitActivation* activation =
      trc->runtime()->mainContextFromAnyThread()->jitActivation.refNoCheck();
  while (activation) {
    // Skip activations without Wasm exit FP -- they are mostly debugger
    // related.
    if (activation->hasWasmExitFP()) {
      // Scan all JitActivations to find one that starts with suspended stack
      // frame pointer.
      WasmFrameIter iter(activation);
      if (!iter.done() && suspender->hasStackAddress(iter.frame())) {
        return activation;
      }
    }
    activation = activation->prevJitActivation();
  }
  MOZ_CRASH("Suspendable stack activation not found");
}

void TraceSuspendableStack(JSTracer* trc, SuspenderObject* suspender) {
  MOZ_ASSERT(suspender->isTraceable());
  void* exitFP = suspender->suspendableExitFP();

  // Create and iterator for wasm frames:
  //  - If a stack entry for suspended stack exists, the
  //  suspender->suspendableFP()
  //    and suspender->suspendedReturnAddress() provide start of the frames.
  //  - Otherwise, the stack is the part of the main stack, the context
  //    JitActivation frames will be used to trace.
  WasmFrameIter iter =
      suspender->isSuspended()
          ? WasmFrameIter(
                static_cast<FrameWithInstances*>(suspender->suspendableFP()),
                suspender->suspendedReturnAddress())
          : WasmFrameIter(FindSuspendableStackActivation(trc, suspender));
  MOZ_ASSERT_IF(suspender->isSuspended(), iter.currentFrameStackSwitched());
  uintptr_t highestByteVisitedInPrevWasmFrame = 0;
  while (true) {
    MOZ_ASSERT(!iter.done());
    uint8_t* nextPC = iter.resumePCinCurrentFrame();
    Instance* instance = iter.instance();
    TraceInstanceEdge(trc, instance, "WasmFrameIter instance");
    highestByteVisitedInPrevWasmFrame = instance->traceFrame(
        trc, iter, nextPC, highestByteVisitedInPrevWasmFrame);
    if (iter.frame() == exitFP) {
      break;
    }
    ++iter;
    if (iter.currentFrameStackSwitched()) {
      highestByteVisitedInPrevWasmFrame = 0;
    }
  }
}

static_assert(JS_STACK_GROWTH_DIRECTION < 0,
              "JS-PI implemented only for native stacks that grows towards 0");

SuspenderObject* SuspenderObject::create(JSContext* cx) {
  if (cx->wasm().suspenders_.count() >= SuspendableStacksMaxCount) {
    JS_ReportErrorNumberASCII(cx, GetErrorMessage, nullptr,
                              JSMSG_JSPI_SUSPENDER_LIMIT);
    return nullptr;
  }

  Rooted<SuspenderObject*> suspender(
      cx, NewBuiltinClassInstance<SuspenderObject>(cx));
  if (!suspender) {
    return nullptr;
  }

  // Initialize all of the slots
  suspender->initFixedSlot(StateSlot, Int32Value(SuspenderState::Moribund));
  suspender->initFixedSlot(PromisingPromiseSlot, NullValue());
  suspender->initFixedSlot(SuspendingReturnTypeSlot,
                           Int32Value(int32_t(ReturnType::Unknown)));
  suspender->initFixedSlot(StackMemorySlot, PrivateValue(nullptr));
  suspender->initFixedSlot(MainFPSlot, PrivateValue(nullptr));
  suspender->initFixedSlot(MainSPSlot, PrivateValue(nullptr));
  suspender->initFixedSlot(SuspendableFPSlot, PrivateValue(nullptr));
  suspender->initFixedSlot(SuspendableSPSlot, PrivateValue(nullptr));
  suspender->initFixedSlot(SuspendableExitFPSlot, PrivateValue(nullptr));
  suspender->initFixedSlot(SuspendedRASlot, PrivateValue(nullptr));
  suspender->initFixedSlot(MainExitFPSlot, PrivateValue(nullptr));

  void* stackMemory = js_malloc(SuspendableStackPlusRedZoneSize);
  if (!stackMemory) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  if (!cx->wasm().suspenders_.putNew(suspender)) {
    js_free(stackMemory);
    ReportOutOfMemory(cx);
    return nullptr;
  }

  // We are now fully constructed and can transition states
  suspender->setStackMemory(stackMemory);
  suspender->setFixedSlot(SuspendableSPSlot,
                          PrivateValue(static_cast<uint8_t*>(stackMemory) +
                                       SuspendableStackPlusRedZoneSize));
  suspender->setState(SuspenderState::Initial);

  return suspender;
}

const JSClass SuspenderObject::class_ = {
    "SuspenderObject",
    JSCLASS_HAS_RESERVED_SLOTS(SlotCount) | JSCLASS_FOREGROUND_FINALIZE,
    &SuspenderObject::classOps_,
    nullptr,
    &SuspenderObject::classExt_,
};

const JSClassOps SuspenderObject::classOps_ = {
    nullptr,   // addProperty
    nullptr,   // delProperty
    nullptr,   // enumerate
    nullptr,   // newEnumerate
    nullptr,   // resolve
    nullptr,   // mayResolve
    finalize,  // finalize
    nullptr,   // call
    nullptr,   // construct
    trace,     // trace
};

const ClassExtension SuspenderObject::classExt_ = {
    .objectMovedOp = SuspenderObject::moved,
};

/* static */
void SuspenderObject::finalize(JS::GCContext* gcx, JSObject* obj) {
  SuspenderObject& suspender = obj->as<SuspenderObject>();
  if (!suspender.isMoribund()) {
    gcx->runtime()->mainContextFromOwnThread()->wasm().suspenders_.remove(
        &suspender);
  }
  suspender.releaseStackMemory();
  MOZ_ASSERT(suspender.isMoribund());
}

/* static */
void SuspenderObject::trace(JSTracer* trc, JSObject* obj) {
  SuspenderObject& suspender = obj->as<SuspenderObject>();
  // The SuspenderObject refers stacks frames that need to be traced
  // only during major GC to determine if SuspenderObject content is
  // reachable from JS.
  if (!suspender.isTraceable() || trc->isTenuringTracer()) {
    return;
  }
  TraceSuspendableStack(trc, &suspender);
}

/* static */
size_t SuspenderObject::moved(JSObject* obj, JSObject* old) {
  wasm::Context& context =
      obj->runtimeFromMainThread()->mainContextFromOwnThread()->wasm();
  context.suspenders_.rekeyIfMoved(&old->as<SuspenderObject>(),
                                   &obj->as<SuspenderObject>());
  return 0;
}

void SuspenderObject::setMoribund(JSContext* cx) {
  MOZ_ASSERT(state() == SuspenderState::Active);
  cx->wasm().leaveSuspendableStack(cx);
  if (!this->isMoribund()) {
    cx->wasm().suspenders_.remove(this);
  }
  this->releaseStackMemory();
  MOZ_ASSERT(this->isMoribund());
}

void SuspenderObject::setActive(JSContext* cx) {
  this->setState(SuspenderState::Active);
  cx->wasm().enterSuspendableStack(cx, this);
}

void SuspenderObject::setSuspended(JSContext* cx) {
  this->setState(SuspenderState::Suspended);
  cx->wasm().leaveSuspendableStack(cx);
}

void SuspenderObject::enter(JSContext* cx) {
  // We can enter a suspender normally from Initial, or through unwinding when
  // are in the 'CalledOnMain' or 'Suspended' states.
  MOZ_ASSERT(state() == SuspenderState::Initial ||
             state() == SuspenderState::CalledOnMain ||
             state() == SuspenderState::Suspended);
  setActive(cx);
}

void SuspenderObject::suspend(JSContext* cx) {
  MOZ_ASSERT(state() == SuspenderState::Active);
  setSuspended(cx);

  if (cx->realm()->isDebuggee()) {
    WasmFrameIter iter(cx->activation()->asJit());
    while (true) {
      MOZ_ASSERT(!iter.done());
      if (iter.debugEnabled()) {
        DebugAPI::onSuspendWasmFrame(cx, iter.debugFrame());
      }
      ++iter;
      if (iter.currentFrameStackSwitched()) {
        break;
      }
    }
  }
}

void SuspenderObject::resume(JSContext* cx) {
  MOZ_ASSERT(state() == SuspenderState::Suspended);
  setActive(cx);
  // Use barrier because object is being removed from the suspendable stack
  // from roots.
  gc::PreWriteBarrier(this);

  if (cx->realm()->isDebuggee()) {
    for (FrameIter iter(cx);; ++iter) {
      MOZ_RELEASE_ASSERT(!iter.done(), "expecting stackSwitched()");
      if (iter.isWasm()) {
        WasmFrameIter& wasmIter = iter.wasmFrame();
        if (wasmIter.currentFrameStackSwitched()) {
          break;
        }
        if (wasmIter.debugEnabled()) {
          DebugAPI::onResumeWasmFrame(cx, iter);
        }
      }
    }
  }
}

void SuspenderObject::leave(JSContext* cx) {
  // We are exiting suspended stack if state is active,
  // otherwise the stack was just suspended.
  switch (state()) {
    case SuspenderState::Active: {
      setMoribund(cx);
      break;
    }
    case SuspenderState::Suspended: {
      MOZ_ASSERT(!cx->wasm().onSuspendableStack());
      break;
    }
    case SuspenderState::Initial:
    case SuspenderState::Moribund:
    case SuspenderState::CalledOnMain:
      MOZ_CRASH();
  }
}

void SuspenderObject::unwind(JSContext* cx) {
  switch (state()) {
    case SuspenderState::Suspended:
    case SuspenderState::CalledOnMain: {
      cx->wasm().suspenders_.remove(this);
      this->releaseStackMemory();
      MOZ_ASSERT(this->isMoribund());
      break;
    }
    case SuspenderState::Active:
    case SuspenderState::Initial:
    case SuspenderState::Moribund:
      MOZ_CRASH();
  }
}

void SuspenderObject::forwardToSuspendable() {
  // Injecting suspendable stack back into main one at the exit frame.
  uint8_t* mainExitFP = (uint8_t*)this->mainExitFP();
  *reinterpret_cast<void**>(mainExitFP + Frame::callerFPOffset()) =
      this->suspendableFP();
  *reinterpret_cast<void**>(mainExitFP + Frame::returnAddressOffset()) =
      this->suspendedReturnAddress();
}

// Suspending

// Builds a wasm module with following structure:
// (module
//   (type $params (struct (field ..)*)))
//   (type $results (struct (field ..)*)))
//   (import "" "" (func $suspending.wrappedfn ..))
//   (func $suspending.exported .. )
//   (func $suspending.trampoline ..)
//   (func $suspending.continue-on-suspendable ..)
//   (export "" (func $suspending.exported))
// )
//
// The module provides logic for the state transitions (see the SMDOC):
//  - Invoke Suspending Import via $suspending.exported
//  - Suspending Function Returns a Promise via $suspending.trampoline
//  - Promise Resolved transitions via $suspending.continue-on-suspendable
//
class SuspendingFunctionModuleFactory {
 public:
  enum TypeIdx {
    ParamsTypeIndex,
    ResultsTypeIndex,
  };

  enum FnIdx {
    WrappedFnIndex,
    ExportedFnIndex,
    TrampolineFnIndex,
    ContinueOnSuspendableFnIndex
  };

 private:
  // Builds function that will be imported to wasm module:
  // (func $suspending.exported
  //   (param ..)* (result ..)*
  //   (local $suspender externref)
  //   (local $results (ref $results))
  //   call $builtin.current-suspender
  //   local.tee $suspender
  //   ref.func $suspending.trampoline
  //   local.get $i*
  //   stuct.new $param-type
  //   stack-switch SwitchToMain ;; <- (suspender,fn,data)
  //   local.get $suspender
  //   call $builtin.get-suspending-promise-result
  //   ref.cast $results-type
  //   local.set $results
  //   (struct.get $results (local.get $results))*
  // )
  bool encodeExportedFunction(CodeMetadata& codeMeta, uint32_t paramsSize,
                              uint32_t resultSize, uint32_t paramsOffset,
                              RefType resultType, Bytes& bytecode) {
    Encoder encoder(bytecode, *codeMeta.types);
    ValTypeVector locals;
    if (!locals.emplaceBack(RefType::extern_())) {
      return false;
    }
    if (!locals.emplaceBack(resultType)) {
      return false;
    }
    if (!EncodeLocalEntries(encoder, locals)) {
      return false;
    }

    const int suspenderIndex = paramsSize;
    if (!encoder.writeOp(Op::I32Const) || !encoder.writeVarU32(0)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32((uint32_t)BuiltinModuleFuncId::CurrentSuspender)) {
      return false;
    }
    if (!encoder.writeOp(Op::LocalTee) ||
        !encoder.writeVarU32(suspenderIndex)) {
      return false;
    }

    // Results local is located after all params and suspender.
    const int resultsIndex = paramsSize + 1;

    if (!encoder.writeOp(Op::RefFunc) ||
        !encoder.writeVarU32(TrampolineFnIndex)) {
      return false;
    }
    for (uint32_t i = 0; i < paramsSize; i++) {
      if (!encoder.writeOp(Op::LocalGet) ||
          !encoder.writeVarU32(i + paramsOffset)) {
        return false;
      }
    }
    if (!encoder.writeOp(GcOp::StructNew) ||
        !encoder.writeVarU32(ParamsTypeIndex)) {
      return false;
    }

    if (!encoder.writeOp(MozOp::StackSwitch) ||
        !encoder.writeVarU32(uint32_t(StackSwitchKind::SwitchToMain))) {
      return false;
    }

    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(suspenderIndex)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32(
            (uint32_t)BuiltinModuleFuncId::GetSuspendingPromiseResult)) {
      return false;
    }
    if (!encoder.writeOp(GcOp::RefCast) ||
        !encoder.writeVarU32(ResultsTypeIndex) ||
        !encoder.writeOp(Op::LocalSet) || !encoder.writeVarU32(resultsIndex)) {
      return false;
    }
    for (uint32_t i = 0; i < resultSize; i++) {
      if (!encoder.writeOp(Op::LocalGet) ||
          !encoder.writeVarU32(resultsIndex) ||
          !encoder.writeOp(GcOp::StructGet) ||
          !encoder.writeVarU32(ResultsTypeIndex) || !encoder.writeVarU32(i)) {
        return false;
      }
    }
    return encoder.writeOp(Op::End);
  }

  // Builds function that is called on main stack:
  // (func $suspending.trampoline
  //   (param $params (ref $suspender)) (param $param (ref $param-type))
  //   (result anyref)
  //   local.get $suspender ;; for $builtin.forward-exn-to-suspended below
  //   block (result exnref)
  //    try_table (catch_all_ref 0)
  //     local.get $suspender ;; for call $add-promise-reactions
  //     (struct.get $param-type $i (local.get $param))*
  //     call $suspending.wrappedfn
  //     ref.func $suspending.continue-on-suspendable
  //     call $builtin.add-promise-reactions
  //     return
  //    end
  //    unreachable
  //   end
  //   call $builtin.forward-exn-to-suspended
  // )
  // The function calls suspending import and returns into the
  // $promising.exported function because that was the top function
  // on the main stack.
  bool encodeTrampolineFunction(CodeMetadata& codeMeta, uint32_t paramsSize,
                                Bytes& bytecode) {
    Encoder encoder(bytecode, *codeMeta.types);
    if (!EncodeLocalEntries(encoder, ValTypeVector())) {
      return false;
    }
    const uint32_t SuspenderIndex = 0;
    const uint32_t ParamsIndex = 1;

    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }

    if (!encoder.writeOp(Op::Block) ||
        !encoder.writeFixedU8(uint8_t(TypeCode::ExnRef))) {
      return false;
    }

    if (!encoder.writeOp(Op::TryTable) ||
        !encoder.writeFixedU8(uint8_t(TypeCode::BlockVoid)) ||
        !encoder.writeVarU32(1) ||
        !encoder.writeFixedU8(/* catch_all_ref = */ 0x03) ||
        !encoder.writeVarU32(0)) {
      return false;
    }

    // For AddPromiseReactions call below.
    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }

    for (uint32_t i = 0; i < paramsSize; i++) {
      if (!encoder.writeOp(Op::LocalGet) || !encoder.writeVarU32(ParamsIndex)) {
        return false;
      }
      if (!encoder.writeOp(GcOp::StructGet) ||
          !encoder.writeVarU32(ParamsTypeIndex) || !encoder.writeVarU32(i)) {
        return false;
      }
    }
    if (!encoder.writeOp(Op::Call) || !encoder.writeVarU32(WrappedFnIndex)) {
      return false;
    }
    if (!encoder.writeOp(Op::RefFunc) ||
        !encoder.writeVarU32(ContinueOnSuspendableFnIndex)) {
      return false;
    }

    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32(
            (uint32_t)BuiltinModuleFuncId::AddPromiseReactions)) {
      return false;
    }

    if (!encoder.writeOp(Op::Return) || !encoder.writeOp(Op::End) ||
        !encoder.writeOp(Op::Unreachable) || !encoder.writeOp(Op::End)) {
      return false;
    }

    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32(
            (uint32_t)BuiltinModuleFuncId::ForwardExceptionToSuspended)) {
      return false;
    }

    return encoder.writeOp(Op::End);
  }

  // Builds function that is called on main stack:
  // (func $suspending.continue-on-suspendable
  //   (param $params (ref $suspender)) (param $results externref)
  //   (result externref)
  //   local.get $suspender
  //   ref.null funcref
  //   local.get $results
  //   any.convert_extern
  //   stack-switch ContinueOnSuspendable
  // )
  bool encodeContinueOnSuspendableFunction(CodeMetadata& codeMeta,
                                           uint32_t resultsSize,
                                           Bytes& bytecode) {
    Encoder encoder(bytecode, *codeMeta.types);
    if (!EncodeLocalEntries(encoder, ValTypeVector())) {
      return false;
    }

    const uint32_t SuspenderIndex = 0;
    const uint32_t ResultsIndex = 1;

    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }
    if (!encoder.writeOp(Op::RefNull) ||
        !encoder.writeValType(ValType(RefType::func()))) {
      return false;
    }
    if (!encoder.writeOp(Op::LocalGet) || !encoder.writeVarU32(ResultsIndex) ||
        !encoder.writeOp(GcOp::AnyConvertExtern)) {
      return false;
    }

    if (!encoder.writeOp(MozOp::StackSwitch) ||
        !encoder.writeVarU32(
            uint32_t(StackSwitchKind::ContinueOnSuspendable))) {
      return false;
    }

    return encoder.writeOp(Op::End);
  }

 public:
  SharedModule build(JSContext* cx, HandleObject func, ValTypeVector&& params,
                     ValTypeVector&& results) {
    FeatureOptions options;
    options.isBuiltinModule = true;

    ScriptedCaller scriptedCaller;
    SharedCompileArgs compileArgs =
        CompileArgs::buildAndReport(cx, std::move(scriptedCaller), options);
    if (!compileArgs) {
      return nullptr;
    }

    MutableModuleMetadata moduleMeta = js_new<ModuleMetadata>();
    if (!moduleMeta || !moduleMeta->init(*compileArgs)) {
      return nullptr;
    }
    MutableCodeMetadata codeMeta = moduleMeta->codeMeta;

    MOZ_ASSERT(IonPlatformSupport());
    CompilerEnvironment compilerEnv(CompileMode::Once, Tier::Optimized,
                                    DebugEnabled::False);
    compilerEnv.computeParameters();

    RefType suspenderType = RefType::extern_();
    RefType promiseType = RefType::extern_();

    ValTypeVector paramsWithoutSuspender;

    const size_t resultsSize = results.length();
    const size_t paramsSize = params.length();
    const size_t paramsOffset = 0;
    if (!paramsWithoutSuspender.append(params.begin(), params.end())) {
      ReportOutOfMemory(cx);
      return nullptr;
    }

    ValTypeVector resultsRef;
    if (!resultsRef.emplaceBack(promiseType)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }

    StructType boxedParamsStruct;
    if (!StructType::createImmutable(paramsWithoutSuspender,
                                     &boxedParamsStruct)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->types->length() == ParamsTypeIndex);
    if (!codeMeta->types->addType(std::move(boxedParamsStruct))) {
      return nullptr;
    }

    StructType boxedResultType;
    if (!StructType::createImmutable(results, &boxedResultType)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->types->length() == ResultsTypeIndex);
    if (!codeMeta->types->addType(std::move(boxedResultType))) {
      return nullptr;
    }

    MOZ_ASSERT(codeMeta->funcs.length() == WrappedFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(paramsWithoutSuspender),
                                    std::move(resultsRef))) {
      return nullptr;
    }

    // Imports names are not important, declare functions above as imports.
    codeMeta->numFuncImports = codeMeta->funcs.length();

    // We will be looking up and using the exports function by index so
    // the name doesn't matter.
    MOZ_ASSERT(codeMeta->funcs.length() == ExportedFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(params), std::move(results),
                                    /*declareForRef = */ true,
                                    mozilla::Some(CacheableName()))) {
      return nullptr;
    }

    ValTypeVector paramsTrampoline, resultsTrampoline;
    if (!paramsTrampoline.emplaceBack(suspenderType) ||
        !paramsTrampoline.emplaceBack(RefType::fromTypeDef(
            &(*codeMeta->types)[ParamsTypeIndex], false)) ||
        !resultsTrampoline.emplaceBack(RefType::any())) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->funcs.length() == TrampolineFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(paramsTrampoline),
                                    std::move(resultsTrampoline),
                                    /*declareForRef = */ true)) {
      return nullptr;
    }

    ValTypeVector paramsContinueOnSuspendable, resultsContinueOnSuspendable;
    if (!paramsContinueOnSuspendable.emplaceBack(suspenderType) ||
        !paramsContinueOnSuspendable.emplaceBack(RefType::extern_())) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->funcs.length() == ContinueOnSuspendableFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(paramsContinueOnSuspendable),
                                    std::move(resultsContinueOnSuspendable),
                                    /*declareForRef = */ true)) {
      return nullptr;
    }

    if (!moduleMeta->prepareForCompile(compilerEnv.mode())) {
      return nullptr;
    }

    ModuleGenerator mg(*codeMeta, compilerEnv, compilerEnv.initialState(),
                       nullptr, nullptr, nullptr);
    if (!mg.initializeCompleteTier()) {
      return nullptr;
    }
    // Build functions and keep bytecodes around until the end.
    uint32_t funcBytecodeOffset = CallSite::FIRST_VALID_BYTECODE_OFFSET;
    Bytes bytecode;
    if (!encodeExportedFunction(
            *codeMeta, paramsSize, resultsSize, paramsOffset,
            RefType::fromTypeDef(&(*codeMeta->types)[ResultsTypeIndex], false),
            bytecode)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    if (!mg.compileFuncDef(ExportedFnIndex, funcBytecodeOffset,
                           bytecode.begin(),
                           bytecode.begin() + bytecode.length())) {
      return nullptr;
    }
    funcBytecodeOffset += bytecode.length();

    Bytes bytecode2;
    if (!encodeTrampolineFunction(*codeMeta, paramsSize, bytecode2)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    if (!mg.compileFuncDef(TrampolineFnIndex, funcBytecodeOffset,
                           bytecode2.begin(),
                           bytecode2.begin() + bytecode2.length())) {
      return nullptr;
    }
    funcBytecodeOffset += bytecode2.length();

    Bytes bytecode3;
    if (!encodeContinueOnSuspendableFunction(*codeMeta, paramsSize,
                                             bytecode3)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    if (!mg.compileFuncDef(ContinueOnSuspendableFnIndex, funcBytecodeOffset,
                           bytecode3.begin(),
                           bytecode3.begin() + bytecode3.length())) {
      return nullptr;
    }
    funcBytecodeOffset += bytecode3.length();

    if (!mg.finishFuncDefs()) {
      return nullptr;
    }

    return mg.finishModule(BytecodeBufferOrSource(), *moduleMeta,
                           /*maybeCompleteTier2Listener=*/nullptr);
  }
};

// Reaction on resolved/rejected suspending promise.
static bool WasmPISuspendTaskContinue(JSContext* cx, unsigned argc, Value* vp) {
  CallArgs args = CallArgsFromVp(argc, vp);
  // The arg[0] has result of resolved promise, or rejection reason.
  Rooted<JSFunction*> callee(cx, &args.callee().as<JSFunction>());
  RootedValue suspender(cx, callee->getExtendedSlot(SUSPENDER_SLOT));
  RootedValue suspendingPromise(cx, callee->getExtendedSlot(PROMISE_SLOT));

  // Convert result of the promise into the parameters/arguments for the
  // $suspending.continue-on-suspendable.
  RootedFunction continueOnSuspendable(
      cx, &callee->getExtendedSlot(CONTINUE_ON_SUSPENDABLE_SLOT)
               .toObject()
               .as<JSFunction>());
  JS::RootedValueArray<2> argv(cx);
  argv[0].set(suspender);
  argv[1].set(suspendingPromise);

  JS::Rooted<JS::Value> rval(cx);
  if (Call(cx, UndefinedHandleValue, continueOnSuspendable, argv, &rval)) {
    return true;
  }

  // The stack was unwound during exception.
  MOZ_RELEASE_ASSERT(!cx->wasm().activeSuspender());
  MOZ_RELEASE_ASSERT(
      suspender.toObject().as<wasm::SuspenderObject>().isMoribund());

  if (cx->isThrowingOutOfMemory()) {
    return false;
  }
  Rooted<PromiseObject*> promise(
      cx, suspender.toObject().as<SuspenderObject>().promisingPromise());
  return RejectPromiseWithPendingError(cx, promise);
}

// Wraps original import to catch all exceptions and convert result to a
// promise.
// Seen as $suspending.wrappedfn in wasm.
static bool WasmPIWrapSuspendingImport(JSContext* cx, unsigned argc,
                                       Value* vp) {
  CallArgs args = CallArgsFromVp(argc, vp);
  Rooted<JSFunction*> callee(cx, &args.callee().as<JSFunction>());
  RootedValue originalImportFunc(cx, callee->getExtendedSlot(WRAPPED_FN_SLOT));

  // Catching exceptions here.
  RootedValue rval(cx);
  if (Call(cx, UndefinedHandleValue, originalImportFunc, args, &rval)) {
    // Convert the result to a resolved promise later in AddPromiseReactions.
    args.rval().set(rval);
    return true;
  }

  // Deferring pending exception to the handler in the
  // $suspending.trampoline.
  return false;
}

static bool ValidateTypes(JSContext* cx, const ValTypeVector& src) {
  for (ValType t : src) {
    if (t.typeDef()) {
      // Error for internal types defined in the main module.
      JS_ReportErrorNumberASCII(cx, GetErrorMessage, nullptr,
                                JSMSG_JSPI_ARG_TYPE);
      return false;
    }
  }
  return true;
}

JSFunction* WasmSuspendingFunctionCreate(JSContext* cx, HandleObject func,
                                         const FuncType& type) {
  if (!ValidateTypes(cx, type.args()) || !ValidateTypes(cx, type.results())) {
    return nullptr;
  }
  ValTypeVector params, results;
  if (!params.append(type.args().begin(), type.args().end()) ||
      !results.append(type.results().begin(), type.results().end())) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  MOZ_ASSERT(IsCallable(ObjectValue(*func)) &&
             !IsCrossCompartmentWrapper(func));

  SuspendingFunctionModuleFactory moduleFactory;
  SharedModule module =
      moduleFactory.build(cx, func, std::move(params), std::move(results));
  if (!module) {
    return nullptr;
  }

  // Instantiate the module.
  Rooted<ImportValues> imports(cx);

  // Add $suspending.wrappedfn to imports.
  RootedFunction funcWrapper(
      cx, NewNativeFunction(cx, WasmPIWrapSuspendingImport, 0, nullptr,
                            gc::AllocKind::FUNCTION_EXTENDED, GenericObject));
  if (!funcWrapper) {
    return nullptr;
  }
  funcWrapper->initExtendedSlot(WRAPPED_FN_SLOT, ObjectValue(*func));
  if (!imports.get().funcs.append(funcWrapper)) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  Rooted<WasmInstanceObject*> instance(cx);
  if (!module->instantiate(cx, imports.get(), nullptr, &instance)) {
    // Can also trap on invalid input function.
    return nullptr;
  }

  // Returns the $suspending.exported function.
  RootedFunction wasmFunc(cx);
  if (!WasmInstanceObject::getExportedFunction(
          cx, instance, SuspendingFunctionModuleFactory::ExportedFnIndex,
          &wasmFunc)) {
    return nullptr;
  }
  return wasmFunc;
}

// Promising

// Builds a wasm module with following structure:
// (module
//   (type $params (struct (field ..)*))
//   (type $results (struct (field ..)*))
//   (type $create-suspender-result (struct (field externref externref)))
//   (import "" "" (func $promising.wrappedfn ..))
//   (func $promising.exported .. )
//   (func $promising.trampoline ..)
//   (export "" (func $promising.exported))
// )
//
// The module provides logic for the Invoke Promising Import state transition
// via $promising.exported and $promising.trampoline (see the SMDOC).
//
class PromisingFunctionModuleFactory {
 public:
  enum TypeIdx {
    ParamsTypeIndex,
    ResultsTypeIndex,
  };

  enum FnIdx {
    WrappedFnIndex,
    ExportedFnIndex,
    TrampolineFnIndex,
  };

 private:
  // Builds function that will be exported for JS:
  // (func $promising.exported
  //   (param ..)* (result externref)
  //   (local $suspender externref)
  //   call $builtin.create-suspender
  //   local.tee $suspender
  //   call $builtin.create-promising-promise ;; -> (promise)
  //   local.get $suspender
  //   ref.func $promising.trampoline
  //   local.get $i*
  //   stuct.new $param-type
  //   stack-switch SwitchToSuspendable ;; <- (suspender,fn,data)
  // )
  bool encodeExportedFunction(CodeMetadata& codeMeta, uint32_t paramsSize,
                              Bytes& bytecode) {
    Encoder encoder(bytecode, *codeMeta.types);
    ValTypeVector locals;
    if (!locals.emplaceBack(RefType::extern_())) {
      return false;
    }
    if (!EncodeLocalEntries(encoder, locals)) {
      return false;
    }

    const uint32_t SuspenderIndex = paramsSize;
    if (!encoder.writeOp(Op::I32Const) || !encoder.writeVarU32(0)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32((uint32_t)BuiltinModuleFuncId::CreateSuspender)) {
      return false;
    }

    if (!encoder.writeOp(Op::LocalTee) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32(
            (uint32_t)BuiltinModuleFuncId::CreatePromisingPromise)) {
      return false;
    }

    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }
    if (!encoder.writeOp(Op::RefFunc) ||
        !encoder.writeVarU32(TrampolineFnIndex)) {
      return false;
    }
    for (uint32_t i = 0; i < paramsSize; i++) {
      if (!encoder.writeOp(Op::LocalGet) || !encoder.writeVarU32(i)) {
        return false;
      }
    }
    if (!encoder.writeOp(GcOp::StructNew) ||
        !encoder.writeVarU32(ParamsTypeIndex)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::StackSwitch) ||
        !encoder.writeVarU32(uint32_t(StackSwitchKind::SwitchToSuspendable))) {
      return false;
    }

    return encoder.writeOp(Op::End);
  }

  // Builds function that is called on alternative stack:
  // (func $promising.trampoline
  //   (param $suspender externref) (param $params (ref $param-type))
  //   (result externref)
  //   local.get $suspender ;; for call $set-results
  //   (local.get $suspender)?
  //   (struct.get $param-type $i (local.get $param))*
  //   (local.get $suspender)?
  //   call $promising.wrappedfn
  //   struct.new $result-type
  //   call $builtin.set-promising-promise-results
  // )
  bool encodeTrampolineFunction(CodeMetadata& codeMeta, uint32_t paramsSize,
                                Bytes& bytecode) {
    Encoder encoder(bytecode, *codeMeta.types);
    if (!EncodeLocalEntries(encoder, ValTypeVector())) {
      return false;
    }
    const uint32_t SuspenderIndex = 0;
    const uint32_t ParamsIndex = 1;

    // Reserved for SetResultsFnIndex call at the end
    if (!encoder.writeOp(Op::LocalGet) ||
        !encoder.writeVarU32(SuspenderIndex)) {
      return false;
    }

    for (uint32_t i = 0; i < paramsSize; i++) {
      if (!encoder.writeOp(Op::LocalGet) || !encoder.writeVarU32(ParamsIndex)) {
        return false;
      }
      if (!encoder.writeOp(GcOp::StructGet) ||
          !encoder.writeVarU32(ParamsTypeIndex) || !encoder.writeVarU32(i)) {
        return false;
      }
    }
    if (!encoder.writeOp(Op::Call) || !encoder.writeVarU32(WrappedFnIndex)) {
      return false;
    }

    if (!encoder.writeOp(GcOp::StructNew) ||
        !encoder.writeVarU32(ResultsTypeIndex)) {
      return false;
    }
    if (!encoder.writeOp(MozOp::CallBuiltinModuleFunc) ||
        !encoder.writeVarU32(
            (uint32_t)BuiltinModuleFuncId::SetPromisingPromiseResults)) {
      return false;
    }

    return encoder.writeOp(Op::End);
  }

 public:
  SharedModule build(JSContext* cx, HandleFunction fn, ValTypeVector&& params,
                     ValTypeVector&& results) {
    const FuncType& fnType = fn->wasmTypeDef()->funcType();
    size_t paramsSize = params.length();

    RefType suspenderType = RefType::extern_();

    FeatureOptions options;
    options.isBuiltinModule = true;

    ScriptedCaller scriptedCaller;
    SharedCompileArgs compileArgs =
        CompileArgs::buildAndReport(cx, std::move(scriptedCaller), options);
    if (!compileArgs) {
      return nullptr;
    }

    MutableModuleMetadata moduleMeta = js_new<ModuleMetadata>();
    if (!moduleMeta || !moduleMeta->init(*compileArgs)) {
      return nullptr;
    }
    MutableCodeMetadata codeMeta = moduleMeta->codeMeta;

    MOZ_ASSERT(IonPlatformSupport());
    CompilerEnvironment compilerEnv(CompileMode::Once, Tier::Optimized,
                                    DebugEnabled::False);
    compilerEnv.computeParameters();

    StructType boxedParamsStruct;
    if (!StructType::createImmutable(params, &boxedParamsStruct)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->types->length() == ParamsTypeIndex);
    if (!codeMeta->types->addType(std::move(boxedParamsStruct))) {
      return nullptr;
    }

    if (!ValidateTypes(cx, fnType.args()) ||
        !ValidateTypes(cx, fnType.results())) {
      return nullptr;
    }
    ValTypeVector paramsForWrapper, resultsForWrapper;
    if (!paramsForWrapper.append(fnType.args().begin(), fnType.args().end()) ||
        !resultsForWrapper.append(fnType.results().begin(),
                                  fnType.results().end())) {
      ReportOutOfMemory(cx);
      return nullptr;
    }

    StructType boxedResultType;
    if (!StructType::createImmutable(resultsForWrapper, &boxedResultType)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->types->length() == ResultsTypeIndex);
    if (!codeMeta->types->addType(std::move(boxedResultType))) {
      return nullptr;
    }

    MOZ_ASSERT(codeMeta->funcs.length() == WrappedFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(paramsForWrapper),
                                    std::move(resultsForWrapper))) {
      return nullptr;
    }

    // Imports names are not important, declare functions above as imports.
    codeMeta->numFuncImports = codeMeta->funcs.length();

    // We will be looking up and using the exports function by index so
    // the name doesn't matter.
    MOZ_ASSERT(codeMeta->funcs.length() == ExportedFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(params), std::move(results),
                                    /* declareFoRef = */ true,
                                    mozilla::Some(CacheableName()))) {
      return nullptr;
    }

    ValTypeVector paramsTrampoline, resultsTrampoline;
    if (!paramsTrampoline.emplaceBack(suspenderType) ||
        !paramsTrampoline.emplaceBack(RefType::fromTypeDef(
            &(*codeMeta->types)[ParamsTypeIndex], false))) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    MOZ_ASSERT(codeMeta->funcs.length() == TrampolineFnIndex);
    if (!moduleMeta->addDefinedFunc(std::move(paramsTrampoline),
                                    std::move(resultsTrampoline),
                                    /* declareFoRef = */ true)) {
      return nullptr;
    }

    if (!moduleMeta->prepareForCompile(compilerEnv.mode())) {
      return nullptr;
    }

    ModuleGenerator mg(*codeMeta, compilerEnv, compilerEnv.initialState(),
                       nullptr, nullptr, nullptr);
    if (!mg.initializeCompleteTier()) {
      return nullptr;
    }
    // Build functions and keep bytecodes around until the end.
    Bytes bytecode;
    uint32_t funcBytecodeOffset = CallSite::FIRST_VALID_BYTECODE_OFFSET;
    if (!encodeExportedFunction(*codeMeta, paramsSize, bytecode)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    if (!mg.compileFuncDef(ExportedFnIndex, funcBytecodeOffset,
                           bytecode.begin(),
                           bytecode.begin() + bytecode.length())) {
      return nullptr;
    }
    funcBytecodeOffset += bytecode.length();

    Bytes bytecode2;
    if (!encodeTrampolineFunction(*codeMeta, paramsSize, bytecode2)) {
      ReportOutOfMemory(cx);
      return nullptr;
    }
    if (!mg.compileFuncDef(TrampolineFnIndex, funcBytecodeOffset,
                           bytecode2.begin(),
                           bytecode2.begin() + bytecode2.length())) {
      return nullptr;
    }
    funcBytecodeOffset += bytecode2.length();

    if (!mg.finishFuncDefs()) {
      return nullptr;
    }

    return mg.finishModule(BytecodeBufferOrSource(), *moduleMeta,
                           /*maybeCompleteTier2Listener=*/nullptr);
  }
};

// Wraps call to wasm $promising.exported function to catch an exception and
// return a promise instead.
static bool WasmPIPromisingFunction(JSContext* cx, unsigned argc, Value* vp) {
  CallArgs args = CallArgsFromVp(argc, vp);
  Rooted<JSFunction*> callee(cx, &args.callee().as<JSFunction>());
  RootedFunction fn(
      cx,
      &callee->getExtendedSlot(WRAPPED_FN_SLOT).toObject().as<JSFunction>());

  // Catching exceptions here.
  if (Call(cx, UndefinedHandleValue, fn, args, args.rval())) {
    return true;
  }

  // The stack was unwound during exception. There should be no active
  // suspender.
  MOZ_RELEASE_ASSERT(!cx->wasm().activeSuspender());

  if (cx->isThrowingOutOfMemory()) {
    return false;
  }

  RootedObject promiseObject(cx, NewPromiseObject(cx, nullptr));
  if (!promiseObject) {
    return false;
  }
  args.rval().setObject(*promiseObject);

  Rooted<PromiseObject*> promise(cx, &promiseObject->as<PromiseObject>());
  return RejectPromiseWithPendingError(cx, promise);
}

JSFunction* WasmPromisingFunctionCreate(JSContext* cx, HandleObject func) {
  RootedFunction wrappedWasmFunc(cx, &func->as<JSFunction>());
  MOZ_ASSERT(wrappedWasmFunc->isWasm());
  const FuncType& wrappedWasmFuncType =
      wrappedWasmFunc->wasmTypeDef()->funcType();

  ValTypeVector results;
  if (!results.append(RefType::extern_())) {
    ReportOutOfMemory(cx);
    return nullptr;
  }
  if (!ValidateTypes(cx, wrappedWasmFuncType.args())) {
    return nullptr;
  }
  ValTypeVector params;
  if (!params.append(wrappedWasmFuncType.args().begin(),
                     wrappedWasmFuncType.args().end())) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  PromisingFunctionModuleFactory moduleFactory;
  SharedModule module = moduleFactory.build(
      cx, wrappedWasmFunc, std::move(params), std::move(results));
  if (!module) {
    return nullptr;
  }

  // Instantiate the module.
  Rooted<ImportValues> imports(cx);

  // Add wrapped function ($promising.wrappedfn) to imports.
  if (!imports.get().funcs.append(func)) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  Rooted<WasmInstanceObject*> instance(cx);
  if (!module->instantiate(cx, imports.get(), nullptr, &instance)) {
    MOZ_ASSERT(cx->isThrowingOutOfMemory());
    return nullptr;
  }

  // Wrap $promising.exported function for exceptions/traps handling.
  RootedFunction wasmFunc(cx);
  if (!WasmInstanceObject::getExportedFunction(
          cx, instance, PromisingFunctionModuleFactory::ExportedFnIndex,
          &wasmFunc)) {
    return nullptr;
  }

  RootedFunction wasmFuncWrapper(
      cx, NewNativeFunction(cx, WasmPIPromisingFunction, 0, nullptr,
                            gc::AllocKind::FUNCTION_EXTENDED, GenericObject));
  if (!wasmFuncWrapper) {
    return nullptr;
  }
  wasmFuncWrapper->initExtendedSlot(WRAPPED_FN_SLOT, ObjectValue(*wasmFunc));
  return wasmFuncWrapper;
}

// Gets active suspender.
// The reserved parameter is a workaround for limitation in the
// WasmBuiltinModule.yaml generator to always have params.
// Seen as $builtin.current-suspender to wasm.
SuspenderObject* CurrentSuspender(Instance* instance, int32_t reserved) {
  MOZ_ASSERT(SASigCurrentSuspender.failureMode == FailureMode::FailOnNullPtr);
  JSContext* cx = instance->cx();
  SuspenderObject* suspender = cx->wasm().activeSuspender();
  if (!suspender) {
    JS_ReportErrorNumberASCII(cx, GetErrorMessage, nullptr,
                              JSMSG_JSPI_INVALID_STATE);
    return nullptr;
  }
  return suspender;
}

// Creates a suspender and promise (that will be returned to JS code).
// Seen as $builtin.create-suspender to wasm.
SuspenderObject* CreateSuspender(Instance* instance, int32_t reserved) {
  MOZ_ASSERT(SASigCreateSuspender.failureMode == FailureMode::FailOnNullPtr);
  JSContext* cx = instance->cx();
  return SuspenderObject::create(cx);
}

// Creates a promise that will be returned at promising call.
// Seen as $builtin.create-promising-promise to wasm.
PromiseObject* CreatePromisingPromise(Instance* instance,
                                      SuspenderObject* suspender) {
  MOZ_ASSERT(SASigCreatePromisingPromise.failureMode ==
             FailureMode::FailOnNullPtr);
  JSContext* cx = instance->cx();

  Rooted<SuspenderObject*> suspenderObject(cx, suspender);
  RootedObject promiseObject(cx, NewPromiseObject(cx, nullptr));
  if (!promiseObject) {
    return nullptr;
  }

  Rooted<PromiseObject*> promise(cx, &promiseObject->as<PromiseObject>());
  suspenderObject->setPromisingPromise(promise);
  return promise.get();
}

// Converts promise results into actual function result, or exception/trap
// if rejected.
// Seen as $builtin.get-suspending-promise-result to wasm.
JSObject* GetSuspendingPromiseResult(Instance* instance, void* result,
                                     SuspenderObject* suspender) {
  MOZ_ASSERT(SASigGetSuspendingPromiseResult.failureMode ==
             FailureMode::FailOnNullPtr);
  JSContext* cx = instance->cx();
  Rooted<SuspenderObject*> suspenderObject(cx, suspender);
  RootedAnyRef resultRef(cx, AnyRef::fromCompiledCode(result));

  SuspenderObject::ReturnType returnType =
      suspenderObject->suspendingReturnType();
  MOZ_ASSERT(returnType != SuspenderObject::ReturnType::Unknown);
  Rooted<PromiseObject*> promise(
      cx, returnType == SuspenderObject::ReturnType::Promise
              ? &resultRef.toJSObject().as<PromiseObject>()
              : nullptr);

#  ifdef DEBUG
  auto resetReturnType = mozilla::MakeScopeExit([&suspenderObject]() {
    suspenderObject->setSuspendingReturnType(
        SuspenderObject::ReturnType::Unknown);
  });
#  endif

  if (promise ? promise->state() == JS::PromiseState::Rejected
              : returnType == SuspenderObject::ReturnType::Exception) {
    // Promise was rejected or an exception was thrown, set pending exception
    // and fail.
    RootedValue reason(
        cx, promise ? promise->reason() : resultRef.get().toJSValue());
    cx->setPendingException(reason, ShouldCaptureStack::Maybe);
    return nullptr;
  }

  // The exception and rejection are handled above -- expect resolved promise.
  MOZ_ASSERT(promise->state() == JS::PromiseState::Fulfilled);
  RootedValue jsValue(cx, promise->value());

  // Construct the results object.
  Rooted<WasmStructObject*> results(
      cx, instance->constantStructNewDefault(
              cx, SuspendingFunctionModuleFactory::ResultsTypeIndex));
  const FieldTypeVector& fields = results->typeDef().structType().fields_;

  if (fields.length() > 0) {
    // The struct object is constructed based on returns of exported function.
    // It is the only way we can get ValType for Val::fromJSValue call.
    const wasm::FuncType& sig = instance->codeMeta().getFuncType(
        SuspendingFunctionModuleFactory::ExportedFnIndex);

    if (fields.length() == 1) {
      RootedVal val(cx);
      MOZ_ASSERT(sig.result(0).storageType() == fields[0].type);
      if (!Val::fromJSValue(cx, sig.result(0), jsValue, &val)) {
        return nullptr;
      }
      results->storeVal(val, 0);
    } else {
      // The multi-value result is wrapped into ArrayObject/Iterable.
      Rooted<ArrayObject*> array(cx, IterableToArray(cx, jsValue));
      if (!array) {
        return nullptr;
      }
      if (fields.length() != array->length()) {
        UniqueChars expected(JS_smprintf("%zu", fields.length()));
        UniqueChars got(JS_smprintf("%u", array->length()));
        if (!expected || !got) {
          ReportOutOfMemory(cx);
          return nullptr;
        }

        JS_ReportErrorNumberUTF8(cx, GetErrorMessage, nullptr,
                                 JSMSG_WASM_WRONG_NUMBER_OF_VALUES,
                                 expected.get(), got.get());
        return nullptr;
      }

      for (size_t i = 0; i < fields.length(); i++) {
        RootedVal val(cx);
        RootedValue v(cx, array->getDenseElement(i));
        MOZ_ASSERT(sig.result(i).storageType() == fields[i].type);
        if (!Val::fromJSValue(cx, sig.result(i), v, &val)) {
          return nullptr;
        }
        results->storeVal(val, i);
      }
    }
  }
  return results;
}

// Collects returned suspending promising, and registers callbacks to
// react on it using WasmPISuspendTaskContinue.
// Seen as $builtin.add-promise-reactions to wasm.
void* AddPromiseReactions(Instance* instance, SuspenderObject* suspender,
                          void* result, JSFunction* continueOnSuspendable) {
  MOZ_ASSERT(SASigAddPromiseReactions.failureMode ==
             FailureMode::FailOnInvalidRef);
  JSContext* cx = instance->cx();

  RootedAnyRef resultRef(cx, AnyRef::fromCompiledCode(result));
  RootedValue resultValue(cx, resultRef.get().toJSValue());
  Rooted<SuspenderObject*> suspenderObject(cx, suspender);
  RootedFunction fn(cx, continueOnSuspendable);

  // Wrap a promise.
  RootedObject promiseConstructor(cx, GetPromiseConstructor(cx));
  RootedObject promiseObj(cx,
                          PromiseResolve(cx, promiseConstructor, resultValue));
  if (!promiseObj) {
    return AnyRef::invalid().forCompiledCode();
  }
  Rooted<PromiseObject*> promiseObject(cx, &promiseObj->as<PromiseObject>());

  suspenderObject->setSuspendingReturnType(
      SuspenderObject::ReturnType::Promise);

  // Add promise reactions
  RootedFunction then_(
      cx, NewNativeFunction(cx, WasmPISuspendTaskContinue, 1, nullptr,
                            gc::AllocKind::FUNCTION_EXTENDED, GenericObject));
  then_->initExtendedSlot(SUSPENDER_SLOT, ObjectValue(*suspenderObject));
  then_->initExtendedSlot(CONTINUE_ON_SUSPENDABLE_SLOT, ObjectValue(*fn));
  then_->initExtendedSlot(PROMISE_SLOT, ObjectValue(*promiseObject));
  if (!JS::AddPromiseReactions(cx, promiseObject, then_, then_)) {
    return AnyRef::invalid().forCompiledCode();
  }
  return AnyRef::fromJSObject(*promiseObject).forCompiledCode();
}

// Changes exit stack frame pointers to suspendable stack and recast exception
// to wasm reference. Seen as $builtin.forward-exn-to-suspended to wasm.
void* ForwardExceptionToSuspended(Instance* instance,
                                  SuspenderObject* suspender, void* exception) {
  MOZ_ASSERT(SASigForwardExceptionToSuspended.failureMode ==
             FailureMode::Infallible);

  suspender->forwardToSuspendable();
  suspender->setSuspendingReturnType(SuspenderObject::ReturnType::Exception);
  return exception;
}

// Resolves the promise using results packed by wasm.
// Seen as $builtin.set-promising-promise-results to wasm.
int32_t SetPromisingPromiseResults(Instance* instance,
                                   SuspenderObject* suspender,
                                   WasmStructObject* results) {
  MOZ_ASSERT(SASigSetPromisingPromiseResults.failureMode ==
             FailureMode::FailOnNegI32);
  JSContext* cx = instance->cx();
  Rooted<WasmStructObject*> res(cx, results);
  Rooted<SuspenderObject*> suspenderObject(cx, suspender);
  RootedObject promise(cx, suspenderObject->promisingPromise());

  const StructType& resultType = res->typeDef().structType();
  RootedValue val(cx);
  // Unbox the result value from the struct, if any.
  switch (resultType.fields_.length()) {
    case 0:
      break;
    case 1: {
      if (!res->getField(cx, /*index=*/0, &val)) {
        return false;
      }
    } break;
    default: {
      Rooted<ArrayObject*> array(cx, NewDenseEmptyArray(cx));
      if (!array) {
        return false;
      }
      for (size_t i = 0; i < resultType.fields_.length(); i++) {
        RootedValue item(cx);
        if (!res->getField(cx, i, &item)) {
          return false;
        }
        if (!NewbornArrayPush(cx, array, item)) {
          return false;
        }
      }
      val.setObject(*array);
    } break;
  }
  ResolvePromise(cx, promise, val);
  return 0;
}

void UpdateSuspenderState(Instance* instance, SuspenderObject* suspender,
                          UpdateSuspenderStateAction action) {
  MOZ_ASSERT(SASigUpdateSuspenderState.failureMode == FailureMode::Infallible);

  JSContext* cx = instance->cx();
  switch (action) {
    case UpdateSuspenderStateAction::Enter:
      suspender->enter(cx);
      break;
    case UpdateSuspenderStateAction::Suspend:
      suspender->suspend(cx);
      break;
    case UpdateSuspenderStateAction::Resume:
      suspender->resume(cx);
      break;
    case UpdateSuspenderStateAction::Leave:
      suspender->leave(cx);
      break;
    default:
      MOZ_CRASH();
  }
}

}  // namespace js::wasm
#endif  // ENABLE_WASM_JSPI

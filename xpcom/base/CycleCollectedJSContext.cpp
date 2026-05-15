/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/CycleCollectedJSContext.h"

#include <algorithm>
#include <utility>

#include "js/Debug.h"
#include "js/friend/DumpFunctions.h"
#include "js/friend/MicroTask.h"
#include "js/GCAPI.h"
#include "js/Utility.h"
#include "jsapi.h"
#include "mozilla/AsyncEventDispatcher.h"
#include "mozilla/AutoRestore.h"
#include "mozilla/CycleCollectedJSRuntime.h"
#include "mozilla/DebuggerOnGCRunnable.h"
#include "mozilla/FlowMarkers.h"
#include "mozilla/MemoryReporting.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/ProfilerRunnable.h"
#include "mozilla/Sprintf.h"
#include "mozilla/StaticPrefs_javascript.h"
#include "mozilla/dom/DOMException.h"
#include "mozilla/dom/DOMJSClass.h"
#include "mozilla/dom/FinalizationRegistryBinding.h"
#include "mozilla/dom/CallbackObject.h"
#include "mozilla/dom/PromiseDebugging.h"
#include "mozilla/dom/PromiseRejectionEvent.h"
#include "mozilla/dom/PromiseRejectionEventBinding.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/dom/UserActivation.h"
#include "mozilla/dom/WebTaskScheduler.h"
#include "nsContentUtils.h"
#include "nsCycleCollectionNoteRootCallback.h"
#include "nsCycleCollectionParticipant.h"
#include "nsCycleCollector.h"
#include "nsDOMJSUtils.h"
#include "nsDOMMutationObserver.h"
#include "nsJSUtils.h"
#include "nsPIDOMWindow.h"
#include "nsThread.h"
#include "nsThreadUtils.h"
#include "nsWrapperCache.h"
#include "xpcpublic.h"

using namespace mozilla;
using namespace mozilla::dom;

namespace mozilla {

CycleCollectedJSContext::CycleCollectedJSContext()
    : mRuntime(nullptr),
      mJSContext(nullptr),
      mDoingStableStates(false),
      mTargetedMicroTaskRecursionDepth(0),
      mMicroTaskLevel(0),
      mSyncOperations(0),
      mSuppressionGeneration(0),
      mDebuggerRecursionDepth(0),
      mFinalizationRegistryCleanup(this) {
  MOZ_COUNT_CTOR(CycleCollectedJSContext);

  nsCOMPtr<nsIThread> thread = do_GetCurrentThread();
  mOwningThread = thread.forget().downcast<nsThread>().take();
  MOZ_RELEASE_ASSERT(mOwningThread);
}

CycleCollectedJSContext::~CycleCollectedJSContext() {
  MOZ_COUNT_DTOR(CycleCollectedJSContext);
  // If the allocation failed, here we are.
  if (!mJSContext) {
    return;
  }

  JS::SetHostCleanupFinalizationRegistryCallback(mJSContext, nullptr, nullptr);

  JS_SetContextPrivate(mJSContext, nullptr);

  MOZ_ASSERT(!JS::HasAnyMicroTasks(mJSContext));

  mRuntime->SetContext(nullptr);
  mRuntime->Shutdown(mJSContext);

  // Last chance to process any events.
  CleanupIDBTransactions(mBaseRecursionDepth);
  MOZ_ASSERT(mPendingIDBTransactions.IsEmpty());

  ProcessStableStateQueue();
  MOZ_ASSERT(mStableStateEvents.IsEmpty());

  // Clear mPendingException first, since it might be cycle collected.
  mPendingException = nullptr;

  mUncaughtRejections.reset();
  mConsumedRejections.reset();

  mAboutToBeNotifiedRejectedPromises.Clear();
  mPendingUnhandledRejections.Clear();

  mFinalizationRegistryCleanup.Destroy();

  JS_DestroyContext(mJSContext);
  mJSContext = nullptr;

  nsCycleCollector_forgetJSContext();

  mozilla::dom::DestroyScriptSettings();

  mOwningThread->SetScriptObserver(nullptr);
  NS_RELEASE(mOwningThread);

  delete mRuntime;
  mRuntime = nullptr;
}

nsresult CycleCollectedJSContext::Initialize(JSRuntime* aParentRuntime,
                                             uint32_t aMaxBytes) {
  MOZ_ASSERT(!mJSContext);

  mozilla::dom::InitScriptSettings();
  mJSContext = JS_NewContext(aMaxBytes, aParentRuntime);
  if (!mJSContext) {
    return NS_ERROR_OUT_OF_MEMORY;
  }

  mRuntime = CreateRuntime(mJSContext);
  mRuntime->SetContext(this);

  mOwningThread->SetScriptObserver(this);
  // The main thread has a base recursion depth of 0, workers of 1.
  mBaseRecursionDepth = RecursionDepth();

  NS_GetCurrentThread()->SetCanInvokeJS(true);

  JS::SetJobQueue(mJSContext, this);
  JS::SetPromiseRejectionTrackerCallback(mJSContext,
                                         PromiseRejectionTrackerCallback, this);
  mUncaughtRejections.init(mJSContext,
                           JS::GCVector<JSObject*, 0, js::SystemAllocPolicy>(
                               js::SystemAllocPolicy()));
  mConsumedRejections.init(mJSContext,
                           JS::GCVector<JSObject*, 0, js::SystemAllocPolicy>(
                               js::SystemAllocPolicy()));

  mFinalizationRegistryCleanup.Init();

  // Cast to PerThreadAtomCache for dom::GetAtomCache(JSContext*).
  JS_SetContextPrivate(mJSContext, static_cast<PerThreadAtomCache*>(this));

  nsCycleCollector_registerJSContext(this);

  return NS_OK;
}

/* static */
CycleCollectedJSContext* CycleCollectedJSContext::GetFor(JSContext* aCx) {
  // Cast from void* matching JS_SetContextPrivate.
  auto atomCache = static_cast<PerThreadAtomCache*>(JS_GetContextPrivate(aCx));
  // Down cast.
  return static_cast<CycleCollectedJSContext*>(atomCache);
}

size_t CycleCollectedJSContext::SizeOfExcludingThis(
    MallocSizeOf aMallocSizeOf) const {
  return 0;
}

enum { INCUMBENT_SETTING_SLOT, SCHEDULING_STATE_SLOT, HOSTDEFINED_DATA_SLOTS };

// Finalizer for instances of HostDefinedData.
void FinalizeHostDefinedData(JS::GCContext* gcx, JSObject* objSelf) {
  JS::Value slotEvent = JS::GetReservedSlot(objSelf, SCHEDULING_STATE_SLOT);
  if (slotEvent.isUndefined()) {
    return;
  }

  WebTaskSchedulingState* schedulingState =
      static_cast<WebTaskSchedulingState*>(slotEvent.toPrivate());
  JS_SetReservedSlot(objSelf, SCHEDULING_STATE_SLOT, JS::UndefinedValue());
  schedulingState->Release();
}

static const JSClassOps sHostDefinedData = {
    nullptr /* addProperty */, nullptr /* delProperty */,
    nullptr /* enumerate */,   nullptr /* newEnumerate */,
    nullptr /* resolve */,     nullptr /* mayResolve */,
    FinalizeHostDefinedData /* finalize */
};

// Implements `HostDefined` in https://html.spec.whatwg.org/#hostmakejobcallback
static const JSClass sHostDefinedDataClass = {
    "HostDefinedData",
    JSCLASS_HAS_RESERVED_SLOTS(HOSTDEFINED_DATA_SLOTS) |
        JSCLASS_FOREGROUND_FINALIZE,
    &sHostDefinedData};

bool CycleCollectedJSContext::getHostDefinedGlobal(
    JSContext* aCx, JS::MutableHandle<JSObject*> out) const {
  nsIGlobalObject* global = mozilla::dom::GetIncumbentGlobal();
  if (!global) {
    return true;
  }

  out.set(global->GetGlobalJSObject());
  return true;
}

void CycleCollectedJSContext::traceNonGCThingMicroTask(JSTracer* trc,
                                                       JS::Value* valuePtr) {
  // This hook is called for non-JSObject microtask values.
  // In Gecko, the microtask queue should only contain JSObjects (JS microtasks)
  // or Private values (Gecko MicroTaskRunnables). Private values are
  // indistinguishable from doubles at the bit level, so if this hook is called,
  // we know it's not an object, and by design it must be a Private value
  // containing a MicroTaskRunnable pointer that was enqueued via
  // EnqueueMicroTask.

  MOZ_ASSERT(!valuePtr->isObject(),
             "This hook should only be called for non-objects");
  if (void* ptr = valuePtr->toPrivate()) {
    // The pointer is a MicroTaskRunnable that may have GC-reachable data
    auto* runnable = static_cast<MicroTaskRunnable*>(ptr);
    runnable->TraceMicroTask(trc);
  }
}

bool CycleCollectedJSContext::getHostDefinedData(
    JSContext* aCx, JS::MutableHandle<JSObject*> aData) const {
  nsIGlobalObject* global = mozilla::dom::GetIncumbentGlobal();
  if (!global) {
    aData.set(nullptr);
    return true;
  }

  JS::Rooted<JSObject*> incumbentGlobal(aCx, global->GetGlobalJSObject());

  if (!incumbentGlobal) {
    aData.set(nullptr);
    return true;
  }

  JSAutoRealm ar(aCx, incumbentGlobal);

  JS::Rooted<JSObject*> objResult(aCx,
                                  JS_NewObject(aCx, &sHostDefinedDataClass));
  if (!objResult) {
    aData.set(nullptr);
    return false;
  }

  JS_SetReservedSlot(objResult, INCUMBENT_SETTING_SLOT,
                     JS::ObjectValue(*incumbentGlobal));

  if (mozilla::dom::WebTaskSchedulingState* schedulingState =
          mozilla::dom::GetWebTaskSchedulingState()) {
    schedulingState->AddRef();
    JS_SetReservedSlot(objResult, SCHEDULING_STATE_SLOT,
                       JS::PrivateValue(schedulingState));
  }

  aData.set(objResult);

  return true;
}

// Used only by the SpiderMonkey Debugger API, and even then only via
// JS::AutoDebuggerJobQueueInterruption, to ensure that the debuggee's queue is
// not affected; see comments in js/public/Promise.h.
void CycleCollectedJSContext::runJobs(JSContext* aCx) {
  MOZ_ASSERT(aCx == Context());
  MOZ_ASSERT(Get() == this);
  PerformMicroTaskCheckPoint();
}

MicroTaskRunnable* MustConsumeMicroTask::MaybeUnwrapTaskToRunnable() const {
  if (!IsJSMicroTask()) {
    void* nonJSTask = mMicroTask.toPrivate();
    MicroTaskRunnable* task = reinterpret_cast<MicroTaskRunnable*>(nonJSTask);
    return task;
  }

  return nullptr;
}

already_AddRefed<MicroTaskRunnable>
MustConsumeMicroTask::MaybeConsumeAsOwnedRunnable() {
  MOZ_ASSERT(!IsConsumed(), "Attempting to consume an already-consumed task");
  MicroTaskRunnable* mtr = MaybeUnwrapTaskToRunnable();
  if (!mtr) {
    return nullptr;
  }
  mMicroTask.setUndefined();
  return already_AddRefed(mtr);
}

// Preserve a debuggee's microtask queue while it is interrupted by the
// debugger. See the comments for JS::AutoDebuggerJobQueueInterruption.
class CycleCollectedJSContext::SavedMicroTaskQueue
    : public JS::JobQueue::SavedJobQueue {
 public:
  explicit SavedMicroTaskQueue(CycleCollectedJSContext* ccjs) : ccjs(ccjs) {
    ccjs->mDebuggerRecursionDepth++;
    mSavedQueue = JS::SaveMicroTaskQueue(ccjs->Context());
  }

  ~SavedMicroTaskQueue() {
    // The JS Debugger attempts to maintain the invariant that microtasks which
    // occur durring debugger operation are completely flushed from the task
    // queue before returning control to the debuggee, in order to avoid
    // micro-tasks generated during debugging from interfering with regular
    // operation.
    //
    // While the vast majority of microtasks can be reliably flushed,
    // synchronous operations (see nsAutoSyncOperation) such as printing and
    // alert diaglogs suppress the execution of some microtasks.
    //
    // When PerformMicroTaskCheckpoint is run while microtasks are suppressed,
    // any suppressed microtasks are gathered into a new SuppressedMicroTasks
    // runnable, which is enqueued on exit from PerformMicroTaskCheckpoint. As a
    // result, AutoDebuggerJobQueueInterruption::runJobs is not able to
    // correctly guarantee that the microtask queue is totally empty in the
    // presence of sync operations.
    //
    // Previous versions of this code release-asserted that the queue was empty,
    // causing user observable crashes (Bug 1849675). To avoid this, we instead
    // choose to move suspended microtasks from the SavedMicroTaskQueue to the
    // main microtask queue in this destructor. This means that jobs enqueued
    // during synchnronous events under debugger control may produce events
    // which run outside the debugger, but this is viewed as strictly
    // preferrable to crashing.
    MOZ_RELEASE_ASSERT(ccjs->mDebuggerRecursionDepth);

    JSContext* cx = ccjs->Context();

    JS::Rooted<MustConsumeMicroTask> suppressedTasks(cx);
    MOZ_ASSERT(JS::GetRegularMicroTaskCount(cx) <= 1);
    if (JS::HasRegularMicroTasks(cx)) {
      suppressedTasks = DequeueNextRegularMicroTask(cx);
      MOZ_ASSERT(suppressedTasks.get().MaybeUnwrapTaskToRunnable() ==
                 ccjs->mSuppressedMicroTaskList);
    }
    MOZ_RELEASE_ASSERT(!JS::HasRegularMicroTasks(cx));
    JS::RestoreMicroTaskQueue(cx, std::move(mSavedQueue));

    if (suppressedTasks.get()) {
      EnqueueMicroTask(cx, suppressedTasks.get().MaybeConsumeAsOwnedRunnable());
    }

    ccjs->mDebuggerRecursionDepth--;
  }

 private:
  CycleCollectedJSContext* ccjs;
  std::deque<RefPtr<MicroTaskRunnable>> mQueue;
  js::UniquePtr<JS::SavedMicroTaskQueue> mSavedQueue;
};

js::UniquePtr<JS::JobQueue::SavedJobQueue>
CycleCollectedJSContext::saveJobQueue(JSContext* cx) {
  auto saved = js::MakeUnique<SavedMicroTaskQueue>(this);
  if (!saved) {
    // When MakeUnique's allocation fails, the SavedMicroTaskQueue constructor
    // is never called, so mPendingMicroTaskRunnables is still initialized.
    JS_ReportOutOfMemory(cx);
    return nullptr;
  }

  return saved;
}

/* static */
void CycleCollectedJSContext::PromiseRejectionTrackerCallback(
    JSContext* aCx, bool aMutedErrors, JS::HandleObject aPromise,
    JS::PromiseRejectionHandlingState state, void* aData) {
  CycleCollectedJSContext* self = static_cast<CycleCollectedJSContext*>(aData);

  MOZ_ASSERT(aCx == self->Context());
  MOZ_ASSERT(Get() == self);

  // TODO: Bug 1549351 - Promise rejection event should not be sent for
  // cross-origin scripts

  PromiseArray& aboutToBeNotified = self->mAboutToBeNotifiedRejectedPromises;
  PromiseHashtable& unhandled = self->mPendingUnhandledRejections;
  uint64_t promiseID = JS::GetPromiseID(aPromise);

  if (state == JS::PromiseRejectionHandlingState::Unhandled) {
    PromiseDebugging::AddUncaughtRejection(aPromise);
    if (!aMutedErrors) {
      RefPtr<Promise> promise =
          Promise::CreateFromExisting(xpc::NativeGlobal(aPromise), aPromise);
      aboutToBeNotified.AppendElement(promise);
      unhandled.InsertOrUpdate(promiseID, std::move(promise));
    }
  } else {
    PromiseDebugging::AddConsumedRejection(aPromise);
    for (size_t i = 0; i < aboutToBeNotified.Length(); i++) {
      if (aboutToBeNotified[i] &&
          aboutToBeNotified[i]->PromiseObj() == aPromise) {
        // To avoid large amounts of memmoves, we don't shrink the vector
        // here. Instead, we filter out nullptrs when iterating over the
        // vector later.
        aboutToBeNotified[i] = nullptr;
        DebugOnly<bool> isFound = unhandled.Remove(promiseID);
        MOZ_ASSERT(isFound);
        return;
      }
    }
    RefPtr<Promise> promise;
    unhandled.Remove(promiseID, getter_AddRefs(promise));
    if (!promise && !aMutedErrors) {
      nsIGlobalObject* global = xpc::NativeGlobal(aPromise);
      if (nsCOMPtr<EventTarget> owner = do_QueryInterface(global)) {
        RootedDictionary<PromiseRejectionEventInit> init(aCx);
        if (RefPtr<Promise> newPromise =
                Promise::CreateFromExisting(global, aPromise)) {
          init.mPromise = newPromise->PromiseObj();
        }
        init.mReason = JS::GetPromiseResult(aPromise);

        RefPtr<PromiseRejectionEvent> event =
            PromiseRejectionEvent::Constructor(owner, u"rejectionhandled"_ns,
                                               init);

        RefPtr<AsyncEventDispatcher> asyncDispatcher =
            new AsyncEventDispatcher(owner, event.forget());
        asyncDispatcher->PostDOMEvent();
      }
    }
  }
}

already_AddRefed<Exception> CycleCollectedJSContext::GetPendingException()
    const {
  MOZ_ASSERT(mJSContext);

  nsCOMPtr<Exception> out = mPendingException;
  return out.forget();
}

void CycleCollectedJSContext::SetPendingException(Exception* aException) {
  MOZ_ASSERT(mJSContext);
  mPendingException = aException;
}

void CycleCollectedJSContext::TraceMicroTasks(JSTracer* aTracer) {
  for (MicroTaskRunnable* mt : mMicrotasksToTrace) {
    mt->TraceMicroTask(aTracer);
  }
}

void CycleCollectedJSContext::ProcessStableStateQueue() {
  MOZ_ASSERT(mJSContext);
  MOZ_RELEASE_ASSERT(!mDoingStableStates);
  mDoingStableStates = true;

  // When run, one event can add another event to the mStableStateEvents, as
  // such you can't use iterators here.
  for (uint32_t i = 0; i < mStableStateEvents.Length(); ++i) {
    nsCOMPtr<nsIRunnable> event = std::move(mStableStateEvents[i]);
    AUTO_PROFILE_FOLLOWING_RUNNABLE(event);
    event->Run();
  }

  mStableStateEvents.Clear();
  mDoingStableStates = false;
}

void CycleCollectedJSContext::CleanupIDBTransactions(uint32_t aRecursionDepth) {
  MOZ_ASSERT(mJSContext);
  MOZ_RELEASE_ASSERT(!mDoingStableStates);
  mDoingStableStates = true;

  nsTArray<PendingIDBTransactionData> localQueue =
      std::move(mPendingIDBTransactions);

  localQueue.RemoveLastElements(
      localQueue.end() -
      std::remove_if(localQueue.begin(), localQueue.end(),
                     [aRecursionDepth](PendingIDBTransactionData& data) {
                       if (data.mRecursionDepth != aRecursionDepth) {
                         return false;
                       }

                       {
                         nsCOMPtr<nsIRunnable> transaction =
                             std::move(data.mTransaction);
                         transaction->Run();
                       }

                       return true;
                     }));

  // If mPendingIDBTransactions has events in it now, they were added from
  // something we called, so they belong at the end of the queue.
  localQueue.AppendElements(std::move(mPendingIDBTransactions));
  mPendingIDBTransactions = std::move(localQueue);
  mDoingStableStates = false;
}

void CycleCollectedJSContext::BeforeProcessTask(bool aMightBlock) {
  // If ProcessNextEvent was called during a microtask callback, we
  // must process any pending microtasks before blocking in the event loop,
  // otherwise we may deadlock until an event enters the queue later.
  if (aMightBlock && PerformMicroTaskCheckPoint()) {
    // If any microtask was processed, we post a dummy event in order to
    // force the ProcessNextEvent call not to block.  This is required
    // to support nested event loops implemented using a pattern like
    // "while (condition) thread.processNextEvent(true)", in case the
    // condition is triggered here by a Promise "then" callback.
    NS_DispatchToMainThread(new Runnable("BeforeProcessTask"));
  }
}

void CycleCollectedJSContext::AfterProcessTask(uint32_t aRecursionDepth) {
  MOZ_ASSERT(mJSContext);

  // See HTML 6.1.4.2 Processing model

  // Step 4.1: Execute microtasks.
  PerformMicroTaskCheckPoint();

  // Step 4.2 Execute any events that were waiting for a stable state.
  ProcessStableStateQueue();

  // This should be a fast test so that it won't affect the next task
  // processing.
  MaybePokeGC();

  mRuntime->FinalizeDeferredThings(CycleCollectedJSRuntime::FinalizeNow);
  nsCycleCollector_maybeDoDeferredDeletion();
}

void CycleCollectedJSContext::AfterProcessMicrotasks() {
  MOZ_ASSERT(mJSContext);
  // Notify unhandled promise rejections:
  // https://html.spec.whatwg.org/multipage/webappapis.html#notify-about-rejected-promises
  if (mAboutToBeNotifiedRejectedPromises.Length()) {
    RefPtr<NotifyUnhandledRejections> runnable = new NotifyUnhandledRejections(
        std::move(mAboutToBeNotifiedRejectedPromises));
    NS_DispatchToCurrentThread(runnable);
  }
  // Cleanup Indexed Database transactions:
  // https://html.spec.whatwg.org/multipage/webappapis.html#perform-a-microtask-checkpoint
  CleanupIDBTransactions(RecursionDepth());

  // Clear kept alive objects in JS WeakRef.
  // https://whatpr.org/html/4571/webappapis.html#perform-a-microtask-checkpoint
  //
  // ECMAScript implementations are expected to call ClearKeptObjects when
  // a synchronous sequence of ECMAScript execution completes.
  //
  // https://tc39.es/proposal-weakrefs/#sec-clear-kept-objects
  JS::ClearKeptObjects(mJSContext);
}

void CycleCollectedJSContext::MaybePokeGC() {
  // Worker-compatible check to see if we want to do an idle-time minor
  // GC.
  class IdleTimeGCTaskRunnable : public mozilla::IdleRunnable {
   public:
    using mozilla::IdleRunnable::IdleRunnable;

   public:
    IdleTimeGCTaskRunnable() : IdleRunnable("IdleTimeGCTask") {}

    NS_IMETHOD Run() override {
      CycleCollectedJSRuntime* ccrt = CycleCollectedJSRuntime::Get();
      if (ccrt) {
        ccrt->RunIdleTimeGCTask();
      }
      return NS_OK;
    }
  };

  if (Runtime()->IsIdleGCTaskNeeded()) {
    nsCOMPtr<nsIRunnable> gc_task = new IdleTimeGCTaskRunnable();
    NS_DispatchToCurrentThreadQueue(gc_task.forget(), EventQueuePriority::Idle);
    Runtime()->SetPendingIdleGCTask();
  }
}

uint32_t CycleCollectedJSContext::RecursionDepth() const {
  // Debugger interruptions are included in the recursion depth so that debugger
  // microtask checkpoints do not run IDB transactions which were initiated
  // before the interruption.
  return mOwningThread->RecursionDepth() + mDebuggerRecursionDepth;
}

void CycleCollectedJSContext::RunInStableState(
    already_AddRefed<nsIRunnable>&& aRunnable) {
  MOZ_ASSERT(mJSContext);
  nsCOMPtr<nsIRunnable> runnable = std::move(aRunnable);
  PROFILER_MARKER("CycleCollectedJSContext::RunInStableState", OTHER, {},
                  FlowMarker, Flow::FromPointer(runnable.get()));
  mStableStateEvents.AppendElement(std::move(runnable));
}

void CycleCollectedJSContext::AddPendingIDBTransaction(
    already_AddRefed<nsIRunnable>&& aTransaction) {
  MOZ_ASSERT(mJSContext);

  PendingIDBTransactionData data;
  data.mTransaction = aTransaction;

  MOZ_ASSERT(mOwningThread);
  data.mRecursionDepth = RecursionDepth();

  // There must be an event running to get here.
#ifndef MOZ_WIDGET_COCOA
  MOZ_ASSERT(data.mRecursionDepth > mBaseRecursionDepth);
#else
  // XXX bug 1261143
  // Recursion depth should be greater than mBaseRecursionDepth,
  // or the runnable will stay in the queue forever.
  if (data.mRecursionDepth <= mBaseRecursionDepth) {
    data.mRecursionDepth = mBaseRecursionDepth + 1;
  }
#endif

  mPendingIDBTransactions.AppendElement(std::move(data));
}

// MicroTaskRunnables and the JS MicroTask Queue:
//
// The following describes our refcounting scheme:
//
// - A runnable wrapped in a JS::Value (RunnableToValue) is always created from
// an already_AddRefed (so has a positive refcount) and it holds onto that ref
// count until it is finally eventually unwrapped to an owning reference
// (MaybeUnwrapTaskToOwnedRunnable)
//
// - This means runnables in the queue have their refcounts stay above zero for
// the duration of the time they are in the queue.
JS::GenericMicroTask RunnableToMicroTask(
    already_AddRefed<MicroTaskRunnable>& aRunnable) {
  JS::GenericMicroTask v;
  auto* r = aRunnable.take();
  MOZ_ASSERT(r);
  v.setPrivate(r);
  return v;
}

bool EnqueueMicroTask(JSContext* aCx,
                      already_AddRefed<MicroTaskRunnable> aRunnable) {
  JS::GenericMicroTask v = RunnableToMicroTask(aRunnable);
  return JS::EnqueueMicroTask(aCx, v);
}
bool EnqueueDebugMicroTask(JSContext* aCx,
                           already_AddRefed<MicroTaskRunnable> aRunnable) {
  JS::GenericMicroTask v = RunnableToMicroTask(aRunnable);
  return JS::EnqueueDebugMicroTask(aCx, v);
}

void CycleCollectedJSContext::DispatchToMicroTask(
    already_AddRefed<MicroTaskRunnable> aRunnable) {
  RefPtr<MicroTaskRunnable> runnable(aRunnable);
  MOZ_ASSERT(NS_IsMainThread());

  JS::JobQueueMayNotBeEmpty(Context());
  PROFILER_MARKER_FLOW_ONLY("CycleCollectedJSContext::DispatchToMicroTask",
                            OTHER, {}, FlowMarker,
                            Flow::FromPointer(runnable.get()));

  LogMicroTaskRunnable::LogDispatch(runnable.get());
  EnqueueMicroTask(Context(), runnable.forget());
}

class AsyncMutationHandler final : public mozilla::Runnable {
 public:
  AsyncMutationHandler() : mozilla::Runnable("AsyncMutationHandler") {}

  // MOZ_CAN_RUN_SCRIPT_BOUNDARY until Runnable::Run is MOZ_CAN_RUN_SCRIPT.  See
  // bug 1535398.
  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  NS_IMETHOD Run() override {
    CycleCollectedJSContext* ccjs = CycleCollectedJSContext::Get();
    if (ccjs) {
      ccjs->PerformMicroTaskCheckPoint();
    }
    return NS_OK;
  }
};

LazyLogModule gLog("mtq");

SuppressedMicroTaskList::SuppressedMicroTaskList(
    CycleCollectedJSContext* aContext)
    : mContext(aContext),
      mSuppressionGeneration(aContext->mSuppressionGeneration),
      mSuppressedMicroTaskRunnables(aContext->Context(), aContext->Context()) {}

bool SuppressedMicroTaskList::Suppressed() {
  if (mSuppressionGeneration == mContext->mSuppressionGeneration) {
    return true;
  }

  MOZ_ASSERT(mContext->mSuppressedMicroTaskList == this);

  MOZ_LOG_FMT(gLog, LogLevel::Verbose, "Prepending %zu suppressed microtasks",
              mSuppressedMicroTaskRunnables.get().length());
  for (size_t i = mSuppressedMicroTaskRunnables.get().length(); i > 0; i--) {
    mSuppressedMicroTaskRunnables.get()[i - 1].ConsumeByPrependToQueue(
        mContext->Context());
  }

  mSuppressedMicroTaskRunnables.get().clear();

  mContext->mSuppressedMicroTaskList = nullptr;

  // Return false: We are -not- ourselves suppressed, so,
  // in PerformMicroTasks we will end up in the branch where
  // we can drop the final refcount.
  return false;
}

SuppressedMicroTaskList::~SuppressedMicroTaskList() {
  MOZ_ASSERT(mContext->mSuppressedMicroTaskList == nullptr);
  MOZ_ASSERT(mSuppressedMicroTaskRunnables.get().empty());
};

// Run a microtask. Handles both non-JS (enqueued MicroTaskRunnables) and JS
// microtasks.
static void MOZ_CAN_RUN_SCRIPT RunMicroTask(
    JSContext* aCx, JS::MutableHandle<MustConsumeMicroTask> aMicroTask) {
  LogMustConsumeMicroTask::Run log(&aMicroTask.get());

  if (RefPtr<MicroTaskRunnable> runnable =
          aMicroTask.get().MaybeConsumeAsOwnedRunnable()) {
    AUTO_PROFILER_TERMINATING_FLOW_MARKER_FLOW_ONLY(
        "RunMicroTaskRunnable", OTHER, Flow::FromPointer(runnable.get()));
    AutoSlowOperation aso;
    runnable->Run(aso);
    return;
  }

  // After this point, if we fail to run, we
  //
  // 1. Know we have JS microtask
  // 2. Can freely ignore it if we cannot execute it.
  //
  // Create a ScopeExit to handle this.
  auto ignoreMicroTasks = mozilla::MakeScopeExit(
      [&aMicroTask]() { aMicroTask.get().IgnoreJSMicroTask(); });

  // Avoid the overhead of GetFlowIdFromJSMicroTask in the common case
  // of not having the profiler enabled.
  mozilla::Maybe<AutoProfilerTerminatingFlowMarkerFlowOnly> terminatingMarker;
  if (profiler_is_active_and_unpaused() &&
      profiler_feature_active(ProfilerFeature::Flows)) {
    uint64_t flowId = 0;
    // Since this only returns false when the microtask won't run (dead wrapper)
    // we can elide the marker if it does fail.
    if (aMicroTask.get().GetFlowIdFromJSMicroTask(&flowId)) {
      terminatingMarker.emplace("RunMicroTask",
                                mozilla::baseprofiler::category::OTHER,
                                Flow::ProcessScoped(flowId));
    }
  }

  JS::Rooted<JSObject*> maybePromise(
      aCx, aMicroTask.get().MaybeGetPromiseFromJSMicroTask());
  auto state = maybePromise
                   ? JS::GetPromiseUserInputEventHandlingState(maybePromise)
                   : JS::PromiseUserInputEventHandlingState::DontCare;
  bool propagate =
      state ==
      JS::PromiseUserInputEventHandlingState::HadUserInteractionAtCreation;
  AutoHandlingUserInputStatePusher userInputStateSwitcher(propagate);

  JS::RootedTuple<JSObject*, JSObject*, JSObject*> roots(aCx);

  JS::RootedField<JSObject*, 0> callbackGlobal(
      roots, aMicroTask.get().GetExecutionGlobalFromJSMicroTask(aCx));
  if (!callbackGlobal) {
    return;
  }
  JS::RootedField<JSObject*, 1> hostDefinedData(roots);
  JS::RootedField<JSObject*, 2> allocStack(roots);

  // Don't run if we fail to unwrap the host defined data.
  if (!aMicroTask.get().MaybeGetHostDefinedDataFromJSMicroTask(
          &hostDefinedData)) {
    return;
  }

  // We do however still need to run if we can't unwrap the stack
  (void)aMicroTask.get().MaybeGetAllocationSiteFromJSMicroTask(&allocStack);

  nsIGlobalObject* incumbentGlobal = nullptr;

  WebTaskSchedulingState* schedulingState = nullptr;
  if (hostDefinedData) {
    MOZ_RELEASE_ASSERT(JS::GetClass(hostDefinedData.get()) ==
                       &sHostDefinedDataClass);
    JS::Value incumbentGlobalVal =
        JS::GetReservedSlot(hostDefinedData, INCUMBENT_SETTING_SLOT);
    // hostDefinedData is only created when incumbent global exists.
    MOZ_ASSERT(incumbentGlobalVal.isObject());
    incumbentGlobal = xpc::NativeGlobal(&incumbentGlobalVal.toObject());

    JS::Value state =
        JS::GetReservedSlot(hostDefinedData, SCHEDULING_STATE_SLOT);
    if (!state.isUndefined()) {
      schedulingState = static_cast<WebTaskSchedulingState*>(state.toPrivate());
    }
  } else {
    // There are two possible causes for hostDefinedData to be missing.
    //   1. It's optimized out, the SpiderMonkey expects the embedding to
    //   retrieve it on their own.
    //   2. It's the special case for debugger usage.
    //
    // MG:XXX: The handling of incumbent global can be made appreciably more
    // harmonious through co-evolution with the JS engine, but I have tried to
    // avoid doing too much divergence for now.
    JSObject* incumbentGlobalJS =
        aMicroTask.get().MaybeGetHostDefinedGlobalFromJSMicroTask();
    MOZ_ASSERT_IF(incumbentGlobalJS, !js::IsWrapper(incumbentGlobalJS));
    if (incumbentGlobalJS) {
      incumbentGlobal = xpc::NativeGlobal(incumbentGlobalJS);
    }
  }

  if (incumbentGlobal) {
    // https://wicg.github.io/scheduling-apis/#sec-patches-html-hostcalljobcallback
    // 2. Set event loop’s current scheduling state to
    // callback.[[HostDefined]].[[SchedulingState]].
    incumbentGlobal->SetWebTaskSchedulingState(schedulingState);
  }

  // MG:XXX: It would be worth revisiting the design of CallSetup here to try
  // and reduce JS microtask overheads that turn out to be superflous. For
  // example, in at least some circumstances we end up having multiple realm
  // changes here that don't need to happen.
  //
  // Similarly, IgnoredErrorResult!
  IgnoredErrorResult rv;
  CallSetup setup(callbackGlobal, incumbentGlobal, allocStack, rv,
                  "promise callback" /* Some tests care about this string. */,
                  dom::CallbackObject::eReportExceptions);
  if (!setup.GetContext()) {
    return;
  }

  // At this point we will definitely consume the task, so we
  // no longer need the scope exit.
  ignoreMicroTasks.release();

  // Note: We're dropping the return value on the floor here, however
  // cleanup and exception handling are done as part of the CallSetup
  // destructor if necessary.
  (void)aMicroTask.get().RunAndConsumeJSMicroTask(aCx);

  // (The step after step 7): Set event loop’s current scheduling
  // state to null
  if (incumbentGlobal) {
    incumbentGlobal->SetWebTaskSchedulingState(nullptr);
  }
}

MustConsumeMicroTask DequeueNextMicroTask(JSContext* aCx) {
  return MustConsumeMicroTask(JS::DequeueNextMicroTask(aCx));
}

MustConsumeMicroTask DequeueNextRegularMicroTask(JSContext* aCx) {
  return MustConsumeMicroTask(JS::DequeueNextRegularMicroTask(aCx));
}

MustConsumeMicroTask DequeueNextDebuggerMicroTask(JSContext* aCx) {
  return MustConsumeMicroTask(JS::DequeueNextDebuggerMicroTask(aCx));
}

static bool IsSuppressed(JSContext* aCx,
                         JS::Handle<MustConsumeMicroTask> task) {
  if (task.get().IsJSMicroTask()) {
    JSObject* jsGlobal = task.get().GetExecutionGlobalFromJSMicroTask(aCx);
    if (!jsGlobal) {
      return false;
    }
    nsIGlobalObject* global = xpc::NativeGlobal(jsGlobal);
    return global && global->IsInSyncOperation();
  }

  MicroTaskRunnable* runnable = task.get().MaybeUnwrapTaskToRunnable();

  // If it's not a JS microtask, it must be a MicroTaskRunnable,
  // and so MaybeUnwrapTaskToRunnable must return non-null.
  MOZ_ASSERT(runnable, "Unexpected task type");

  return runnable->Suppressed();
}

bool CycleCollectedJSContext::PerformMicroTaskCheckPoint(bool aForce) {
  MOZ_LOG_FMT(gLog, LogLevel::Verbose, "Called PerformMicroTaskCheckpoint");

  JSContext* cx = Context();

  // If we have no JSContext we are not capable of checking for
  // nor running microtasks, and so simply return false early here.
  if (!cx) {
    return false;
  }

  if (!JS::HasAnyMicroTasks(cx)) {
    // Nothing to do, return early.
    AfterProcessMicrotasks();
    return false;
  }

  uint32_t currentDepth = RecursionDepth();
  if (mMicroTaskRecursionDepth && *mMicroTaskRecursionDepth >= currentDepth &&
      !aForce) {
    // We are already executing microtasks for the current recursion depth.
    return false;
  }

  if (mTargetedMicroTaskRecursionDepth != 0 &&
      mTargetedMicroTaskRecursionDepth + mDebuggerRecursionDepth !=
          currentDepth) {
    return false;
  }

  if (NS_IsMainThread() && !nsContentUtils::IsSafeToRunScript()) {
    // Special case for main thread where DOM mutations may happen when
    // it is not safe to run scripts.
    nsContentUtils::AddScriptRunner(new AsyncMutationHandler());
    return false;
  }

  mozilla::AutoRestore<Maybe<uint32_t>> restore(mMicroTaskRecursionDepth);
  mMicroTaskRecursionDepth = Some(currentDepth);

  AUTO_PROFILER_MARKER("Perform microtasks", JS);

  bool didProcess = false;
  AutoSlowOperation aso;

  // Make sure we don't leak tasks into the Gecko MicroTask queues.
  JS::Rooted<MustConsumeMicroTask> job(cx);
  while (JS::HasAnyMicroTasks(cx)) {
    job.set(DequeueNextMicroTask(cx));

    // To avoid us accidentally re-enqueing a SuppressionMicroTaskList in
    // itself, we determine here if the job is actually the suppression task
    // list.
    bool isSuppressionJob =
        mSuppressedMicroTaskList
            ? job.get().MaybeUnwrapTaskToRunnable() == mSuppressedMicroTaskList
            : false;

    // No need to check Suppressed if there aren't ongoing sync operations nor
    // pending mSuppressedMicroTasks.s
    if ((IsInSyncOperation() || mSuppressedMicroTaskList) &&
        IsSuppressed(cx, job)) {
      // Microtasks in worker shall never be suppressed.
      // Otherwise, the micro tasks queue will be replaced later with
      // all suppressed tasks in mDebuggerMicroTaskQueue unexpectedly.
      MOZ_ASSERT(NS_IsMainThread());
      JS::JobQueueMayNotBeEmpty(Context());

      // To avoid re-enqueing a suppressed SuppressionMicroTaskList in itself.
      if (!isSuppressionJob) {
        if (!mSuppressedMicroTaskList) {
          mSuppressedMicroTaskList = new SuppressedMicroTaskList(this);
        }

        mSuppressedMicroTaskList->mSuppressedMicroTaskRunnables.get().append(
            std::move(job.get()));
      } else {
        // Consume the runnable & simultaneously drop a ref count.
        RefPtr<MicroTaskRunnable> refToDrop(
            job.get().MaybeConsumeAsOwnedRunnable());
        MOZ_ASSERT(refToDrop);
      }
    } else {
      // MG:XXX: It's sort of too bad that we can't handle the JobQueueIsEmpty
      // note entirely within the JS engine, but in order to do that we'd need
      // to move the suppressed micro task handling inside and that's more
      // divergence than I would like.
      if (!JS::HasAnyMicroTasks(cx) && !mSuppressedMicroTaskList) {
        JS::JobQueueIsEmpty(Context());
      }
      didProcess = true;

      RunMicroTask(cx, &job);
    }
  }

  // Put back the suppressed microtasks so that they will be run later.
  // Note, it is possible that we end up keeping these suppressed tasks around
  // for some time, but no longer than spinning the event loop nestedly
  // (sync XHR, alert, etc.)
  if (mSuppressedMicroTaskList) {
    // Like everywhere else, do_AddRef when enqueing. Then the refcount in the
    // queue is 2; when ->Suppressed is called, mSuppressedMicroTaskList will
    // be nulled out, dropping the refcount to 1, then when the conversion to
    // owned happens, inside of RunMicroTask, the remaining ref will be
    // dropped, and the code will be cleaned up.
    //
    // This should work generally, as if you re-enqueue the task list (we have
    // no code to prevent this!) you'll just have more refs in the queue,
    // all of which is good.
    if (!EnqueueMicroTask(cx, do_AddRef(mSuppressedMicroTaskList))) {
      MOZ_CRASH("Failed to re-enqueue suppressed microtask list");
    }
  }

  AfterProcessMicrotasks();

  return didProcess;
}

void CycleCollectedJSContext::PerformDebuggerMicroTaskCheckpoint() {
  // Don't do normal microtask handling checks here, since whoever is calling
  // this method is supposed to know what they are doing.

  JSContext* cx = Context();

  JS::Rooted<MustConsumeMicroTask> job(cx);
  while (JS::HasDebuggerMicroTasks(cx)) {
    job.set(DequeueNextDebuggerMicroTask(cx));

    // MG:XXX: Need to add a JS::JobQueueIsEmpty call here.

    RunMicroTask(cx, &job);
  }

  AfterProcessMicrotasks();
}

NS_IMETHODIMP CycleCollectedJSContext::NotifyUnhandledRejections::Run() {
  for (size_t i = 0; i < mUnhandledRejections.Length(); ++i) {
    CycleCollectedJSContext* cccx = CycleCollectedJSContext::Get();
    NS_ENSURE_STATE(cccx);

    RefPtr<Promise>& promise = mUnhandledRejections[i];
    if (!promise) {
      continue;
    }

    JS::RootingContext* cx = cccx->RootingCx();
    JS::RootedObject promiseObj(cx, promise->PromiseObj());
    MOZ_ASSERT(JS::IsPromiseObject(promiseObj));

    // Only fire unhandledrejection if the promise is still not handled;
    uint64_t promiseID = JS::GetPromiseID(promiseObj);
    if (!JS::GetPromiseIsHandled(promiseObj)) {
      if (nsCOMPtr<EventTarget> target =
              do_QueryInterface(promise->GetParentObject())) {
        RootedDictionary<PromiseRejectionEventInit> init(cx);
        init.mPromise = promiseObj;
        init.mReason = JS::GetPromiseResult(promiseObj);
        init.mCancelable = true;

        RefPtr<PromiseRejectionEvent> event =
            PromiseRejectionEvent::Constructor(target, u"unhandledrejection"_ns,
                                               init);
        // We don't use the result of dispatching event here to check whether
        // to report the Promise to console.
        target->DispatchEvent(*event);
      }
    }

    cccx = CycleCollectedJSContext::Get();
    NS_ENSURE_STATE(cccx);
    if (!JS::GetPromiseIsHandled(promiseObj)) {
      DebugOnly<bool> isFound =
          cccx->mPendingUnhandledRejections.Remove(promiseID);
      MOZ_ASSERT(isFound);
    }

    // If a rejected promise is being handled in "unhandledrejection" event
    // handler, it should be removed from the table in
    // PromiseRejectionTrackerCallback.
    MOZ_ASSERT(!cccx->mPendingUnhandledRejections.Lookup(promiseID));
  }
  return NS_OK;
}

nsresult CycleCollectedJSContext::NotifyUnhandledRejections::Cancel() {
  CycleCollectedJSContext* cccx = CycleCollectedJSContext::Get();
  NS_ENSURE_STATE(cccx);

  for (size_t i = 0; i < mUnhandledRejections.Length(); ++i) {
    RefPtr<Promise>& promise = mUnhandledRejections[i];
    if (!promise) {
      continue;
    }

    JS::RootedObject promiseObj(cccx->RootingCx(), promise->PromiseObj());
    cccx->mPendingUnhandledRejections.Remove(JS::GetPromiseID(promiseObj));
  }
  return NS_OK;
}

#ifdef MOZ_EXECUTION_TRACING

void CycleCollectedJSContext::BeginExecutionTracingAsync() {
  mOwningThread->Dispatch(NS_NewRunnableFunction(
      "CycleCollectedJSContext::BeginExecutionTracingAsync", [] {
        CycleCollectedJSContext* ccjs = CycleCollectedJSContext::Get();
        if (ccjs) {
          JS_TracerBeginTracing(ccjs->Context());
        }
      }));
}

void CycleCollectedJSContext::EndExecutionTracingAsync() {
  mOwningThread->Dispatch(NS_NewRunnableFunction(
      "CycleCollectedJSContext::EndExecutionTracingAsync", [] {
        CycleCollectedJSContext* ccjs = CycleCollectedJSContext::Get();
        if (ccjs) {
          JS_TracerEndTracing(ccjs->Context());
        }
      }));
}

#else

void CycleCollectedJSContext::BeginExecutionTracingAsync() {}
void CycleCollectedJSContext::EndExecutionTracingAsync() {}

#endif

class FinalizationRegistryCleanup::CleanupRunnable
    : public DiscardableRunnable {
 public:
  explicit CleanupRunnable(FinalizationRegistryCleanup* aCleanupWork)
      : DiscardableRunnable("CleanupRunnable"), mCleanupWork(aCleanupWork) {}

  // MOZ_CAN_RUN_SCRIPT_BOUNDARY until Runnable::Run is MOZ_CAN_RUN_SCRIPT.  See
  // bug 1535398.
  MOZ_CAN_RUN_SCRIPT_BOUNDARY
  NS_IMETHOD Run() override {
    mCleanupWork->DoCleanup();
    return NS_OK;
  }

 private:
  FinalizationRegistryCleanup* mCleanupWork;
};

FinalizationRegistryCleanup::FinalizationRegistryCleanup(
    CycleCollectedJSContext* aContext)
    : mContext(aContext) {}

void FinalizationRegistryCleanup::Destroy() {
  // This must happen before the CycleCollectedJSContext destructor calls
  // JS_DestroyContext().
  mCallbacks.reset();
}

void FinalizationRegistryCleanup::Init() {
  JSContext* cx = mContext->Context();
  mCallbacks.init(cx);
  JS::SetHostCleanupFinalizationRegistryCallback(cx, QueueCallback, this);
}

/* static */
void FinalizationRegistryCleanup::QueueCallback(JSFunction* aDoCleanup,
                                                JSObject* aHostDefinedData,
                                                void* aData) {
  FinalizationRegistryCleanup* cleanup =
      static_cast<FinalizationRegistryCleanup*>(aData);
  cleanup->QueueCallback(aDoCleanup, aHostDefinedData);
}

void FinalizationRegistryCleanup::QueueCallback(JSFunction* aDoCleanup,
                                                JSObject* aHostDefinedData) {
  bool firstCallback = mCallbacks.empty();

  JSObject* incumbentGlobal = nullptr;

  // Extract incumbentGlobal from aHostDefinedData.
  if (aHostDefinedData) {
    MOZ_RELEASE_ASSERT(JS::GetClass(aHostDefinedData) ==
                       &sHostDefinedDataClass);
    JS::Value global =
        JS::GetReservedSlot(aHostDefinedData, INCUMBENT_SETTING_SLOT);
    incumbentGlobal = &global.toObject();
  }

  MOZ_ALWAYS_TRUE(mCallbacks.append(Callback{aDoCleanup, incumbentGlobal}));

  if (firstCallback) {
    RefPtr<CleanupRunnable> cleanup = new CleanupRunnable(this);
    NS_DispatchToCurrentThread(cleanup.forget());
  }
}

void FinalizationRegistryCleanup::DoCleanup() {
  if (mCallbacks.empty()) {
    return;
  }

  JS::RootingContext* cx = mContext->RootingCx();

  JS::Rooted<CallbackVector> callbacks(cx);
  std::swap(callbacks.get(), mCallbacks.get());

  for (const Callback& callback : callbacks) {
    JS::ExposeObjectToActiveJS(
        JS_GetFunctionObject(callback.mCallbackFunction));
    JS::ExposeObjectToActiveJS(callback.mIncumbentGlobal);

    JS::RootedObject functionObj(
        cx, JS_GetFunctionObject(callback.mCallbackFunction));
    JS::RootedObject globalObj(cx, JS::GetNonCCWObjectGlobal(functionObj));

    nsIGlobalObject* incumbentGlobal =
        xpc::NativeGlobal(callback.mIncumbentGlobal);
    if (!incumbentGlobal) {
      continue;
    }

    RefPtr<FinalizationRegistryCleanupCallback> cleanupCallback(
        new FinalizationRegistryCleanupCallback(functionObj, globalObj, nullptr,
                                                incumbentGlobal));

    nsIGlobalObject* global =
        xpc::NativeGlobal(cleanupCallback->CallbackPreserveColor());
    if (global) {
      cleanupCallback->Call("FinalizationRegistryCleanup::DoCleanup");
    }
  }
}

void FinalizationRegistryCleanup::Callback::trace(JSTracer* trc) {
  JS::TraceRoot(trc, &mCallbackFunction, "mCallbackFunction");
  JS::TraceRoot(trc, &mIncumbentGlobal, "mIncumbentGlobal");
}

}  // namespace mozilla

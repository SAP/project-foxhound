/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "LlamaRunner.h"

#include "mozilla/dom/LlamaRunnerBinding.h"
#include "mozilla/dom/quota/QuotaCommon.h"
#include "nsCOMPtr.h"
#include "nsDebug.h"
#include "nsIEventTarget.h"
#include "nsIFileStreams.h"
#include "nsINode.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"
#include "nsXPCOM.h"
#include "prsystem.h"
#include "mozilla/Casting.h"
#include <cstddef>
#include "mozilla/dom/Promise.h"

#include "mozilla/dom/ReadableStream.h"
#include "mozilla/dom/ReadableStreamDefaultController.h"
#include "mozilla/dom/UnderlyingSourceCallbackHelpers.h"

#include "nsIFileStreams.h"

#include "nsThreadUtils.h"
#include "mozilla/RefPtr.h"
#include "nsIThread.h"
#include "nsError.h"
#include "mozilla/dom/ContentChild.h"

#include "mozilla/llama/LlamaBackend.h"
#include "mozilla/Logging.h"
#include "nsThread.h"
#include "nsThreadManager.h"
#include "mozilla/ThreadEventQueue.h"
#include "mozilla/dom/Promise-inl.h"
#include "nsQueryObject.h"
#include "private/pprio.h"

#ifdef XP_WIN
#  include <fcntl.h>
#endif

mozilla::LazyLogModule gLlamaRunnerLog("GeckoMLLlamaRunnerNative");

#define LOGV_RUNNER(fmt, ...) \
  MOZ_LOG_FMT(gLlamaRunnerLog, LogLevel::Verbose, fmt, ##__VA_ARGS__)

#define LOGD_RUNNER(fmt, ...) \
  MOZ_LOG_FMT(gLlamaRunnerLog, LogLevel::Debug, fmt, ##__VA_ARGS__)

#define LOGE_RUNNER(fmt, ...) \
  MOZ_LOG_FMT(gLlamaRunnerLog, LogLevel::Error, fmt, ##__VA_ARGS__)

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_INHERITED(LlamaStreamSource,
                                   UnderlyingSourceAlgorithmsWrapper, mTask,
                                   mOriginalEventTarget, mControllerStream,
                                   mGenerateThread)
NS_IMPL_ADDREF_INHERITED(LlamaStreamSource, UnderlyingSourceAlgorithmsWrapper)
NS_IMPL_RELEASE_INHERITED(LlamaStreamSource, UnderlyingSourceAlgorithmsWrapper)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(LlamaStreamSource)
NS_INTERFACE_MAP_END_INHERITING(UnderlyingSourceAlgorithmsWrapper)

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(LlamaRunner, mStreamSource, mGlobal)
NS_IMPL_CYCLE_COLLECTING_ADDREF(LlamaRunner)
NS_IMPL_CYCLE_COLLECTING_RELEASE(LlamaRunner)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(LlamaRunner)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

}  // namespace mozilla::dom

namespace mozilla::llama {

// Constructed with strong ownership of the backend (RefPtr),
// and a weak reference to the stream to avoid keeping it alive.
LlamaGenerateTask::LlamaGenerateTask(RefPtr<LlamaBackend> aBackend,
                                     const LlamaChatOptions& aOptions)
    : CancelableRunnable("LlamaGenerateTask"),
      mBackend(std::move(aBackend)),
      mChatOptions(aOptions),
      mMessagesQueue(5) {}

LlamaGenerateTask::~LlamaGenerateTask() {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
}

nsresult LlamaGenerateTask::Run() {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  mState = TaskState::Running;
  mozilla::dom::LlamaChatResponse response;

  // Used by the backend to check cancellation status during generation.
  auto cancelCallback = [&state = mState]() -> bool {
    return state == TaskState::Cancelled;
  };

  // Called by the backend each time new tokens are generated.
  auto tokenCallback =
      [&response, bufSize = mChatOptions.mMinOutputBufferSize, self = this](
          const mozilla::dom::LlamaChatResponse& chunk) -> ResultStatus {
    LOGV_RUNNER("Entered {}", __PRETTY_FUNCTION__);
    // Flush if phase has changed
    if ((response.mPhase != chunk.mPhase) && !response.mTokens.IsEmpty()) {
      LOGV_RUNNER("{}: Pushing completed chunk", __PRETTY_FUNCTION__);
      // Push the completed chunk
      if (MOZ_LIKELY(self->PushMessage(mozilla::Some(response)))) {
        //  Reset for next chunk
        response = mozilla::dom::LlamaChatResponse();
      } else {
        nsFmtCString msg("{}: fatal error: the message queue is full",
                         __PRETTY_FUNCTION__);
        LOGE_RUNNER("{}", msg);
        // graceful termination
        return mozilla::Err(Error{msg});
      }
    }

    response.mPiece.Append(chunk.mPiece);
    auto out =
        response.mTokens.AppendElements(chunk.mTokens, mozilla::fallible);
    if (!out) {
      auto msg = nsFmtCString("{}: Unable to append message to the response",
                              __PRETTY_FUNCTION__);
      LOGE_RUNNER("{}", msg);
      return mozilla::Err(Error{msg});
    }

    response.mPhase = chunk.mPhase;
    response.mIsPhaseCompleted = chunk.mIsPhaseCompleted;

    // Flush if buffer is full or phase is complete
    if ((response.mTokens.Length() >= mozilla::AssertedCast<size_t>(bufSize)) ||
        response.mIsPhaseCompleted) {
      LOGV_RUNNER("{}: Pushing completed chunk", __PRETTY_FUNCTION__);

      if (self->MaybePushMessage(mozilla::Some(response))) {
        // Push the completed chunk to the stream source
        // Reset for next chunk
        response = mozilla::dom::LlamaChatResponse();
      }
    }

    LOGV_RUNNER("Exiting {}", __PRETTY_FUNCTION__);

    return mozilla::Ok();
  };

  // Start generation using provided callbacks
  auto result = mBackend->Generate(mChatOptions, tokenCallback, cancelCallback);

  // Generation done, clearing backend
  mBackend = nullptr;

  // Notify stream source of failure
  if (result.isErr()) {
    LOGE_RUNNER("{} Error during generation {}", __PRETTY_FUNCTION__,
                result.inspectErr().mMessage);

    mErrorMessage = result.inspectErr().mMessage;
    mState = TaskState::CompletedFailure;

    return NS_ERROR_FAILURE;
  }

  // Notify completion (nullopt signals end of stream)
  LOGV_RUNNER("{}: Indicating completed status", __PRETTY_FUNCTION__);

  if (MOZ_UNLIKELY(!PushMessage(mozilla::Nothing()))) {
    auto msg = nsFmtCString(
        "{}: Fatal error: Unable to indicate "
        "completion status as the queue is full",
        __PRETTY_FUNCTION__);
    LOGE_RUNNER("{}", msg);

    mErrorMessage = msg;
    mState = TaskState::CompletedFailure;
  }

  LOGV_RUNNER("{} LlamaGenerateTask Completed.", __PRETTY_FUNCTION__);
  mState = TaskState::CompletedSuccess;
  return NS_OK;
}

nsresult LlamaGenerateTask::Cancel() {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  if (mState == TaskState::Idle || mState == TaskState::Running) {
    mState = TaskState::Cancelled;
    LOGD_RUNNER("{}: Cancellation signal set", __PRETTY_FUNCTION__);
  } else {
    LOGD_RUNNER("{}: Task is already completed or cancelled. Not re-cancelling",
                __PRETTY_FUNCTION__);
  }

  return NS_OK;
}

bool LlamaGenerateTask::PushMessage(
    mozilla::Maybe<LlamaChatResponse> aMessage) {
  LOGV_RUNNER("Entered {}", __PRETTY_FUNCTION__);

  if (MaybePushMessage(aMessage)) {
    return true;
  }

  auto numEnqueued = mMessagesQueue.Enqueue(aMessage);

  LOGV_RUNNER("Exited {}", __PRETTY_FUNCTION__);

  return numEnqueued > 0;
}

bool LlamaGenerateTask::MaybePushMessage(
    mozilla::Maybe<LlamaChatResponse> aMessage) {
  LOGV_RUNNER("Entered {}", __PRETTY_FUNCTION__);

  // One producer (thread this function is running from), one consumer thread.

  // If No one is waiting, then do nothing
  if (mHasPendingConsumer) {
    // A consumer is waiting. Resolve its pending promise using a message:
    // - Prefer an already queued message if available
    // - Otherwise, use the incoming one
    // To eliminate a rare race condition (where the consumer may request
    // a new promise before we finish resolving the current one), we *first*
    // switch to the next promise holder index, then resolve the current one.
    // This guarantees the consumer will always use a fresh, unfulfilled
    // promise.

    // First resolve with any existing message in the queue
    mozilla::Maybe<LlamaChatResponse> existingMessage;

    mozilla::Maybe<LlamaChatResponse> messageToResolve;

    // Indicate the thread we are now reading from
    mMessagesQueue.ResetConsumerThreadId();

    if (mMessagesQueue.Dequeue(&existingMessage, 1)) {
      messageToResolve = std::move(existingMessage);
      // We've consumed one from the queue, so there should be space to enqueue
      // the new one
      auto numEnqueued = mMessagesQueue.Enqueue(aMessage);
      if (MOZ_UNLIKELY(!numEnqueued)) {
        auto msg = nsFmtCString(
            "{}: LlamaGenerateTask::PushMessage failed: queue is full when "
            "it shoudn't",
            __PRETTY_FUNCTION__);
        LOGE_RUNNER("{}", msg);

        MOZ_ASSERT(false,
                   "LlamaGenerateTask::PushMessage failed: queue is full when "
                   "it shoudn't");
      }
    } else {
      messageToResolve = aMessage;
    }

    auto promiseHolderToResolveIdx = mCurrentPromiseHolderIdx;

    mCurrentPromiseHolderIdx ^= 1;  // toggles between 0 and 1
    mHasPendingConsumer = false;
    mPromiseHolders[promiseHolderToResolveIdx].Resolve(messageToResolve,
                                                       __func__);

    LOGV_RUNNER("Exited {} with message pushed", __PRETTY_FUNCTION__);

    return true;
  }

  LOGV_RUNNER("Exited {} with message not pushed", __PRETTY_FUNCTION__);
  return false;
}

RefPtr<LlamaGenerateTaskPromise> LlamaGenerateTask::GetMessage() {
  LOGV_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  if (mState == TaskState::CompletedFailure) {
    LOGE_RUNNER("{}: {}", __PRETTY_FUNCTION__, mErrorMessage);
    return LlamaGenerateTaskPromise::CreateAndReject(mErrorMessage, __func__);
  }
  mozilla::Maybe<LlamaChatResponse> message;
  // Indicate the thread we are now reading from.
  mMessagesQueue.ResetConsumerThreadId();
  if (mMessagesQueue.Dequeue(&message, 1)) {
    LOGV_RUNNER(
        "{}: A message is available immediately — resolve synchronously.",
        __PRETTY_FUNCTION__);
    return LlamaGenerateTaskPromise::CreateAndResolve(message, __func__);
  }

  LOGV_RUNNER("{}: Wait for message to be ready.", __PRETTY_FUNCTION__);
  // No message is ready. Create a pending promise holder and mark that
  // a consumer is now waiting. The producer will resolve this later.
  RefPtr<LlamaGenerateTaskPromise> promise =
      mPromiseHolders[mCurrentPromiseHolderIdx].Ensure(__func__);
  mHasPendingConsumer = true;

  return promise.forget();
}

}  // namespace mozilla::llama

namespace mozilla::dom {

LlamaStreamSource::LlamaStreamSource(nsIGlobalObject* aGlobal,
                                     RefPtr<LlamaBackend> aBackend,
                                     const LlamaChatOptions& aOptions)
    : GlobalTeardownObserver(aGlobal),
      mBackend(std::move(aBackend)),
      mChatOptions(aOptions) {
  LOGD_RUNNER("LlamaStreamSource created and bound to global");
}

void LlamaStreamSource::DisconnectFromOwner() {
  LOGD_RUNNER("DisconnectFromOwner called - worker is shutting down");
  ShutdownWorkerThread();
  GlobalTeardownObserver::DisconnectFromOwner();
}

void LlamaStreamSource::ShutdownWorkerThread() {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);

  if (mTask) {
    LOGD_RUNNER("{}: Cancelling the generation task", __PRETTY_FUNCTION__);
    mTask->Cancel();
    mTask = nullptr;
  }

  if (!mGenerateThread) {
    return;
  }

  LOGD_RUNNER("{}: Shutting down the generation thread asynchronously",
              __PRETTY_FUNCTION__);

  // Critical section: Properly coordinate async shutdown with WorkerRef.
  // When using AsyncShutdown(), we need to ensure the worker stays alive until
  // the thread is fully shut down. We do this by posting a final runnable to
  // the worker thread before calling AsyncShutdown(). That runnable will
  // execute after all pending work and post back to the original thread to
  // release the WorkerRef, ensuring the worker lives long enough for cleanup
  // to complete.
  if (mWorkerRef && mOriginalEventTarget) {
    RefPtr<ThreadSafeWorkerRef> workerRef = mWorkerRef;
    nsCOMPtr<nsISerialEventTarget> originalTarget = mOriginalEventTarget;

    // Post a final task to the worker thread that will run after all pending
    // work. This task posts back to the original thread to clear the WorkerRef.
    nsresult rv = mGenerateThread->Dispatch(
        NS_NewRunnableFunction(
            "LlamaStreamSource::ShutdownWorkerThread::ClearWorkerRef",
            [workerRef, originalTarget]() {
              LOGD_RUNNER(
                  "Worker thread is idle, posting back to original thread to "
                  "clear WorkerRef");
              // Post back to the original thread to clear the WorkerRef
              // This ensures the ref is released on the correct thread
              originalTarget->Dispatch(NS_NewRunnableFunction(
                  "LlamaStreamSource::ClearWorkerRefOnOriginalThread",
                  [workerRef]() {
                    LOGD_RUNNER(
                        "Releasing WorkerRef now that async shutdown is "
                        "complete");
                    // workerRef goes out of scope here, releasing the last
                    // reference
                  }));
            }),
        NS_DISPATCH_NORMAL);

    if (NS_FAILED(rv)) {
      LOGE_RUNNER(
          "{}: Failed to dispatch cleanup task, clearing WorkerRef immediately",
          __PRETTY_FUNCTION__);
      // If we can't dispatch the cleanup task, clear the ref now to avoid
      // blocking worker shutdown
      mWorkerRef = nullptr;
    } else {
      // Clear our reference to the WorkerRef now - the cleanup task holds
      // its own reference
      mWorkerRef = nullptr;
    }
  }

  mGenerateThread->AsyncShutdown();
  mGenerateThread = nullptr;

  LOGD_RUNNER("Exited {}", __PRETTY_FUNCTION__);
}

already_AddRefed<Promise> LlamaStreamSource::CancelCallbackImpl(
    JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
    ErrorResult& aRv) {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  ShutdownWorkerThread();
  LOGD_RUNNER("Exited {}", __PRETTY_FUNCTION__);
  return nullptr;
}

already_AddRefed<Promise> LlamaStreamSource::PullCallbackImpl(
    JSContext* aCx, ReadableStreamControllerBase& aController,
    ErrorResult& aRv) {
  LOGV_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  RefPtr<ReadableStream> controller = aController.Stream();

  // Create JS promise to signal when data becomes available
  RefPtr<Promise> promise = Promise::Create(controller->GetParentObject(), aRv);
  if (!promise) {
    auto msg =
        nsFmtCString("{} Unable to create promise for llama source stream",
                     __PRETTY_FUNCTION__);
    LOGE_RUNNER("{}", msg);
    // Cannot continue if promise creation failed
    aRv.ThrowTypeError(msg);
    return nullptr;
  }

  // First pull: capture the event target used by the stream
  if (!mOriginalEventTarget) {
    LOGD_RUNNER("Retrieving the event target of the readable stream thread");
    mOriginalEventTarget = GetCurrentSerialEventTarget();
  }

  // First pull: Start the generation in a dedicated thread.
  if (!mTask) {
    LOGD_RUNNER("{}: Launching background task for generation",
                __PRETTY_FUNCTION__);

    LOGD_RUNNER("{}: Creating a new thread for generation",
                __PRETTY_FUNCTION__);
    nsresult rv2 = nsThreadManager::get().nsThreadManager::NewNamedThread(
        "LlamaWorker"_ns, nsThreadManager::ThreadCreationOptions{},
        getter_AddRefs(mGenerateThread));

    if (NS_FAILED(rv2)) {
      auto msg = nsFmtCString(
          "{} Could not initialize LlamaWorker "
          "thread via nsThreadManager.",
          __PRETTY_FUNCTION__);
      LOGE_RUNNER("{}", msg);
      aRv.ThrowTypeError(msg);
      return nullptr;
    }

    // Create a WorkerRef to keep the worker alive during async shutdown.
    // When we use AsyncShutdown(), the thread cleanup happens asynchronously.
    // Without this ref, the worker could be torn down while the thread is still
    // shutting down, leading to use-after-free crashes.
    if (WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate()) {
      LOGD_RUNNER("{}: Creating WorkerRef for worker", __PRETTY_FUNCTION__);
      // Create a StrongWorkerRef that keeps the worker alive until we
      // explicitly release it
      RefPtr<StrongWorkerRef> strongRef =
          StrongWorkerRef::Create(workerPrivate, "LlamaStreamSource");
      if (strongRef) {
        mWorkerRef = new ThreadSafeWorkerRef(strongRef);
        LOGD_RUNNER("{}: Successfully created ThreadSafeWorkerRef",
                    __PRETTY_FUNCTION__);
      } else {
        // Worker is already shutting down, we can't start new work
        LOGE_RUNNER("{}: Worker is shutting down, cannot create WorkerRef",
                    __PRETTY_FUNCTION__);
        mGenerateThread = nullptr;
        auto msg = nsFmtCString(
            "{} Worker is shutting down, cannot start generation task",
            __PRETTY_FUNCTION__);
        aRv.ThrowTypeError(msg);
        return nullptr;
      }
    }

    LOGD_RUNNER("{}: Creating LlamaGenerateTask", __PRETTY_FUNCTION__);
    //  Create task with backend and weak stream reference
    mTask =
        MakeRefPtr<mozilla::llama::LlamaGenerateTask>(mBackend, mChatOptions);

    LOGD_RUNNER("{}: Starting LlamaGenerateTask", __PRETTY_FUNCTION__);
    // Dispatch task to background thread
    auto dispatchedTask = mTask;
    nsresult rv =
        mGenerateThread->Dispatch(dispatchedTask.forget(), NS_DISPATCH_NORMAL);

    if (NS_FAILED(rv)) {
      mTask = nullptr;
      auto msg = nsFmtCString(
          "{} Unable to start LlamaGenerateTask in the background ",
          __PRETTY_FUNCTION__);
      LOGE_RUNNER("{}", msg);
      aRv.ThrowTypeError(msg);
      return nullptr;
    }
  }

  auto task = mTask;

  auto messagePromise = task->GetMessage();

  // When resolved, flush available results into stream
  Result<RefPtr<Promise>, nsresult> pullResult =
      promise->ThenWithCycleCollectedArgs(
          [](JSContext* aCx, JS::Handle<JS::Value> aValue, ErrorResult& aRv,
             RefPtr<Promise> aPromise, RefPtr<ReadableStream> aStream)
              MOZ_CAN_RUN_SCRIPT -> already_AddRefed<Promise> {
                if (aValue.isUndefined()) {
                  LOGD_RUNNER(
                      "{}: LlamaStreamSource completed. Closing the stream",
                      __PRETTY_FUNCTION__);
                  aStream->CloseNative(aCx, aRv);
                } else {
                  LOGV_RUNNER("{} Deliver chunk message to stream",
                              __PRETTY_FUNCTION__);
                  aStream->EnqueueNative(aCx, aValue, aRv);
                }

                return nullptr;
              },
          promise, mControllerStream);

  if (pullResult.isErr()) {
    LOGE_RUNNER(
        "{}: Error when chaining generation dom promise with incoming message "
        "one",
        __PRETTY_FUNCTION__);
    aRv.Throw(pullResult.inspectErr());
    return nullptr;
  }

  // When the generation task has new data, messagePromise is resolved & then we
  // resolve the JS promise
  messagePromise->Then(
      // ← Ensure the chained resolve/reject run in the thread where the JS
      // promise is created from
      mOriginalEventTarget,
      // debugging label
      __func__,
      [promise](mozilla::Maybe<LlamaChatResponse>&& chunk) {
        if (chunk) {
          promise->MaybeResolve(chunk.ref());
        }

        promise->MaybeResolveWithUndefined();
      },
      [promise](const nsCString& error) {
        promise->MaybeRejectWithTypeError(error);
      });

  return pullResult.unwrap().forget();
}

LlamaStreamSource::~LlamaStreamSource() {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  ShutdownWorkerThread();
  LOGD_RUNNER("Exited {}", __PRETTY_FUNCTION__);
}

void LlamaStreamSource::SetControllerStream(RefPtr<ReadableStream> aStream) {
  mControllerStream = aStream;
}

}  // namespace mozilla::dom

namespace mozilla::dom {

LlamaRunner::LlamaRunner(const GlobalObject& aGlobal)
    : mBackend(MakeRefPtr<LlamaBackend>()),
      mGlobal(do_QueryInterface(aGlobal.GetAsSupports())) {}

already_AddRefed<ReadableStream> LlamaRunner::CreateGenerationStream(
    const LlamaChatOptions& aOptions, ErrorResult& aRv) {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  RefPtr<LlamaStreamSource> source =
      new LlamaStreamSource(mGlobal, mBackend, aOptions);

  AutoJSAPI jsapi;
  if (!jsapi.Init(mGlobal)) {
    auto msg =
        nsFmtCString("{} Unable to initialize the JSAPI", __PRETTY_FUNCTION__);
    LOGE_RUNNER("{}", msg);
    aRv.ThrowTypeError(msg);
    return nullptr;
  }
  LOGD_RUNNER("{}: Obtaining the JSContext", __PRETTY_FUNCTION__);
  JSContext* cx = jsapi.cx();

  Maybe<double> highWaterMark;
  QueuingStrategySize* sizeAlgorithm = nullptr;

  LOGD_RUNNER("{}: Creating the native readable stream from LlamaStreamSource ",
              __PRETTY_FUNCTION__);
  RefPtr<ReadableStream> stream = ReadableStream::CreateNative(
      cx, mGlobal, *source, highWaterMark, sizeAlgorithm, aRv);

  source->SetControllerStream(stream);

  mStreamSource = source;

  return stream.forget();
}

bool LlamaRunner::InInferenceProcess(JSContext*, JSObject*) {
  if (!ContentChild::GetSingleton()) {
    return false;
  }
  return ContentChild::GetSingleton()->GetRemoteType().Equals(
      INFERENCE_REMOTE_TYPE);
}

class MetadataCallback final : public nsIFileMetadataCallback {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  explicit MetadataCallback(LlamaRunner* aRunner) : mRunner(aRunner) {}
  NS_IMETHOD OnFileMetadataReady(nsIAsyncFileMetadata* aObject) override {
    mRunner->OnMetadataReceived();
    return NS_OK;
  }
  LlamaRunner* mRunner = nullptr;

 private:
  virtual ~MetadataCallback() = default;
};

NS_IMPL_ISUPPORTS(MetadataCallback, nsIFileMetadataCallback)

void LlamaRunner::OnMetadataReceived() {
  mMetadataCallback = nullptr;
  const nsCOMPtr<nsIFileMetadata> fileMetadata = do_QueryInterface(mStream);
  if (NS_WARN_IF(!fileMetadata)) {
    LOGE_RUNNER("QI fileMetadata failed");
    return;
  }
  PRFileDesc* fileDesc;
  const nsresult rv = fileMetadata->GetFileDescriptor(&fileDesc);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    LOGE_RUNNER("GetFileDescriptor failed");
    return;
  }

  MOZ_ASSERT(fileDesc);

#ifdef XP_WIN
  // Convert our file descriptor to FILE*
  void* handle = mozilla::ipc::FileDescriptor::PlatformHandleType(
      PR_FileDesc2NativeHandle(fileDesc));
  int fd = _open_osfhandle(reinterpret_cast<intptr_t>(handle), _O_RDONLY);
  if (fd == -1) {
    LOGE_RUNNER("Convertion to integer fd failed");
    return;
  }
  FILE* fp = fdopen(fd, "rb");
  if (!fp) {
    LOGE_RUNNER("Conversion to FILE* failed");
    return;
  }
#else
  PROsfd fd = PR_FileDesc2NativeHandle(fileDesc);
  FILE* fp = fdopen(fd, "r");
#endif

  auto result = mBackend->Reinitialize(LlamaModelOptions(mModelOptions), fp);

  LOGD_RUNNER("LLamaRunner: Reinitialize OK");

  if (result.isErr()) {
    LOGE_RUNNER("{}", result.inspectErr().mMessage);
    mInitPromise->MaybeReject(NS_ERROR_FAILURE);
    return;
  }

  mInitPromise->MaybeResolve(NS_OK);
}

already_AddRefed<Promise> LlamaRunner::Initialize(
    const LlamaModelOptions& aOptions, Blob& aModelBlob, ErrorResult& aRv) {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  RefPtr<Promise> promise = Promise::Create(mGlobal, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  mModelOptions = aOptions;

  RefPtr<Blob> domBlob = do_QueryObject(&aModelBlob);
  domBlob->CreateInputStream(getter_AddRefs(mStream), aRv);
  const nsCOMPtr<nsIFileMetadata> fileMetadata = do_QueryInterface(mStream);
  if (NS_WARN_IF(!fileMetadata)) {
    return nullptr;
  }

  mInitPromise = promise;
  nsCOMPtr<nsIEventTarget> eventTarget = mozilla::GetCurrentSerialEventTarget();
  nsCOMPtr<nsIAsyncFileMetadata> asyncFileMetadata = do_QueryInterface(mStream);
  mMetadataCallback = MakeAndAddRef<MetadataCallback>(this);
  nsresult rv = asyncFileMetadata->AsyncFileMetadataWait(
      mMetadataCallback.get(), eventTarget);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    LOGD_RUNNER("{} AsyncFileMetadataWait failed", __PRETTY_FUNCTION__);
    return nullptr;
  }

  LOGD_RUNNER("{} Initialization successfully complete", __PRETTY_FUNCTION__);

  return promise.forget();
}

already_AddRefed<LlamaRunner> LlamaRunner::Constructor(
    const GlobalObject& aGlobal, ErrorResult& aRv) {
  RefPtr<LlamaRunner> runner = new LlamaRunner(aGlobal);
  return runner.forget();
}

JSObject* LlamaRunner::WrapObject(JSContext* aCx,
                                  JS::Handle<JSObject*> aGivenProto) {
  return LlamaRunner_Binding::Wrap(aCx, this, aGivenProto);
}

already_AddRefed<Promise> LlamaRunner::FormatChat(
    const LlamaFormatChatOptions& aOptions, ErrorResult& aRv) {
  LOGD_RUNNER("Entered {}", __PRETTY_FUNCTION__);
  RefPtr<Promise> promise = Promise::Create(mGlobal, aRv);
  if (aRv.Failed()) {
    auto msg = "Failed to create promise in LlamaRunner"_ns;
    LOGE_RUNNER("{}", msg);
    aRv.ThrowTypeError(msg);
    return nullptr;
  }

  auto result = mBackend->FormatChat(aOptions);

  if (result.isErr()) {
    LOGE_RUNNER("{}", result.inspectErr().mMessage);
    aRv.ThrowTypeError(result.inspectErr().mMessage);
    return nullptr;
  }

  promise->MaybeResolve(result.unwrap());

  LOGD_RUNNER("Successfully completed {}", __PRETTY_FUNCTION__);

  return promise.forget();
}

}  // namespace mozilla::dom

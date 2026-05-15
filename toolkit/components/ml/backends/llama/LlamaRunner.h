/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_LlamaRunner_h
#define mozilla_dom_LlamaRunner_h

// Primary WebIDL interface for llama.cpp-based streaming chat model
// integration. Exposes LLM-backed ReadableStream generation and chat prompt
// formatting to JavaScript via LlamaRunner.

#include "MediaInfo.h"
#include "mozilla/dom/LlamaRunnerBinding.h"
#include "mozilla/dom/MessagePort.h"
#include "mozilla/dom/ReadableStream.h"
#include "nsIFileStreams.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"
#include "mozilla/llama/LlamaBackend.h"

#include "prsystem.h"
#include "mozilla/SPSCQueue.h"
#include "mozilla/Array.h"
#include <cstdint>
#include "mozilla/dom/Promise.h"

#include "mozilla/dom/ReadableStream.h"
#include "mozilla/dom/ReadableStreamDefaultController.h"
#include "mozilla/dom/UnderlyingSourceCallbackHelpers.h"

#include "nsThreadUtils.h"
#include "mozilla/TaskQueue.h"
#include "mozilla/RefPtr.h"
#include "nsIThread.h"
#include "nsError.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/Atomics.h"

#include "mozilla/llama/LlamaBackend.h"
#include "mozilla/Logging.h"
#include "nsFmtString.h"
#include "nsThread.h"
#include "nsThreadManager.h"
#include "mozilla/ThreadEventQueue.h"
#include "mozilla/EventQueue.h"
#include "nsDeque.h"
#include "mozilla/dom/Blob.h"
#include "mozilla/dom/WorkerRef.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/GlobalTeardownObserver.h"

namespace mozilla::dom {

class LlamaStreamSource;
}

namespace mozilla::llama {

// When the Maybe has no value, it indicates the model has finished generating.
// Otherwise, it contains a LlamaChatResponse with partial or final content.
using LlamaGenerateTaskPromise =
    MozPromise<mozilla::Maybe<LlamaChatResponse>, nsCString,
               /* IsExclusive = */ true>;

/**
 * LlamaGenerateTask runs the orchestration of model inference on a background
 * thread, but delegates all compute-intensive operations (e.g., token
 * generation, prompt processing, decoding) to the LlamaBackend's internal
 * threadpool.
 *
 * The task itself manages:
 *  - Calling LlamaBackend::Generate with user options and callbacks.
 *  - Buffering responses and applying streaming heuristics (e.g., flush size,
 * phase boundaries).
 *  - Monitoring for cancellation requests.
 *
 * This task is launched during the first JS stream pull and executes
 * independently. It posts all intermediate/final results back to the
 * LlamaStreamSource on the JS stream thread.
 *
 * Note: This class does not do the heavy lifting; it schedules and collects
 * results from backend-owned threads. This enables concurrency across multiple
 * LlamaRunner instances with minimal blocking.
 */
class LlamaGenerateTask final : public mozilla::CancelableRunnable {
 public:
  using LlamaChatResponse = mozilla::dom::LlamaChatResponse;

  enum class TaskState : uint32_t {
    // Task has not started yet.
    Idle,
    // Task is actively running.
    Running,
    // Task completed successfully.
    CompletedSuccess,
    // Task failed due to an error.
    CompletedFailure,
    // Task was externally cancelled (if not already completed).
    Cancelled
  };

  LlamaGenerateTask(RefPtr<LlamaBackend> aBackend,
                    const LlamaChatOptions& aOptions);

  NS_IMETHOD Run() override;

  nsresult Cancel() override;

  // Returns the next message if available, or a promise that will resolve once
  // a message is ready. Rejects immediately if the task has failed.
  RefPtr<LlamaGenerateTaskPromise> GetMessage();

 private:
  // Attempts to push a message only if a consumer is actively waiting.
  // Returns true if the message was consumed immediately or queued to resolve a
  // pending promise.
  bool MaybePushMessage(mozilla::Maybe<LlamaChatResponse> aMessage);

  // Unconditionally pushes a message. First tries MaybePushMessage(); if that
  // fails, enqueues the message into the internal queue. Returns true if the
  // message was accepted.
  bool PushMessage(mozilla::Maybe<LlamaChatResponse> aMessage);

  // Thread-safe task state
  mozilla::Atomic<TaskState> mState{TaskState::Idle};
  // Error message set if the task fails. We store it separately instead of
  // using the message-passing queue, so that errors can still be surfaced even
  // if the queue mechanism fails.
  nsCString mErrorMessage;

  // Shared reference to backend (not exclusive owner)
  RefPtr<LlamaBackend> mBackend;

  const LlamaChatOptions mChatOptions;

  // Index of the currently active promise holder (0 or 1).
  // The producer resolves the promise at this index, then toggles it.
  // The consumer uses the *other* index to safely create a new promise.
  int mCurrentPromiseHolderIdx{0};

  // Double-buffered promise holders (index toggles between 0 and 1) to avoid a
  // rare race where a resolved promise might be consumed by the other thread
  // *before* we’ve officially marked it as resolved. While this race is highly
  // unlikely (would require the consumer thread to request a new promise
  // between the resolve() call and its internal state update), this design
  // fully eliminates the possibility. The producer resolves the current index,
  // then switches to the next; the consumer always creates new promises from
  // the non-current index.
  Array<MozPromiseHolder<LlamaGenerateTaskPromise>, 2> mPromiseHolders;

  // Thread-safe flag indicating whether a consumer is waiting for data.
  Atomic<bool> mHasPendingConsumer{false};

  // Thread-safe buffer for messages to be sent back to the consumer.
  SPSCQueue<mozilla::Maybe<LlamaChatResponse>> mMessagesQueue;

  ~LlamaGenerateTask();
};

}  // namespace mozilla::llama

namespace mozilla::dom {

using LlamaBackend = ::mozilla::llama::LlamaBackend;

/**
 * LlamaStreamSource is a bridge between LlamaGenerateTask and JS
 * ReadableStream.
 *
 * Implements UnderlyingSourceAlgorithmsWrapper so it can be used with
 * ReadableStream::CreateNative. This object owns the lifecycle of the
 * generation task (LlamaGenerateTask) and buffers intermediate results
 * for consumption by JS pull callbacks.
 *
 * It holds a shared strong reference to the backend (LlamaBackend),
 * which may also be retained by other components (e.g., LlamaRunner).
 * All compute-heavy work is performed by the backend's internal threadpool.
 *
 * Generation results are delivered via LlamaGenerateTask::Generate(), which
 * returns a promise. Once resolved, the result is forwarded to the JS consumer.
 *
 * The stream starts when PullCallbackImpl is first called from JS,
 * launching a background generation task and associating it with a thread.
 *
 * Inherits from GlobalTeardownObserver to receive notifications when the
 * worker/global is shutting down, allowing proper cleanup of background
 * threads.
 */
class LlamaStreamSource final : public UnderlyingSourceAlgorithmsWrapper,
                                public GlobalTeardownObserver {
 public:
  MOZ_DECLARE_REFCOUNTED_TYPENAME(LlamaStreamSource)
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(LlamaStreamSource,
                                           UnderlyingSourceAlgorithmsWrapper)
  LlamaStreamSource(nsIGlobalObject* aGlobal, RefPtr<LlamaBackend> aBackend,
                    const LlamaChatOptions& aOptions);

  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<Promise> CancelCallbackImpl(
      JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
      ErrorResult& aRv) override;

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> PullCallbackImpl(
      JSContext* aCx, ReadableStreamControllerBase& aController,
      ErrorResult& aRv) override;

  // Links the JS-side stream controller to this source
  void SetControllerStream(RefPtr<ReadableStream> aStream);

  void DisconnectFromOwner() override;

 private:
  ~LlamaStreamSource();

  // Helper to properly shut down the worker thread with async cleanup
  void ShutdownWorkerThread();

  RefPtr<LlamaBackend> mBackend;
  const LlamaChatOptions mChatOptions;

  // Background generation task
  RefPtr<mozilla::llama::LlamaGenerateTask> mTask;

  // Background worker thread
  nsCOMPtr<nsIThread> mGenerateThread;

  // Holds the event queue where PullCallbackImpl is
  // called from
  nsCOMPtr<nsISerialEventTarget> mOriginalEventTarget;

  // Associated JS stream object
  RefPtr<ReadableStream> mControllerStream;

  // Keeps the worker alive during async operations.
  // When using AsyncShutdown(), the worker thread cleanup happens
  // asynchronously. If the worker context is torn down before the thread
  // finishes shutting down, we can crash. The ThreadSafeWorkerRef keeps the
  // worker alive until we explicitly release it after shutdown completes.
  RefPtr<ThreadSafeWorkerRef> mWorkerRef;
};

class MetadataCallback;

/**
 * LlamaRunner is the primary WebIDL-exposed controller for llama.cpp chat.
 *
 * It provides JavaScript with an API to format prompts, launch inference, and
 * receive output as a `ReadableStream`. It delegates inference to a
 * thread-safe LlamaBackend and manages stream logic via LlamaStreamSource.
 *
 * This class is designed for use in JS.
 */
class LlamaRunner final : public nsISupports, public nsWrapperCache {
 public:
  MOZ_DECLARE_REFCOUNTED_TYPENAME(LlamaRunner)
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(LlamaRunner)

  explicit LlamaRunner(const GlobalObject& aGlobal);

  nsISupports* GetParentObject() const { return mGlobal; }

  static already_AddRefed<LlamaRunner> Constructor(const GlobalObject& aGlobal,
                                                   ErrorResult& aRv);

  already_AddRefed<Promise> Initialize(const LlamaModelOptions& aOptions,
                                       Blob& aModelBlob, ErrorResult& aRv);

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

  /**
   * Creates a readable stream that incrementally yields language model
   * responses.
   *
   * This function initiates a new generation session using the provided options
   * and returns a JavaScript `ReadableStream`. The stream will asynchronously
   * emit `LlamaChatResponse` chunks as the model produces output.
   *
   * @param aOptions Configuration for the generation session.
   * @param aRv Used to report any errors during stream setup or execution.
   *
   * @returns A `ReadableStream` that yields `LlamaChatResponse` objects from
   * the language model, suitable for consumption in JavaScript via async
   * iteration or stream readers.
   *
   * @note This function is designed for use in JavaScript via WebIDL. It
   * supports streaming output for real-time use cases such as chat UIs or
   * progressive rendering.
   *
   * @example JavaScript usage:
   * const stream = CreateGenerationStream(chatOptions);
   * const reader = stream.getReader();
   *
   * while (true) {
   *   const { value, done } = await reader.read();
   *   if (done) break;
   *   console.log(value); // `value` is a LlamaChatResponse
   * }
   */
  already_AddRefed<ReadableStream> CreateGenerationStream(
      const LlamaChatOptions& aOptions, ErrorResult& aRv);

  /**
   * Formats a sequence of chat messages into a prompt string for LLM inference.
   *
   * This function takes a structured list of chat messages (user, assistant, or
   * system roles) and formats them into a prompt string suitable for processing
   * by a llama.cpp-based language model. The function is asynchronous and
   * returns a JavaScript Promise that resolves to the formatted string.
   *
   * @param aOptions An object containing the input messages and formatting
   * options.
   *
   * @param aRv Used to report any errors that occur during formatting.
   *
   * @returns A Promise that resolves to the final prompt string formatted for
   * LLM input.
   *
   * @throws DOMException via `aRv` on failure (e.g., invalid message roles or
   * empty input).
   *
   * @example JavaScript usage:
   * FormatChat({
   *   messages: [
   *     { role: "user", content: "What's the weather like?" },
   *     { role: "assistant", content: "It's sunny and 25°C." }
   *   ],
   *   addAssistant: true
   * }).then(prompt => {
   *   // Pass prompt to LLM for inference
   * });
   */
  already_AddRefed<Promise> FormatChat(const LlamaFormatChatOptions& aOptions,
                                       ErrorResult& aRv);

  static bool InInferenceProcess(JSContext*, JSObject*);

  void OnMetadataReceived();

 private:
  ~LlamaRunner() = default;

  RefPtr<LlamaBackend> mBackend;
  RefPtr<LlamaStreamSource> mStreamSource;

 protected:
  LlamaModelOptions mModelOptions;
  nsCOMPtr<nsIGlobalObject> mGlobal;
  RefPtr<Promise> mInitPromise;
  nsCOMPtr<nsIInputStream> mStream;
  RefPtr<MetadataCallback> mMetadataCallback;
};

}  // namespace mozilla::dom

#endif

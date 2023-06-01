/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WritableStream_h
#define mozilla_dom_WritableStream_h

#include "js/TypeDecls.h"
#include "js/Value.h"
#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/QueuingStrategyBinding.h"
#include "mozilla/dom/WritableStreamDefaultController.h"
#include "mozilla/dom/WritableStreamDefaultWriter.h"

#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

class Promise;
class WritableStreamDefaultController;
class WritableStreamDefaultWriter;
class UnderlyingSinkAlgorithmsBase;
class UniqueMessagePortId;
class MessagePort;

class WritableStream : public nsISupports, public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(WritableStream)

 protected:
  virtual ~WritableStream();

  virtual void LastRelease() {}

 public:
  // If one extends WritableStream with another cycle collectable class,
  // calling HoldJSObjects and DropJSObjects should happen using 'this' of
  // that extending class. And in that case Explicit should be passed to the
  // constructor of WriteableStream so that it doesn't make those calls.
  // See also https://bugzilla.mozilla.org/show_bug.cgi?id=1801214.
  enum class HoldDropJSObjectsCaller { Implicit, Explicit };

  // XXX: Do not call this constructor outside of dom/streams/ unless you are
  // subclassing, instead use WritableStream::CreateNative, because currently
  // the constructor is fallible. (See bug 1762233)
  // Subclasses need to call SetUpNative method separately as a part of the
  // construction.
  explicit WritableStream(const GlobalObject& aGlobal,
                          HoldDropJSObjectsCaller aHoldDropCaller);
  // XXX: Do not call this constructor outside of dom/streams/ unless you are
  // subclassing, instead use WritableStream::CreateNative, because currently
  // the constructor is fallible. (See bug 1762233)
  // Subclasses need to call SetUpNative method separately as a part of the
  // construction.
  explicit WritableStream(nsIGlobalObject* aGlobal,
                          HoldDropJSObjectsCaller aHoldDropCaller);

  enum class WriterState { Writable, Closed, Erroring, Errored };

  // Slot Getter/Setters:
  bool Backpressure() const { return mBackpressure; }
  void SetBackpressure(bool aBackpressure) { mBackpressure = aBackpressure; }

  Promise* GetCloseRequest() { return mCloseRequest; }
  void SetCloseRequest(Promise* aRequest) { mCloseRequest = aRequest; }

  MOZ_KNOWN_LIVE WritableStreamDefaultController* Controller() {
    return mController;
  }
  void SetController(WritableStreamDefaultController& aController) {
    MOZ_ASSERT(!mController);
    mController = &aController;
  }

  Promise* GetInFlightWriteRequest() const { return mInFlightWriteRequest; }

  Promise* GetPendingAbortRequestPromise() const {
    return mPendingAbortRequestPromise;
  }

  void SetPendingAbortRequest(Promise* aPromise, JS::Handle<JS::Value> aReason,
                              bool aWasAlreadyErroring) {
    mPendingAbortRequestPromise = aPromise;
    mPendingAbortRequestReason = aReason;
    mPendingAbortRequestWasAlreadyErroring = aWasAlreadyErroring;
  }

  WritableStreamDefaultWriter* GetWriter() const { return mWriter; }
  void SetWriter(WritableStreamDefaultWriter* aWriter) { mWriter = aWriter; }

  WriterState State() const { return mState; }
  void SetState(const WriterState& aState) { mState = aState; }

  JS::Value StoredError() const { return mStoredError; }
  void SetStoredError(JS::Handle<JS::Value> aStoredError) {
    mStoredError = aStoredError;
  }

  void AppendWriteRequest(RefPtr<Promise>& aRequest) {
    mWriteRequests.AppendElement(aRequest);
  }

  // WritableStreamCloseQueuedOrInFlight
  bool CloseQueuedOrInFlight() const {
    return mCloseRequest || mInFlightCloseRequest;
  }

  // WritableStreamDealWithRejection
  MOZ_CAN_RUN_SCRIPT void DealWithRejection(JSContext* aCx,
                                            JS::Handle<JS::Value> aError,
                                            ErrorResult& aRv);

  // WritableStreamFinishErroring
  MOZ_CAN_RUN_SCRIPT void FinishErroring(JSContext* aCx, ErrorResult& aRv);

  // WritableStreamFinishInFlightClose
  void FinishInFlightClose();

  // WritableStreamFinishInFlightCloseWithError
  MOZ_CAN_RUN_SCRIPT void FinishInFlightCloseWithError(
      JSContext* aCx, JS::Handle<JS::Value> aError, ErrorResult& aRv);

  // WritableStreamFinishInFlightWrite
  void FinishInFlightWrite();

  // WritableStreamFinishInFlightWriteWithError
  MOZ_CAN_RUN_SCRIPT void FinishInFlightWriteWithError(
      JSContext* aCX, JS::Handle<JS::Value> aError, ErrorResult& aR);

  // WritableStreamHasOperationMarkedInFlight
  bool HasOperationMarkedInFlight() const {
    return mInFlightWriteRequest || mInFlightCloseRequest;
  }

  // WritableStreamMarkCloseRequestInFlight
  void MarkCloseRequestInFlight();

  // WritableStreamMarkFirstWriteRequestInFlight
  void MarkFirstWriteRequestInFlight();

  // WritableStreamRejectCloseAndClosedPromiseIfNeeded
  void RejectCloseAndClosedPromiseIfNeeded();

  // WritableStreamStartErroring
  MOZ_CAN_RUN_SCRIPT void StartErroring(JSContext* aCx,
                                        JS::Handle<JS::Value> aReason,
                                        ErrorResult& aRv);

  // WritableStreamUpdateBackpressure
  void UpdateBackpressure(bool aBackpressure);

  // [Transferable]
  // https://html.spec.whatwg.org/multipage/structured-data.html#transfer-steps
  MOZ_CAN_RUN_SCRIPT bool Transfer(JSContext* aCx,
                                   UniqueMessagePortId& aPortId);
  // https://html.spec.whatwg.org/multipage/structured-data.html#transfer-receiving-steps
  static MOZ_CAN_RUN_SCRIPT bool ReceiveTransfer(
      JSContext* aCx, nsIGlobalObject* aGlobal, MessagePort& aPort,
      JS::MutableHandle<JSObject*> aReturnObject);

  // Public functions to implement other specs
  // https://streams.spec.whatwg.org/#other-specs-ws

  // https://streams.spec.whatwg.org/#writablestream-set-up
 protected:
  // Sets up the WritableStream. Intended for subclasses.
  // TODO: Do this in constructor if bug 1762233 makes this infallible.
  MOZ_CAN_RUN_SCRIPT void SetUpNative(
      JSContext* aCx, UnderlyingSinkAlgorithmsWrapper& aAlgorithms,
      Maybe<double> aHighWaterMark, QueuingStrategySize* aSizeAlgorithm,
      ErrorResult& aRv);

 public:
  // Creates and sets up a WritableStream. Use SetUpNative for this purpose in
  // subclasses.
  // TODO: Do this in constructor if bug 1762233 makes this infallible.
  MOZ_CAN_RUN_SCRIPT static already_AddRefed<WritableStream> CreateNative(
      JSContext* aCx, nsIGlobalObject& aGlobal,
      UnderlyingSinkAlgorithmsWrapper& aAlgorithms,
      Maybe<double> aHighWaterMark, QueuingStrategySize* aSizeAlgorithm,
      ErrorResult& aRv);

  // The following definitions must only be used on WritableStream instances
  // initialized via the above set up algorithm:

  // https://streams.spec.whatwg.org/#writablestream-error
  MOZ_CAN_RUN_SCRIPT void ErrorNative(JSContext* aCx,
                                      JS::Handle<JS::Value> aError,
                                      ErrorResult& aRv);

  // IDL layer functions

  nsIGlobalObject* GetParentObject() const { return mGlobal; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // IDL methods

  // TODO: Use MOZ_CAN_RUN_SCRIPT when IDL constructors can use it (bug 1749042)
  MOZ_CAN_RUN_SCRIPT_BOUNDARY static already_AddRefed<WritableStream>
  Constructor(const GlobalObject& aGlobal,
              const Optional<JS::Handle<JSObject*>>& aUnderlyingSink,
              const QueuingStrategy& aStrategy, ErrorResult& aRv);

  bool Locked() const { return !!mWriter; }

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> Abort(
      JSContext* cx, JS::Handle<JS::Value> aReason, ErrorResult& aRv);

  MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> Close(JSContext* aCx,
                                                     ErrorResult& aRv);

  already_AddRefed<WritableStreamDefaultWriter> GetWriter(ErrorResult& aRv);

  // Internal Slots:
 private:
  bool mBackpressure = false;
  RefPtr<Promise> mCloseRequest;
  RefPtr<WritableStreamDefaultController> mController;
  RefPtr<Promise> mInFlightWriteRequest;
  RefPtr<Promise> mInFlightCloseRequest;

  // We inline all members of [[pendingAbortRequest]] in this class.
  // The absence (i.e. undefined) of the [[pendingAbortRequest]]
  // is indicated by mPendingAbortRequestPromise = nullptr.
  RefPtr<Promise> mPendingAbortRequestPromise;
  JS::Heap<JS::Value> mPendingAbortRequestReason;
  bool mPendingAbortRequestWasAlreadyErroring = false;

  WriterState mState = WriterState::Writable;
  JS::Heap<JS::Value> mStoredError;
  RefPtr<WritableStreamDefaultWriter> mWriter;
  nsTArray<RefPtr<Promise>> mWriteRequests;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  HoldDropJSObjectsCaller mHoldDropCaller;
};

namespace streams_abstract {

MOZ_CAN_RUN_SCRIPT already_AddRefed<WritableStream> CreateWritableStream(
    JSContext* aCx, nsIGlobalObject* aGlobal,
    UnderlyingSinkAlgorithmsBase* aAlgorithms, double aHighWaterMark,
    QueuingStrategySize* aSizeAlgorithm, ErrorResult& aRv);

inline bool IsWritableStreamLocked(WritableStream* aStream) {
  return aStream->Locked();
}

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> WritableStreamAbort(
    JSContext* aCx, WritableStream* aStream, JS::Handle<JS::Value> aReason,
    ErrorResult& aRv);

MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise> WritableStreamClose(
    JSContext* aCx, WritableStream* aStream, ErrorResult& aRv);

already_AddRefed<Promise> WritableStreamAddWriteRequest(
    WritableStream* aStream);

already_AddRefed<WritableStreamDefaultWriter>
AcquireWritableStreamDefaultWriter(WritableStream* aStream, ErrorResult& aRv);

}  // namespace streams_abstract

}  // namespace mozilla::dom

#endif  // mozilla_dom_WritableStream_h

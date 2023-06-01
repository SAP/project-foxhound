/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ReadableStream.h"

#include "ReadIntoRequest.h"
#include "ReadableStreamPipeTo.h"
#include "ReadableStreamTee.h"
#include "StreamUtils.h"
#include "TeeState.h"
#include "js/Array.h"
#include "js/Exception.h"
#include "js/PropertyAndElement.h"
#include "js/TypeDecls.h"
#include "js/Value.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/Assertions.h"
#include "mozilla/Attributes.h"
#include "mozilla/CycleCollectedJSContext.h"
#include "mozilla/FloatingPoint.h"
#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BindingCallContext.h"
#include "mozilla/dom/ByteStreamHelpers.h"
#include "mozilla/dom/BodyStream.h"
#include "mozilla/dom/QueueWithSizes.h"
#include "mozilla/dom/QueuingStrategyBinding.h"
#include "mozilla/dom/ReadRequest.h"
#include "mozilla/dom/ReadableByteStreamController.h"
#include "mozilla/dom/ReadableStreamBYOBReader.h"
#include "mozilla/dom/ReadableStreamBinding.h"
#include "mozilla/dom/ReadableStreamController.h"
#include "mozilla/dom/ReadableStreamDefaultController.h"
#include "mozilla/dom/ReadableStreamDefaultReader.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/dom/UnderlyingSourceBinding.h"
#include "mozilla/dom/UnderlyingSourceCallbackHelpers.h"
#include "mozilla/dom/WritableStream.h"
#include "mozilla/dom/WritableStreamDefaultWriter.h"
#include "nsCOMPtr.h"

#include "mozilla/dom/Promise-inl.h"
#include "nsIGlobalObject.h"
#include "nsISupports.h"

inline void ImplCycleCollectionTraverse(
    nsCycleCollectionTraversalCallback& aCallback,
    mozilla::Variant<mozilla::Nothing,
                     RefPtr<mozilla::dom::ReadableStreamDefaultReader>>&
        aReader,
    const char* aName, uint32_t aFlags = 0) {
  if (aReader.is<RefPtr<mozilla::dom::ReadableStreamDefaultReader>>()) {
    ImplCycleCollectionTraverse(
        aCallback,
        aReader.as<RefPtr<mozilla::dom::ReadableStreamDefaultReader>>(), aName,
        aFlags);
  }
}

inline void ImplCycleCollectionUnlink(
    mozilla::Variant<mozilla::Nothing,
                     RefPtr<mozilla::dom::ReadableStreamDefaultReader>>&
        aReader) {
  aReader = AsVariant(mozilla::Nothing());
}

namespace mozilla::dom {

using namespace streams_abstract;

// Only needed for refcounted objects.
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_WITH_JS_MEMBERS(
    ReadableStream, (mGlobal, mController, mReader), (mStoredError))

NS_IMPL_CYCLE_COLLECTING_ADDREF(ReadableStream)
NS_IMPL_CYCLE_COLLECTING_RELEASE(ReadableStream)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ReadableStream)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

ReadableStream::ReadableStream(nsIGlobalObject* aGlobal)
    : mGlobal(aGlobal), mReader(nullptr) {
  mozilla::HoldJSObjects(this);
}

ReadableStream::ReadableStream(const GlobalObject& aGlobal)
    : mGlobal(do_QueryInterface(aGlobal.GetAsSupports())), mReader(nullptr) {
  mozilla::HoldJSObjects(this);
}

ReadableStream::~ReadableStream() { mozilla::DropJSObjects(this); }

JSObject* ReadableStream::WrapObject(JSContext* aCx,
                                     JS::Handle<JSObject*> aGivenProto) {
  return ReadableStream_Binding::Wrap(aCx, this, aGivenProto);
}

ReadableStreamDefaultReader* ReadableStream::GetDefaultReader() {
  return mReader->AsDefault();
}

void ReadableStream::SetReader(ReadableStreamGenericReader* aReader) {
  mReader = aReader;
}

namespace streams_abstract {

// https://streams.spec.whatwg.org/#readable-stream-has-byob-reader
bool ReadableStreamHasBYOBReader(ReadableStream* aStream) {
  // Step 1. Let reader be stream.[[reader]].
  ReadableStreamGenericReader* reader = aStream->GetReader();

  // Step 2. If reader is undefined, return false.
  if (!reader) {
    return false;
  }

  // Step 3. If reader implements ReadableStreamBYOBReader, return true.
  // Step 4. Return false.
  return reader->IsBYOB();
}

// https://streams.spec.whatwg.org/#readable-stream-has-default-reader
bool ReadableStreamHasDefaultReader(ReadableStream* aStream) {
  // Step 1. Let reader be stream.[[reader]].
  ReadableStreamGenericReader* reader = aStream->GetReader();

  // Step 2. If reader is undefined, return false.
  if (!reader) {
    return false;
  }

  // Step 3. If reader implements ReadableStreamDefaultReader, return true.
  // Step 4. Return false.
  return reader->IsDefault();
}

}  // namespace streams_abstract

// Streams Spec: 4.2.4: https://streams.spec.whatwg.org/#rs-prototype
/* static */
already_AddRefed<ReadableStream> ReadableStream::Constructor(
    const GlobalObject& aGlobal,
    const Optional<JS::Handle<JSObject*>>& aUnderlyingSource,
    const QueuingStrategy& aStrategy, ErrorResult& aRv) {
  // Step 1.
  JS::Rooted<JSObject*> underlyingSourceObj(
      aGlobal.Context(),
      aUnderlyingSource.WasPassed() ? aUnderlyingSource.Value() : nullptr);

  // Step 2.
  RootedDictionary<UnderlyingSource> underlyingSourceDict(aGlobal.Context());
  if (underlyingSourceObj) {
    JS::Rooted<JS::Value> objValue(aGlobal.Context(),
                                   JS::ObjectValue(*underlyingSourceObj));
    dom::BindingCallContext callCx(aGlobal.Context(),
                                   "ReadableStream.constructor");
    aRv.MightThrowJSException();
    if (!underlyingSourceDict.Init(callCx, objValue)) {
      aRv.StealExceptionFromJSContext(aGlobal.Context());
      return nullptr;
    }
  }

  // Step 3.
  RefPtr<ReadableStream> readableStream = new ReadableStream(aGlobal);

  // Step 4.
  if (underlyingSourceDict.mType.WasPassed()) {
    // Implicit assertion on above check.
    MOZ_ASSERT(underlyingSourceDict.mType.Value() == ReadableStreamType::Bytes);

    // Step 4.1
    if (aStrategy.mSize.WasPassed()) {
      aRv.ThrowRangeError("Implementation preserved member 'size'");
      return nullptr;
    }

    // Step 4.2
    double highWaterMark = ExtractHighWaterMark(aStrategy, 0, aRv);
    if (aRv.Failed()) {
      return nullptr;
    }

    // Step 4.3
    SetUpReadableByteStreamControllerFromUnderlyingSource(
        aGlobal.Context(), readableStream, underlyingSourceObj,
        underlyingSourceDict, highWaterMark, aRv);
    if (aRv.Failed()) {
      return nullptr;
    }

    return readableStream.forget();
  }

  // Step 5.1 (implicit in above check)
  // Step 5.2. Extract callback.
  //
  // Implementation Note: The specification demands that if the size doesn't
  // exist, we instead would provide an algorithm that returns 1. Instead, we
  // will teach callers that a missing callback should simply return 1, rather
  // than gin up a fake callback here.
  //
  // This decision may need to be revisited if the default action ever diverges
  // within the specification.
  RefPtr<QueuingStrategySize> sizeAlgorithm =
      aStrategy.mSize.WasPassed() ? &aStrategy.mSize.Value() : nullptr;

  // Step 5.3
  double highWaterMark = ExtractHighWaterMark(aStrategy, 1, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 5.4.
  SetupReadableStreamDefaultControllerFromUnderlyingSource(
      aGlobal.Context(), readableStream, underlyingSourceObj,
      underlyingSourceDict, highWaterMark, sizeAlgorithm, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  return readableStream.forget();
}

// Dealing with const this ptr is a pain, so just re-implement.
// https://streams.spec.whatwg.org/#is-readable-stream-locked
bool ReadableStream::Locked() const {
  // Step 1 + 2.
  return mReader;
}

namespace streams_abstract {

// https://streams.spec.whatwg.org/#initialize-readable-stream
static void InitializeReadableStream(ReadableStream* aStream) {
  // Step 1.
  aStream->SetState(ReadableStream::ReaderState::Readable);

  // Step 2.
  aStream->SetReader(nullptr);
  aStream->SetStoredError(JS::UndefinedHandleValue);

  // Step 3.
  aStream->SetDisturbed(false);
}

// https://streams.spec.whatwg.org/#create-readable-stream
MOZ_CAN_RUN_SCRIPT
already_AddRefed<ReadableStream> CreateReadableStream(
    JSContext* aCx, nsIGlobalObject* aGlobal,
    UnderlyingSourceAlgorithmsBase* aAlgorithms,
    mozilla::Maybe<double> aHighWaterMark, QueuingStrategySize* aSizeAlgorithm,
    ErrorResult& aRv) {
  // Step 1. If highWaterMark was not passed, set it to 1.
  double highWaterMark = aHighWaterMark.valueOr(1.0);

  // Step 2. consumers of sizeAlgorithm
  //         handle null algorithms correctly.
  // Step 3.
  MOZ_ASSERT(IsNonNegativeNumber(highWaterMark));
  // Step 4.
  RefPtr<ReadableStream> stream = new ReadableStream(aGlobal);

  // Step 5.
  InitializeReadableStream(stream);

  // Step 6.
  RefPtr<ReadableStreamDefaultController> controller =
      new ReadableStreamDefaultController(aGlobal);

  // Step 7.
  SetUpReadableStreamDefaultController(aCx, stream, controller, aAlgorithms,
                                       highWaterMark, aSizeAlgorithm, aRv);

  // Step 8.
  return stream.forget();
}

// https://streams.spec.whatwg.org/#readable-stream-close
void ReadableStreamClose(JSContext* aCx, ReadableStream* aStream,
                         ErrorResult& aRv) {
  // Step 1.
  MOZ_ASSERT(aStream->State() == ReadableStream::ReaderState::Readable);

  // Step 2.
  aStream->SetState(ReadableStream::ReaderState::Closed);

  // Step 3.
  ReadableStreamGenericReader* reader = aStream->GetReader();

  // Step 4.
  if (!reader) {
    return;
  }

  // Step 5.
  reader->ClosedPromise()->MaybeResolveWithUndefined();

  // Step 6.
  if (reader->IsDefault()) {
    // Step 6.1. Let readRequests be reader.[[readRequests]].
    // Move LinkedList out of DefaultReader onto stack to avoid the potential
    // for concurrent modification, which could invalidate the iterator.
    //
    // See https://bugs.chromium.org/p/chromium/issues/detail?id=1045874 as an
    // example of the kind of issue that could occur.
    LinkedList<RefPtr<ReadRequest>> readRequests =
        std::move(reader->AsDefault()->ReadRequests());

    // Step 6.2. Set reader.[[readRequests]] to an empty list.
    // Note: The std::move already cleared this anyway.
    reader->AsDefault()->ReadRequests().clear();

    // Step 6.3. For each readRequest of readRequests,
    // Drain the local list and destroy elements along the way.
    while (RefPtr<ReadRequest> readRequest = readRequests.popFirst()) {
      // Step 6.3.1. Perform readRequest’s close steps.
      readRequest->CloseSteps(aCx, aRv);
      if (aRv.Failed()) {
        return;
      }
    }
  }
}

// https://streams.spec.whatwg.org/#readable-stream-cancel
already_AddRefed<Promise> ReadableStreamCancel(JSContext* aCx,
                                               ReadableStream* aStream,
                                               JS::Handle<JS::Value> aError,
                                               ErrorResult& aRv) {
  // Step 1.
  aStream->SetDisturbed(true);

  // Step 2.
  if (aStream->State() == ReadableStream::ReaderState::Closed) {
    RefPtr<Promise> promise =
        Promise::CreateInfallible(aStream->GetParentObject());
    promise->MaybeResolveWithUndefined();
    return promise.forget();
  }

  // Step 3.
  if (aStream->State() == ReadableStream::ReaderState::Errored) {
    JS::Rooted<JS::Value> storedError(aCx, aStream->StoredError());
    return Promise::CreateRejected(aStream->GetParentObject(), storedError,
                                   aRv);
  }

  // Step 4.
  ReadableStreamClose(aCx, aStream, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 5.
  ReadableStreamGenericReader* reader = aStream->GetReader();

  // Step 6.
  if (reader && reader->IsBYOB()) {
    // Step 6.1. Let readIntoRequests be reader.[[readIntoRequests]].
    LinkedList<RefPtr<ReadIntoRequest>> readIntoRequests =
        std::move(reader->AsBYOB()->ReadIntoRequests());

    // Step 6.2. Set reader.[[readIntoRequests]] to an empty list.
    // Note: The std::move already cleared this anyway.
    reader->AsBYOB()->ReadIntoRequests().clear();

    // Step 6.3. For each readIntoRequest of readIntoRequests,
    while (RefPtr<ReadIntoRequest> readIntoRequest =
               readIntoRequests.popFirst()) {
      // Step 6.3.1.Perform readIntoRequest’s close steps, given undefined.
      readIntoRequest->CloseSteps(aCx, JS::UndefinedHandleValue, aRv);
      if (aRv.Failed()) {
        return nullptr;
      }
    }
  }

  // Step 7.
  RefPtr<ReadableStreamController> controller(aStream->Controller());
  RefPtr<Promise> sourceCancelPromise =
      controller->CancelSteps(aCx, aError, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 8.
  RefPtr<Promise> promise =
      Promise::CreateInfallible(sourceCancelPromise->GetParentObject());

  // ThenWithCycleCollectedArgs will carry promise, keeping it alive until the
  // callback executes.
  Result<RefPtr<Promise>, nsresult> returnResult =
      sourceCancelPromise->ThenWithCycleCollectedArgs(
          [](JSContext*, JS::Handle<JS::Value>, ErrorResult&,
             RefPtr<Promise> newPromise) {
            newPromise->MaybeResolveWithUndefined();
            return newPromise.forget();
          },
          promise);

  if (returnResult.isErr()) {
    aRv.Throw(returnResult.unwrapErr());
    return nullptr;
  }

  return returnResult.unwrap().forget();
}

}  // namespace streams_abstract

// https://streams.spec.whatwg.org/#rs-cancel
already_AddRefed<Promise> ReadableStream::Cancel(JSContext* aCx,
                                                 JS::Handle<JS::Value> aReason,
                                                 ErrorResult& aRv) {
  // Step 1. If ! IsReadableStreamLocked(this) is true,
  // return a promise rejected with a TypeError exception.
  if (Locked()) {
    aRv.ThrowTypeError("Cannot cancel a stream locked by a reader.");
    return nullptr;
  }

  // Step 2. Return ! ReadableStreamCancel(this, reason).
  RefPtr<ReadableStream> thisRefPtr = this;
  return ReadableStreamCancel(aCx, thisRefPtr, aReason, aRv);
}

namespace streams_abstract {
// https://streams.spec.whatwg.org/#acquire-readable-stream-reader
already_AddRefed<ReadableStreamDefaultReader>
AcquireReadableStreamDefaultReader(ReadableStream* aStream, ErrorResult& aRv) {
  // Step 1.
  RefPtr<ReadableStreamDefaultReader> reader =
      new ReadableStreamDefaultReader(aStream->GetParentObject());

  // Step 2.
  SetUpReadableStreamDefaultReader(reader, aStream, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 3.
  return reader.forget();
}
}  // namespace streams_abstract

// https://streams.spec.whatwg.org/#rs-get-reader
void ReadableStream::GetReader(const ReadableStreamGetReaderOptions& aOptions,
                               OwningReadableStreamReader& resultReader,
                               ErrorResult& aRv) {
  // Step 1. If options["mode"] does not exist,
  // return ? AcquireReadableStreamDefaultReader(this).
  if (!aOptions.mMode.WasPassed()) {
    RefPtr<ReadableStreamDefaultReader> defaultReader =
        AcquireReadableStreamDefaultReader(this, aRv);
    if (aRv.Failed()) {
      return;
    }
    resultReader.SetAsReadableStreamDefaultReader() = defaultReader;
    return;
  }

  // Step 2. Assert: options["mode"] is "byob".
  MOZ_ASSERT(aOptions.mMode.Value() == ReadableStreamReaderMode::Byob);

  // Step 3. Return ? AcquireReadableStreamBYOBReader(this).
  RefPtr<ReadableStreamBYOBReader> byobReader =
      AcquireReadableStreamBYOBReader(this, aRv);
  if (aRv.Failed()) {
    return;
  }
  resultReader.SetAsReadableStreamBYOBReader() = byobReader;
}

namespace streams_abstract {
// https://streams.spec.whatwg.org/#is-readable-stream-locked
bool IsReadableStreamLocked(ReadableStream* aStream) {
  // Step 1 + 2.
  return aStream->Locked();
}
}  // namespace streams_abstract

// https://streams.spec.whatwg.org/#rs-pipe-through
MOZ_CAN_RUN_SCRIPT already_AddRefed<ReadableStream> ReadableStream::PipeThrough(
    const ReadableWritablePair& aTransform, const StreamPipeOptions& aOptions,
    ErrorResult& aRv) {
  // Step 1: If ! IsReadableStreamLocked(this) is true, throw a TypeError
  // exception.
  if (IsReadableStreamLocked(this)) {
    aRv.ThrowTypeError("Cannot pipe from a locked stream.");
    return nullptr;
  }

  // Step 2: If ! IsWritableStreamLocked(transform["writable"]) is true, throw a
  // TypeError exception.
  if (IsWritableStreamLocked(aTransform.mWritable)) {
    aRv.ThrowTypeError("Cannot pipe to a locked stream.");
    return nullptr;
  }

  // Step 3: Let signal be options["signal"] if it exists, or undefined
  // otherwise.
  RefPtr<AbortSignal> signal =
      aOptions.mSignal.WasPassed() ? &aOptions.mSignal.Value() : nullptr;

  // Step 4: Let promise be ! ReadableStreamPipeTo(this, transform["writable"],
  // options["preventClose"], options["preventAbort"], options["preventCancel"],
  // signal).
  RefPtr<WritableStream> writable = aTransform.mWritable;
  RefPtr<Promise> promise = ReadableStreamPipeTo(
      this, writable, aOptions.mPreventClose, aOptions.mPreventAbort,
      aOptions.mPreventCancel, signal, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 5: Set promise.[[PromiseIsHandled]] to true.
  MOZ_ALWAYS_TRUE(promise->SetAnyPromiseIsHandled());

  // Step 6: Return transform["readable"].
  return do_AddRef(aTransform.mReadable.get());
};

namespace streams_abstract {

// https://streams.spec.whatwg.org/#readable-stream-get-num-read-requests
double ReadableStreamGetNumReadRequests(ReadableStream* aStream) {
  // Step 1.
  MOZ_ASSERT(ReadableStreamHasDefaultReader(aStream));

  // Step 2.
  return double(aStream->GetDefaultReader()->ReadRequests().length());
}

// https://streams.spec.whatwg.org/#readable-stream-error
void ReadableStreamError(JSContext* aCx, ReadableStream* aStream,
                         JS::Handle<JS::Value> aValue, ErrorResult& aRv) {
  // Step 1.
  MOZ_ASSERT(aStream->State() == ReadableStream::ReaderState::Readable);

  // Step 2.
  aStream->SetState(ReadableStream::ReaderState::Errored);

  // Step 3.
  aStream->SetStoredError(aValue);

  // Step 4.
  ReadableStreamGenericReader* reader = aStream->GetReader();

  // Step 5.
  if (!reader) {
    return;
  }

  // Step 6.
  reader->ClosedPromise()->MaybeReject(aValue);

  // Step 7.
  reader->ClosedPromise()->SetSettledPromiseIsHandled();

  // Step 8.
  if (reader->IsDefault()) {
    // Step 8.1. Perform ! ReadableStreamDefaultReaderErrorReadRequests(reader,
    // e).
    RefPtr<ReadableStreamDefaultReader> defaultReader = reader->AsDefault();
    ReadableStreamDefaultReaderErrorReadRequests(aCx, defaultReader, aValue,
                                                 aRv);
    if (aRv.Failed()) {
      return;
    }
  } else {
    // Step 9. Otherwise,
    // Step 9.1. Assert: reader implements ReadableStreamBYOBReader.
    MOZ_ASSERT(reader->IsBYOB());

    // Step 9.2. Perform ! ReadableStreamBYOBReaderErrorReadIntoRequests(reader,
    // e).
    RefPtr<ReadableStreamBYOBReader> byobReader = reader->AsBYOB();
    ReadableStreamBYOBReaderErrorReadIntoRequests(aCx, byobReader, aValue, aRv);
    if (aRv.Failed()) {
      return;
    }
  }
}

// https://streams.spec.whatwg.org/#rs-default-controller-close
void ReadableStreamFulfillReadRequest(JSContext* aCx, ReadableStream* aStream,
                                      JS::Handle<JS::Value> aChunk, bool aDone,
                                      ErrorResult& aRv) {
  // Step 1.
  MOZ_ASSERT(ReadableStreamHasDefaultReader(aStream));

  // Step 2.
  ReadableStreamDefaultReader* reader = aStream->GetDefaultReader();

  // Step 3.
  MOZ_ASSERT(!reader->ReadRequests().isEmpty());

  // Step 4+5.
  RefPtr<ReadRequest> readRequest = reader->ReadRequests().popFirst();

  // Step 6.
  if (aDone) {
    readRequest->CloseSteps(aCx, aRv);
    if (aRv.Failed()) {
      return;
    }
  }

  // Step 7.
  readRequest->ChunkSteps(aCx, aChunk, aRv);
}

// https://streams.spec.whatwg.org/#readable-stream-add-read-request
void ReadableStreamAddReadRequest(ReadableStream* aStream,
                                  ReadRequest* aReadRequest) {
  // Step 1.
  MOZ_ASSERT(aStream->GetReader()->IsDefault());
  // Step 2.
  MOZ_ASSERT(aStream->State() == ReadableStream::ReaderState::Readable);
  // Step 3.
  aStream->GetDefaultReader()->ReadRequests().insertBack(aReadRequest);
}

}  // namespace streams_abstract

// https://streams.spec.whatwg.org/#abstract-opdef-readablestreamdefaulttee
// Step 14, 15
MOZ_CAN_RUN_SCRIPT already_AddRefed<Promise>
ReadableStreamDefaultTeeSourceAlgorithms::CancelCallback(
    JSContext* aCx, const Optional<JS::Handle<JS::Value>>& aReason,
    ErrorResult& aRv) {
  // Step 1.
  mTeeState->SetCanceled(mBranch, true);

  // Step 2.
  mTeeState->SetReason(mBranch, aReason.Value());

  // Step 3.

  if (mTeeState->Canceled(OtherTeeBranch(mBranch))) {
    // Step 3.1

    JS::Rooted<JSObject*> compositeReason(aCx, JS::NewArrayObject(aCx, 2));
    if (!compositeReason) {
      aRv.StealExceptionFromJSContext(aCx);
      return nullptr;
    }

    JS::Rooted<JS::Value> reason1(aCx, mTeeState->Reason1());
    if (!JS_SetElement(aCx, compositeReason, 0, reason1)) {
      aRv.StealExceptionFromJSContext(aCx);
      return nullptr;
    }

    JS::Rooted<JS::Value> reason2(aCx, mTeeState->Reason2());
    if (!JS_SetElement(aCx, compositeReason, 1, reason2)) {
      aRv.StealExceptionFromJSContext(aCx);
      return nullptr;
    }

    // Step 3.2
    JS::Rooted<JS::Value> compositeReasonValue(
        aCx, JS::ObjectValue(*compositeReason));
    RefPtr<ReadableStream> stream(mTeeState->GetStream());
    RefPtr<Promise> cancelResult =
        ReadableStreamCancel(aCx, stream, compositeReasonValue, aRv);
    if (aRv.Failed()) {
      return nullptr;
    }

    // Step 3.3
    mTeeState->CancelPromise()->MaybeResolve(cancelResult);
  }

  // Step 4.
  return do_AddRef(mTeeState->CancelPromise());
}

// https://streams.spec.whatwg.org/#abstract-opdef-readablestreamdefaulttee
MOZ_CAN_RUN_SCRIPT
static void ReadableStreamDefaultTee(JSContext* aCx, ReadableStream* aStream,
                                     bool aCloneForBranch2,
                                     nsTArray<RefPtr<ReadableStream>>& aResult,
                                     ErrorResult& aRv) {
  // Step 1. Implicit.
  // Step 2. Implicit.

  // Steps 3-12 are contained in the construction of Tee State.
  RefPtr<TeeState> teeState = TeeState::Create(aStream, aCloneForBranch2, aRv);
  if (aRv.Failed()) {
    return;
  }

  // Step 13 - 16
  auto branch1Algorithms = MakeRefPtr<ReadableStreamDefaultTeeSourceAlgorithms>(
      teeState, TeeBranch::Branch1);
  auto branch2Algorithms = MakeRefPtr<ReadableStreamDefaultTeeSourceAlgorithms>(
      teeState, TeeBranch::Branch2);

  // Step 17.
  nsCOMPtr<nsIGlobalObject> global(
      do_AddRef(teeState->GetStream()->GetParentObject()));
  teeState->SetBranch1(CreateReadableStream(aCx, global, branch1Algorithms,
                                            mozilla::Nothing(), nullptr, aRv));
  if (aRv.Failed()) {
    return;
  }

  // Step 18.
  teeState->SetBranch2(CreateReadableStream(aCx, global, branch2Algorithms,
                                            mozilla::Nothing(), nullptr, aRv));
  if (aRv.Failed()) {
    return;
  }

  // Step 19.
  teeState->GetReader()->ClosedPromise()->AddCallbacksWithCycleCollectedArgs(
      [](JSContext* aCx, JS::Handle<JS::Value> aValue, ErrorResult& aRv,
         TeeState* aTeeState) {},
      [](JSContext* aCx, JS::Handle<JS::Value> aReason, ErrorResult& aRv,
         TeeState* aTeeState) {
        // Step 19.1.
        ReadableStreamDefaultControllerError(
            aCx, aTeeState->Branch1()->DefaultController(), aReason, aRv);
        if (aRv.Failed()) {
          return;
        }

        // Step 19.2
        ReadableStreamDefaultControllerError(
            aCx, aTeeState->Branch2()->DefaultController(), aReason, aRv);
        if (aRv.Failed()) {
          return;
        }

        // Step 19.3
        if (!aTeeState->Canceled1() || !aTeeState->Canceled2()) {
          aTeeState->CancelPromise()->MaybeResolveWithUndefined();
        }
      },
      RefPtr(teeState));

  // Step 20.
  aResult.AppendElement(teeState->Branch1());
  aResult.AppendElement(teeState->Branch2());
}

// https://streams.spec.whatwg.org/#rs-pipe-to
already_AddRefed<Promise> ReadableStream::PipeTo(
    WritableStream& aDestination, const StreamPipeOptions& aOptions,
    ErrorResult& aRv) {
  // Step 1. If !IsReadableStreamLocked(this) is true, return a promise rejected
  // with a TypeError exception.
  if (IsReadableStreamLocked(this)) {
    aRv.ThrowTypeError("Cannot pipe from a locked stream.");
    return nullptr;
  }

  // Step 2. If !IsWritableStreamLocked(destination) is true, return a promise
  //         rejected with a TypeError exception.
  if (IsWritableStreamLocked(&aDestination)) {
    aRv.ThrowTypeError("Cannot pipe to a locked stream.");
    return nullptr;
  }

  // Step 3. Let signal be options["signal"] if it exists, or undefined
  // otherwise.
  RefPtr<AbortSignal> signal =
      aOptions.mSignal.WasPassed() ? &aOptions.mSignal.Value() : nullptr;

  // Step 4. Return ! ReadableStreamPipeTo(this, destination,
  // options["preventClose"], options["preventAbort"], options["preventCancel"],
  // signal).
  return ReadableStreamPipeTo(this, &aDestination, aOptions.mPreventClose,
                              aOptions.mPreventAbort, aOptions.mPreventCancel,
                              signal, aRv);
}

// https://streams.spec.whatwg.org/#readable-stream-tee
MOZ_CAN_RUN_SCRIPT
static void ReadableStreamTee(JSContext* aCx, ReadableStream* aStream,
                              bool aCloneForBranch2,
                              nsTArray<RefPtr<ReadableStream>>& aResult,
                              ErrorResult& aRv) {
  // Step 1. Implicit.
  // Step 2. Implicit.
  // Step 3.
  if (aStream->Controller()->IsByte()) {
    ReadableByteStreamTee(aCx, aStream, aResult, aRv);
    return;
  }
  // Step 4.
  ReadableStreamDefaultTee(aCx, aStream, aCloneForBranch2, aResult, aRv);
}

void ReadableStream::Tee(JSContext* aCx,
                         nsTArray<RefPtr<ReadableStream>>& aResult,
                         ErrorResult& aRv) {
  ReadableStreamTee(aCx, this, false, aResult, aRv);
}

void ReadableStream::IteratorData::Traverse(
    nsCycleCollectionTraversalCallback& cb) {
  ReadableStream::IteratorData* tmp = this;
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mReader);
}
void ReadableStream::IteratorData::Unlink() {
  ReadableStream::IteratorData* tmp = this;
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mReader);
}

// https://streams.spec.whatwg.org/#rs-get-iterator
void ReadableStream::InitAsyncIteratorData(
    IteratorData& aData, Iterator::IteratorType aType,
    const ReadableStreamIteratorOptions& aOptions, ErrorResult& aRv) {
  // Step 1. Let reader be ? AcquireReadableStreamDefaultReader(stream).
  RefPtr<ReadableStreamDefaultReader> reader =
      AcquireReadableStreamDefaultReader(this, aRv);
  if (aRv.Failed()) {
    return;
  }

  // Step 2. Set iterator’s reader to reader.
  aData.mReader = reader;

  // Step 3. Let preventCancel be args[0]["preventCancel"].
  // Step 4. Set iterator’s prevent cancel to preventCancel.
  aData.mPreventCancel = aOptions.mPreventCancel;
}

// https://streams.spec.whatwg.org/#rs-asynciterator-prototype-next
// Step 4.
struct IteratorReadRequest : public ReadRequest {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(IteratorReadRequest, ReadRequest)

  RefPtr<Promise> mPromise;
  RefPtr<ReadableStreamDefaultReader> mReader;

  explicit IteratorReadRequest(Promise* aPromise,
                               ReadableStreamDefaultReader* aReader)
      : mPromise(aPromise), mReader(aReader) {}

  // chunk steps, given chunk
  void ChunkSteps(JSContext* aCx, JS::Handle<JS::Value> aChunk,
                  ErrorResult& aRv) override {
    // Step 1. Resolve promise with chunk.
    mPromise->MaybeResolve(aChunk);
  }

  // close steps
  void CloseSteps(JSContext* aCx, ErrorResult& aRv) override {
    // Step 1. Perform ! ReadableStreamDefaultReaderRelease(reader).
    ReadableStreamDefaultReaderRelease(aCx, mReader, aRv);
    if (aRv.Failed()) {
      mPromise->MaybeRejectWithUndefined();
      return;
    }

    // Step 2. Resolve promise with end of iteration.
    iterator_utils::ResolvePromiseForFinished(mPromise);
  }

  // error steps, given e
  void ErrorSteps(JSContext* aCx, JS::Handle<JS::Value> aError,
                  ErrorResult& aRv) override {
    // Step 1. Perform ! ReadableStreamDefaultReaderRelease(reader).
    ReadableStreamDefaultReaderRelease(aCx, mReader, aRv);
    if (aRv.Failed()) {
      mPromise->MaybeRejectWithUndefined();
      return;
    }

    // Step 2. Reject promise with e.
    mPromise->MaybeReject(aError);
  }

 protected:
  virtual ~IteratorReadRequest() = default;
};

NS_IMPL_CYCLE_COLLECTION_INHERITED(IteratorReadRequest, ReadRequest, mPromise,
                                   mReader)

NS_IMPL_ADDREF_INHERITED(IteratorReadRequest, ReadRequest)
NS_IMPL_RELEASE_INHERITED(IteratorReadRequest, ReadRequest)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(IteratorReadRequest)
NS_INTERFACE_MAP_END_INHERITING(ReadRequest)

// https://streams.spec.whatwg.org/#rs-asynciterator-prototype-next
already_AddRefed<Promise> ReadableStream::GetNextIterationResult(
    Iterator* aIterator, ErrorResult& aRv) {
  // Step 1. Let reader be iterator’s reader.
  RefPtr<ReadableStreamDefaultReader> reader = aIterator->Data().mReader;

  // Step 2. Assert: reader.[[stream]] is not undefined.
  MOZ_ASSERT(reader->GetStream());

  // Step 3. Let promise be a new promise.
  RefPtr<Promise> promise = Promise::CreateInfallible(GetParentObject());

  // Step 4. Let readRequest be a new read request with the following items:
  RefPtr<ReadRequest> request = new IteratorReadRequest(promise, reader);

  // Step 5. Perform ! ReadableStreamDefaultReaderRead(this, readRequest).
  AutoJSAPI jsapi;
  if (!jsapi.Init(mGlobal)) {
    aRv.ThrowUnknownError("Internal error");
    return nullptr;
  }

  ReadableStreamDefaultReaderRead(jsapi.cx(), reader, request, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Step 6. Return promise.
  return promise.forget();
}

// https://streams.spec.whatwg.org/#rs-asynciterator-prototype-return
already_AddRefed<Promise> ReadableStream::IteratorReturn(
    JSContext* aCx, Iterator* aIterator, JS::Handle<JS::Value> aValue,
    ErrorResult& aRv) {
  // Step 1. Let reader be iterator’s reader.
  RefPtr<ReadableStreamDefaultReader> reader = aIterator->Data().mReader;

  // Step 2. Assert: reader.[[stream]] is not undefined.
  MOZ_ASSERT(reader->GetStream());

  // Step 3. Assert: reader.[[readRequests]] is empty, as the async iterator
  // machinery guarantees that any previous calls to next() have settled before
  // this is called.
  MOZ_ASSERT(reader->ReadRequests().isEmpty());

  // Step 4. If iterator’s prevent cancel is false:
  if (!aIterator->Data().mPreventCancel) {
    // Step 4.1. Let result be ! ReadableStreamReaderGenericCancel(reader, arg).
    RefPtr<ReadableStream> stream(reader->GetStream());
    RefPtr<Promise> result = ReadableStreamCancel(aCx, stream, aValue, aRv);
    if (NS_WARN_IF(aRv.Failed())) {
      return nullptr;
    }

    // Step 4.2. Perform ! ReadableStreamDefaultReaderRelease(reader).
    ReadableStreamDefaultReaderRelease(aCx, reader, aRv);
    if (NS_WARN_IF(aRv.Failed())) {
      return nullptr;
    }

    // Step 4.3. Return result.
    return result.forget();
  }

  // Step 5. Perform ! ReadableStreamDefaultReaderRelease(reader).
  ReadableStreamDefaultReaderRelease(aCx, reader, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  // Step 6. Return a promise resolved with undefined.
  return Promise::CreateResolvedWithUndefined(GetParentObject(), aRv);
}

namespace streams_abstract {

// https://streams.spec.whatwg.org/#readable-stream-add-read-into-request
void ReadableStreamAddReadIntoRequest(ReadableStream* aStream,
                                      ReadIntoRequest* aReadIntoRequest) {
  // Step 1. Assert: stream.[[reader]] implements ReadableStreamBYOBReader.
  MOZ_ASSERT(aStream->GetReader()->IsBYOB());

  // Step 2. Assert: stream.[[state]] is "readable" or "closed".
  MOZ_ASSERT(aStream->State() == ReadableStream::ReaderState::Readable ||
             aStream->State() == ReadableStream::ReaderState::Closed);

  // Step 3. Append readRequest to stream.[[reader]].[[readIntoRequests]].
  aStream->GetReader()->AsBYOB()->ReadIntoRequests().insertBack(
      aReadIntoRequest);
}

// https://streams.spec.whatwg.org/#abstract-opdef-createreadablebytestream
already_AddRefed<ReadableStream> CreateReadableByteStream(
    JSContext* aCx, nsIGlobalObject* aGlobal,
    UnderlyingSourceAlgorithmsBase* aAlgorithms, ErrorResult& aRv) {
  // Step 1. Let stream be a new ReadableStream.
  RefPtr<ReadableStream> stream = new ReadableStream(aGlobal);

  // Step 2. Perform ! InitializeReadableStream(stream).
  InitializeReadableStream(stream);

  // Step 3. Let controller be a new ReadableByteStreamController.
  RefPtr<ReadableByteStreamController> controller =
      new ReadableByteStreamController(aGlobal);

  // Step 4. Perform ? SetUpReadableByteStreamController(stream, controller,
  // startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, undefined).
  SetUpReadableByteStreamController(aCx, stream, controller, aAlgorithms, 0,
                                    mozilla::Nothing(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  // Return stream.
  return stream.forget();
}

}  // namespace streams_abstract

// https://streams.spec.whatwg.org/#readablestream-set-up
// (except this instead creates a new ReadableStream rather than accepting an
// existing instance)
already_AddRefed<ReadableStream> ReadableStream::CreateNative(
    JSContext* aCx, nsIGlobalObject* aGlobal,
    UnderlyingSourceAlgorithmsWrapper& aAlgorithms,
    mozilla::Maybe<double> aHighWaterMark, QueuingStrategySize* aSizeAlgorithm,
    ErrorResult& aRv) {
  // an optional number highWaterMark (default 1)
  double highWaterMark = aHighWaterMark.valueOr(1);
  // and if given, highWaterMark must be a non-negative, non-NaN number.
  MOZ_ASSERT(IsNonNegativeNumber(highWaterMark));

  // Step 1: Let startAlgorithm be an algorithm that returns undefined.
  // Step 2: Let pullAlgorithmWrapper be an algorithm that runs these steps:
  // Step 3: Let cancelAlgorithmWrapper be an algorithm that runs these steps:
  // (Done by UnderlyingSourceAlgorithmsWrapper)

  // Step 4: If sizeAlgorithm was not given, then set it to an algorithm that
  // returns 1. (Callers will treat nullptr as such, see
  // ReadableStream::Constructor for details)

  // Step 5: Perform ! InitializeReadableStream(stream).
  auto stream = MakeRefPtr<ReadableStream>(aGlobal);

  // Step 6: Let controller be a new ReadableStreamDefaultController.
  auto controller = MakeRefPtr<ReadableStreamDefaultController>(aGlobal);

  // Step 7: Perform ! SetUpReadableStreamDefaultController(stream, controller,
  // startAlgorithm, pullAlgorithmWrapper, cancelAlgorithmWrapper,
  // highWaterMark, sizeAlgorithm).
  SetUpReadableStreamDefaultController(aCx, stream, controller, &aAlgorithms,
                                       highWaterMark, aSizeAlgorithm, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  return stream.forget();
}

// https://streams.spec.whatwg.org/#readablestream-set-up-with-byte-reading-support
// (except this instead creates a new ReadableStream rather than accepting an
// existing instance)
already_AddRefed<ReadableStream> ReadableStream::CreateByteNative(
    JSContext* aCx, nsIGlobalObject* aGlobal,
    UnderlyingSourceAlgorithmsWrapper& aAlgorithms,
    mozilla::Maybe<double> aHighWaterMark, ErrorResult& aRv) {
  // an optional number highWaterMark (default 0)
  double highWaterMark = aHighWaterMark.valueOr(0);

  // Step 1: Let startAlgorithm be an algorithm that returns undefined.
  // Step 2: Let pullAlgorithmWrapper be an algorithm that runs these steps:
  // Step 3: Let cancelAlgorithmWrapper be an algorithm that runs these steps:
  // (Done by UnderlyingSourceAlgorithmsWrapper)

  // Step 4: Perform ! InitializeReadableStream(stream).
  auto stream = MakeRefPtr<ReadableStream>(aGlobal);

  // Step 5: Let controller be a new ReadableByteStreamController.
  auto controller = MakeRefPtr<ReadableByteStreamController>(aGlobal);

  // Step 6: Perform ! SetUpReadableByteStreamController(stream, controller,
  // startAlgorithm, pullAlgorithmWrapper, cancelAlgorithmWrapper,
  // highWaterMark, undefined).
  SetUpReadableByteStreamController(aCx, stream, controller, &aAlgorithms,
                                    highWaterMark, Nothing(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  return stream.forget();
}

// https://streams.spec.whatwg.org/#readablestream-close
void ReadableStream::CloseNative(JSContext* aCx, ErrorResult& aRv) {
  MOZ_ASSERT(mController->GetAlgorithms()->IsNative());

  // Step 1: If stream.[[controller]] implements ReadableByteStreamController,
  if (mController->IsByte()) {
    RefPtr<ReadableByteStreamController> controller = mController->AsByte();

    // Step 1.1: Perform !
    // ReadableByteStreamControllerClose(stream.[[controller]]).
    ReadableByteStreamControllerClose(aCx, controller, aRv);
    if (aRv.Failed()) {
      return;
    }

    // Step 1.2: If stream.[[controller]].[[pendingPullIntos]] is not empty,
    // perform ! ReadableByteStreamControllerRespond(stream.[[controller]], 0).
    if (!controller->PendingPullIntos().isEmpty()) {
      ReadableByteStreamControllerRespond(aCx, controller, 0, aRv);
    }
    return;
  }

  // Step 2: Otherwise, perform !
  // ReadableStreamDefaultControllerClose(stream.[[controller]]).
  RefPtr<ReadableStreamDefaultController> controller = mController->AsDefault();
  ReadableStreamDefaultControllerClose(aCx, controller, aRv);
}

// https://streams.spec.whatwg.org/#readablestream-error
void ReadableStream::ErrorNative(JSContext* aCx, JS::Handle<JS::Value> aError,
                                 ErrorResult& aRv) {
  // Step 1: If stream.[[controller]] implements ReadableByteStreamController,
  // then perform ! ReadableByteStreamControllerError(stream.[[controller]], e).
  if (mController->IsByte()) {
    ReadableByteStreamControllerError(mController->AsByte(), aError, aRv);
    return;
  }
  // Step 2: Otherwise, perform !
  // ReadableStreamDefaultControllerError(stream.[[controller]], e).
  ReadableStreamDefaultControllerError(aCx, mController->AsDefault(), aError,
                                       aRv);
}

// https://streams.spec.whatwg.org/#readablestream-current-byob-request-view
static void CurrentBYOBRequestView(JSContext* aCx,
                                   ReadableByteStreamController& aController,
                                   JS::MutableHandle<JSObject*> aRetVal,
                                   ErrorResult& aRv) {
  // Step 1. Assert: stream.[[controller]] implements
  // ReadableByteStreamController. (implicit)

  // Step 2: Let byobRequest be !
  // ReadableByteStreamControllerGetBYOBRequest(stream.[[controller]]).
  RefPtr<ReadableStreamBYOBRequest> byobRequest =
      ReadableByteStreamControllerGetBYOBRequest(aCx, &aController, aRv);
  // Step 3: If byobRequest is null, then return null.
  if (!byobRequest) {
    aRetVal.set(nullptr);
    return;
  }
  // Step 4: Return byobRequest.[[view]].
  byobRequest->GetView(aCx, aRetVal);
}

static bool HasSameBufferView(JSContext* aCx, JS::Handle<JSObject*> aX,
                              JS::Handle<JSObject*> aY, ErrorResult& aRv) {
  bool isShared;
  JS::Rooted<JSObject*> viewedBufferX(
      aCx, JS_GetArrayBufferViewBuffer(aCx, aX, &isShared));
  if (!viewedBufferX) {
    aRv.StealExceptionFromJSContext(aCx);
    return false;
  }

  JS::Rooted<JSObject*> viewedBufferY(
      aCx, JS_GetArrayBufferViewBuffer(aCx, aY, &isShared));
  if (!viewedBufferY) {
    aRv.StealExceptionFromJSContext(aCx);
    return false;
  }

  return viewedBufferX == viewedBufferY;
}

// https://streams.spec.whatwg.org/#readablestream-enqueue
void ReadableStream::EnqueueNative(JSContext* aCx, JS::Handle<JS::Value> aChunk,
                                   ErrorResult& aRv) {
  MOZ_ASSERT(mController->GetAlgorithms()->IsNative());

  // Step 1: If stream.[[controller]] implements
  // ReadableStreamDefaultController,
  if (mController->IsDefault()) {
    // Step 1.1: Perform !
    // ReadableStreamDefaultControllerEnqueue(stream.[[controller]], chunk).
    RefPtr<ReadableStreamDefaultController> controller =
        mController->AsDefault();
    ReadableStreamDefaultControllerEnqueue(aCx, controller, aChunk, aRv);
    return;
  }

  // Step 2.1: Assert: stream.[[controller]] implements
  // ReadableByteStreamController.
  MOZ_ASSERT(mController->IsByte());
  RefPtr<ReadableByteStreamController> controller = mController->AsByte();

  // Step 2.2: Assert: chunk is an ArrayBufferView.
  MOZ_ASSERT(aChunk.isObject() &&
             JS_IsArrayBufferViewObject(&aChunk.toObject()));
  JS::Rooted<JSObject*> chunk(aCx, &aChunk.toObject());

  // Step 3: Let byobView be the current BYOB request view for stream.
  JS::Rooted<JSObject*> byobView(aCx);
  CurrentBYOBRequestView(aCx, *controller, &byobView, aRv);
  if (aRv.Failed()) {
    return;
  }

  // Step 4: If byobView is non-null, and chunk.[[ViewedArrayBuffer]] is
  // byobView.[[ViewedArrayBuffer]], then:
  if (byobView && HasSameBufferView(aCx, chunk, byobView, aRv)) {
    // Step 4.1: Assert: chunk.[[ByteOffset]] is byobView.[[ByteOffset]].
    MOZ_ASSERT(JS_GetArrayBufferViewByteOffset(chunk) ==
               JS_GetArrayBufferViewByteOffset(byobView));
    // Step 4.2: Assert: chunk.[[ByteLength]] ≤ byobView.[[ByteLength]].
    MOZ_ASSERT(JS_GetArrayBufferViewByteLength(chunk) ==
               JS_GetArrayBufferViewByteLength(byobView));
    // Step 4.3: Perform ?
    // ReadableByteStreamControllerRespond(stream.[[controller]],
    // chunk.[[ByteLength]]).
    ReadableByteStreamControllerRespond(
        aCx, controller, JS_GetArrayBufferViewByteLength(chunk), aRv);
    return;
  }

  if (aRv.Failed()) {
    return;
  }

  // Step 5: Otherwise, perform ?
  // ReadableByteStreamControllerEnqueue(stream.[[controller]], chunk).
  ReadableByteStreamControllerEnqueue(aCx, controller, chunk, aRv);
}

// https://streams.spec.whatwg.org/#readablestream-get-a-reader
// To get a reader for a ReadableStream stream, return ?
// AcquireReadableStreamDefaultReader(stream). The result will be a
// ReadableStreamDefaultReader.
already_AddRefed<mozilla::dom::ReadableStreamDefaultReader>
ReadableStream::GetReader(ErrorResult& aRv) {
  return AcquireReadableStreamDefaultReader(this, aRv);
}

}  // namespace mozilla::dom

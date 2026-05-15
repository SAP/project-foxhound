/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BaseAlgorithms.h"

#include "mozilla/dom/BufferSourceBinding.h"
#include "mozilla/dom/BufferSourceBindingFwd.h"
#include "mozilla/dom/TransformStreamDefaultController.h"
#include "mozilla/dom/UnionTypes.h"

namespace mozilla::dom::compression {

// Step 3 of
// https://compression.spec.whatwg.org/#dom-compressionstream-compressionstream
// Let transformAlgorithm be an algorithm which takes a chunk argument and
// runs the compress and enqueue a chunk algorithm with this and chunk.
MOZ_CAN_RUN_SCRIPT
void CompressionStreamAlgorithms::TransformCallbackImpl(
    JS::Handle<JS::Value> aChunk, TransformStreamDefaultController& aController,
    ErrorResult& aRv) {
  AutoJSAPI jsapi;
  if (!jsapi.Init(aController.GetParentObject())) {
    aRv.ThrowUnknownError("Internal error");
    return;
  }
  JSContext* cx = jsapi.cx();

  // https://compression.spec.whatwg.org/#compress-and-enqueue-a-chunk

  // Step 1: If chunk is not a BufferSource type, then throw a TypeError.
  RootedUnion<OwningBufferSource> bufferSource(cx);
  if (!bufferSource.Init(cx, aChunk)) {
    aRv.MightThrowJSException();
    aRv.StealExceptionFromJSContext(cx);
    return;
  }

  // Step 2 - 5: (Done in CompressAndEnqueue)
  ProcessTypedArraysFixed(
      bufferSource,
      [&](const Span<uint8_t>& aData) MOZ_CAN_RUN_SCRIPT_BOUNDARY {
        CompressAndEnqueue(cx, aData, Flush::No, aController, aRv);
      });
}

// Step 4 of
// https://compression.spec.whatwg.org/#dom-compressionstream-compressionstream
// Let flushAlgorithm be an algorithm which takes no argument and runs the
// compress flush and enqueue algorithm with this.
MOZ_CAN_RUN_SCRIPT void CompressionStreamAlgorithms::FlushCallbackImpl(
    TransformStreamDefaultController& aController, ErrorResult& aRv) {
  AutoJSAPI jsapi;
  if (!jsapi.Init(aController.GetParentObject())) {
    aRv.ThrowUnknownError("Internal error");
    return;
  }
  JSContext* cx = jsapi.cx();

  // https://compression.spec.whatwg.org/#compress-flush-and-enqueue

  // Step 1 - 4: (Done in CompressAndEnqueue)
  CompressAndEnqueue(cx, Span<const uint8_t>(), Flush::Yes, aController, aRv);
}

// Shared by:
// https://compression.spec.whatwg.org/#compress-and-enqueue-a-chunk
// https://compression.spec.whatwg.org/#compress-flush-and-enqueue
MOZ_CAN_RUN_SCRIPT void CompressionStreamAlgorithms::CompressAndEnqueue(
    JSContext* aCx, Span<const uint8_t> aInput, Flush aFlush,
    TransformStreamDefaultController& aController, ErrorResult& aRv) {
  MOZ_ASSERT_IF(aFlush == Flush::Yes, !aInput.Length());

  JS::RootedVector<JSObject*> array(aCx);

  // Step 2: Let buffer be the result of compressing chunk with cs’s
  // format and context.
  // Step 3: If buffer is empty, return. (implicit as array will be empty then)
  // Step 4: Let arrays be the result of buffer into one or more non-empty
  // pieces and converting them into Uint8Arrays.
  Compress(aCx, aInput, &array, aFlush, aRv);
  if (aRv.Failed()) {
    return;
  }

  // Step 5: For each Uint8Array array, enqueue array in cs's transform.
  for (const auto& view : array) {
    JS::Rooted<JS::Value> value(aCx, JS::ObjectValue(*view));
    aController.Enqueue(aCx, value, aRv);
    if (aRv.Failed()) {
      return;
    }
  }
}

// Step 3 of
// https://compression.spec.whatwg.org/#dom-decompressionstream-decompressionstream
// Let transformAlgorithm be an algorithm which takes a chunk argument and
// runs the compress and enqueue a chunk algorithm with this and chunk.
MOZ_CAN_RUN_SCRIPT
void DecompressionStreamAlgorithms::TransformCallbackImpl(
    JS::Handle<JS::Value> aChunk, TransformStreamDefaultController& aController,
    ErrorResult& aRv) {
  AutoJSAPI jsapi;
  if (!jsapi.Init(aController.GetParentObject())) {
    aRv.ThrowUnknownError("Internal error");
    return;
  }
  JSContext* cx = jsapi.cx();

  // https://compression.spec.whatwg.org/#decompress-and-enqueue-a-chunk

  // Step 1: If chunk is not a BufferSource type, then throw a TypeError.
  RootedUnion<OwningBufferSource> bufferSource(cx);
  if (!bufferSource.Init(cx, aChunk)) {
    aRv.MightThrowJSException();
    aRv.StealExceptionFromJSContext(cx);
    return;
  }

  // Step 2: Let buffer be the result of decompressing chunk with ds's format
  // and context. If this results in an error, then throw a TypeError.
  // Step 3 - 5: (Done in DecompressAndEnqueue)
  ProcessTypedArraysFixed(
      bufferSource,
      [&](const Span<uint8_t>& aData) MOZ_CAN_RUN_SCRIPT_BOUNDARY {
        DecompressAndEnqueue(cx, aData, Flush::No, aController, aRv);
      });
}

// Step 4 of
// https://compression.spec.whatwg.org/#dom-decompressionstream-decompressionstream
// Let flushAlgorithm be an algorithm which takes no argument and runs the
// compress flush and enqueue algorithm with this.
MOZ_CAN_RUN_SCRIPT void DecompressionStreamAlgorithms::FlushCallbackImpl(
    TransformStreamDefaultController& aController, ErrorResult& aRv) {
  AutoJSAPI jsapi;
  if (!jsapi.Init(aController.GetParentObject())) {
    aRv.ThrowUnknownError("Internal error");
    return;
  }
  JSContext* cx = jsapi.cx();

  // https://compression.spec.whatwg.org/#decompress-flush-and-enqueue

  // Step 1: Let buffer be the result of decompressing an empty input with
  // ds's format and context, with the finish flag.
  // Step 2 - 6: (Done in DecompressAndEnqueue)
  DecompressAndEnqueue(cx, Span<const uint8_t>(), Flush::Yes, aController, aRv);
}

// Shared by:
// https://compression.spec.whatwg.org/#decompress-and-enqueue-a-chunk
// https://compression.spec.whatwg.org/#decompress-flush-and-enqueue
MOZ_CAN_RUN_SCRIPT void DecompressionStreamAlgorithms::DecompressAndEnqueue(
    JSContext* aCx, Span<const uint8_t> aInput, Flush aFlush,
    TransformStreamDefaultController& aController, ErrorResult& aRv) {
  MOZ_ASSERT_IF(aFlush == Flush::Yes, !aInput.Length());

  JS::RootedVector<JSObject*> array(aCx);

  // Step 2: Let buffer be the result of decompressing chunk with ds’s format
  // and context. If this results in an error, then throw a TypeError.
  // Step 3: If buffer is empty, return.
  // (Skipping, see https://github.com/whatwg/compression/issues/78)
  // Step 4: Let arrays be the result of splitting buffer into one or more
  // non-empty pieces and converting them into Uint8Arrays.
  bool fullyConsumed = Decompress(aCx, aInput, &array, aFlush, aRv);
  if (aRv.Failed()) {
    return;
  }

  // Step 5: For each Uint8Array array, enqueue array in ds's transform.
  for (const auto& view : array) {
    JS::Rooted<JS::Value> value(aCx, JS::ObjectValue(*view));
    aController.Enqueue(aCx, value, aRv);
    if (aRv.Failed()) {
      return;
    }
  }

  // Step 6: If the end of the compressed input has been reached, and ds's
  // context has not fully consumed chunk, then throw a TypeError.
  if (mObservedStreamEnd && !fullyConsumed) {
    aRv.ThrowTypeError("Unexpected input after the end of stream");
    return;
  }

  // Step 3 of
  // https://compression.spec.whatwg.org/#decompress-flush-and-enqueue
  // If the end of the compressed input has not been reached, then throw a
  // TypeError.
  if (aFlush == Flush::Yes && !mObservedStreamEnd) {
    aRv.ThrowTypeError("The input is ended without reaching the stream end");
    return;
  }
}

}  // namespace mozilla::dom::compression

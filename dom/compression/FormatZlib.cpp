/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FormatZlib.h"

#include "BaseAlgorithms.h"
#include "mozilla/dom/CompressionStreamBinding.h"
#include "mozilla/dom/TransformStreamDefaultController.h"

namespace mozilla::dom::compression {

NS_IMPL_CYCLE_COLLECTION_INHERITED(ZLibCompressionStreamAlgorithms,
                                   TransformerAlgorithmsBase)
NS_IMPL_ADDREF_INHERITED(ZLibCompressionStreamAlgorithms,
                         TransformerAlgorithmsBase)
NS_IMPL_RELEASE_INHERITED(ZLibCompressionStreamAlgorithms,
                          TransformerAlgorithmsBase)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ZLibCompressionStreamAlgorithms)
NS_INTERFACE_MAP_END_INHERITING(TransformerAlgorithmsBase)

NS_IMPL_CYCLE_COLLECTION_INHERITED(ZLibDecompressionStreamAlgorithms,
                                   TransformerAlgorithmsBase)
NS_IMPL_ADDREF_INHERITED(ZLibDecompressionStreamAlgorithms,
                         TransformerAlgorithmsBase)
NS_IMPL_RELEASE_INHERITED(ZLibDecompressionStreamAlgorithms,
                          TransformerAlgorithmsBase)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ZLibDecompressionStreamAlgorithms)
NS_INTERFACE_MAP_END_INHERITING(TransformerAlgorithmsBase)

inline uint8_t intoZLibFlush(Flush aFlush) {
  switch (aFlush) {
    case Flush::No: {
      return Z_NO_FLUSH;
    }
    case Flush::Yes: {
      return Z_FINISH;
    }
    default: {
      MOZ_ASSERT_UNREACHABLE("Unknown flush mode");
      return Z_NO_FLUSH;
    }
  }
}

// From the docs in
// https://searchfox.org/mozilla-central/source/modules/zlib/src/zlib.h
inline int8_t ZLibWindowBits(CompressionFormat format) {
  switch (format) {
    case CompressionFormat::Deflate:
      // The windowBits parameter is the base two logarithm of the window size
      // (the size of the history buffer). It should be in the range 8..15 for
      // this version of the library. Larger values of this parameter result
      // in better compression at the expense of memory usage.
      return 15;
    case CompressionFormat::Deflate_raw:
      // windowBits can also be –8..–15 for raw deflate. In this case,
      // -windowBits determines the window size.
      return -15;
    case CompressionFormat::Gzip:
      // windowBits can also be greater than 15 for optional gzip encoding.
      // Add 16 to windowBits to write a simple gzip header and trailer around
      // the compressed data instead of a zlib wrapper.
      return 31;
    default:
      MOZ_ASSERT_UNREACHABLE("Unknown compression format");
      return 0;
  }
}

Result<already_AddRefed<ZLibCompressionStreamAlgorithms>, nsresult>
ZLibCompressionStreamAlgorithms::Create(CompressionFormat format) {
  RefPtr<ZLibCompressionStreamAlgorithms> alg =
      new ZLibCompressionStreamAlgorithms();
  MOZ_TRY(alg->Init(format));
  return alg.forget();
}

[[nodiscard]] nsresult ZLibCompressionStreamAlgorithms::Init(
    CompressionFormat format) {
  int8_t err = deflateInit2(&mZStream, Z_DEFAULT_COMPRESSION, Z_DEFLATED,
                            ZLibWindowBits(format), 8 /* default memLevel */,
                            Z_DEFAULT_STRATEGY);
  if (err == Z_MEM_ERROR) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  MOZ_ASSERT(err == Z_OK);
  return NS_OK;
}

// Shared by:
// https://wicg.github.io/compression/#compress-and-enqueue-a-chunk
// https://wicg.github.io/compression/#compress-flush-and-enqueue
void ZLibCompressionStreamAlgorithms::Compress(
    JSContext* aCx, Span<const uint8_t> aInput,
    JS::MutableHandleVector<JSObject*> aOutput, Flush aFlush,
    ErrorResult& aRv) {
  mZStream.avail_in = aInput.Length();
  mZStream.next_in = const_cast<uint8_t*>(aInput.Elements());

  do {
    static uint16_t kBufferSize = 16384;
    UniquePtr<uint8_t[], JS::FreePolicy> buffer(
        static_cast<uint8_t*>(JS_malloc(aCx, kBufferSize)));
    if (!buffer) {
      aRv.ThrowTypeError("Out of memory");
      return;
    }

    mZStream.avail_out = kBufferSize;
    mZStream.next_out = buffer.get();

    int8_t err = deflate(&mZStream, intoZLibFlush(aFlush));

    // From the manual: deflate() returns ...
    switch (err) {
      case Z_OK:
      case Z_STREAM_END:
      case Z_BUF_ERROR:
        // * Z_OK if some progress has been made
        // * Z_STREAM_END if all input has been consumed and all output has
        // been produced (only when flush is set to Z_FINISH)
        // * Z_BUF_ERROR if no progress is possible (for example avail_in or
        // avail_out was zero). Note that Z_BUF_ERROR is not fatal, and
        // deflate() can be called again with more input and more output space
        // to continue compressing.
        //
        // (But of course no input should be given after Z_FINISH)
        break;
      case Z_STREAM_ERROR:
      default:
        // * Z_STREAM_ERROR if the stream state was inconsistent
        // (which is fatal)
        MOZ_ASSERT_UNREACHABLE("Unexpected compression error code");
        aRv.ThrowTypeError("Unexpected compression error");
        return;
    }

    // Stream should end only when flushed, see above
    // The reverse is not true as zlib may have big data to be flushed that is
    // larger than the buffer size
    MOZ_ASSERT_IF(err == Z_STREAM_END, aFlush == Flush::Yes);

    // At this point we either exhausted the input or the output buffer
    MOZ_ASSERT(!mZStream.avail_in || !mZStream.avail_out);

    size_t written = kBufferSize - mZStream.avail_out;
    if (!written) {
      break;
    }

    // Step 3: If buffer is empty, return.
    // (We'll implicitly return when the array is empty.)

    // Step 4: Split buffer into one or more non-empty pieces and convert them
    // into Uint8Arrays.
    // (The buffer is 'split' by having a fixed sized buffer above.)

    JS::Rooted<JSObject*> view(aCx, nsJSUtils::MoveBufferAsUint8Array(
                                        aCx, written, std::move(buffer)));
    if (!view || !aOutput.append(view)) {
      JS_ClearPendingException(aCx);
      aRv.ThrowTypeError("Out of memory");
      return;
    }
  } while (mZStream.avail_out == 0);
  // From the manual:
  // If deflate returns with avail_out == 0, this function must be called
  // again with the same value of the flush parameter and more output space
  // (updated avail_out)
}

ZLibCompressionStreamAlgorithms::~ZLibCompressionStreamAlgorithms() {
  deflateEnd(&mZStream);
};

Result<already_AddRefed<ZLibDecompressionStreamAlgorithms>, nsresult>
ZLibDecompressionStreamAlgorithms::Create(CompressionFormat format) {
  RefPtr<ZLibDecompressionStreamAlgorithms> alg =
      new ZLibDecompressionStreamAlgorithms();
  MOZ_TRY(alg->Init(format));
  return alg.forget();
}

[[nodiscard]] nsresult ZLibDecompressionStreamAlgorithms::Init(
    CompressionFormat format) {
  int8_t err = inflateInit2(&mZStream, ZLibWindowBits(format));
  if (err == Z_MEM_ERROR) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  MOZ_ASSERT(err == Z_OK);
  return NS_OK;
}

// Shared by:
// https://wicg.github.io/compression/#decompress-and-enqueue-a-chunk
// https://wicg.github.io/compression/#decompress-flush-and-enqueue
// All data errors throw TypeError by step 2: If this results in an error,
// then throw a TypeError.
bool ZLibDecompressionStreamAlgorithms::Decompress(
    JSContext* aCx, Span<const uint8_t> aInput,
    JS::MutableHandleVector<JSObject*> aOutput, Flush aFlush,
    ErrorResult& aRv) {
  mZStream.avail_in = aInput.Length();
  mZStream.next_in = const_cast<uint8_t*>(aInput.Elements());

  do {
    UniquePtr<uint8_t[], JS::FreePolicy> buffer(
        static_cast<uint8_t*>(JS_malloc(aCx, kBufferSize)));
    if (!buffer) {
      aRv.ThrowTypeError("Out of memory");
      return false;
    }

    mZStream.avail_out = kBufferSize;
    mZStream.next_out = buffer.get();

    int8_t err = inflate(&mZStream, intoZLibFlush(aFlush));

    // From the manual: inflate() returns ...
    switch (err) {
      case Z_DATA_ERROR:
        // Z_DATA_ERROR if the input data was corrupted (input stream not
        // conforming to the zlib format or incorrect check value, in which
        // case strm->msg points to a string with a more specific error)
        aRv.ThrowTypeError("The input data is corrupted: "_ns +
                           nsDependentCString(mZStream.msg));
        return false;
      case Z_MEM_ERROR:
        // Z_MEM_ERROR if there was not enough memory
        aRv.ThrowTypeError("Out of memory");
        return false;
      case Z_NEED_DICT:
        // Z_NEED_DICT if a preset dictionary is needed at this point
        //
        // From the `deflate` section of
        // https://wicg.github.io/compression/#supported-formats:
        // * The FDICT flag is not supported by these APIs, and will error the
        // stream if set.
        // And FDICT means preset dictionary per
        // https://datatracker.ietf.org/doc/html/rfc1950#page-5.
        aRv.ThrowTypeError(
            "The stream needs a preset dictionary but such setup is "
            "unsupported");
        return false;
      case Z_STREAM_END:
        // Z_STREAM_END if the end of the compressed data has been reached and
        // all uncompressed output has been produced
        //
        // https://wicg.github.io/compression/#supported-formats has error
        // conditions for each compression format when additional input comes
        // after stream end.
        // Note that additional calls for inflate() immediately emits
        // Z_STREAM_END after this point.
        mObservedStreamEnd = true;
        break;
      case Z_OK:
      case Z_BUF_ERROR:
        // * Z_OK if some progress has been made
        // * Z_BUF_ERROR if no progress was possible or if there was not
        // enough room in the output buffer when Z_FINISH is used. Note that
        // Z_BUF_ERROR is not fatal, and inflate() can be called again with
        // more input and more output space to continue decompressing.
        //
        // (But of course no input should be given after Z_FINISH)
        break;
      case Z_STREAM_ERROR:
      default:
        // * Z_STREAM_ERROR if the stream state was inconsistent
        // (which is fatal)
        MOZ_ASSERT_UNREACHABLE("Unexpected decompression error code");
        aRv.ThrowTypeError("Unexpected decompression error");
        return false;
    }

    // At this point we either exhausted the input or the output buffer, or
    // met the stream end.
    MOZ_ASSERT(!mZStream.avail_in || !mZStream.avail_out || mObservedStreamEnd);

    size_t written = kBufferSize - mZStream.avail_out;
    if (!written) {
      break;
    }

    // Step 3: If buffer is empty, return.
    // (We'll implicitly return when the array is empty.)

    // Step 4: Split buffer into one or more non-empty pieces and convert them
    // into Uint8Arrays.
    // (The buffer is 'split' by having a fixed sized buffer above.)

    JS::Rooted<JSObject*> view(aCx, nsJSUtils::MoveBufferAsUint8Array(
                                        aCx, written, std::move(buffer)));
    if (!view || !aOutput.append(view)) {
      JS_ClearPendingException(aCx);
      aRv.ThrowTypeError("Out of memory");
      return false;
    }
  } while (mZStream.avail_out == 0 && !mObservedStreamEnd);
  // From the manual:
  // * It must update next_out and avail_out when avail_out has dropped to
  // zero.
  // * inflate() should normally be called until it returns Z_STREAM_END or an
  // error.

  return mZStream.avail_in == 0;
}

ZLibDecompressionStreamAlgorithms::~ZLibDecompressionStreamAlgorithms() {
  inflateEnd(&mZStream);
}

}  // namespace mozilla::dom::compression

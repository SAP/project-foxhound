/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CompressionStream.h"

#include "FormatBrotli.h"
#include "FormatZlib.h"
#include "js/TypeDecls.h"
#include "mozilla/dom/CompressionStreamBinding.h"
#include "mozilla/dom/ReadableStream.h"
#include "mozilla/dom/TextDecoderStream.h"
#include "mozilla/dom/TransformStream.h"
#include "mozilla/dom/WritableStream.h"

// See the zlib manual in https://www.zlib.net/manual.html or in
// https://searchfox.org/mozilla-central/source/modules/zlib/src/zlib.h

namespace mozilla::dom {
using namespace compression;

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(CompressionStream, mGlobal, mStream)
NS_IMPL_CYCLE_COLLECTING_ADDREF(CompressionStream)
NS_IMPL_CYCLE_COLLECTING_RELEASE(CompressionStream)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CompressionStream)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

/*
 * Constructs either a ZLibDecompressionStreamAlgorithms or a
 * BrotliDecompressionStreamAlgorithms, based on the CompressionFormat.
 */
static Result<already_AddRefed<CompressionStreamAlgorithms>, nsresult>
CreateCompressionStreamAlgorithms(CompressionFormat aFormat) {
  if (aFormat == CompressionFormat::Brotli) {
    RefPtr<CompressionStreamAlgorithms> brotliAlgos =
        MOZ_TRY(BrotliCompressionStreamAlgorithms::Create());
    return brotliAlgos.forget();
  }

  RefPtr<CompressionStreamAlgorithms> zlibAlgos =
      MOZ_TRY(ZLibCompressionStreamAlgorithms::Create(aFormat));
  return zlibAlgos.forget();
}

CompressionStream::CompressionStream(nsISupports* aGlobal,
                                     TransformStream& aStream)
    : mGlobal(aGlobal), mStream(&aStream) {}

CompressionStream::~CompressionStream() = default;

JSObject* CompressionStream::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  return CompressionStream_Binding::Wrap(aCx, this, aGivenProto);
}

// https://wicg.github.io/compression/#dom-compressionstream-compressionstream
already_AddRefed<CompressionStream> CompressionStream::Constructor(
    const GlobalObject& aGlobal, CompressionFormat aFormat, ErrorResult& aRv) {
  if (aFormat == CompressionFormat::Zstd) {
    aRv.ThrowTypeError(
        "'zstd' (value of argument 1) is not a valid value for enumeration "
        "CompressionFormat.");
    return nullptr;
  }

  // Step 1: If format is unsupported in CompressionStream, then throw a
  // TypeError.
  // XXX: Skipped as we are using enum for this

  // Step 2 - 4: (Done in CompressionStreamAlgorithms)

  // Step 5: Set this's transform to a new TransformStream.

  // Step 6: Set up this's transform with transformAlgorithm set to
  // transformAlgorithm and flushAlgorithm set to flushAlgorithm.
  Result<already_AddRefed<CompressionStreamAlgorithms>, nsresult> algorithms =
      CreateCompressionStreamAlgorithms(aFormat);
  if (algorithms.isErr()) {
    aRv.ThrowUnknownError("Not enough memory");
    return nullptr;
  }

  RefPtr<CompressionStreamAlgorithms> alg = algorithms.unwrap();
  RefPtr<TransformStream> stream =
      TransformStream::CreateGeneric(aGlobal, *alg, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  return do_AddRef(new CompressionStream(aGlobal.GetAsSupports(), *stream));
}

already_AddRefed<ReadableStream> CompressionStream::Readable() const {
  return do_AddRef(mStream->Readable());
}

already_AddRefed<WritableStream> CompressionStream::Writable() const {
  return do_AddRef(mStream->Writable());
}

}  // namespace mozilla::dom

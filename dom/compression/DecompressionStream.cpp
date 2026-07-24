/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DecompressionStream.h"

#include "BaseAlgorithms.h"
#include "FormatBrotli.h"
#include "FormatZlib.h"
#include "FormatZstd.h"
#include "js/TypeDecls.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/CompressionStreamBinding.h"
#include "mozilla/dom/DecompressionStreamBinding.h"
#include "mozilla/dom/ReadableStream.h"
#include "mozilla/dom/TextDecoderStream.h"
#include "mozilla/dom/TransformStream.h"
#include "mozilla/dom/UnionTypes.h"
#include "mozilla/dom/WritableStream.h"

namespace mozilla::dom {
using namespace compression;

/*
 * Constructs either a ZLibDecompressionStreamAlgorithms or a
 * Brotli/ZstdDecompressionStreamAlgorithms, based on the CompressionFormat.
 */
static Result<already_AddRefed<DecompressionStreamAlgorithms>, nsresult>
CreateDecompressionStreamAlgorithms(CompressionFormat aFormat) {
  if (aFormat == CompressionFormat::Brotli) {
    RefPtr<DecompressionStreamAlgorithms> brotliAlgos =
        MOZ_TRY(BrotliDecompressionStreamAlgorithms::Create());
    return brotliAlgos.forget();
  }
  if (aFormat == CompressionFormat::Zstd) {
    RefPtr<DecompressionStreamAlgorithms> zstdAlgos =
        MOZ_TRY(ZstdDecompressionStreamAlgorithms::Create());
    return zstdAlgos.forget();
  }

  RefPtr<DecompressionStreamAlgorithms> zlibAlgos =
      MOZ_TRY(ZLibDecompressionStreamAlgorithms::Create(aFormat));
  return zlibAlgos.forget();
}

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(DecompressionStream, mGlobal, mStream)
NS_IMPL_CYCLE_COLLECTING_ADDREF(DecompressionStream)
NS_IMPL_CYCLE_COLLECTING_RELEASE(DecompressionStream)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(DecompressionStream)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

DecompressionStream::DecompressionStream(nsISupports* aGlobal,
                                         TransformStream& aStream)
    : mGlobal(aGlobal), mStream(&aStream) {}

DecompressionStream::~DecompressionStream() = default;

JSObject* DecompressionStream::WrapObject(JSContext* aCx,
                                          JS::Handle<JSObject*> aGivenProto) {
  return DecompressionStream_Binding::Wrap(aCx, this, aGivenProto);
}

// https://wicg.github.io/compression/#dom-decompressionstream-decompressionstream
already_AddRefed<DecompressionStream> DecompressionStream::Constructor(
    const GlobalObject& aGlobal, CompressionFormat aFormat, ErrorResult& aRv) {
  if (aFormat == CompressionFormat::Zstd &&
      aGlobal.CallerType() != CallerType::System &&
      !StaticPrefs::dom_compression_streams_zstd_enabled()) {
    aRv.ThrowTypeError(
        "'zstd' (value of argument 1) is not a valid value for enumeration "
        "CompressionFormat.");
    return nullptr;
  }

  // Step 1: If format is unsupported in DecompressionStream, then throw a
  // TypeError.
  // XXX: Skipped as we are using enum for this

  // Step 2 - 4: (Done in {ZLib|Zstd}DecompressionStreamAlgorithms)

  // Step 5: Set this's transform to a new TransformStream.

  // Step 6: Set up this's transform with transformAlgorithm set to
  // transformAlgorithm and flushAlgorithm set to flushAlgorithm.

  Result<already_AddRefed<DecompressionStreamAlgorithms>, nsresult> algorithms =
      CreateDecompressionStreamAlgorithms(aFormat);
  if (algorithms.isErr()) {
    aRv.ThrowUnknownError("Not enough memory");
    return nullptr;
  }

  RefPtr<DecompressionStreamAlgorithms> alg = algorithms.unwrap();
  RefPtr<TransformStream> stream =
      TransformStream::CreateGeneric(aGlobal, *alg, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }
  return do_AddRef(new DecompressionStream(aGlobal.GetAsSupports(), *stream));
}

already_AddRefed<ReadableStream> DecompressionStream::Readable() const {
  return do_AddRef(mStream->Readable());
};

already_AddRefed<WritableStream> DecompressionStream::Writable() const {
  return do_AddRef(mStream->Writable());
};

}  // namespace mozilla::dom

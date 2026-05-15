/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_COMPRESSION_FORMATBROTLI_H_
#define DOM_COMPRESSION_FORMATBROTLI_H_

#include "BaseAlgorithms.h"

struct BrotliDecoderStateStruct;
struct BrotliEncoderStateStruct;

// See the brotli manual
// https://searchfox.org/firefox-main/source/modules/brotli/include/brotli/decode.h

namespace mozilla::dom::compression {

class BrotliCompressionStreamAlgorithms : public CompressionStreamAlgorithms {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(BrotliCompressionStreamAlgorithms,
                                           CompressionStreamAlgorithms)

  static Result<already_AddRefed<BrotliCompressionStreamAlgorithms>, nsresult>
  Create();

 private:
  BrotliCompressionStreamAlgorithms() = default;

  [[nodiscard]] nsresult Init();

  // Shared by:
  // https://wicg.github.io/compression/#compress-and-enqueue-a-chunk
  // https://wicg.github.io/compression/#compress-flush-and-enqueue
  void Compress(JSContext* aCx, Span<const uint8_t> aInput,
                JS::MutableHandleVector<JSObject*> aOutput, Flush aFlush,
                ErrorResult& aRv) override;

  ~BrotliCompressionStreamAlgorithms() = default;

  struct BrotliDeleter {
    void operator()(BrotliEncoderStateStruct* aState);
  };

  std::unique_ptr<BrotliEncoderStateStruct, BrotliDeleter> mState;
};

class BrotliDecompressionStreamAlgorithms
    : public DecompressionStreamAlgorithms {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(BrotliDecompressionStreamAlgorithms,
                                           DecompressionStreamAlgorithms)

  static Result<already_AddRefed<BrotliDecompressionStreamAlgorithms>, nsresult>
  Create();

 private:
  BrotliDecompressionStreamAlgorithms() = default;

  [[nodiscard]] nsresult Init();

  // Shared by:
  // https://wicg.github.io/compression/#decompress-and-enqueue-a-chunk
  // https://wicg.github.io/compression/#decompress-flush-and-enqueue
  // All data errors throw TypeError by step 2: If this results in an error,
  // then throw a TypeError.
  bool Decompress(JSContext* aCx, Span<const uint8_t> aInput,
                  JS::MutableHandleVector<JSObject*> aOutput, Flush aFlush,
                  ErrorResult& aRv) override;

  ~BrotliDecompressionStreamAlgorithms() = default;

  struct BrotliDeleter {
    void operator()(BrotliDecoderStateStruct* aState);
  };

  std::unique_ptr<BrotliDecoderStateStruct, BrotliDeleter> mState;
};

}  // namespace mozilla::dom::compression

#endif  // DOM_COMPRESSION_FORMATBROTLI_H_

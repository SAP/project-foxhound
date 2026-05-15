/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_COMPRESSION_FORMATZSTD_H_
#define DOM_COMPRESSION_FORMATZSTD_H_

#include "BaseAlgorithms.h"

struct ZSTD_DCtx_s;

// See the zstd manual in https://facebook.github.io/zstd/zstd_manual.html or in
// https://searchfox.org/mozilla-central/source/third_party/zstd/lib/zstd.h

namespace mozilla::dom::compression {

class ZstdDecompressionStreamAlgorithms : public DecompressionStreamAlgorithms {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(ZstdDecompressionStreamAlgorithms,
                                           DecompressionStreamAlgorithms)

  static Result<already_AddRefed<ZstdDecompressionStreamAlgorithms>, nsresult>
  Create();

 private:
  ZstdDecompressionStreamAlgorithms() = default;

  [[nodiscard]] nsresult Init();

  // Shared by:
  // https://wicg.github.io/compression/#decompress-and-enqueue-a-chunk
  // https://wicg.github.io/compression/#decompress-flush-and-enqueue
  // All data errors throw TypeError by step 2: If this results in an error,
  // then throw a TypeError.
  bool Decompress(JSContext* aCx, Span<const uint8_t> aInput,
                  JS::MutableHandleVector<JSObject*> aOutput, Flush aFlush,
                  ErrorResult& aRv) override;

  ~ZstdDecompressionStreamAlgorithms() override;

  ZSTD_DCtx_s* mDStream = nullptr;
};
}  // namespace mozilla::dom::compression

#endif  // DOM_COMPRESSION_FORMATZSTD_H_

/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_image_decoders_nsJXLDecoder_h
#define mozilla_image_decoders_nsJXLDecoder_h

#include "Decoder.h"
#include "StreamingLexer.h"
#include "mozilla/Vector.h"
#include "mozilla/image/jxl_decoder_ffi.h"

namespace mozilla::image {

struct JxlDecoderDeleter {
  void operator()(JxlApiDecoder* ptr) { jxl_decoder_destroy(ptr); }
};

class nsJXLDecoder final : public Decoder {
 public:
  ~nsJXLDecoder() override;

  DecoderType GetType() const override { return DecoderType::JXL; }

 protected:
  nsresult InitInternal() override;
  LexerResult DoDecode(SourceBufferIterator& aIterator,
                       IResumable* aOnResume) override;

 private:
  friend class DecoderFactory;

  explicit nsJXLDecoder(RasterImage* aImage);

  std::unique_ptr<JxlApiDecoder, JxlDecoderDeleter> mDecoder;

  enum class State { JXL_DATA, DRAIN_FRAMES, FINISHED_JXL_DATA };

  enum class FrameOutputResult {
    BufferAllocated,
    FrameAdvanced,
    DecodeComplete,
    NoOutput,
    Error
  };

  JxlDecoderStatus ProcessInput(const uint8_t** aData, size_t* aLength);
  nsresult ProcessFrame(Vector<uint8_t>& aPixelBuffer);
  FrameOutputResult HandleFrameOutput();

  LexerTransition<State> ReadJXLData(const char* aData, size_t aLength);
  LexerTransition<State> DrainFrames();
  LexerTransition<State> FinishedJXLData();

  StreamingLexer<State> mLexer;

  uint32_t mFrameIndex = 0;

  Vector<uint8_t> mPixelBuffer;
};

}  // namespace mozilla::image

#endif  // mozilla_image_decoders_nsJXLDecoder_h

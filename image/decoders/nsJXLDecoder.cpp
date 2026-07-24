/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ImageLogging.h"  // Must appear first

#include "nsJXLDecoder.h"

#include "AnimationParams.h"
#include "mozilla/CheckedInt.h"
#include "RasterImage.h"
#include "SurfacePipeFactory.h"
#include "mozilla/Vector.h"

using namespace mozilla::gfx;

namespace mozilla::image {

static LazyLogModule sJXLLog("JXLDecoder");

nsJXLDecoder::nsJXLDecoder(RasterImage* aImage)
    : Decoder(aImage),
      mLexer(Transition::ToUnbuffered(State::FINISHED_JXL_DATA, State::JXL_DATA,
                                      SIZE_MAX),
             Transition::To(State::DRAIN_FRAMES, 0)) {
  MOZ_LOG(sJXLLog, LogLevel::Debug,
          ("[this=%p] nsJXLDecoder::nsJXLDecoder", this));
}

nsresult nsJXLDecoder::InitInternal() {
  bool premultiply = !(GetSurfaceFlags() & SurfaceFlags::NO_PREMULTIPLY_ALPHA);
  mDecoder.reset(jxl_decoder_new(IsMetadataDecode(), premultiply));
  return NS_OK;
}

nsJXLDecoder::~nsJXLDecoder() {
  MOZ_LOG(sJXLLog, LogLevel::Debug,
          ("[this=%p] nsJXLDecoder::~nsJXLDecoder", this));
}

LexerResult nsJXLDecoder::DoDecode(SourceBufferIterator& aIterator,
                                   IResumable* aOnResume) {
  MOZ_ASSERT(!HasError(), "Shouldn't call DoDecode after error!");

  return mLexer.Lex(aIterator, aOnResume,
                    [this](State aState, const char* aData, size_t aLength) {
                      switch (aState) {
                        case State::JXL_DATA:
                          return ReadJXLData(aData, aLength);
                        case State::DRAIN_FRAMES:
                          return DrainFrames();
                        case State::FINISHED_JXL_DATA:
                          return FinishedJXLData();
                      }
                      MOZ_CRASH("Unknown State");
                    });
}

LexerTransition<nsJXLDecoder::State> nsJXLDecoder::ReadJXLData(
    const char* aData, size_t aLength) {
  MOZ_ASSERT(mDecoder);

  const uint8_t* currentData = reinterpret_cast<const uint8_t*>(aData);
  size_t currentLength = aLength;

  while (true) {
    JxlDecoderStatus status = ProcessInput(&currentData, &currentLength);

    switch (status) {
      case JxlDecoderStatus::Ok: {
        if (!HasSize()) {
          JxlBasicInfo basicInfo = jxl_decoder_get_basic_info(mDecoder.get());
          if (!basicInfo.valid) {
            if (currentLength == 0) {
              return Transition::ContinueUnbuffered(State::JXL_DATA);
            } else {
              break;
            }
          }

          if (basicInfo.width > INT32_MAX || basicInfo.height > INT32_MAX) {
            return Transition::TerminateFailure();
          }

          PostSize(basicInfo.width, basicInfo.height);
          if (basicInfo.has_alpha) {
            PostHasTransparency();
          }

          if (!basicInfo.is_animated) {
            PostFrameCount(1);
            if (IsMetadataDecode()) {
              return Transition::TerminateSuccess();
            }
          }
        }

        // Handle animation metadata when first frame header is available.
        if (jxl_decoder_is_frame_ready(mDecoder.get()) && !HasAnimation()) {
          JxlBasicInfo basicInfo = jxl_decoder_get_basic_info(mDecoder.get());
          if (basicInfo.is_animated) {
            JxlFrameInfo frameInfo = jxl_decoder_get_frame_info(mDecoder.get());
            PostIsAnimated(
                FrameTimeout::FromRawMilliseconds(frameInfo.duration_ms));
            PostLoopCount(
                (basicInfo.num_loops == 0 || basicInfo.num_loops > INT32_MAX)
                    ? -1
                    : static_cast<int32_t>(basicInfo.num_loops));
            if (IsMetadataDecode()) {
              return Transition::TerminateSuccess();
            }
          }
        }

        switch (HandleFrameOutput()) {
          case FrameOutputResult::BufferAllocated:
            break;
          case FrameOutputResult::FrameAdvanced:
            return Transition::ContinueUnbufferedAfterYield(
                State::JXL_DATA, aLength - currentLength);
          case FrameOutputResult::DecodeComplete:
            return Transition::TerminateSuccess();
          case FrameOutputResult::NoOutput:
            if (currentLength == 0) {
              return Transition::ContinueUnbuffered(State::JXL_DATA);
            }
            break;
          case FrameOutputResult::Error:
            return Transition::TerminateFailure();
        }
        break;
      }

      case JxlDecoderStatus::NeedMoreData: {
        if (currentLength == 0) {
          return Transition::ContinueUnbuffered(State::JXL_DATA);
        }
        break;
      }

      case JxlDecoderStatus::Error:
        return Transition::TerminateFailure();
    }
  }
}

JxlDecoderStatus nsJXLDecoder::ProcessInput(const uint8_t** aData,
                                            size_t* aLength) {
  uint8_t* bufferPtr = mPixelBuffer.empty() ? nullptr : mPixelBuffer.begin();
  size_t bufferLen = mPixelBuffer.length();
  return jxl_decoder_process_data(mDecoder.get(), aData, aLength, bufferPtr,
                                  bufferLen);
}

nsJXLDecoder::FrameOutputResult nsJXLDecoder::HandleFrameOutput() {
  bool frameNeedsBuffer = jxl_decoder_is_frame_ready(mDecoder.get());

  // Allocate buffer for frame rendering.
  if (frameNeedsBuffer && mPixelBuffer.empty()) {
    OrientedIntSize size = Size();
    CheckedInt<size_t> bufferSize =
        CheckedInt<size_t>(size.width) * size.height * 4;
    if (!bufferSize.isValid() || !mPixelBuffer.resize(bufferSize.value())) {
      MOZ_LOG(sJXLLog, LogLevel::Error,
              ("[this=%p] nsJXLDecoder::HandleFrameOutput -- "
               "failed to allocate pixel buffer\n",
               this));
      return FrameOutputResult::Error;
    }
    return FrameOutputResult::BufferAllocated;
  }

  // Frame rendering complete. The pixel buffer has been filled by
  // jxl_decoder_process_data. Send it through the surface pipeline.
  if (!frameNeedsBuffer && !mPixelBuffer.empty()) {
    nsresult rv = ProcessFrame(mPixelBuffer);
    if (NS_FAILED(rv)) {
      return FrameOutputResult::Error;
    }

    bool hasMoreFrames = jxl_decoder_has_more_frames(mDecoder.get());
    if (IsFirstFrameDecode() || !HasAnimation() || !hasMoreFrames) {
      PostFrameCount(mFrameIndex + 1);
      PostDecodeDone();
      return FrameOutputResult::DecodeComplete;
    }
    mFrameIndex++;
    mPixelBuffer.clear();
    return FrameOutputResult::FrameAdvanced;
  }

  return FrameOutputResult::NoOutput;
}

LexerTransition<nsJXLDecoder::State> nsJXLDecoder::DrainFrames() {
  // Called via the truncated transition when the source is complete. Since
  // jxl-rs buffers all input data internally, it may be able to produce
  // remaining frames without additional source bytes.
  while (true) {
    const uint8_t* noData = nullptr;
    size_t noLength = 0;
    JxlDecoderStatus status = ProcessInput(&noData, &noLength);

    switch (status) {
      case JxlDecoderStatus::Ok: {
        if (!HasSize()) {
          return Transition::TerminateFailure();
        }

        switch (HandleFrameOutput()) {
          case FrameOutputResult::BufferAllocated:
            break;
          case FrameOutputResult::FrameAdvanced:
            return Transition::ToAfterYield(State::DRAIN_FRAMES);
          case FrameOutputResult::DecodeComplete:
          case FrameOutputResult::NoOutput:
            return Transition::TerminateSuccess();
          case FrameOutputResult::Error:
            return Transition::TerminateFailure();
        }
        break;
      }

      case JxlDecoderStatus::NeedMoreData:
        return Transition::TerminateSuccess();

      case JxlDecoderStatus::Error:
        return Transition::TerminateFailure();
    }
  }
}

LexerTransition<nsJXLDecoder::State> nsJXLDecoder::FinishedJXLData() {
  MOZ_ASSERT_UNREACHABLE("Read the entire address space?");
  return Transition::TerminateFailure();
}

nsresult nsJXLDecoder::ProcessFrame(Vector<uint8_t>& aPixelBuffer) {
  MOZ_ASSERT(HasSize());
  MOZ_ASSERT(mDecoder);

  JxlBasicInfo basicInfo = jxl_decoder_get_basic_info(mDecoder.get());

  OrientedIntSize size = Size();

  Maybe<AnimationParams> animParams;
  if (HasAnimation()) {
    JxlFrameInfo frameInfo = jxl_decoder_get_frame_info(mDecoder.get());
    if (!frameInfo.frame_duration_valid) {
      return NS_ERROR_FAILURE;
    }
    // jxl-rs renders complete frames, replacing the previous frame entirely.
    animParams.emplace(FullFrame().ToUnknownRect(),
                       FrameTimeout::FromRawMilliseconds(frameInfo.duration_ms),
                       mFrameIndex, BlendMethod::SOURCE, DisposalMethod::KEEP);
  }

  SurfaceFormat inFormat = SurfaceFormat::R8G8B8A8;
  SurfaceFormat outFormat =
      basicInfo.has_alpha ? SurfaceFormat::OS_RGBA : SurfaceFormat::OS_RGBX;
  SurfacePipeFlags pipeFlags = SurfacePipeFlags();

  Maybe<SurfacePipe> pipe = SurfacePipeFactory::CreateSurfacePipe(
      this, size, OutputSize(), FullFrame(), inFormat, outFormat, animParams,
      nullptr, pipeFlags);
  if (!pipe) {
    return NS_ERROR_FAILURE;
  }

  uint8_t* currentRow = aPixelBuffer.begin();
  for (int32_t y = 0; y < size.height; ++y) {
    WriteState result =
        pipe->WriteBuffer(reinterpret_cast<uint32_t*>(currentRow));
    if (result == WriteState::FAILURE) {
      return NS_ERROR_FAILURE;
    }
    currentRow += size.width * 4;
  }

  if (Maybe<SurfaceInvalidRect> invalidRect = pipe->TakeInvalidRect()) {
    PostInvalidation(invalidRect->mInputSpaceRect,
                     Some(invalidRect->mOutputSpaceRect));
  }

  PostFrameStop(basicInfo.has_alpha ? Opacity::SOME_TRANSPARENCY
                                    : Opacity::FULLY_OPAQUE);
  return NS_OK;
}

}  // namespace mozilla::image

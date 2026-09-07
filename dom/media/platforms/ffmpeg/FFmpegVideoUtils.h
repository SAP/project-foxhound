/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGVIDEOUTILS_H_
#define DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGVIDEOUTILS_H_

#include "MediaData.h"
#include "libavcodec/version.h"
#include "libavutil/pixfmt.h"

#if LIBAVCODEC_VERSION_MAJOR < 54
#  ifndef AV_PIX_FMT_YUV420P10LE
#    define AV_PIX_FMT_YUV420P10LE PIX_FMT_YUV420P10LE
#  endif
#  ifndef AV_PIX_FMT_YUV422P
#    define AV_PIX_FMT_YUV422P PIX_FMT_YUV422P
#  endif
#  ifndef AV_PIX_FMT_YUV422P10LE
#    define AV_PIX_FMT_YUV422P10LE PIX_FMT_YUV422P10LE
#  endif
#  ifndef AV_PIX_FMT_YUV444P
#    define AV_PIX_FMT_YUV444P PIX_FMT_YUV444P
#  endif
#  ifndef AV_PIX_FMT_YUV444P10LE
#    define AV_PIX_FMT_YUV444P10LE PIX_FMT_YUV444P10LE
#  endif
#  ifndef AV_PIX_FMT_GBRP
#    define AV_PIX_FMT_GBRP PIX_FMT_GBRP
#  endif
#  ifndef AV_PIX_FMT_GBRP10LE
#    define AV_PIX_FMT_GBRP10LE PIX_FMT_GBRP10LE
#  endif
#endif

namespace mozilla {

// Fills the chroma plane geometry (Cb/Cr dimensions, chroma subsampling and
// colour depth) of aBuffer from aFormat, an AVPixelFormat value, and the luma
// dimensions aWidth and aHeight. The luma plane (index 0) must already be
// populated by the caller.
inline void SetChromaPlaneGeometryFromAVFormat(VideoData::YCbCrBuffer& aBuffer,
                                               int aFormat, int aWidth,
                                               int aHeight) {
  if (aFormat == AV_PIX_FMT_YUV444P || aFormat == AV_PIX_FMT_YUV444P10LE ||
      aFormat == AV_PIX_FMT_GBRP || aFormat == AV_PIX_FMT_GBRP10LE
#if LIBAVCODEC_VERSION_MAJOR >= 57
      || aFormat == AV_PIX_FMT_YUV444P12LE
#endif
  ) {
    aBuffer.mPlanes[1].mWidth = aBuffer.mPlanes[2].mWidth = aWidth;
    aBuffer.mPlanes[1].mHeight = aBuffer.mPlanes[2].mHeight = aHeight;
    if (aFormat == AV_PIX_FMT_YUV444P10LE || aFormat == AV_PIX_FMT_GBRP10LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_10;
    }
#if LIBAVCODEC_VERSION_MAJOR >= 57
    else if (aFormat == AV_PIX_FMT_YUV444P12LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_12;
    }
#endif
  } else if (aFormat == AV_PIX_FMT_YUV422P || aFormat == AV_PIX_FMT_YUV422P10LE
#if LIBAVCODEC_VERSION_MAJOR >= 57
             || aFormat == AV_PIX_FMT_YUV422P12LE
#endif
  ) {
    aBuffer.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH;
    aBuffer.mPlanes[1].mWidth = aBuffer.mPlanes[2].mWidth = (aWidth + 1) >> 1;
    aBuffer.mPlanes[1].mHeight = aBuffer.mPlanes[2].mHeight = aHeight;
    if (aFormat == AV_PIX_FMT_YUV422P10LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_10;
    }
#if LIBAVCODEC_VERSION_MAJOR >= 57
    else if (aFormat == AV_PIX_FMT_YUV422P12LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_12;
    }
#endif
  } else {
    aBuffer.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;
    aBuffer.mPlanes[1].mWidth = aBuffer.mPlanes[2].mWidth = (aWidth + 1) >> 1;
    aBuffer.mPlanes[1].mHeight = aBuffer.mPlanes[2].mHeight =
        (aHeight + 1) >> 1;
    if (aFormat == AV_PIX_FMT_YUV420P10LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_10;
    }
#if LIBAVCODEC_VERSION_MAJOR >= 57
    else if (aFormat == AV_PIX_FMT_YUV420P12LE) {
      aBuffer.mColorDepth = gfx::ColorDepth::COLOR_12;
    }
#endif
  }
}

}  // namespace mozilla

#endif  // DOM_MEDIA_PLATFORMS_FFMPEG_FFMPEGVIDEOUTILS_H_

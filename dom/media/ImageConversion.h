/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ImageToI420Converter_h
#define ImageToI420Converter_h

#include "mozilla/AlreadyAddRefed.h"
#include "nsError.h"

namespace mozilla {

namespace gfx {
class SourceSurface;
enum class SurfaceFormat : int8_t;
}  // namespace gfx

namespace layers {
class Image;
}  // namespace layers

/**
 * Gets a SourceSurface from given image.
 */
already_AddRefed<gfx::SourceSurface> GetSourceSurface(layers::Image* aImage);

/**
 * Converts aImage to an I420 image and writes it to the given buffers.
 */
nsresult ConvertToI420(layers::Image* aImage, uint8_t* aDestY, int aDestStrideY,
                       uint8_t* aDestU, int aDestStrideU, uint8_t* aDestV,
                       int aDestStrideV);

/**
 * Converts aImage to an NV12 image and writes it to the given buffers.
 */
nsresult ConvertToNV12(layers::Image* aImage, uint8_t* aDestY, int aDestStrideY,
                       uint8_t* aDestUV, int aDestStrideUV);

/**
 * Converts aImage into an RGBA image in a specified format and writes it to the
 * given buffer.
 */
nsresult ConvertToRGBA(layers::Image* aImage,
                       const gfx::SurfaceFormat& aDestFormat,
                       uint8_t* aDestBuffer, int aDestStride);

/*
 * Convert the RGBA image data from SRGB color into DisplayP3 color.
 * aSrcBuffer and aDestBuffer can be the same.
 */
nsresult ConvertSRGBBufferToDisplayP3(uint8_t* aSrcBuffer,
                                      const gfx::SurfaceFormat& aSrcFormat,
                                      uint8_t* aDestBuffer, int aWidth,
                                      int aHeight);

}  // namespace mozilla

#endif /* ImageToI420Converter_h */

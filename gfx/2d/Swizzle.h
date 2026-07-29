/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_SWIZZLE_H_
#define MOZILLA_GFX_SWIZZLE_H_

#include "Point.h"
#include "Rect.h"

namespace mozilla {
namespace image {
struct Orientation;
}

namespace gfx {

/**
 * Premultiplies source and writes it to destination. Source and destination may
 * be the same to premultiply in-place. The source format must have an alpha
 * channel.
 */
GFX2D_API bool PremultiplyData(const uint8_t* aSrc, int32_t aSrcStride,
                               SurfaceFormat aSrcFormat, uint8_t* aDst,
                               int32_t aDstStride, SurfaceFormat aDstFormat,
                               const IntSize& aSize);

/**
 * Unpremultiplies source and writes it to destination. Source and destination
 * may be the same to unpremultiply in-place. Both the source and destination
 * formats must have an alpha channel.
 */
GFX2D_API bool UnpremultiplyData(const uint8_t* aSrc, int32_t aSrcStride,
                                 SurfaceFormat aSrcFormat, uint8_t* aDst,
                                 int32_t aDstStride, SurfaceFormat aDstFormat,
                                 const IntSize& aSize);

/**
 * Swizzles source and writes it to destination. Source and destination may be
 * the same to swizzle in-place.
 */
GFX2D_API bool SwizzleData(const uint8_t* aSrc, int32_t aSrcStride,
                           SurfaceFormat aSrcFormat, uint8_t* aDst,
                           int32_t aDstStride, SurfaceFormat aDstFormat,
                           const IntSize& aSize);

/**
 * Flips rows of source and swizzles it to destination. Source and destination
 * may be the same to swizzle in-place; this will fail if it cannot allocate a
 * temporary buffer.
 */
GFX2D_API bool SwizzleYFlipData(const uint8_t* aSrc, int32_t aSrcStride,
                                SurfaceFormat aSrcFormat, uint8_t* aDst,
                                int32_t aDstStride, SurfaceFormat aDstFormat,
                                const IntSize& aSize);

/**
 * Flips rows of source and premultiplies/swizzles it to destination. Source and
 * destination may be the same to premultiply/swizzle in-place; this will fail
 * if it cannot allocate a temporary buffer.
 */
GFX2D_API bool PremultiplyYFlipData(const uint8_t* aSrc, int32_t aSrcStride,
                                    SurfaceFormat aSrcFormat, uint8_t* aDst,
                                    int32_t aDstStride,
                                    SurfaceFormat aDstFormat,
                                    const IntSize& aSize);

/**
 * Swizzles source and writes it to destination. Source and destination may be
 * the same to swizzle in-place.
 */
typedef void (*SwizzleRowFn)(const uint8_t* aSrc, uint8_t* aDst,
                             int32_t aLength);

/**
 * Get a function pointer to perform premultiplication between two formats.
 */
GFX2D_API SwizzleRowFn PremultiplyRow(SurfaceFormat aSrcFormat,
                                      SurfaceFormat aDstFormat);

/**
 * Get a function pointer to perform unpremultiplication between two formats.
 */
GFX2D_API SwizzleRowFn UnpremultiplyRow(SurfaceFormat aSrcFormat,
                                        SurfaceFormat aDstFormat);

/**
 * Get a function pointer to perform swizzling between two formats.
 */
GFX2D_API SwizzleRowFn SwizzleRow(SurfaceFormat aSrcFormat,
                                  SurfaceFormat aDstFormat);

/**
 * Reorients source and writes it to destination. Returns the dirty rect of
 * what was changed in aDst.
 */
typedef IntRect (*ReorientRowFn)(const uint8_t* aSrc, int32_t aSrcRow,
                                 uint8_t* aDst, const IntSize& aDstSize,
                                 int32_t aDstStride);

/**
 * Get a function pointer to perform reorientation by row.
 */
GFX2D_API ReorientRowFn
ReorientRow(const struct image::Orientation& aOrientation);

/**
 * Converts a row of RGBA float16 pixels to uint16_t values, clamping the
 * float [0.0, 1.0] range to uint16 [0, 65535], with NaN treated as 0.0.
 * Writes aChannels (3 or 4) channels per pixel.
 */
GFX2D_API void ConvertFloat16RowToUint16(const uint16_t* aSrc, uint16_t* aDst,
                                         uint32_t aWidth, uint32_t aChannels);

}  // namespace gfx
}  // namespace mozilla

#endif /* MOZILLA_GFX_SWIZZLE_H_ */

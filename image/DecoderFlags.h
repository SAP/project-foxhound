/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_image_DecoderFlags_h
#define mozilla_image_DecoderFlags_h

#include "mozilla/TypedEnumBits.h"

namespace mozilla {
namespace image {

/**
 * Flags that influence decoder behavior. Note that these flags *don't*
 * influence the logical content of the surfaces that the decoder generates, so
 * they're not in a factor in SurfaceCache lookups and the like. These flags
 * instead either influence which surfaces are generated at all or the tune the
 * decoder's behavior for a particular scenario.
 */
enum class DecoderFlags : uint8_t {
  FIRST_FRAME_ONLY = 1 << 0,
  IS_REDECODE = 1 << 1,
  IMAGE_IS_TRANSIENT = 1 << 2,
  ASYNC_NOTIFY = 1 << 3,

  /**
   * By default, a surface is considered substitutable. That means callers are
   * willing to accept a less than ideal match to display. If a caller requires
   * a specific size and won't accept alternatives, then this flag should be
   * set.
   */
  CANNOT_SUBSTITUTE = 1 << 4,

#ifdef MOZ_AV1
  // The flags below are stored in RasterImage to allow a decoded image to
  // remain consistent in whether it is animated or not.

  // Set according to the "image.avif.sequence.enabled" preference.
  AVIF_SEQUENCES_ENABLED = 1 << 5,
  // Set according to the
  // "image.avif.sequence.animate_avif_major_branded_images" preference.
  AVIF_ANIMATE_AVIF_MAJOR = 1 << 6,
#endif

  /**
   * By default, we don't count how many animated frames there are in an image,
   * as that would require us to iterate over the entire buffer for some image
   * formats. If the caller requires a full accounting of how many frames there
   * are.
   */
  COUNT_FRAMES = 1 << 7,
};
MOZ_MAKE_ENUM_CLASS_BITWISE_OPERATORS(DecoderFlags)

/**
 * @return the default set of decode flags.
 */
inline DecoderFlags DefaultDecoderFlags() { return DecoderFlags(); }

}  // namespace image
}  // namespace mozilla

#endif  // mozilla_image_DecoderFlags_h

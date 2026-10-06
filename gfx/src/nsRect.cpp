/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsRect.h"
#include "mozilla/gfx/Types.h"   // for eSideBottom, etc
#include "mozilla/CheckedInt.h"  // for CheckedInt
#include "nsDeviceContext.h"     // for nsDeviceContext
#include "nsString.h"            // for nsAutoString, etc
#include "nsMargin.h"            // for nsMargin

#ifdef USE_NEON
#  include "nsRectIntersectGeneric.h"
#  include "mozilla/arm.h"
#endif
#if defined(USE_SSE42)
#  include "nsRectIntersectGeneric.h"
#  include "mozilla/SSE.h"
#endif

static_assert(
    (int(mozilla::eSideTop) == 0) && (int(mozilla::eSideRight) == 1) &&
        (int(mozilla::eSideBottom) == 2) && (int(mozilla::eSideLeft) == 3),
    "The mozilla::Side sequence must match the nsMargin nscoord sequence");

const mozilla::gfx::IntRect& GetMaxSizedIntRect() {
  static const mozilla::gfx::IntRect r(0, 0, INT32_MAX, INT32_MAX);
  return r;
}

bool nsRect::Overflows() const {
  mozilla::CheckedInt<int32_t> xMost = this->x;
  xMost += this->width;
  mozilla::CheckedInt<int32_t> yMost = this->y;
  yMost += this->height;
  return !xMost.isValid() || !yMost.isValid();
}

[[nodiscard]] nsRect nsRect::Intersect(const nsRect& aRect) const {
#ifdef USE_NEON
  if (mozilla::supports_neon()) {
    return mozilla::IntersectEngine<xsimd::neon64>::Intersect(&aRect, this);
  }
#endif
#ifdef USE_SSE42
  if (mozilla::supports_sse4_2()) {
    return mozilla::IntersectEngine<xsimd::sse4_2>::Intersect(&aRect, this);
  }
#endif

  nsRect result;

  result.x = std::max<int32_t>(x, aRect.x);
  result.y = std::max<int32_t>(y, aRect.y);
  result.width =
      std::min<int32_t>(x - result.x + width, aRect.x - result.x + aRect.width);
  result.height = std::min<int32_t>(y - result.y + height,
                                    aRect.y - result.y + aRect.height);

  if (result.width < 0 || result.height < 0) {
    result.SizeTo(0, 0);
  }
  return result;
}

bool nsRect::IntersectRect(const nsRect& aRect1, const nsRect& aRect2) {
#ifdef USE_NEON
  if (mozilla::supports_neon()) {
    return mozilla::IntersectEngine<xsimd::neon64>::IntersectRect(
        &aRect1, &aRect2, this);
  }
#endif
#ifdef USE_SSE42
  if (mozilla::supports_sse4_2()) {
    return mozilla::IntersectEngine<xsimd::sse4_2>::Intersect(&aRect1, &aRect2,
                                                              this);
  }
#endif

  int32_t newX = std::max<int32_t>(aRect1.x, aRect2.x);
  int32_t newY = std::max<int32_t>(aRect1.y, aRect2.y);
  width = std::min<int32_t>(aRect1.x - newX + aRect1.width,
                            aRect2.x - newX + aRect2.width);
  height = std::min<int32_t>(aRect1.y - newY + aRect1.height,
                             aRect2.y - newY + aRect2.height);
  x = newX;
  y = newY;
  if (width <= 0 || height <= 0) {
    SizeTo(0, 0);
    return false;
  }
  return true;
}

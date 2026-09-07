/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef GFX_SRC_NSRECTINTERSECTGENERICIMPL_H_
#define GFX_SRC_NSRECTINTERSECTGENERICIMPL_H_

#include "nsRectIntersectGeneric.h"

#include <xsimd/xsimd.hpp>

template <class Arch>
void mozilla::IntersectEngine<Arch>::Intersect(const int32_t lhs[4],
                                               const int32_t rhs[4],
                                               int32_t result[4]) {
  using batch_type = xsimd::batch<int32_t, Arch>;
  static_assert(batch_type::size == 4, "Algorithm tied to 128 bits registers");

  auto rect1 = batch_type::load_unaligned(lhs);  // x1, y1, w1, h1
  auto rect2 = batch_type::load_unaligned(rhs);  // x2, y2, w2, h2
  auto resultRect = xsimd::max(rect1, rect2);    // xr, yr, zz, zz

  // result.width = std::min<int32_t>(x - result.x + width,
  //                                  aRect.x - result.x + aRect.width);
  // result.height = std::min<int32_t>(y - result.y + height,
  //                                   aRect.y - result.y + aRect.height);
  auto widthheight = xsimd::min(
      rect1 - resultRect + xsimd::slide_right<8>(rect1),
      rect2 - resultRect + xsimd::slide_right<8>(rect2));  // w, h, zz, zz
  widthheight = xsimd::slide_left<8>(widthheight);         // 00, 00, wr, hr

  constexpr xsimd::batch_bool_constant<int32_t, Arch, true, true, false, false>
      mask;
  resultRect = xsimd::select(mask, resultRect, widthheight);  // xr, yr, wr, hr

  if (((resultRect < 0).mask() & 0xC) != 0) {
    // It's potentially more efficient to store all 0s. But the non vectorized
    // code leaves x/y intact so let's do the same here.
    resultRect = resultRect & xsimd::batch<int32_t, Arch>{-1, -1, 0, 0};
  }

  resultRect.store_unaligned(result);
}

template <class Arch>
bool mozilla::IntersectEngine<Arch>::IntersectRect(const int32_t lhs[4],
                                                   const int32_t rhs[4],
                                                   int32_t result[4]) {
  using batch_type = xsimd::batch<int32_t, Arch>;
  static_assert(batch_type::size == 4, "Algorithm tied to 128 bits registers");

  auto rect1 = batch_type::load_unaligned(lhs);  // x1, y1, w1, h1
  auto rect2 = batch_type::load_unaligned(rhs);  // x2, y2, w2, h2
  auto resultRect = xsimd::max(rect1, rect2);    // xr, yr, zz, zz

  // result.width = std::min<int32_t>(x - result.x + width,
  //                                  aRect.x - result.x + aRect.width);
  // result.height = std::min<int32_t>(y - result.y + height,
  //                                   aRect.y - result.y + aRect.height);
  auto widthheight = xsimd::min(
      rect1 - resultRect + xsimd::slide_right<8>(rect1),
      rect2 - resultRect + xsimd::slide_right<8>(rect2));  // w, h, zz, zz
  widthheight = xsimd::slide_left<8>(widthheight);         // 00, 00, wr, hr

  constexpr xsimd::batch_bool_constant<int32_t, Arch, true, true, false, false>
      mask;
  resultRect = xsimd::select(mask, resultRect, widthheight);  // xr, yr, wr, hr

  const bool isDisjoint = ((resultRect > 0).mask() & 0xC) != 0xC;
  if (isDisjoint) {
    // It's potentially more efficient to store all 0s. But the non vectorized
    // code leaves x/y intact so let's do the same here.
    resultRect = resultRect & xsimd::batch<int32_t, Arch>{-1, -1, 0, 0};
  }
  resultRect.store_unaligned(result);
  return !isDisjoint;
}

#endif  // GFX_SRC_NSRECTINTERSECTGENERICIMPL_H_

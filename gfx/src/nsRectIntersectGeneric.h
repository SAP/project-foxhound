/* this source code form is subject to the terms of the mozilla public
 * license, v. 2.0. if a copy of the mpl was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NSRECT_INTERSECT_GENERIC_H_
#define NSRECT_INTERSECT_GENERIC_H_

#include "nsRect.h"

#include <xsimd/xsimd.hpp>

namespace mozilla {

template <class Arch>
struct IntersectEngine {
 private:
  static void Intersect(const int32_t lhs[4], const int32_t rhs[4],
                        int32_t result[4]);
  static bool IntersectRect(const int32_t lhs[4], const int32_t rhs[4],
                            int32_t result[4]);

 public:
  static nsRect Intersect(const nsRect* lhs, const nsRect* rhs) {
    nsRect result;
    Intersect(reinterpret_cast<const int32_t*>(lhs),
              reinterpret_cast<const int32_t*>(rhs),
              reinterpret_cast<int32_t*>(&result));
    return result;
  }
  static bool IntersectRect(const nsRect* lhs, const nsRect* rhs,
                            nsRect* result) {
    return IntersectRect(reinterpret_cast<const int32_t*>(lhs),
                         reinterpret_cast<const int32_t*>(rhs),
                         reinterpret_cast<int32_t*>(result));
  }
};

}  // namespace mozilla

#endif /* NSRECT_INTERSECT_GENERIC_H_ */

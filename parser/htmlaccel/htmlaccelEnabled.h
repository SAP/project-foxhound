/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_htmlaccel_htmlaccelEnabled_h
#define mozilla_htmlaccel_htmlaccelEnabled_h

#include "mozilla/Assertions.h"
#if defined(__x86_64__)
#  include "mozilla/SSE.h"
#endif

namespace mozilla::htmlaccel {

// MOZ_MAY_HAVE_HTMLACCEL gets defined iff `htmlaccelEnabled()` may return
// `true`. The purpose is this define is to accommodate builds that don't
// link `htmlaccelNotInline.cpp` and have even the most basic constant
// propagation turned off so that `htmlaccelEnabled()` statically returning
// false isn't enough to remove calls to functions whose definitions are
// missing.

/// This function is appropriate to call when the SIMD path is compiled
/// with `HTML_ACCEL_FLAGS`.
///
/// Keep this in sync with `HTML_ACCEL_FLAGS` in `toolchain.configure`.
inline bool htmlaccelEnabled() {
#if !defined(__clang__) && defined(__GNUC__) && __GNUC__ < 12
  // __GNUC__ is stuck at 4 in clang, so we need to check __clang__ above.
  // GCC 12 or newer is required for __builtin_shuffle.
  return false;
#elif defined(__aarch64__) && __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
#  define MOZ_MAY_HAVE_HTMLACCEL 1
  return true;
#elif defined(__x86_64__)
#  define MOZ_MAY_HAVE_HTMLACCEL 1
  bool ret = mozilla::supports_bmi();
  if (ret) {
    // As a micro optimization for the innerHTML getter, don't bother
    // calling `supports_avx` in release builds, since the implementation
    // of SSE.h supports_bmi implies supports_avx anyway.
    MOZ_ASSERT(mozilla::supports_avx(),
               "supports_bmi is supposed to imply supports_avx");
  }
  return ret;
#else
  return false;
#endif
}

}  // namespace mozilla::htmlaccel

#endif  // mozilla_htmlaccel_htmlaccelEnabled_h

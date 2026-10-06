/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_SourcePathLiteral_
#define mozilla_SourcePathLiteral_

#include "nsLiteralString.h"

namespace mozilla::detail {

template <std::size_t N>
struct SourcePathLiteralBuffer {
  char value[N];
  MOZ_IMPLICIT constexpr SourcePathLiteralBuffer(const char (&aSrc)[N]) {
    for (std::size_t i = 0; i < N; ++i) {
      value[i] = aSrc[i];
#if defined(__clang__) && defined(_WIN32)
      if (value[i] == '/') {
        value[i] = '\\';
      }
#endif
    }
  }
};

}  // namespace mozilla::detail

// Returns a literal CString that matches the syntax of __FILE__ (using
// back slashes on windows, and forward slashes elsewhere).
template <::mozilla::detail::SourcePathLiteralBuffer aPath>
constexpr const nsLiteralCString operator""_sp() {
  return nsLiteralCString(aPath.value);
}

#endif

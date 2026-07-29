/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_TYPEDOMUTILS_H_
#define LAYOUT_STYLE_TYPEDOM_TYPEDOMUTILS_H_

#include "mozilla/dom/CSSKeywordValueBindingFwd.h"
#include "mozilla/dom/CSSPerspectiveBindingFwd.h"

namespace mozilla::dom {

// Extract the CSSKeywordish branch from a flattened CSSPerspectiveValue union.
//
// The caller is expected to pass only pre-checked CSSPerspectiveValue values
// matching the CSSKeywordish variants (UTF8String or CSSKeywordValue).
void ToCSSKeywordish(const CSSPerspectiveValue& aValue, CSSKeywordish& aResult);

}  // namespace mozilla::dom

#endif  // LAYOUT_STYLE_TYPEDOM_TYPEDOMUTILS_H_

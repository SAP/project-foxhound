/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TypedOMUtils.h"

#include "mozilla/Assertions.h"
#include "mozilla/dom/CSSKeywordValueBinding.h"
#include "mozilla/dom/CSSPerspectiveBinding.h"

namespace mozilla::dom {

void ToCSSKeywordish(const CSSPerspectiveValue& aValue,
                     CSSKeywordish& aResult) {
  MOZ_DIAGNOSTIC_ASSERT(aValue.IsUTF8String() || aValue.IsCSSKeywordValue());

  if (aValue.IsUTF8String()) {
    aResult.SetAsUTF8String() = aValue.GetAsUTF8String();
    return;
  }

  aResult.SetAsCSSKeywordValue() = &aValue.GetAsCSSKeywordValue();
}

}  // namespace mozilla::dom

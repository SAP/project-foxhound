/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Forward declarations to avoid including all of nsStyleStruct.h.
 */

#ifndef nsStyleStructFwd_h_
#define nsStyleStructFwd_h_

#include "nsStyleStructList.h"

namespace mozilla {

enum class StyleStructID : uint32_t {
/*
 * Define the constants eStyleStruct_Font, etc.
 *
 * The C++ standard, section 7.2, guarantees that enums begin with 0 and
 * increase by 1.
 *
 * Note that we rely on the inherited structs being before the rest in
 * ComputedStyle.
 */
#define ENUM_ENTRY(name) name,
  FOR_EACH_STYLE_STRUCT(ENUM_ENTRY, ENUM_ENTRY)
#undef ENUM_ENTRY
};

struct StyleStructConstants {
  static const uint32_t kStyleStructCount =
#define COUNT_STRUCT(name) 1 +
      FOR_EACH_STYLE_STRUCT(COUNT_STRUCT, COUNT_STRUCT)
#undef COUNT_STRUCT
          0;

  static const uint32_t kInheritedStyleStructCount =
#define COUNT_INHERITED(name) 1 +
#define COUNT_RESET(name)
      FOR_EACH_STYLE_STRUCT(COUNT_INHERITED, COUNT_RESET)
#undef COUNT_INHERITED
#undef COUNT_RESET
          0;

  static const uint32_t kResetStyleStructCount =
#define COUNT_INHERITED(name)
#define COUNT_RESET(name) 1 +
      FOR_EACH_STYLE_STRUCT(COUNT_INHERITED, COUNT_RESET)
#undef COUNT_INHERITED
#undef COUNT_RESET
          0;

  static_assert(kStyleStructCount <= 32, "Bitmasks must be bigger!");

  static const uint32_t kAllStructsMask = (1 << kStyleStructCount) - 1;
  static const uint32_t kInheritedStructsMask =
      (1 << kInheritedStyleStructCount) - 1;
  static const uint32_t kResetStructsMask =
      kAllStructsMask & (~kInheritedStructsMask);

  static uint32_t BitFor(StyleStructID aID) {
    return 1 << static_cast<uint32_t>(aID);
  }
};

}  // namespace mozilla

#endif /* nsStyleStructFwd_h_ */

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef builtin_intl_UsingEnum_h
#define builtin_intl_UsingEnum_h

#include "mozilla/MacroForEach.h"

// C++20 `using enum` declaration isn't supported in GCC 10. Provide a simple
// macro until our minimum supported GCC has been upgraded to GCC 11.
//
// Usage:
// ```
// enum class MyEnum { Foo, Bar, Baz };
//
// #ifndef USING_ENUM
//   using enum MyEnum;
// #else
//   USING_ENUM(MyEnum, Foo, Bar, Baz);
// #endif
// ```

#ifndef __cpp_using_enum
#  define USING_ENUM_DECLARE(ENUM, NAME) constexpr auto NAME = ENUM::NAME;
#  define USING_ENUM(ENUM, ...) \
    MOZ_FOR_EACH(USING_ENUM_DECLARE, (ENUM, ), (__VA_ARGS__))
#endif

#endif  // builtin_intl_UsingEnum_h

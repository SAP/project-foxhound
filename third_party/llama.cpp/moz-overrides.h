/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstdlib>

#pragma once

/*
 * llama.cpp uses exceptions and a little bit of dynamic_cast, those are
 * overriden here. This file is included in all files. This technique allows for
 * minimal patching of the library.
 */

// llama.cpp uses a single dynamic_cast in a deprecated code path, not used in
// Firefox.
#define dynamic_cast reinterpret_cast

// Inline function to replace throw. We can't use a regular define because some
// compilers warn about unreachable code (e.g. the ctor call).
[[noreturn]] inline void abort_with_suppression() {
  std::abort();
}

#define throw abort_with_suppression(); if (false)

// Replace try blocks by ifs
#define try if (true)

// This works because llama.cpp more or less consistently uses `e`, `err` and
// `error` for the exception variable name, but might need adjustments.
#define catch(x) \
    if (const std::exception &e = std::exception(), err = std::exception(), \
        error = std::exception(); \
        false)

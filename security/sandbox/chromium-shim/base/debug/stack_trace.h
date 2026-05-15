/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This is a dummy version of Chromium source file base/debug/stack_trace.h
// to provide a dummy class StackTrace.

#ifndef BASE_DEBUG_STACK_TRACE_H_
#define BASE_DEBUG_STACK_TRACE_H_

#include <iosfwd>
#include <string>

#include "base/base_export.h"

namespace base {
namespace debug {

class BASE_EXPORT StackTrace {
 public:
  StackTrace() {}

  std::string ToString() const {
    return std::string();
  }

#if !defined(__UCLIBC__) & !defined(_AIX)
  void OutputToStream(std::ostream*) const {}
#endif
};

// Forwards to StackTrace::OutputToStream().
BASE_EXPORT std::ostream& operator<<(std::ostream& os, const StackTrace& s);

}  // namespace debug
}  // namespace base

#endif  // BASE_DEBUG_STACK_TRACE_H_

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This is a partial implementation of Chromium's source file
// base/debug/stack_trace.cc.

#include "stack_trace.h"

#include <ostream>

namespace base {
namespace debug {

std::ostream& operator<<(std::ostream& os, const StackTrace& s) {
  os << "StackTrace::OutputToStream not implemented.";
  return os;
}

}  // namespace debug
}  // namespace base

/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_gtest_ipc_TestUtilityProcess_h
#define mozilla_gtest_ipc_TestUtilityProcess_h

#include "gtest/gtest.h"

namespace mozilla::gtest::ipc {

class TestUtilityProcess : public ::testing::Test {
 protected:
  static void SetUpTestSuite();
};

}  // namespace mozilla::gtest::ipc

#endif  // mozilla_gtest_ipc_TestUtilityProcess_h

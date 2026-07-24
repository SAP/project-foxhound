/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
#include <stdint.h>

#include "gtest/gtest.h"

extern "C" uint8_t* test_rust();

TEST(rust, CallFromCpp)
{
  auto greeting = test_rust();
  EXPECT_STREQ(reinterpret_cast<char*>(greeting), "hello from rust.");
}

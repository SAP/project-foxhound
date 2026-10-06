/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <gtest/gtest.h>

#include <string>

#include "AsyncLogger.h"

namespace mozilla {

TEST(AsyncLogger, AppendCStringExactFitOOBWrite)
{
  const size_t kBufSize = 16;
  char buf[kBufSize + 1];
  buf[kBufSize] = 0x42;

  StringWriter writer(buf, kBufSize);

  std::string s(kBufSize, 'A');
  size_t idx;
  bool truncated = writer.AppendCString(s.c_str(), &idx);

  EXPECT_TRUE(truncated);
  EXPECT_EQ(idx, 0u);
  EXPECT_EQ(static_cast<unsigned char>(buf[kBufSize]), 0x42u)
      << "off-by-one: null terminator written one byte past end of buffer";
  EXPECT_EQ(buf[kBufSize - 1], 0)
      << "last byte of buffer should be null terminator";
}

TEST(AsyncLogger, AppendCStringOverflow)
{
  const size_t kBufSize = 8;
  char buf[kBufSize + 1];
  buf[kBufSize] = 0x42;

  StringWriter writer(buf, kBufSize);

  std::string s(kBufSize * 4, 'B');
  size_t idx;
  bool truncated = writer.AppendCString(s.c_str(), &idx);

  EXPECT_TRUE(truncated);
  EXPECT_EQ(idx, 0u);
  EXPECT_EQ(static_cast<unsigned char>(buf[kBufSize]), 0x42u)
      << "sentinel overwritten on overflow";
  EXPECT_EQ(buf[kBufSize - 1], 0)
      << "last byte of buffer should be null terminator";
  // Truncated content should be kBufSize-1 bytes of 'B'
  EXPECT_EQ(std::string(buf, kBufSize - 1), std::string(kBufSize - 1, 'B'));
}

TEST(AsyncLogger, AppendCStringFullBufferEarlyReturn)
{
  const size_t kBufSize = 8;
  char buf[kBufSize + 1];
  buf[kBufSize] = 0x42;

  StringWriter writer(buf, kBufSize);

  // First call: fill the buffer exactly (string of kBufSize chars truncates
  // to kBufSize-1 chars + null terminator, consuming all kBufSize bytes).
  std::string s1(kBufSize, 'C');
  size_t idx1;
  writer.AppendCString(s1.c_str(), &idx1);

  // Second call: buffer is now full, should early-return without writing.
  size_t idx2;
  bool truncated = writer.AppendCString("more", &idx2);

  EXPECT_TRUE(truncated);
  EXPECT_EQ(static_cast<unsigned char>(buf[kBufSize]), 0x42u)
      << "sentinel overwritten on second append to full buffer";
}

}  // namespace mozilla

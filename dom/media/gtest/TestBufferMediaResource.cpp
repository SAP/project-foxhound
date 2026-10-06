/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BufferMediaResource.h"
#include "gtest/gtest.h"
#include "mozilla/RefPtr.h"

using namespace mozilla;

TEST(BufferMediaResource, ReadFromCache_OffsetBeyondLength_ShouldFail)
{
  const uint8_t buf[1] = {0x41};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[8] = {0};
  nsresult rv = res->ReadFromCache(out, 2, static_cast<uint32_t>(sizeof(out)));

  EXPECT_NE(rv, NS_OK);
}

TEST(BufferMediaResource, ReadFromCache_PartialRead_ShouldFail)
{
  const uint8_t buf[4] = {0x41, 0x42, 0x43, 0x44};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[8] = {0};
  nsresult rv = res->ReadFromCache(out, 2, 8);

  EXPECT_NE(rv, NS_OK);
}

TEST(BufferMediaResource, ReadFromCache_ValidRange_ShouldSucceed)
{
  const uint8_t buf[4] = {0x41, 0x42, 0x43, 0x44};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[4] = {0};
  nsresult rv = res->ReadFromCache(out, 0, 4);

  EXPECT_EQ(rv, NS_OK);
  EXPECT_EQ(out[0], 0x41);
  EXPECT_EQ(out[1], 0x42);
  EXPECT_EQ(out[2], 0x43);
  EXPECT_EQ(out[3], 0x44);
}

TEST(BufferMediaResource, ReadFromCache_NegativeOffset_ShouldFail)
{
  const uint8_t buf[4] = {0x41, 0x42, 0x43, 0x44};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[4] = {0};
  nsresult rv = res->ReadFromCache(out, -1, 4);

  EXPECT_NE(rv, NS_OK);
}

TEST(BufferMediaResource, ReadFromCache_OffsetAtLength_ShouldFail)
{
  const uint8_t buf[4] = {0x41, 0x42, 0x43, 0x44};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[1] = {0};
  nsresult rv = res->ReadFromCache(out, 4, 1);

  EXPECT_NE(rv, NS_OK);
}

TEST(BufferMediaResource, ReadFromCache_NegativeCount_ShouldFail)
{
  const uint8_t buf[4] = {0x41, 0x42, 0x43, 0x44};
  RefPtr<MediaResource> res = new BufferMediaResource(buf, sizeof(buf));

  char out[4] = {0};
  // Prevent constant propagation leading to a warning/error on older GCC, that
  // thinks we're doing a 4GB memcpy into a 4 byte array.
  // ReadFromCache has an early return that prevents the copy.
  volatile uint32_t count = static_cast<uint32_t>(-1);
  nsresult rv = res->ReadFromCache(out, 0, count);

  EXPECT_NE(rv, NS_OK);
}

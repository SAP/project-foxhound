/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "scoped_ptrs_util.h"

#if defined(__has_feature)
#if __has_feature(address_sanitizer)
#define NSS_TEST_HAVE_ASAN 1
#endif
#elif defined(__SANITIZE_ADDRESS__)
#define NSS_TEST_HAVE_ASAN 1
#endif

#ifdef NSS_TEST_HAVE_ASAN

namespace nss_test {

static void ArenaOobAccess(size_t alloc_size) {
  PLArenaPool *arena = PORT_NewArena(1024);
  ASSERT_NE(nullptr, arena);

  unsigned char *alloc1 =
      static_cast<unsigned char *>(PORT_ArenaAlloc(arena, alloc_size));
  ASSERT_NE(nullptr, alloc1);
  unsigned char *alloc2 =
      static_cast<unsigned char *>(PORT_ArenaAlloc(arena, alloc_size));
  ASSERT_NE(nullptr, alloc2);

  // Write one byte past the end of the first allocation, which lands in
  // the ASan redzone. ASan should detect this as a heap-buffer-overflow.
  alloc1[alloc_size] = 0xAB;

  // Never reached. ASan aborts on the write above.
  PORT_FreeArena(arena, PR_FALSE);
}

TEST(ArenaAsanTest, IntraArenaOobDetected) {
  EXPECT_DEATH(ArenaOobAccess(32), "");
}

TEST(ArenaAsanTest, IntraArenaOobDetectedSmall) {
  EXPECT_DEATH(ArenaOobAccess(1), "");
}

TEST(ArenaAsanTest, IntraArenaOobDetectedLarge) {
  EXPECT_DEATH(ArenaOobAccess(256), "");
}

}  // namespace nss_test

#endif  // NSS_TEST_HAVE_ASAN

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

#include "gtest/gtest.h"

#include "mozilla/intl/AppCollator.h"
#include "nsString.h"

#define APP_COLLATOR_TEST(name) TEST(AppCollatorTest, name)

using namespace mozilla::intl;

APP_COLLATOR_TEST(Numeric) {
  nsAutoCString ten("foo10");
  nsAutoCString two("foo2");
  nsAutoString ten16(u"foo10");
  nsAutoString two16(u"foo2");

  ASSERT_EQ(AppCollator::Compare(ten, two), 1);
  ASSERT_EQ(AppCollator::CompareBase(ten, two), 1);
  ASSERT_EQ(AppCollator::Compare(ten16, two16), 1);
  ASSERT_EQ(AppCollator::CompareBase(ten16, two16), 1);
}

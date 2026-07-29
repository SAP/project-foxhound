/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SimpleMap.h"
#include "gtest/gtest.h"
#include "nsString.h"

namespace mozilla {

TEST(SimpleMapTest, Insert)
{
  SimpleMap<int, nsCString> map;

  map.Insert(1, "first"_ns);
  ASSERT_EQ(map.Count(), size_t(1));

  Maybe<nsCString> taken = map.Take(1);
  ASSERT_TRUE(taken.isSome());
  ASSERT_TRUE(taken.ref().EqualsLiteral("first"));
  ASSERT_EQ(map.Count(), size_t(0));

  Maybe<nsCString> shouldBeNothing = map.Take(1);
  ASSERT_TRUE(shouldBeNothing.isNothing());
}

TEST(SimpleMapTest, DuplicateKeys)
{
  SimpleMap<int, nsCString> map;

  map.Insert(1, "a1"_ns);
  map.Insert(2, "b1"_ns);
  map.Insert(1, "a2"_ns);
  map.Insert(2, "b2"_ns);
  ASSERT_EQ(map.Count(), size_t(4));

  // Take returns entries in FIFO order within each key.
  Maybe<nsCString> v = map.Take(1);
  ASSERT_TRUE(v.isSome());
  ASSERT_TRUE(v.ref().EqualsLiteral("a1"));

  v = map.Take(2);
  ASSERT_TRUE(v.isSome());
  ASSERT_TRUE(v.ref().EqualsLiteral("b1"));

  v = map.Take(1);
  ASSERT_TRUE(v.isSome());
  ASSERT_TRUE(v.ref().EqualsLiteral("a2"));

  v = map.Take(2);
  ASSERT_TRUE(v.isSome());
  ASSERT_TRUE(v.ref().EqualsLiteral("b2"));

  ASSERT_EQ(map.Count(), size_t(0));
}

TEST(SimpleMapTest, Contains)
{
  SimpleMap<int, nsCString> map;

  ASSERT_FALSE(map.Contains(1));
  map.Insert(1, "one"_ns);
  ASSERT_TRUE(map.Contains(1));
  ASSERT_FALSE(map.Contains(2));
}

TEST(SimpleMapTest, Take)
{
  SimpleMap<int, nsCString> map;

  ASSERT_EQ(map.Count(), size_t(0));
  map.Insert(1, "one"_ns);
  ASSERT_EQ(map.Count(), size_t(1));
  map.Insert(2, "two"_ns);
  ASSERT_EQ(map.Count(), size_t(2));

  Maybe<nsCString> taken = map.Take(1);
  ASSERT_TRUE(taken.isSome());
  ASSERT_TRUE(taken.ref().EqualsLiteral("one"));
  ASSERT_FALSE(map.Contains(1));
  ASSERT_TRUE(map.Contains(2));
  ASSERT_EQ(map.Count(), size_t(1));

  Maybe<nsCString> notTaken = map.Take(3);
  ASSERT_TRUE(notTaken.isNothing());
}

TEST(SimpleMapTest, Clear)
{
  SimpleMap<int, nsCString> map;

  ASSERT_EQ(map.Count(), size_t(0));

  map.Insert(1, "one"_ns);
  map.Insert(2, "two"_ns);

  ASSERT_EQ(map.Count(), size_t(2));
  ASSERT_TRUE(map.Contains(1));
  ASSERT_TRUE(map.Contains(2));

  map.Clear();
  ASSERT_FALSE(map.Contains(1));
  ASSERT_FALSE(map.Contains(2));
  ASSERT_EQ(map.Count(), size_t(0));
}

TEST(SimpleMapTest, ClearWithCallback)
{
  SimpleMap<int, nsCString> map;

  map.Insert(1, "one"_ns);
  map.Insert(2, "two"_ns);
  map.Insert(3, "three"_ns);

  nsTArray<int> keys;
  map.Clear([&](int key, const nsCString& value) { keys.AppendElement(key); });

  ASSERT_EQ(map.Count(), size_t(0));
  ASSERT_EQ(keys.Length(), size_t(3));
  ASSERT_TRUE(keys.Contains(1) && keys.Contains(2) && keys.Contains(3));
}

}  // namespace mozilla

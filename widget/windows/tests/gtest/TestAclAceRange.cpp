/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WinHeaderOnlyUtils.h"

#include <algorithm>

#include "gtest/gtest.h"
#include "mozilla/gtest/MozHelpers.h"

using namespace mozilla;

struct TestAcl {
  ACL acl{ACL_REVISION, 0, sizeof(TestAcl), 3, 0};
  ACCESS_ALLOWED_ACE ace1{
      {ACCESS_ALLOWED_ACE_TYPE, OBJECT_INHERIT_ACE, sizeof(ACCESS_ALLOWED_ACE)},
      GENERIC_READ,
      0};
  ACCESS_ALLOWED_OBJECT_ACE ace2{{ACCESS_ALLOWED_OBJECT_ACE_TYPE, INHERITED_ACE,
                                  sizeof(ACCESS_ALLOWED_OBJECT_ACE)},
                                 GENERIC_READ,
                                 0};
  ACCESS_DENIED_ACE ace3{
      {ACCESS_DENIED_ACE_TYPE, INHERITED_ACE, sizeof(ACCESS_DENIED_ACE)},
      GENERIC_READ,
      0};
  NotNull<ACL*> AsAclPtr() { return WrapNotNull(reinterpret_cast<ACL*>(this)); }
};

TEST(AclAceRange, SimpleCount)
{
  TestAcl testAcl;
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    (void)aceHeader;
    ++aceCount;
  }

  ASSERT_EQ(aceCount, 3);
}

TEST(AclAceRange, SameAsGetAce)
{
  TestAcl testAcl;
  int aceIdx = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    VOID* pGetAceHeader = nullptr;
    EXPECT_TRUE(::GetAce(testAcl.AsAclPtr(), aceIdx, &pGetAceHeader));
    auto* getAceHeader = static_cast<ACE_HEADER*>(pGetAceHeader);
    EXPECT_EQ(getAceHeader->AceType, aceHeader.AceType);
    EXPECT_EQ(getAceHeader->AceFlags, aceHeader.AceFlags);
    EXPECT_EQ(getAceHeader->AceSize, aceHeader.AceSize);
    ++aceIdx;
  }
}

TEST(AclAceRange, WithFlagCount)
{
  TestAcl testAcl;
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    if (aceHeader.AceFlags & INHERITED_ACE) {
      ++aceCount;
    }
  }

  ASSERT_EQ(aceCount, 2);
}

TEST(AclAceRange, AclSizeCheckedAsWellAsCount)
{
  TestAcl testAcl;
  testAcl.acl.AclSize -= sizeof(ACCESS_DENIED_ACE);
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    if (aceHeader.AceFlags & INHERITED_ACE) {
      ++aceCount;
    }
  }

  ASSERT_EQ(aceCount, 1);
}

TEST(AclAceRange, ChecksAceHeaderSizeInAclSize)
{
  TestAcl testAcl;
  testAcl.acl.AclSize -= 1;
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    if (aceHeader.AceFlags & INHERITED_ACE) {
      ++aceCount;
    }
  }

  ASSERT_EQ(aceCount, 1);
}

TEST(AclAceRange, AceCountOfZeroResultsInNoIterations)
{
  TestAcl testAcl;
  testAcl.acl.AceCount = 0;
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    (void)aceHeader;
    ++aceCount;
  }

  ASSERT_EQ(aceCount, 0);
}

TEST(AclAceRange, AclSizeTooSmallForAnyAcesResultsInNoIterations)
{
  TestAcl testAcl;
  testAcl.acl.AclSize = sizeof(ACCESS_ALLOWED_ACE) - 1;
  int aceCount = 0;
  for (const auto& aceHeader : AclAceRange(testAcl.AsAclPtr())) {
    (void)aceHeader;
    ++aceCount;
  }

  ASSERT_EQ(aceCount, 0);
}

TEST(AclAceRange, weakly_incrementable)
{
  TestAcl testAcl;
  AclAceRange aclAceRange(testAcl.AsAclPtr());
  auto iter = aclAceRange.begin();

  EXPECT_TRUE(std::addressof(++iter) == std::addressof(iter))
      << "addressof pre-increment result should match iterator";

  // pre and post increment advance iterator.
  EXPECT_EQ(iter->AceType, testAcl.ace2.Header.AceType);
  EXPECT_EQ(iter->AceFlags, testAcl.ace2.Header.AceFlags);
  EXPECT_EQ(iter->AceSize, testAcl.ace2.Header.AceSize);
  iter++;
  EXPECT_EQ(iter->AceType, testAcl.ace3.Header.AceType);
  EXPECT_EQ(iter->AceFlags, testAcl.ace3.Header.AceFlags);
  EXPECT_EQ(iter->AceSize, testAcl.ace3.Header.AceSize);

  // Moveable.
  auto moveConstructedIter(std::move(iter));
  EXPECT_EQ(moveConstructedIter->AceType, testAcl.ace3.Header.AceType);
  EXPECT_EQ(moveConstructedIter->AceFlags, testAcl.ace3.Header.AceFlags);
  EXPECT_EQ(moveConstructedIter->AceSize, testAcl.ace3.Header.AceSize);
  auto moveAssignedIter = std::move(iter);
  EXPECT_EQ(moveAssignedIter->AceType, testAcl.ace3.Header.AceType);
  EXPECT_EQ(moveAssignedIter->AceFlags, testAcl.ace3.Header.AceFlags);
  EXPECT_EQ(moveAssignedIter->AceSize, testAcl.ace3.Header.AceSize);
}

TEST(AclAceRange, incrementable)
{
  TestAcl testAcl;
  AclAceRange aclAceRange1(testAcl.AsAclPtr());
  AclAceRange aclAceRange2(testAcl.AsAclPtr());
  auto it1 = aclAceRange1.begin();
  auto it2 = aclAceRange2.begin();

  // bool(a == b) implies bool(a++ == b)
  EXPECT_TRUE(it1 == it2) << "begin iterators for same ACL should be equal";
  EXPECT_TRUE(it1++ == it2);
  EXPECT_FALSE(it1 == it2);
  EXPECT_FALSE(it1++ == it2);

  // bool(a == b) implies bool(((void)a++, a) == ++b)
  it1 = aclAceRange1.begin();
  EXPECT_TRUE(it1 == it2);
  EXPECT_TRUE(((void)it1++, it1) == ++it2);
  it1 = aclAceRange1.begin();
  EXPECT_FALSE(it1 == it2);
  EXPECT_FALSE(((void)it1++, it1) == ++it2);

  // Copyable.
  auto copyConstructedIter(it2);
  EXPECT_EQ(copyConstructedIter->AceType, testAcl.ace3.Header.AceType);
  EXPECT_EQ(copyConstructedIter->AceFlags, testAcl.ace3.Header.AceFlags);
  EXPECT_EQ(copyConstructedIter->AceSize, testAcl.ace3.Header.AceSize);
  auto copyAssignedIter = it2;
  EXPECT_EQ(copyAssignedIter->AceType, testAcl.ace3.Header.AceType);
  EXPECT_EQ(copyAssignedIter->AceFlags, testAcl.ace3.Header.AceFlags);
  EXPECT_EQ(copyAssignedIter->AceSize, testAcl.ace3.Header.AceSize);

  // Default constructable.
  AclAceRange::Iterator defaultConstructed;
  EXPECT_TRUE(defaultConstructed == aclAceRange1.end());
}

TEST(AclAceRange, AlgorithmCountIf)
{
  TestAcl testAcl;
  AclAceRange aclAceRange(testAcl.AsAclPtr());
  auto aceCount = std::count_if(
      aclAceRange.begin(), aclAceRange.end(),
      [](const auto& hdr) { return hdr.AceFlags & INHERITED_ACE; });

  ASSERT_EQ(aceCount, 2);
}

TEST(AclAceRange, AlgorithmAnyOf)
{
  TestAcl testAcl;
  AclAceRange aclAceRange(testAcl.AsAclPtr());
  auto anyInherited =
      std::any_of(aclAceRange.begin(), aclAceRange.end(),
                  [](const auto& hdr) { return hdr.AceFlags & INHERITED_ACE; });

  ASSERT_TRUE(anyInherited);
}

TEST(AclAceRange, DereferenceAtEndIsFatal)
{
#if DEBUG
  const auto* msg =
      "Assertion failure: mAceCount \\(Trying to dereference past end of "
      "AclAceRange\\)";
#else
  const auto* msg = "";
#endif

  EXPECT_DEATH_WRAP(
      {
        TestAcl testAcl;
        AclAceRange aclAceRange(testAcl.AsAclPtr());
        auto aceItCurrent = aclAceRange.begin();
        for (; aceItCurrent != aclAceRange.end(); ++aceItCurrent) {
        }
        *aceItCurrent;
      },
      msg);
}

TEST(AclAceRange, DebugAssertForIteratingPastEnd)
{
  EXPECT_DEBUG_DEATH_WRAP(
      {
        TestAcl testAcl;
        AclAceRange aclAceRange(testAcl.AsAclPtr());
        auto aceItCurrent = aclAceRange.begin();
        for (; aceItCurrent != aclAceRange.end(); ++aceItCurrent) {
        }
        ++aceItCurrent;
      },
      "Assertion failure: mAceCount \\(Iterating past end of AclAceRange\\)");
}

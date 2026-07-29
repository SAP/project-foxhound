/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "EnterprisePoliciesFlagFile.h"
#include "TestDirHelpers.h"

#include <filesystem>

namespace fs = std::filesystem;

class EnterprisePoliciesFlagFileTests : public ::testing::Test {
 protected:
  fs::path mTempDir;

  void SetUp() override {
    mTempDir = CreateTempDir();
    ASSERT_FALSE(mTempDir.empty());
  }

  void TearDown() override { RemoveDir(mTempDir); }
};

TEST_F(EnterprisePoliciesFlagFileTests, DoesNotExist) {
  EXPECT_FALSE(EnterprisePoliciesFlagFile::Exists(mTempDir));
}

TEST_F(EnterprisePoliciesFlagFileTests, AddThenExists) {
  EnterprisePoliciesFlagFile::Add(mTempDir);
  EXPECT_TRUE(EnterprisePoliciesFlagFile::Exists(mTempDir));
}

TEST_F(EnterprisePoliciesFlagFileTests, AddThenRemoveThenDoesNotExist) {
  EnterprisePoliciesFlagFile::Add(mTempDir);
  EXPECT_TRUE(EnterprisePoliciesFlagFile::Remove(mTempDir));
  EXPECT_FALSE(EnterprisePoliciesFlagFile::Exists(mTempDir));
}

TEST_F(EnterprisePoliciesFlagFileTests, RemoveWhenDoesNotExist) {
  EXPECT_FALSE(EnterprisePoliciesFlagFile::Remove(mTempDir));
  EXPECT_FALSE(EnterprisePoliciesFlagFile::Exists(mTempDir));
}

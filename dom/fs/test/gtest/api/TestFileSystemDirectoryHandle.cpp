/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileSystemMocks.h"
#include "gtest/gtest.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/FileSystemDirectoryHandle.h"
#include "mozilla/dom/FileSystemDirectoryHandleBinding.h"
#include "mozilla/dom/FileSystemHandle.h"
#include "mozilla/dom/FileSystemHandleBinding.h"
#include "mozilla/dom/FileSystemManager.h"
#include "mozilla/dom/StorageManager.h"
#include "nsIGlobalObject.h"

using ::testing::_;

namespace mozilla::dom::fs::test {

class TestFileSystemDirectoryHandle : public ::testing::Test {
 protected:
  void SetUp() override {
    // TODO: Fix the test to not depend on CreateFileSystemManagerParent
    // failure because of the pref set to false.
    nsCOMPtr<nsIPrefBranch> prefs = do_GetService(NS_PREFSERVICE_CONTRACTID);
    prefs->SetBoolPref("dom.fs.enabled", false);

    mRequestHandler = MakeUnique<MockFileSystemRequestHandler>();
    mMetadata = FileSystemEntryMetadata("dir"_ns, u"Directory"_ns,
                                        /* directory */ true);
    mName = u"testDir"_ns;
    mManager = MakeAndAddRef<FileSystemManager>(mGlobal, nullptr);
  }

  void TearDown() override {
    nsCOMPtr<nsIPrefBranch> prefs = do_GetService(NS_PREFSERVICE_CONTRACTID);
    prefs->SetBoolPref("dom.fs.enabled", true);

    if (!mManager->IsShutdown()) {
      mManager->Shutdown();
    }
  }

  nsIGlobalObject* mGlobal = GetGlobal();
  const IterableIteratorBase::IteratorType mIteratorType =
      IterableIteratorBase::IteratorType::Keys;
  UniquePtr<MockFileSystemRequestHandler> mRequestHandler;
  FileSystemEntryMetadata mMetadata;
  nsString mName;
  RefPtr<FileSystemManager> mManager;
};

TEST_F(TestFileSystemDirectoryHandle, constructDirectoryHandleRefPointer) {
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata);

  ASSERT_TRUE(dirHandle);
}

TEST_F(TestFileSystemDirectoryHandle, initIterator) {
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  RefPtr<FileSystemDirectoryHandle::iterator_t> iterator =
      new FileSystemDirectoryHandle::iterator_t(dirHandle.get(), mIteratorType);
  IgnoredErrorResult rv;
  dirHandle->InitAsyncIteratorData(iterator->Data(), mIteratorType, rv);
  ASSERT_TRUE(iterator->Data().mImpl);
}

class MockFileSystemDirectoryIteratorImpl final
    : public FileSystemDirectoryIterator::Impl {
 public:
  MOCK_METHOD(already_AddRefed<Promise>, Next,
              (nsIGlobalObject * aGlobal, RefPtr<FileSystemManager>& aManager,
               ErrorResult& aError),
              (override));
};

TEST_F(TestFileSystemDirectoryHandle, isNextPromiseReturned) {
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  auto mockIter = MakeUnique<MockFileSystemDirectoryIteratorImpl>();
  IgnoredErrorResult error;
  EXPECT_CALL(*mockIter, Next(_, _, _))
      .WillOnce(::testing::Return(Promise::Create(mGlobal, error)));

  RefPtr<FileSystemDirectoryHandle::iterator_t> iterator =
      MakeAndAddRef<FileSystemDirectoryHandle::iterator_t>(dirHandle.get(),
                                                           mIteratorType);
  iterator->Data().mImpl = std::move(mockIter);

  IgnoredErrorResult rv;
  RefPtr<Promise> promise =
      dirHandle->GetNextIterationResult(iterator.get(), rv);
  ASSERT_TRUE(promise);
}

TEST_F(TestFileSystemDirectoryHandle, isHandleKindDirectory) {
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  ASSERT_EQ(FileSystemHandleKind::Directory, dirHandle->Kind());
}

TEST_F(TestFileSystemDirectoryHandle, isFileHandleReturned) {
  EXPECT_CALL(*mRequestHandler, GetFileHandle(_, _, _, _, _))
      .WillOnce(::testing::ReturnArg<3>());
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  FileSystemGetFileOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->GetFileHandle(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_OK));
}

TEST_F(TestFileSystemDirectoryHandle, doesGetFileHandleFailOnNullGlobal) {
  mGlobal = nullptr;
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata);

  ASSERT_TRUE(dirHandle);

  FileSystemGetFileOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->GetFileHandle(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_ERROR_UNEXPECTED));
}

TEST_F(TestFileSystemDirectoryHandle, isDirectoryHandleReturned) {
  EXPECT_CALL(*mRequestHandler, GetDirectoryHandle(_, _, _, _, _))
      .WillOnce(::testing::ReturnArg<3>());
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  FileSystemGetDirectoryOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->GetDirectoryHandle(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_OK));
}

TEST_F(TestFileSystemDirectoryHandle, doesGetDirectoryHandleFailOnNullGlobal) {
  mGlobal = nullptr;
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata);

  ASSERT_TRUE(dirHandle);

  FileSystemGetDirectoryOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->GetDirectoryHandle(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_ERROR_UNEXPECTED));
}

TEST_F(TestFileSystemDirectoryHandle, isRemoveEntrySuccessful) {
  EXPECT_CALL(*mRequestHandler, RemoveEntry(_, _, _, _, _))
      .WillOnce(::testing::ReturnArg<3>());
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  FileSystemRemoveOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->RemoveEntry(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_OK));
}

TEST_F(TestFileSystemDirectoryHandle, doesRemoveEntryFailOnNullGlobal) {
  mGlobal = nullptr;
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata);

  ASSERT_TRUE(dirHandle);

  FileSystemRemoveOptions options;
  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->RemoveEntry(mName, options, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_ERROR_UNEXPECTED));
}

TEST_F(TestFileSystemDirectoryHandle, isResolveSuccessful) {
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata,
                                               mRequestHandler.release());

  ASSERT_TRUE(dirHandle);

  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->Resolve(*dirHandle, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_OK));
}

TEST_F(TestFileSystemDirectoryHandle, doesResolveFailOnNullGlobal) {
  mGlobal = nullptr;
  RefPtr<FileSystemDirectoryHandle> dirHandle =
      MakeAndAddRef<FileSystemDirectoryHandle>(mGlobal, mManager, mMetadata);

  ASSERT_TRUE(dirHandle);

  IgnoredErrorResult rv;
  RefPtr<Promise> promise = dirHandle->Resolve(*dirHandle, rv);

  ASSERT_TRUE(rv.ErrorCodeIs(NS_ERROR_UNEXPECTED));
}

}  // namespace mozilla::dom::fs::test

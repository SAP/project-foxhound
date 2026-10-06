#include "gtest/gtest.h"

#include "mozilla/net/rust_helper.h"
#include "nsDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"
#include "nsIFile.h"
#include "nsIFileStreams.h"
#include "nsNetUtil.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsUnicharUtils.h"
#include <fcntl.h>
#include <sys/stat.h>

#ifndef XP_WIN
#  include <sys/file.h>
#  include <unistd.h>
#endif

#ifdef XP_WIN
#  include <io.h>
#  include <share.h>
#endif

using namespace mozilla;
using namespace mozilla::net;

class TestEtcHostsParsing : public ::testing::Test {
 protected:
  void SetUp() override {
    // Get temp directory
    nsCOMPtr<nsIFile> tmpDir;
    nsresult rv =
        NS_GetSpecialDirectory(NS_OS_TEMP_DIR, getter_AddRefs(tmpDir));
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    // Create unique test file names
    nsAutoString baseName(u"test_hosts_");
    baseName.AppendInt(PR_IntervalNow());

    // Normal test file
    rv = tmpDir->Clone(getter_AddRefs(mTestHostsFile));
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    nsAutoString normalName = baseName + u"_normal"_ns;
    rv = mTestHostsFile->Append(normalName);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    // Locked test file
    rv = tmpDir->Clone(getter_AddRefs(mLockedHostsFile));
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    nsAutoString lockedName = baseName + u"_locked"_ns;
    rv = mLockedHostsFile->Append(lockedName);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    // Permission denied test file
    rv = tmpDir->Clone(getter_AddRefs(mNoPermHostsFile));
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    nsAutoString noPermName = baseName + u"_noperm"_ns;
    rv = mNoPermHostsFile->Append(noPermName);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    mCallbackInvoked = false;
    mCallbackResult = true;
    mParsedHosts.Clear();
  }

  void TearDown() override {
    // Clean up test files
    if (mTestHostsFile) {
      mTestHostsFile->Remove(false);
    }
    if (mLockedHostsFile) {
      mLockedHostsFile->Remove(false);
    }
    if (mNoPermHostsFile) {
      mNoPermHostsFile->Remove(false);
    }

    // Close any open file descriptors
    if (mLockFd != -1) {
#ifdef XP_WIN
      _close(mLockFd);
#else
      close(mLockFd);
#endif
      mLockFd = -1;
    }
  }

  void CreateNormalHostsFile() {
    nsCOMPtr<nsIOutputStream> stream;
    nsresult rv =
        NS_NewLocalFileOutputStream(getter_AddRefs(stream), mTestHostsFile);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    const char* content =
        "127.0.0.1 localhost\n"
        "::1 localhost\n"
        "127.0.0.1 example.com www.example.com\n"
        "# This is a comment\n"
        "192.168.1.1 router.local\n";

    uint32_t written;
    rv = stream->Write(content, strlen(content), &written);
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    ASSERT_EQ(written, strlen(content));

    rv = stream->Close();
    ASSERT_TRUE(NS_SUCCEEDED(rv));
  }

  void CreateLockedHostsFile() {
    // First create the file with content
    nsCOMPtr<nsIOutputStream> stream;
    nsresult rv =
        NS_NewLocalFileOutputStream(getter_AddRefs(stream), mLockedHostsFile);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    const char* content = "127.0.0.1 locked.test\n";
    uint32_t written;
    rv = stream->Write(content, strlen(content), &written);
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    rv = stream->Close();
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    // Now lock it by opening with exclusive access
    nsAutoCString nativePath;
    rv = GetCrossplatformNativePath(mLockedHostsFile, nativePath);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

#ifdef XP_WIN
    // On Windows, open with no sharing to simulate a locked file
    mLockFd = _sopen(nativePath.get(), _O_RDONLY, _SH_DENYRW, _S_IREAD);
#else
    // On Unix, use flock to lock the file
    mLockFd = open(nativePath.get(), O_RDONLY);
    if (mLockFd != -1) {
      ::flock(mLockFd, LOCK_EX | LOCK_NB);  // Exclusive, non-blocking lock
    }
#endif
    ASSERT_NE(mLockFd, -1);
  }

  void CreateNoPermissionFile() {
#ifndef XP_WIN
    // Create the file first
    nsCOMPtr<nsIOutputStream> stream;
    nsresult rv =
        NS_NewLocalFileOutputStream(getter_AddRefs(stream), mNoPermHostsFile);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    const char* content = "127.0.0.1 noperm.test\n";
    uint32_t written;
    rv = stream->Write(content, strlen(content), &written);
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    rv = stream->Close();
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    // Remove read permissions
    nsAutoCString nativePath;
    rv = GetCrossplatformNativePath(mNoPermHostsFile, nativePath);
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    chmod(nativePath.get(), 0000);  // No permissions
#endif
  }

  nsresult GetCrossplatformNativePath(nsIFile* aFile, nsACString& aPath) {
#ifdef XP_WIN
    nsAutoString widePath;
    nsresult rv = aFile->GetPath(widePath);
    if (NS_FAILED(rv)) return rv;
    aPath = NS_ConvertUTF16toUTF8(widePath);
    return NS_OK;
#else
    return aFile->GetNativePath(aPath);
#endif
  }

  static bool TestCallback(const nsTArray<nsCString>* aArray) {
    auto* self = static_cast<TestEtcHostsParsing*>(sCurrentTest);
    self->mCallbackInvoked = true;

    if (aArray) {
      self->mParsedHosts.AppendElements(*aArray);
    }

    return self->mCallbackResult;
  }

  nsCOMPtr<nsIFile> mTestHostsFile;
  nsCOMPtr<nsIFile> mLockedHostsFile;
  nsCOMPtr<nsIFile> mNoPermHostsFile;
  int mLockFd = -1;

  bool mCallbackInvoked;
  bool mCallbackResult;
  nsTArray<nsCString> mParsedHosts;

  static TestEtcHostsParsing* sCurrentTest;
};

TestEtcHostsParsing* TestEtcHostsParsing::sCurrentTest = nullptr;

TEST_F(TestEtcHostsParsing, ParseNormalFile) {
  sCurrentTest = this;
  CreateNormalHostsFile();

  nsAutoCString path;
  nsresult rv = GetCrossplatformNativePath(mTestHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  rust_parse_etc_hosts(&path, TestCallback);

  EXPECT_TRUE(mCallbackInvoked);
  EXPECT_GT(mParsedHosts.Length(), 0u);

  // Check that expected hostnames are parsed
  bool foundLocalhost = false;
  bool foundExampleCom = false;
  bool foundWwwExampleCom = false;
  bool foundRouterLocal = false;

  for (const auto& host : mParsedHosts) {
    if (host.EqualsLiteral("localhost")) foundLocalhost = true;
    if (host.EqualsLiteral("example.com")) foundExampleCom = true;
    if (host.EqualsLiteral("www.example.com")) foundWwwExampleCom = true;
    if (host.EqualsLiteral("router.local")) foundRouterLocal = true;
  }

  EXPECT_TRUE(foundLocalhost);
  EXPECT_TRUE(foundExampleCom);
  EXPECT_TRUE(foundWwwExampleCom);
  EXPECT_TRUE(foundRouterLocal);
}

TEST_F(TestEtcHostsParsing, ParseLockedFile) {
  sCurrentTest = this;
  CreateLockedHostsFile();

  nsAutoCString path;
  nsresult rv = GetCrossplatformNativePath(mLockedHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  // The function should handle locked files gracefully and not crash or hang
  rust_parse_etc_hosts(&path, TestCallback);

  // On some systems, locked files might still be readable, on others not.
  // The important thing is that the function doesn't crash or hang.
  // We don't assert on mCallbackInvoked because it depends on platform
  // behavior.
}

TEST_F(TestEtcHostsParsing, ParseNoPermissionFile) {
#ifndef XP_WIN
  sCurrentTest = this;
  CreateNoPermissionFile();

  nsAutoCString path;
  nsresult rv = GetCrossplatformNativePath(mNoPermHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  // The function should handle permission denied gracefully
  rust_parse_etc_hosts(&path, TestCallback);

  // Callback should not be invoked for files we can't read
  EXPECT_FALSE(mCallbackInvoked);
#endif
}

TEST_F(TestEtcHostsParsing, ParseNonExistentFile) {
  sCurrentTest = this;

  nsAutoCString fakePath("/nonexistent/file/hosts");

  // The function should handle non-existent files gracefully
  rust_parse_etc_hosts(&fakePath, TestCallback);

  // Callback should not be invoked for non-existent files
  EXPECT_FALSE(mCallbackInvoked);
}

TEST_F(TestEtcHostsParsing, CallbackReturnsFalse) {
  sCurrentTest = this;
  CreateNormalHostsFile();
  mCallbackResult = false;  // Tell callback to return false

  nsAutoCString path;
  nsresult rv = GetCrossplatformNativePath(mTestHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  rust_parse_etc_hosts(&path, TestCallback);

  EXPECT_TRUE(mCallbackInvoked);
  // When callback returns false, parsing should stop early
  // So we shouldn't get all the hosts
}

TEST_F(TestEtcHostsParsing, EmptyFile) {
  sCurrentTest = this;

  // Create empty file
  nsCOMPtr<nsIOutputStream> stream;
  nsresult rv =
      NS_NewLocalFileOutputStream(getter_AddRefs(stream), mTestHostsFile);
  ASSERT_TRUE(NS_SUCCEEDED(rv));
  rv = stream->Close();
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  nsAutoCString path;
  rv = GetCrossplatformNativePath(mTestHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  rust_parse_etc_hosts(&path, TestCallback);

  // Callback might or might not be invoked for empty files, but shouldn't crash
  EXPECT_EQ(mParsedHosts.Length(), 0u);
}

TEST_F(TestEtcHostsParsing, FileWithOnlyComments) {
  sCurrentTest = this;

  nsCOMPtr<nsIOutputStream> stream;
  nsresult rv =
      NS_NewLocalFileOutputStream(getter_AddRefs(stream), mTestHostsFile);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  const char* content =
      "# This is a comment\n"
      "# Another comment\n"
      "   # Indented comment\n";

  uint32_t written;
  rv = stream->Write(content, strlen(content), &written);
  ASSERT_TRUE(NS_SUCCEEDED(rv));
  rv = stream->Close();
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  nsAutoCString path;
  rv = GetCrossplatformNativePath(mTestHostsFile, path);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  rust_parse_etc_hosts(&path, TestCallback);

  // Should not parse any hosts from a file with only comments
  EXPECT_EQ(mParsedHosts.Length(), 0u);
}

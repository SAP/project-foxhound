/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/gtest/MozAssertions.h"

#include "nsXREDirProvider.h"
#include "nsAppRunner.h"

#include "nsDirectoryService.h"
#include "nsIDirectoryService.h"
#include "nsTHashMap.h"

#include "nsAppDirectoryServiceDefs.h"
#include "prenv.h"
#include "nsIFile.h"
#include "SpecialSystemDirectory.h"
#include "nsPrintfCString.h"

#if defined(XP_UNIX)
#  include <unistd.h>
#  include <sys/stat.h>
#endif  // XP_UNIX

using namespace mozilla;

#if defined(XP_WIN)
#  include <windows.h>
#  include <shlobj.h>
#  include <knownfolders.h>  // FOLDERID_Documents
#endif

#include "mozilla/XREAppData.h"

class BaseXREAppDir : public ::testing::Test {
 protected:
  void SetUp() override {
// There is no need to mock on macOS because nsXREDirProvider relies on macOS
// level APIs, see below
#if defined(XP_UNIX) && !defined(XP_MACOSX)
    mMockedHomeDir = GetNewHome();
#endif

    mFakeAppData = XREAppData();
    mFakeAppData.profile = "fooprofile";
#if defined(ANDROID)
    mFakeAppData.name = "Fennec";
#else
    mFakeAppData.name = "Firefox";
#endif
    mFakeAppData.vendor = "Mozilla";

#if defined(XP_WIN)
    nsresult rv = GetShellFolderPath(FOLDERID_RoamingAppData, mRoamingHome);
    EXPECT_NS_SUCCEEDED(rv);
    rv = GetShellFolderPath(FOLDERID_LocalAppData, mLocalHome);
    EXPECT_NS_SUCCEEDED(rv);
#endif

#if defined(XP_MACOSX)
    nsresult rv = FindFolder(kApplicationSupportFolderType, mAppSupport);
    EXPECT_NS_SUCCEEDED(rv);
    rv = FindFolder(kCachedDataFolderType, mAppCache);
    EXPECT_NS_SUCCEEDED(rv);
    rv = FindFolder(kDomainLibraryFolderType, mLibrary);
    EXPECT_NS_SUCCEEDED(rv);
    rv = FindFolder(kCurrentUserFolderType, mHomeRoot);
    EXPECT_NS_SUCCEEDED(rv);
#endif
  }

#if defined(XP_WIN)
  nsresult GetShellFolderPath(KNOWNFOLDERID folder, nsACString& _retval) {
    DWORD flags =
        KF_FLAG_SIMPLE_IDLIST | KF_FLAG_DONT_VERIFY | KF_FLAG_NO_ALIAS;
    PWSTR path = nullptr;

    if (!SUCCEEDED(SHGetKnownFolderPath(folder, flags, NULL, &path))) {
      return NS_ERROR_NOT_AVAILABLE;
    }

    CopyUTF16toUTF8(MakeStringSpan(reinterpret_cast<char16_t*>(path)), _retval);
    CoTaskMemFree(path);
    return NS_OK;
  }
#endif

#if defined(XP_MACOSX)
  nsresult FindFolder(OSType folderType, nsACString& retval) {
    FSRef fsRef;
    nsCOMPtr<nsILocalFileMac> dirFileMac;
    OSErr err =
        ::FSFindFolder(kUserDomain, folderType, kDontCreateFolder, &fsRef);
    if (err != noErr) {
      return NS_ERROR_FAILURE;
    }

    nsresult rv = NS_NewLocalFileWithFSRef(&fsRef, getter_AddRefs(dirFileMac));
    EXPECT_NS_SUCCEEDED(rv);
    retval = dirFileMac->NativePath().get();

    return NS_OK;
  }
#endif

  void TearDown() override {
#if defined(XP_UNIX) && !defined(XP_MACOSX)
    nsresult rv = nsXREDirProvider::RestoreUserDataProfileDirectoryFromGTest(
        mDataDirProfileLocal, mDataDirProfile);
    EXPECT_NS_SUCCEEDED(rv);

    for (auto& entry : mRestoreEnv) {
      PR_SetEnv(ToNewCString(entry.GetKey() + "="_ns + entry.GetData()));
    }

    rv = mMockedHome->Remove(true);
#endif

    if (mOriginalAppData) {
      SwitchFakeAppDataOff();
    }

    EXPECT_STREQ(gAppData->profile, nullptr);
#if defined(ANDROID)
    EXPECT_STREQ(gAppData->name, "Fennec");
#else
    EXPECT_STREQ(gAppData->name, "Firefox");
#endif
    EXPECT_STREQ(gAppData->vendor, "Mozilla");
  }

  nsCString GetPath(nsCOMPtr<nsIFile> aFile) {
#if defined(XP_WIN)
    return NS_ConvertUTF16toUTF8(aFile->NativePath());
#else
    return aFile->NativePath();
#endif
  }

  void SwitchFakeAppDataOn() {
    EXPECT_EQ(mOriginalAppData, nullptr);
    mOriginalAppData = gAppData;
    gAppData = &mFakeAppData;
    EXPECT_STREQ(gAppData->profile, "fooprofile");
  }

  void SwitchFakeAppDataOff() {
    EXPECT_NE(mOriginalAppData, nullptr);
    gAppData = mOriginalAppData;
    mOriginalAppData = nullptr;
    EXPECT_STREQ(gAppData->profile, nullptr);
  }

  // Used by
  //  - XRE_USER_APP_DATA_DIR
  //  - NS_APP_APPLICATION_REGISTRY_DIR
  //  - NS_APP_APPLICATION_REGISTRY_FILE
  nsCString GetUserAppDataDirectory() {
    nsCOMPtr<nsIFile> localDir;
    nsresult rv = NS_OK;
    nsXREDirProvider::GetUserAppDataDirectory(getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  nsCString GetUserProfilesRootDir() {
    RefPtr<nsXREDirProvider> ds = nsXREDirProvider::GetSingleton();

    nsCOMPtr<nsIFile> localDir;
    nsresult rv = ds->GetUserProfilesRootDir(getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  nsCString GetUserProfilesLocalDir() {
    RefPtr<nsXREDirProvider> ds = nsXREDirProvider::GetSingleton();

    nsCOMPtr<nsIFile> localDir;
    nsresult rv = ds->GetUserProfilesLocalDir(getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  nsCString GetUserLocalDataDirectory() {
    nsCOMPtr<nsIFile> localDir;
    nsresult rv =
        nsXREDirProvider::GetUserLocalDataDirectory(getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  nsCString GetFromXREDirProvider(const char* aName) {
    RefPtr<nsXREDirProvider> ds = nsXREDirProvider::GetSingleton();

    bool dummy;
    nsCOMPtr<nsIFile> localDir;
    nsresult rv = ds->GetFile(aName, &dummy, getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  nsCString GetFromDirectoryService(const char* aName) {
    nsCOMPtr<nsIFile> localDir;
    nsDirectoryService::gService->Undefine(aName);
    nsresult rv = nsDirectoryService::gService->Get(aName, NS_GET_IID(nsIFile),
                                                    getter_AddRefs(localDir));
    EXPECT_NS_SUCCEEDED(rv);
    return GetPath(localDir);
  }

  // Create a temp dir and set HOME to it.  Upon successful completion, return
  // the string with the path of the homedir.
#if defined(XP_UNIX) && !defined(XP_MACOSX)
  nsCString GetNewHome() {
    nsresult rv = GetSpecialSystemDirectory(
        SystemDirectories::OS_TemporaryDirectory, getter_AddRefs(mMockedHome));
    EXPECT_NS_SUCCEEDED(rv);

    rv = mMockedHome->AppendNative(
        nsPrintfCString("xreappdir-gtest-%d", getpid()));
    EXPECT_NS_SUCCEEDED(rv);

    rv = mMockedHome->CreateUnique(nsIFile::DIRECTORY_TYPE, 0700);
    EXPECT_NS_SUCCEEDED(rv);

    // Get a Clone() of gDataDirProfileLocal / gDataDirProfile
    // They will get restored in TearDown()
    rv = nsXREDirProvider::ClearUserDataProfileDirectoryFromGTest(
        getter_AddRefs(mDataDirProfileLocal), getter_AddRefs(mDataDirProfile));
    EXPECT_NS_SUCCEEDED(rv);

    nsCString homedir = mMockedHome->NativePath();
    SetEnv("HOME", homedir.get());
    return homedir;
  }
#endif

#if defined(XP_UNIX)
  nsTHashMap<nsCString, nsCString> mRestoreEnv;

  static const char* GetEnv(const char* aName) { return PR_GetEnv(aName); }

  void SaveEnv(const char* aName) {
    mRestoreEnv.LookupOrInsertWith(nsDependentCString(aName), [aName] {
      const char* value = GetEnv(aName);
      return value ? nsCString(value) : ""_ns;
    });
  }

  void SetEnv(const char* aName, const char* aValue) {
    SaveEnv(aName);
    auto envValue = Smprintf("%s=%s", aName, aValue);
    ASSERT_EQ(0, PR_SetEnv(envValue.release()));
    ASSERT_STREQ(aValue, GetEnv(aName));
  }

  void UnsetEnv(const char* aName) { SetEnv(aName, ""); }
#endif

  void MkHomeSubdir(const char* aSubdir, nsCString& subdir) {
#if defined(XP_UNIX) && !defined(XP_MACOSX)
    subdir = mMockedHomeDir;
    if (aSubdir[0] != '/') {
      subdir += "/";
    }
    subdir += aSubdir;
    ASSERT_EQ(0, mkdir(subdir.get(), S_IRWXU));
#endif
  }

#if defined(XP_UNIX) && !defined(XP_MACOSX)
  nsCOMPtr<nsIFile> mMockedHome;
  nsCOMPtr<nsIFile> mDataDirProfileLocal;
  nsCOMPtr<nsIFile> mDataDirProfile;

  nsCString mMockedHomeDir;
#endif

#if defined(XP_MACOSX)
  nsCString mAppSupport;
  nsCString mAppCache;
  nsCString mLibrary;
  nsCString mHomeRoot;
#endif

#if defined(XP_WIN)
  nsCString mLocalHome;
  nsCString mRoamingHome;
#endif

  const XREAppData* mOriginalAppData = nullptr;
  XREAppData mFakeAppData{};
};

class ExistentLegacyXREAppDir_Generic : public BaseXREAppDir {
 protected:
  void SetUp() override {
    BaseXREAppDir::SetUp();
    MkHomeSubdir(".mozilla", mMozDir);
    MkHomeSubdir(".mozilla/firefox", mMozDir);
  }
  nsCString mMozDir;
};

class ExistentLegacyXREAppDir_Generic_AppDataProfile
    : public ExistentLegacyXREAppDir_Generic {
 protected:
  void SetUp() override {
    ExistentLegacyXREAppDir_Generic::SetUp();
    SwitchFakeAppDataOn();
  }
};

class NonExistentLegacyXREAppDir_Generic : public BaseXREAppDir {};

class NonExistentLegacyXREAppDir_Generic_AppDataProfile : public BaseXREAppDir {
 protected:
  void SetUp() override {
    BaseXREAppDir::SetUp();
    SwitchFakeAppDataOn();
  }
};

/*
 * Tests the legacy behavior when there is
 *  - no MOZ_LEGACY_HOME
 *  - existing $HOME/.mozilla
 */
class ExistentLegacyXREAppDir_NoEnv : public ExistentLegacyXREAppDir_Generic {};

class ExistentLegacyXREAppDir_NoEnv_AppDataProfile
    : public ExistentLegacyXREAppDir_Generic_AppDataProfile {};

class NonExistentLegacyXREAppDir_NoEnv
    : public NonExistentLegacyXREAppDir_Generic {};

class NonExistentLegacyXREAppDir_NoEnv_AppDataProfile
    : public NonExistentLegacyXREAppDir_Generic_AppDataProfile {};

/*
 * Tests the legacy behavior when there is
 *  - MOZ_LEGACY_HOME = 0
 *  - existing $HOME/.mozilla
 */
class ExistentLegacyXREAppDir_BadEnv : public ExistentLegacyXREAppDir_Generic {
 protected:
  void SetUp() override {
    ExistentLegacyXREAppDir_Generic::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "0");
#endif
  }
};

class ExistentLegacyXREAppDir_BadEnv_AppDataProfile
    : public ExistentLegacyXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    ExistentLegacyXREAppDir_Generic_AppDataProfile::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "0");
#endif
  }
};

class NonExistentLegacyXREAppDir_BadEnv
    : public NonExistentLegacyXREAppDir_Generic {
 protected:
  void SetUp() override {
    NonExistentLegacyXREAppDir_Generic::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "0");
#endif
  }
};

class NonExistentLegacyXREAppDir_BadEnv_AppDataProfile
    : public NonExistentLegacyXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    NonExistentLegacyXREAppDir_Generic_AppDataProfile::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "0");
#endif
  }
};

/*
 * Tests the legacy behavior when there is
 *  - MOZ_LEGACY_HOME = 1
 *  - existing $HOME/.mozilla
 */
class ExistentLegacyXREAppDir_GoodEnv : public ExistentLegacyXREAppDir_Generic {
 protected:
  void SetUp() override {
    ExistentLegacyXREAppDir_Generic::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "1");
#endif
  }
};

class ExistentLegacyXREAppDir_GoodEnv_AppDataProfile
    : public ExistentLegacyXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    ExistentLegacyXREAppDir_Generic_AppDataProfile::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "1");
#endif
  }
};

class NonExistentLegacyXREAppDir_GoodEnv
    : public NonExistentLegacyXREAppDir_Generic {
 protected:
  void SetUp() override {
    NonExistentLegacyXREAppDir_Generic::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "1");
#endif
  }
};

class NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile
    : public NonExistentLegacyXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    NonExistentLegacyXREAppDir_Generic_AppDataProfile::SetUp();
#if defined(XP_UNIX)
    SetEnv("MOZ_LEGACY_HOME", "1");
#endif
  }
};

class XDGXREAppDir_Generic : public BaseXREAppDir {};

class XDGXREAppDir_Generic_AppDataProfile : public XDGXREAppDir_Generic {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic::SetUp();
    SwitchFakeAppDataOn();
  }
};

/*
 * Tests the new default behavior when there is:
 *  - no MOZ_LEGACY_HOME
 *  - no XDG_CONFIG_HOME
 *  - no existing $HOME/.mozilla
 * => $HOME/.config/mozilla/
 */
class XDGXREAppDir_NoEnv : public XDGXREAppDir_Generic {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic::SetUp();
#if defined(XP_UNIX)
    UnsetEnv("MOZ_LEGACY_HOME");
    UnsetEnv("XDG_CONFIG_HOME");
#endif
  }
};

class XDGXREAppDir_NoEnv_AppDataProfile
    : public XDGXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic_AppDataProfile::SetUp();
#if defined(XP_UNIX)
    UnsetEnv("MOZ_LEGACY_HOME");
    UnsetEnv("XDG_CONFIG_HOME");
#endif
  }
};

/*
 * Tests the new default behavior when there is:
 *  - no MOZ_LEGACY_HOME
 *  - XDG_CONFIG_HOME
 *  - no existing $HOME/.mozilla
 * => $XDG_CONFIG_HOME/mozilla
 */
class XDGXREAppDir_Env : public XDGXREAppDir_Generic {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic::SetUp();
    // mXdgDir will be cleaned when we clean the temp home we created
    MkHomeSubdir(".xdgConfigDir", mXdgDir);
#if defined(XP_UNIX)
    SetEnv("XDG_CONFIG_HOME", mXdgDir.get());
#endif
  }

  nsCString mXdgDir;
};

class XDGXREAppDir_Env_AppDataProfile
    : public XDGXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic_AppDataProfile::SetUp();
    // mXdgDir will be cleaned when we clean the temp home we created
    MkHomeSubdir(".xdgConfigDir", mXdgDir);
#if defined(XP_UNIX)
    SetEnv("XDG_CONFIG_HOME", mXdgDir.get());
#endif
  }

  nsCString mXdgDir;
};

/*
 * Tests the new default behavior when there is:
 *  - invalid XDG_CONFIG_HOME
 * => $HOME/.config/mozilla
 */
class XDGXREAppDir_InvalidEnv : public XDGXREAppDir_Generic {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic::SetUp();
    mXdgDir += "$HOME/invalid-xdg-dir/";
#if defined(XP_UNIX)
    SetEnv("XDG_CONFIG_HOME", mXdgDir.get());
#endif
  }

  nsCString mXdgDir;
};

class XDGXREAppDir_InvalidEnv_AppDataProfile
    : public XDGXREAppDir_Generic_AppDataProfile {
 protected:
  void SetUp() override {
    XDGXREAppDir_Generic_AppDataProfile::SetUp();
    mXdgDir += "$HOME/invalid-xdg-dir/";
#if defined(XP_UNIX)
    SetEnv("XDG_CONFIG_HOME", mXdgDir.get());
#endif
  }

  nsCString mXdgDir;
};

class CacheXREAppDir_Env : public BaseXREAppDir {
 protected:
  void SetUp() override {
    BaseXREAppDir::SetUp();
    // mXdgCache will be cleaned when we clean the temp home we created
    MkHomeSubdir(".xdgCacheDir", mXdgCache);
#if defined(XP_UNIX)
    SetEnv("XDG_CACHE_HOME", mXdgCache.get());
#endif
  }

  nsCString mXdgCache;
};

class CacheXREAppDir_NoEnv : public BaseXREAppDir {
 protected:
  void SetUp() override {
    BaseXREAppDir::SetUp();
#if defined(XP_UNIX)
    UnsetEnv("XDG_CACHE_HOME");
#endif
  }
};

// GetUserAppDataDirectory

// Check if '$HOME/.mozilla' is used when it exists.
TEST_F(ExistentLegacyXREAppDir_NoEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// Check if '$HOME/.mozilla' is used when it exists and MOZ_LEGACY_HOME != 1
TEST_F(ExistentLegacyXREAppDir_BadEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// Check if '$HOME/.mozilla' is not used when the env variable MOZ_LEGACY_HOME
// is set to 0.
TEST_F(NonExistentLegacyXREAppDir_BadEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// Check if '$HOME/.mozilla' is used when it does not exists and MOZ_LEGACY_HOME
// = 1
TEST_F(NonExistentLegacyXREAppDir_GoodEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is not set.
TEST_F(XDGXREAppDir_NoEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is invalid.
TEST_F(XDGXREAppDir_InvalidEnv, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(XDGXREAppDir_Env, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgConfigDir/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// XREUserNativeManifests

#if defined(XP_UNIX)
TEST_F(ExistentLegacyXREAppDir_NoEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_NoEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_InvalidEnv, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_Env, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}
#endif  // defined(XP_UNIX)

// XREUserSysExtensionDir

#if defined(XP_UNIX)
TEST_F(ExistentLegacyXREAppDir_NoEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_NoEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_InvalidEnv, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_Env, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}
#endif  // defined(XP_UNIX)

// GetUserProfilesRootDir

TEST_F(XDGXREAppDir_NoEnv, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

TEST_F(XDGXREAppDir_InvalidEnv, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

TEST_F(XDGXREAppDir_Env, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgConfigDir/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

// GetDefaultUserProfileRoot

// Check if '$HOME/.mozilla' is used when it exists.
TEST_F(ExistentLegacyXREAppDir_NoEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is used when it exists and MOZ_LEGACY_HOME != 1
TEST_F(ExistentLegacyXREAppDir_BadEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is not used when the env variable MOZ_LEGACY_HOME
// is set to 0.
TEST_F(NonExistentLegacyXREAppDir_BadEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is used when it does not exists and MOZ_LEGACY_HOME
// = 1
TEST_F(NonExistentLegacyXREAppDir_GoodEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is not set.
TEST_F(XDGXREAppDir_NoEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is invalid.
TEST_F(XDGXREAppDir_InvalidEnv, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(XDGXREAppDir_Env, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgConfigDir/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// GetTempDefaultUserProfileRoot

// Check if '$HOME/.mozilla' is used when it exists.
TEST_F(ExistentLegacyXREAppDir_NoEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is used when it exists and MOZ_LEGACY_HOME != 1
TEST_F(ExistentLegacyXREAppDir_BadEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is not used when the env variable MOZ_LEGACY_HOME
// is set to 0.
TEST_F(NonExistentLegacyXREAppDir_BadEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

// Check if '$HOME/.mozilla' is used when it does not exists and MOZ_LEGACY_HOME
// = 1
TEST_F(NonExistentLegacyXREAppDir_GoodEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is not set.
TEST_F(XDGXREAppDir_NoEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

// Check if '$HOME/.config/mozilla' is used if $HOME/.mozilla does not exist
// and the env variable XDG_CONFIG_HOME is invalid.
TEST_F(XDGXREAppDir_InvalidEnv, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.config/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(XDGXREAppDir_Env, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgConfigDir/mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

/// AppDataProfile variants

TEST_F(ExistentLegacyXREAppDir_NoEnv_AppDataProfile, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(ExistentLegacyXREAppDir_BadEnv_AppDataProfile, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, GetUserAppDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserAppDataDirectory());
}

// XREUserNativeManifests

#if defined(XP_UNIX)
TEST_F(ExistentLegacyXREAppDir_NoEnv_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, XREUserNativeManifests) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_NATIVE_MANIFESTS));
}
#endif  // defined(XP_UNIX)

// XREUserSysExtensionDir

#if defined(XP_UNIX)
TEST_F(ExistentLegacyXREAppDir_NoEnv_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, XREUserSysExtensionDir) {
  ASSERT_EQ(
#  if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Mozilla/Extensions"_ns)
#  elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla/extensions"_ns)
#  endif
          ,
      GetFromXREDirProvider(XRE_USER_SYS_EXTENSION_DIR));
}
#endif  // defined(XP_UNIX)

// GetUserProfilesRootDir

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, GetUserProfilesRootDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppSupport + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.fooprofile"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesRootDir());
}

// GetDefaultUserProfileRoot

TEST_F(ExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, GetDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mLibrary + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mRoamingHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_ROOT_DIR));
}

// GetTempDefaultUserProfileRoot

TEST_F(ExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(ExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_NoEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_BadEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(NonExistentLegacyXREAppDir_GoodEnv_AppDataProfile,
       GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(XDGXREAppDir_NoEnv_AppDataProfile, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(XDGXREAppDir_InvalidEnv_AppDataProfile, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

TEST_F(XDGXREAppDir_Env_AppDataProfile, GetTempDefaultUserProfileRoot) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Mozilla/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.mozilla"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Profiles"_ns)
#endif
          ,
      GetFromDirectoryService(NS_APP_USER_PROFILES_LOCAL_ROOT_DIR));
}

/// END AppDataProfile variants

/// Tests for XDG_CACHE_HOME

// GetUserLocalDataDirectory

// Check if '$HOME/.cache/mozilla' is used when '$XDG_CACHE_HOME' is not set.
TEST_F(CacheXREAppDir_NoEnv, GetUserLocalDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.cache/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserLocalDataDirectory());
}

// Check if '$XDG_CACHE_HOME/mozilla' is used when '$XDG_CACHE_HOME' is set.
TEST_F(CacheXREAppDir_Env, GetUserLocalDataDirectory) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Firefox"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgCacheDir/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Firefox"_ns)
#endif
          ,
      GetUserLocalDataDirectory());
}

// GetUserProfilesLocalDir

TEST_F(CacheXREAppDir_NoEnv, GetUserProfilesLocalDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.cache/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesLocalDir());
}

TEST_F(CacheXREAppDir_Env, GetUserProfilesLocalDir) {
  ASSERT_EQ(
#if defined(ANDROID)
      nsCString(mMockedHomeDir + "/mozilla"_ns)
#elif defined(XP_MACOSX)
      nsCString(mAppCache + "/Firefox/Profiles"_ns)
#elif defined(XP_UNIX)
      nsCString(mMockedHomeDir + "/.xdgCacheDir/mozilla/firefox"_ns)
#elif defined(XP_WIN)
      nsCString(mLocalHome + "\\Mozilla\\Firefox\\Profiles"_ns)
#endif
          ,
      GetUserProfilesLocalDir());
}

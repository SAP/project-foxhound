/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "gtest/gtest.h"
#include <windows.h>
#include <string>
#include <optional>
#include <shellapi.h>

#include "find_firefox.h"
#include "tempfile_name.h"
#include "download_firefox.h"
#include "data_sink.h"
#include "file_sink.h"

static std::optional<std::wstring> get_value_from_key(
    const wchar_t* key_path, const wchar_t* value_path) {
  // First we need to get the current version of Firefox
  wchar_t buffer[MAX_PATH]{};
  DWORD buffer_size = sizeof buffer;
  LSTATUS status = RegGetValueW(HKEY_CURRENT_USER, key_path, value_path,
                                RRF_RT_REG_SZ, nullptr, buffer, &buffer_size);
  if (status != ERROR_SUCCESS) {
    return std::nullopt;
  }
  return std::wstring(buffer);
}

static bool set_value_for_key(const wchar_t* key_path,
                              const wchar_t* value_path,
                              const std::wstring& value) {
  LSTATUS status = RegSetKeyValueW(HKEY_CURRENT_USER, key_path, value_path,
                                   REG_SZ, value.c_str(), value.size() * 2 + 2);
  return status == ERROR_SUCCESS;
}

static bool clear_value_for_key(const wchar_t* key_path,
                                const wchar_t* value_path) {
  LSTATUS status = RegDeleteKeyValueW(HKEY_CURRENT_USER, key_path, value_path);
  return status == ERROR_SUCCESS;
}

static bool delete_key(const wchar_t* key_path) {
  LSTATUS status = RegDeleteKeyW(HKEY_CURRENT_USER, key_path);
  return status == ERROR_SUCCESS;
}

class DesktopLauncherTest : public ::testing::Test {
 protected:
  HANDLE serverProcessHandle = nullptr;
  std::optional<std::wstring> savedFirefoxVersion = std::nullopt;
  std::optional<std::wstring> savedFirefoxPath = std::nullopt;
  std::wstring base_key = getFirefoxRegistryBranding();
  std::wstring test_version = L"test.0.0.0.0";
  std::wstring test_path = L"This is a test";
  std::wstring test_base = base_key + L"\\" + test_version;
  std::wstring test_subkey = test_base + L"\\Main";

  void SetUp() override {
    savedFirefoxVersion =
        get_value_from_key(base_key.c_str(), L"CurrentVersion");
    if (savedFirefoxVersion.has_value()) {
      std::wstring subkey = base_key + L"\\" + savedFirefoxVersion.value();
      savedFirefoxPath = get_value_from_key(subkey.c_str(), L"PathToExe");
    }
    set_value_for_key(base_key.c_str(), L"CurrentVersion", test_version);
    set_value_for_key(test_subkey.c_str(), L"PathToExe", test_path);
    // Override values
  }

  void TearDown() override {
    if (savedFirefoxVersion.has_value()) {
      set_value_for_key(base_key.c_str(), L"CurrentVersion",
                        savedFirefoxVersion.value());
    } else {
      clear_value_for_key(base_key.c_str(), L"CurrentVersion");
    }
    delete_key(test_subkey.c_str());
    delete_key(test_base.c_str());
  }
};

TEST_F(DesktopLauncherTest, FirefoxPathTest) {
  std::optional<std::wstring> path = lookupFirefoxPath();
  ASSERT_TRUE(path.has_value());
  ASSERT_EQ(path.value(), test_path);
}

TEST_F(DesktopLauncherTest, TempFileNameTest) {
  std::optional<std::wstring> path = get_tempfile_name();
  ASSERT_TRUE(path.has_value());
  ASSERT_TRUE(path.value().find(std::wstring(L".exe")) > 0);
  ASSERT_TRUE(path.value().find(std::wstring(L":\\")) > 0);
}

TEST_F(DesktopLauncherTest, TestGetObjectName) {
  std::optional<std::wstring> objectName = get_object_name();
  ASSERT_TRUE(objectName.has_value());
  // The object name is a path, not a URL.
  ASSERT_EQ(std::wstring::npos,
            objectName.value().find(L"https://download.mozilla.org/"));
  ASSERT_NE(std::wstring::npos, objectName.value().find(L"lang="));
  ASSERT_NE(std::wstring::npos, objectName.value().find(L"product="));
}

TEST_F(DesktopLauncherTest, TestTempFileNamesAreDifferent) {
  std::wstring temp1 = get_tempfile_name().value();
  std::wstring temp2 = get_tempfile_name().value();
  ASSERT_NE(temp1, temp2);
}

TEST_F(DesktopLauncherTest, TestFileSinkFreeze) {
  std::wstring path = get_tempfile_name().value();

  auto delete_expecting_error = [](const wchar_t* path, DWORD expected) {
    SetLastError(ERROR_SUCCESS);
    BOOL result = DeleteFileW(path);
    DWORD lastError = GetLastError();
    ASSERT_EQ(result, expected == ERROR_SUCCESS);
    ASSERT_EQ(lastError, expected);
  };

  char data[] = "important data";

  {
    FileSink sink;
    delete_expecting_error(path.c_str(), ERROR_FILE_NOT_FOUND);
    ASSERT_TRUE(sink.open(path));
    delete_expecting_error(path.c_str(), ERROR_SHARING_VIOLATION);
    ASSERT_TRUE(sink.accept(data, sizeof(data) - 1));
    delete_expecting_error(path.c_str(), ERROR_SHARING_VIOLATION);
    ASSERT_TRUE(sink.freeze());
    delete_expecting_error(path.c_str(), ERROR_SHARING_VIOLATION);
    ASSERT_FALSE(sink.accept(data, sizeof(data) - 1));

    // TODO: Automatically test that the path can be run with ShellExecuteEx
    // or similar.
    //
    // To test this manually, run the launcher without Firefox installed. You
    // should see a prompt to install Firefox; if so, then it was executable.
  }
  delete_expecting_error(path.c_str(), ERROR_SUCCESS);
}

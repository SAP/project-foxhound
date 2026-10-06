/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "gtest/gtest.h"
#include <windows.h>
#include <string>
#include <shellapi.h>
#include <winhttp.h>

#include "find_firefox.h"
#include "tempfile_name.h"
#include "download_firefox.h"
#include "data_sink.h"

static const size_t python_path_len = 32768;
static wchar_t python_path[python_path_len];

static wchar_t* getPythonPath() {
  DWORD res = GetEnvironmentVariableW(L"PYTHON", python_path, python_path_len);
  if (res == 0) {
    std::wcout << L"Can't find python" << std::endl;
    return nullptr;
  }
  return python_path;
}

static HANDLE startWebServer() {
  SHELLEXECUTEINFOW execInfo{};
  execInfo.cbSize = sizeof(SHELLEXECUTEINFOW);
  execInfo.fMask = SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC;
  execInfo.lpVerb = L"open";
  execInfo.lpFile = getPythonPath();
  if (!execInfo.lpFile) {
    // Can't find Python
    return nullptr;
  }
  execInfo.lpParameters =
      L"-m http.server --protocol HTTP/1.1 --bind 127.0.0.1 9191";
  execInfo.nShow = SW_HIDE;

  if (!ShellExecuteExW(&execInfo)) {
    std::wcout << L"Can't exec python web server" << std::endl;
    return nullptr;
  }
  return execInfo.hProcess;
}

static void stopWebServer(HANDLE processHandle) {
  if (processHandle) {
    TerminateProcess(processHandle, 0);
    CloseHandle(processHandle);
  }
  processHandle = nullptr;
}

class StringDataSink : public DataSink {
 public:
  std::string data;

  bool accept(char* buf, int count) {
    std::string str(buf, count);
    data += str;
    return true;
  }
};

static void DownloadAndCheckStub(const std::wstring& product) {
  StringDataSink sink;
  std::wstring object_name = L"/?os=win64&lang=en-US&product=" + product;

  ErrCode ec =
      download_file(&sink, L"download.mozilla.org", INTERNET_DEFAULT_HTTPS_PORT,
                    true,  // HTTPS
                    object_name, L"application/x-msdos-program");

  // First, ensure that the request was successful
  ASSERT_EQ(ec, ErrCode::OK);

  // All .exe files start with MZ
  ASSERT_EQ((unsigned char)sink.data[0], 'M')
      << "File is not a valid PE executable";
  ASSERT_EQ((unsigned char)sink.data[1], 'Z');
}

class DesktopLauncherDownloaderTest : public ::testing::Test {
 protected:
  HANDLE serverProcessHandle = nullptr;

  void SetUp() override { serverProcessHandle = startWebServer(); }

  void TearDown() override { stopWebServer(serverProcessHandle); }
};

TEST_F(DesktopLauncherDownloaderTest, TestDownloadFileSuccess) {
  if (serverProcessHandle == nullptr) {
    FAIL() << "No process.";
  }
  StringDataSink sink;
  ErrCode ec =
      download_file(&sink, L"localhost", 9191, false,
                    L"/desktop_launcher_test_content.txt", L"text/plain");
  ASSERT_EQ(ec, ErrCode::OK);
  ASSERT_STREQ(sink.data.c_str(), "Testing 123");
}

TEST_F(DesktopLauncherDownloaderTest, TestDownloadFile_NotFound) {
  if (serverProcessHandle == nullptr) {
    FAIL() << "No process.";
  }
  StringDataSink sink;
  ErrCode ec = download_file(&sink, L"localhost", 9191, false,
                             L"/this_file_should_not_exist.txt", L"text/plain");
  ASSERT_EQ(ec, ErrCode::ERR_FILE_NOT_FOUND);
  ASSERT_STREQ(sink.data.c_str(), "");
}

TEST_F(DesktopLauncherDownloaderTest, TestDownloadFile_InvalidRequest) {
  if (serverProcessHandle == nullptr) {
    FAIL() << "No process.";
  }
  StringDataSink sink;
  // Requesting https download from the non-https server.
  ErrCode ec = download_file(&sink, L"localhost", 9191, true,
                             L"/name_doesnt_matter.txt", L"text/plain");
  ASSERT_EQ(ec, ErrCode::ERR_REQUEST_INVALID);
  ASSERT_STREQ(sink.data.c_str(), "");
}

TEST(DesktopLauncherDownloaderReal, DownloadNightlyStub)
{
  DownloadAndCheckStub(L"firefox-nightly-stub");
}

TEST(DesktopLauncherDownloaderReal, DownloadBetaStub)
{
  DownloadAndCheckStub(L"firefox-beta-stub");
}

TEST(DesktopLauncherDownloaderReal, DownloadDevStub)
{
  DownloadAndCheckStub(L"firefox-devedition-stub");
}

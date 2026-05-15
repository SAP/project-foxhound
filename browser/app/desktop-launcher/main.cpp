/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include <iostream>
#include <optional>
#include <rpc.h>
#include <shellapi.h>
#include <string>
#include <windows.h>
#include "download_firefox.h"
#include "file_sink.h"
#include "find_firefox.h"
#include "tempfile_name.h"

#define DOWNLOAD_PAGE L"https://www.mozilla.org/firefox/new/"
#define STUB_INSTALLER_ARGS L"/Prompt /LaunchedBy:desktoplauncher"

/**
 * Runs the provided path using the shell using the provided command-line
 * parameters.
 *
 * Blocks until the application starts accepting input, or until a
 * Windows-internal timeout is reached. Refer to SEE_MASK_WAITFORINPUTIDLE's
 * documentation.
 *
 * @param path The path to the file or URL to run.
 * @param params Command-line arguments to pass. May be null.
 * @returns Truthy if the launch succeeded, false otherwise.
 */
static bool ExecuteAndWaitForIdle(const std::wstring& path,
                                  const wchar_t* params) {
  SHELLEXECUTEINFOW sei = {0};
  sei.cbSize = sizeof(sei);
  sei.fMask = SEE_MASK_WAITFORINPUTIDLE | SEE_MASK_NOASYNC;
  sei.lpFile = path.c_str();
  sei.lpParameters = params;
  sei.nShow = SW_SHOWNORMAL;
  ShellExecuteExW(&sei);
  return (uintptr_t)sei.hInstApp > 32;
}

int wmain() {
  // For telemetry purposes, let's set the env variable to indicate that
  // we used the launcher to start Firefox
  if (!SetEnvironmentVariableW(L"FIREFOX_LAUNCHED_BY_DESKTOP_LAUNCHER",
                               L"TRUE")) {
    std::wcout
        << L"Could not set env variable FIREFOX_LAUNCHED_BY_DESKTOP_LAUNCHER"
        << std::endl;
  }

  // First, we try to launch Firefox if it is installed
  std::optional<std::wstring> firefox_path = lookupFirefoxPath();
  if (firefox_path.has_value()) {
    std::wcout << L"Found Firefox at path " << firefox_path.value()
               << std::endl;
    if (ExecuteAndWaitForIdle(firefox_path.value(), nullptr)) {
      std::wcout << L"Firefox launched" << std::endl;
      return 0;
    }
  }
  bool download_completed = false;
  // If that doesn't work, we try to download the installer.
  std::optional<std::wstring> tempfileName = get_tempfile_name();
  // If we do create a fileSink, it needs to live until the
  // ExecuteAndWaitForIdle calls return to ensure that other processes cannot
  // delete or rename it.
  std::unique_ptr<FileSink> fileSink;
  if (tempfileName.has_value()) {
    fileSink = std::make_unique<FileSink>();
    if (fileSink->open(tempfileName.value())) {
      ErrCode rc = download_firefox(fileSink.get());
      if (rc == ErrCode::OK) {
        std::wcout << L"Firefox installer successfully downloaded" << std::endl;
        download_completed = true;
      }
    }
  }
  // If the installer successfully downloaded, try to launch it
  if (download_completed) {
    if (fileSink->freeze() &&
        ExecuteAndWaitForIdle(tempfileName.value(), STUB_INSTALLER_ARGS)) {
      std::wcout << L"Firefox installer launched" << std::endl;
      return 0;
    }
  }

  // If that doesn't work, open the download page in the default browser
  if (ExecuteAndWaitForIdle(DOWNLOAD_PAGE, nullptr)) {
    std::wcout << L"Opened default browser to the download page" << std::endl;
  }
  return 0;
}

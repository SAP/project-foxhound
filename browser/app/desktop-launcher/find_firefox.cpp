/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "find_firefox.h"

#include <iostream>
#include <optional>
#include <string>
#include <windows.h>

// The firefox_node logic here mirrors the definition of BrandFullNameInternal
// in browser/branding/${channel}/branding.nsi
// Opened Bug 1979135 to address refactoring this.
#if defined(MOZ_BRANDING_IS_OFFICIAL)
static const wchar_t* firefox_node = L"SOFTWARE\\Mozilla\\Mozilla Firefox";
#elif defined(MOZ_BRANDING_IS_NIGHTLY)
static const wchar_t* firefox_node = L"SOFTWARE\\Mozilla\\Nightly";
#elif defined(MOZ_BRANDING_IS_BETA)
static const wchar_t* firefox_node = L"SOFTWARE\\Mozilla\\Mozilla Firefox";
#elif defined(MOZ_BRANDING_IS_DEVEDITION)
static const wchar_t* firefox_node =
    L"SOFTWARE\\Mozilla\\Firefox Developer Edition";
#elif defined(MOZ_BRANDING_IS_UNOFFICIAL)
static const wchar_t* firefox_node =
    L"SOFTWARE\\Mozilla\\Mozilla Developer Preview";
#else
// Unexpected case. Fail the build here so we can figure out the missing case.
static_assert(false);
#endif

/**
 * The base registry key that Firefox uses to store its settings is different
 * depending on the branding for the build. This function exposes the correct
 * registry key to use for the current build's branding.
 */
const wchar_t* getFirefoxRegistryBranding() { return firefox_node; }

/**
 * Look up Firefox path in a particular HKEY
 */
static std::optional<std::wstring> lookupFirefoxPathInHKEY(HKEY hkey) {
  std::wstring current_version = L"CurrentVersion";
  wchar_t buffer[MAX_PATH];
  // RegGetValueW will store the size of the value (including terminal \0) in
  // bytes into this variable.
  DWORD value_size = sizeof(buffer);

  // First we need to get the current version of Firefox
  LSTATUS status =
      RegGetValueW(hkey, getFirefoxRegistryBranding(), current_version.c_str(),
                   RRF_RT_REG_SZ, nullptr, buffer, &value_size);
  if (status != ERROR_SUCCESS || value_size < 2) {
    std::wcout << L"Failed to get firefox current version at node "
               << getFirefoxRegistryBranding() << L"status: " << status
               << std::endl;
    return std::nullopt;
  }
  DWORD value_len = value_size / sizeof(wchar_t) - 1;
  // Then we need to see where that version is installed
  std::wstring current_version_string = std::wstring(buffer, value_len);
  std::wstring current_version_node =
      std::wstring(getFirefoxRegistryBranding()) + L"\\" +
      current_version_string + L"\\Main";
  std::wstring path_to_exe = L"PathToExe";
  value_size = sizeof(buffer);
  status = RegGetValueW(hkey, current_version_node.c_str(), path_to_exe.c_str(),
                        RRF_RT_REG_SZ, nullptr, buffer, &value_size);
  if (status != ERROR_SUCCESS || value_size < 2) {
    std::wcout
        << L"Failed to get firefox path for current version, at location "
        << current_version_node << L" status was " << status << std::endl;
    return std::nullopt;
  }
  value_len = value_size / sizeof(wchar_t) - 1;
  // We should have the path in buffer. Note that value_len contains the size of
  // the path in bytes, so we need to divide by 2 to get the length in
  // characters.
  std::wstring firefox_path = std::wstring(buffer, value_len);
  return firefox_path;
}

/**
 * Look up Firefox path in registry keys
 * @return  the path as a std::wstring if found
 */
std::optional<std::wstring> lookupFirefoxPath() {
  auto sharedInstallPath = lookupFirefoxPathInHKEY(HKEY_CURRENT_USER);
  if (sharedInstallPath.has_value()) {
    return sharedInstallPath;
  } else {
    return lookupFirefoxPathInHKEY(HKEY_LOCAL_MACHINE);
  }
}

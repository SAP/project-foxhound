/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "EnterprisePoliciesFlagFile.h"

#include <windows.h>

#include <filesystem>

#include "updatecommon.h"

namespace fs = std::filesystem;

namespace {

static HANDLE sFlagFileHandle{INVALID_HANDLE_VALUE};

static fs::path GetFlagFilePath(const fs::path& aDir) noexcept {
  const fs::path kFlagFilename{L"EnterprisePolicies.flag"};
  return aDir / kFlagFilename;
}

}  // namespace

namespace EnterprisePoliciesFlagFile {

void Add(const fs::path& aDir) noexcept {
  const fs::path flagFilePath{GetFlagFilePath(aDir)};
  sFlagFileHandle = CreateFileW(
      flagFilePath.c_str(), GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_DELETE,
      nullptr, CREATE_ALWAYS, FILE_FLAG_DELETE_ON_CLOSE, nullptr);

  const bool added{sFlagFileHandle != INVALID_HANDLE_VALUE};
  LOG(("Flag file '%s' %s", flagFilePath.string().c_str(),
       added ? "added" : "not added"));
}

bool Exists(const fs::path& aDir) noexcept {
  const fs::path flagFilePath{GetFlagFilePath(aDir)};
  std::error_code ec;
  const bool exists{fs::exists(flagFilePath, ec)};

  LOG(("Flag file '%s' %s", flagFilePath.string().c_str(),
       exists ? "exists" : "doesn't exist"));

  return exists;
}

bool Remove(const fs::path& aDir) noexcept {
  const fs::path flagFilePath{GetFlagFilePath(aDir)};
  std::error_code ec;
  const bool removed{fs::remove(flagFilePath, ec)};

  LOG(("Flag file '%s' %s", flagFilePath.string().c_str(),
       removed ? "removed" : "not removed"));

  return removed;
}

}  // namespace EnterprisePoliciesFlagFile

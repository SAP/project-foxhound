/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TestDirHelpers.h"

#include <filesystem>
#include <windows.h>

namespace fs = std::filesystem;

fs::path CreateTempDir() noexcept {
  std::error_code ec;
  const fs::path tempBaseDir{fs::temp_directory_path(ec)};
  if (ec) return {};

  wchar_t tempFilename[MAX_PATH + 1];
  if (!GetTempFileNameW(tempBaseDir.c_str(), L"", 0, tempFilename)) {
    return {};
  }

  const fs::path tempDir{tempFilename};
  fs::remove(tempDir, ec);
  if (ec) return {};

  fs::create_directory(tempDir, ec);
  if (ec) return {};
  return tempDir;
}

void RemoveDir(const fs::path& aDir) noexcept {
  std::error_code ec;
  fs::remove_all(aDir, ec);
}

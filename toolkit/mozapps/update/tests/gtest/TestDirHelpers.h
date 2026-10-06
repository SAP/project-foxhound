/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TEST_DIR_HELPERS_H_
#define TEST_DIR_HELPERS_H_

#include <filesystem>

std::filesystem::path CreateTempDir() noexcept;
void RemoveDir(const std::filesystem::path& aDir) noexcept;

#endif

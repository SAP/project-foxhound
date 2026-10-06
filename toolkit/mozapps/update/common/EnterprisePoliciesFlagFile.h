/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ENTERPRISE_POLICIES_FLAG_FILE_H_
#define ENTERPRISE_POLICIES_FLAG_FILE_H_

#include <filesystem>

namespace EnterprisePoliciesFlagFile {

/**
 * Add the enterprise policies flag file in aDir.
 *
 * The flag file is automatically deleted when the process exits.
 *
 * @param  aDir The directory where the flag file is added.
 */
void Add(const std::filesystem::path& aDir) noexcept;

/**
 * Check if the enterprise policies flag file exists in aDir.
 *
 * @param  aDir The directory where the flag file is checked.
 * @return true if the flag file exists, false otherwise.
 */
bool Exists(const std::filesystem::path& aDir) noexcept;

/**
 * Remove the enterprise policies flag file from aDir.
 *
 * @param  aDir The directory where the flag file is removed.
 * @return true if the flag file is removed, false otherwise.
 */
bool Remove(const std::filesystem::path& aDir) noexcept;

}  // namespace EnterprisePoliciesFlagFile

#endif

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ENTERPRISE_POLICIES_H_
#define ENTERPRISE_POLICIES_H_

#include <filesystem>
#include <string_view>

namespace EnterprisePolicies {

/**
 * Check if enterprise policies are set via distribution/policies.json in aDir.
 *
 * @param  aDir The directory where distribution/policies.json is located.
 * @return true if enterprise policies are set, false otherwise.
 */
bool InDistribution(const std::filesystem::path& aDir);

/**
 * Check if enterprise policies are set via registry.
 *
 * @param  aBrand The application brand name.
 * @return true if enterprise policies are set, false otherwise..
 */
bool InRegistry(std::wstring_view aBrand);

}  // namespace EnterprisePolicies

#endif  // ENTERPRISE_POLICIES_H_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FIND_FIREFOX_H
#define FIND_FIREFOX_H

#include <optional>
#include <string>

std::optional<std::wstring> lookupFirefoxPath();
const wchar_t* getFirefoxRegistryBranding();

#endif

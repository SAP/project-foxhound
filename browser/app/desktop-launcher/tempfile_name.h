/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef TEMPFILE_NAME_H
#define TEMPFILE_NAME_H
#include <optional>
#include <string>

std::optional<std::wstring> get_tempfile_name();

#endif

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ConsoleReportIPCUtils_h
#define mozilla_dom_ConsoleReportIPCUtils_h

#include "ipc/EnumSerializer.h"
#include "nsContentUtils.h"

namespace IPC {

template <>
struct ParamTraits<PropertiesFile>
    : public ContiguousEnumSerializer<PropertiesFile,
                                      PropertiesFile::CSS_PROPERTIES,
                                      PropertiesFile::COUNT> {};

static_assert(uint8_t(PropertiesFile::CSS_PROPERTIES) == 0);

}  // namespace IPC

#endif  // mozilla_dom_ConsoleReportIPCUtils_h

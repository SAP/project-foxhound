/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_psm_PSMIPCUtils_h_
#define mozilla_psm_PSMIPCUtils_h_

#include "ipc/EnumSerializer.h"
#include "mozilla/psm/EnabledSignatureSchemes.h"

namespace mozilla::psm {

// This mirrors the subset of SSLSignatureScheme from sslt.h that Firefox
// enables. sslt.h can't be included here without polluting all IPC code.

enum class EnabledSignatureScheme : uint16_t {
#define SCHEME(NAME, _) NAME,
  FOR_EACH_ENABLED_SIGNATURE_SCHEME(SCHEME)
#undef SCHEME
};

#define COUNT_SCHEME(NAME, _) +1
constexpr size_t kEnabledSignatureSchemeCount =
    0 FOR_EACH_ENABLED_SIGNATURE_SCHEME(COUNT_SCHEME);
#undef COUNT_SCHEME

constexpr EnabledSignatureScheme kHighestEnabledSignatureScheme =
    EnabledSignatureScheme(kEnabledSignatureSchemeCount - 1);

}  // namespace mozilla::psm

namespace IPC {

template <>
struct ParamTraits<mozilla::psm::EnabledSignatureScheme>
    : ContiguousEnumSerializerInclusive<
          mozilla::psm::EnabledSignatureScheme,
          mozilla::psm::EnabledSignatureScheme(0),
          mozilla::psm::kHighestEnabledSignatureScheme> {};

}  // namespace IPC

#endif  // mozilla_psm_PSMIPCUtils_h_

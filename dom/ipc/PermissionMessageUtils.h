/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_permission_message_utils_h_
#define mozilla_dom_permission_message_utils_h_

#include "ipc/IPCMessageUtils.h"
#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/PermissionStatusBinding.h"
#include "mozilla/dom/PermissionsBinding.h"
#include "nsCOMPtr.h"
#include "nsIPrincipal.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::PermissionState>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::PermissionState> {
};

template <>
struct ParamTraits<mozilla::dom::PermissionName>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::PermissionName> {
};

template <>
struct ParamTraits<nsIPrincipal*> {
  static void Write(IPC::MessageWriter* aWriter, nsIPrincipal* aParam);
  static bool Read(IPC::MessageReader* aReader, RefPtr<nsIPrincipal>* aResult);

  // Overload to support deserializing nsCOMPtr<nsIPrincipal> directly.
  static bool Read(IPC::MessageReader* aReader,
                   nsCOMPtr<nsIPrincipal>* aResult) {
    RefPtr<nsIPrincipal> result;
    if (!Read(aReader, &result)) {
      return false;
    }
    *aResult = std::move(result);
    return true;
  }
};

}  // namespace IPC

#endif  // mozilla_dom_permission_message_utils_h_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_LOCKS_IPCUTILS_H_
#define DOM_LOCKS_IPCUTILS_H_

#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/LockManagerBinding.h"

namespace IPC {
template <>
struct ParamTraits<mozilla::dom::LockMode>
    : public mozilla::dom::WebIDLEnumSerializer<mozilla::dom::LockMode> {};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::dom::LockInfo, mName, mMode,
                                  mClientId);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::dom::LockManagerSnapshot, mHeld,
                                  mPending);
}  // namespace IPC

#endif  // DOM_LOCKS_IPCUTILS_H_

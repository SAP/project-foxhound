/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_NOTIFICATION_IPCUTILS_H_
#define DOM_NOTIFICATION_IPCUTILS_H_

#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/NotificationBinding.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::NotificationDirection>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::NotificationDirection> {};

}  // namespace IPC

#endif  // DOM_NOTIFICATION_IPCUTILS_H_

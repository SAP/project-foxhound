/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "WindowsLocationChild.h"

namespace mozilla::dom {

::mozilla::ipc::IPCResult WindowsLocationChild::RecvStartup() {
  return Startup();
}

::mozilla::ipc::IPCResult WindowsLocationChild::RecvSetHighAccuracy(
    const bool& aEnable) {
  return SetHighAccuracy(aEnable);
}

::mozilla::ipc::IPCResult WindowsLocationChild::RecvRegisterForReport() {
  return RegisterForReport();
}

::mozilla::ipc::IPCResult WindowsLocationChild::RecvUnregisterForReport() {
  return UnregisterForReport();
}

}  // namespace mozilla::dom

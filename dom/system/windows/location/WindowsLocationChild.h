/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WindowsLocationChild_h_
#define mozilla_dom_WindowsLocationChild_h_

#include "mozilla/WeakPtr.h"
#include "mozilla/dom/PWindowsLocationChild.h"

namespace mozilla::dom {

// Geolocation actor in utility process.
class WindowsLocationChild : public PWindowsLocationChild,
                             public SupportsWeakPtr {
 public:
  using IPCResult = ::mozilla::ipc::IPCResult;

  IPCResult RecvStartup();
  IPCResult RecvRegisterForReport();
  IPCResult RecvUnregisterForReport();
  IPCResult RecvSetHighAccuracy(const bool& aEnable);

 protected:
  virtual mozilla::ipc::IPCResult Startup() = 0;
  virtual mozilla::ipc::IPCResult RegisterForReport() = 0;
  virtual mozilla::ipc::IPCResult UnregisterForReport() = 0;
  virtual mozilla::ipc::IPCResult SetHighAccuracy(const bool& aEnable) = 0;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_WindowsLocationChild_h_

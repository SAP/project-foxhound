/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WindowsLegacyLocationChild_h_
#define mozilla_dom_WindowsLegacyLocationChild_h_

#include "mozilla/dom/WindowsLocationChild.h"

class ILocation;

namespace mozilla::dom {

// Geolocation actor in utility process.
class WindowsLegacyLocationChild final : public WindowsLocationChild {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WindowsLegacyLocationChild, override);

 public:
  WindowsLegacyLocationChild();

  using IPCResult = ::mozilla::ipc::IPCResult;

  void ActorDestroy(ActorDestroyReason aWhy) override;

 protected:
  ~WindowsLegacyLocationChild() override;

  mozilla::ipc::IPCResult Startup() override;
  mozilla::ipc::IPCResult RegisterForReport() override;
  mozilla::ipc::IPCResult UnregisterForReport() override;
  mozilla::ipc::IPCResult SetHighAccuracy(const bool& aEnable) override;

 private:
  // The COM object the actors are proxying calls for.
  RefPtr<ILocation> mLocation;

  bool mHighAccuracy = false;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_WindowsLegacyLocationChild_h_

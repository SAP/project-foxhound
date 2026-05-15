/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_WindowsRuntimeLocationChild_h_
#define mozilla_dom_WindowsRuntimeLocationChild_h_

#include <windows.devices.geolocation.h>
#include <wrl.h>

#include "WindowsLocationChild.h"

namespace mozilla::dom {

// Geolocation actor in utility process.
class WindowsRuntimeLocationChild final : public WindowsLocationChild {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WindowsRuntimeLocationChild, override);

 public:
  WindowsRuntimeLocationChild();

  void ActorDestroy(ActorDestroyReason aWhy) override;

 protected:
  mozilla::ipc::IPCResult Startup() override;
  mozilla::ipc::IPCResult RegisterForReport() override;
  mozilla::ipc::IPCResult UnregisterForReport() override;
  mozilla::ipc::IPCResult SetHighAccuracy(const bool& aEnable) override;

 private:
  template <typename T>
  using ComPtr = Microsoft::WRL::ComPtr<T>;
  using IGeolocator = ABI::Windows::Devices::Geolocation::IGeolocator;
  using IPositionChangedEventArgs =
      ABI::Windows::Devices::Geolocation::IPositionChangedEventArgs;
  using IStatusChangedEventArgs =
      ABI::Windows::Devices::Geolocation::IStatusChangedEventArgs;

  ~WindowsRuntimeLocationChild() override;

  HRESULT OnPositionChanged(const ComPtr<IGeolocator>& aGeolocator,
                            const ComPtr<IPositionChangedEventArgs>& aArgs);
  HRESULT OnStatusChanged(const ComPtr<IGeolocator>& aGeolocator,
                          const ComPtr<IStatusChangedEventArgs>& aArgs);

  ComPtr<IGeolocator> mGeolocator;
  EventRegistrationToken mPositionChangedToken{};
  EventRegistrationToken mStatusChangedToken{};
  bool mHighAccuracy = false;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_WindowsRuntimeLocationChild_h_

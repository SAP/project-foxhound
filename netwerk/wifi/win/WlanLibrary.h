/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

// Moz headers (alphabetical)

// System headers (alphabetical)
#include <windows.h>  // HINSTANCE, HANDLE
#include <wlanapi.h>  // Wlan* functions

class WinWLANLibrary {
 public:
  static WinWLANLibrary* Load();
  ~WinWLANLibrary();

  HANDLE GetWLANHandle() const;
  decltype(::WlanEnumInterfaces)* GetWlanEnumInterfacesPtr() const;
  decltype(::WlanGetNetworkBssList)* GetWlanGetNetworkBssListPtr() const;
  decltype(::WlanFreeMemory)* GetWlanFreeMemoryPtr() const;
  decltype(::WlanCloseHandle)* GetWlanCloseHandlePtr() const;
  decltype(::WlanOpenHandle)* GetWlanOpenHandlePtr() const;
  decltype(::WlanRegisterNotification)* GetWlanRegisterNotificationPtr() const;
  decltype(::WlanScan)* GetWlanScanPtr() const;

 private:
  WinWLANLibrary() = default;
  bool Initialize();

  HMODULE mWlanLibrary = nullptr;
  HANDLE mWlanHandle = nullptr;
  decltype(::WlanEnumInterfaces)* mWlanEnumInterfacesPtr = nullptr;
  decltype(::WlanGetNetworkBssList)* mWlanGetNetworkBssListPtr = nullptr;
  decltype(::WlanFreeMemory)* mWlanFreeMemoryPtr = nullptr;
  decltype(::WlanCloseHandle)* mWlanCloseHandlePtr = nullptr;
  decltype(::WlanOpenHandle)* mWlanOpenHandlePtr = nullptr;
  decltype(::WlanRegisterNotification)* mWlanRegisterNotificationPtr = nullptr;
  decltype(::WlanScan)* mWlanScanPtr = nullptr;
};

class ScopedWLANObject {
 public:
  ScopedWLANObject(const WinWLANLibrary& library, void* object)
      : mLibrary(library), mObject(object) {}

  ~ScopedWLANObject() { (*(mLibrary.GetWlanFreeMemoryPtr()))(mObject); }

 private:
  const WinWLANLibrary& mLibrary;
  void* mObject;
};

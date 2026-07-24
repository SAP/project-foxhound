/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WindowsUtilsChild.h"

#include "WindowsLegacyLocationChild.h"
#include "mozilla/StaticPrefs_geo.h"
#include "mozilla/dom/PWindowsUtilsChild.h"
#include "mozilla/dom/WindowsLocationChild.h"

#if !defined(__MINGW32__)
#  include "WindowsRuntimeLocationChild.h"
#endif

namespace mozilla::dom {

already_AddRefed<PWindowsLocationChild>
WindowsUtilsChild::AllocPWindowsLocationChild() {
  // MinGW has windows.devices.geolocation.h header, but it lacks some
  // Geolocation classes/structures such as BasicGeoposition.
#if !defined(__MINGW32__)
  if (StaticPrefs::geo_provider_use_winrt()) {
    return MakeAndAddRef<WindowsRuntimeLocationChild>();
  }
#endif
  return MakeAndAddRef<WindowsLegacyLocationChild>();
}

}  // namespace mozilla::dom

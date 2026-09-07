/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/Maybe.h"
#include "nsWindow.h"

using namespace mozilla;
using namespace mozilla::widget;
using NativePointerLockMode = nsIWidget::NativePointerLockMode;

static UINT GetRawInputDevices(std::vector<RAWINPUTDEVICE>& aDevices) {
  UINT numDevices = 0;
  if (GetRegisteredRawInputDevices(nullptr, &numDevices,
                                   sizeof(RAWINPUTDEVICE)) == UINT(-1)) {
    EXPECT_TRUE(false);
    MOZ_ASSERT_UNREACHABLE("GetRegisteredRawInputDevices fails");
  }
  aDevices.resize(numDevices);
  if (GetRegisteredRawInputDevices(aDevices.data(), &numDevices,
                                   sizeof(RAWINPUTDEVICE)) == UINT(-1)) {
    EXPECT_TRUE(false);
    MOZ_ASSERT_UNREACHABLE("GetRegisteredRawInputDevices fails");
  }
  return numDevices;
}

static void CheckNativePointerLockState(
    nsWindow* aWindow, UINT aExpectedRawInputDevicesCount,
    Maybe<NativePointerLockMode> aExpectedLockState) {
  std::vector<RAWINPUTDEVICE> devices;
  UINT numDevices = GetRawInputDevices(devices);
  ASSERT_EQ(numDevices, aExpectedRawInputDevicesCount);
  ASSERT_EQ(aWindow->IsNativePointerLocked(), !!aExpectedLockState);

  const bool isUnadjustedLock =
      !!aExpectedLockState &&
      *aExpectedLockState == NativePointerLockMode::Unadjusted;
  ASSERT_EQ(aWindow->IsUsingRawInputForMouseMove(), isUnadjustedLock);
  if (isUnadjustedLock) {
    MOZ_ASSERT(numDevices > 0);

    // Check the last device.
    const auto& device = devices[numDevices - 1];
    ASSERT_EQ(device.usUsagePage, 0x01 /* HID_USAGE_PAGE_GENERIC */);
    ASSERT_EQ(device.usUsage, 0x02 /* HID_USAGE_GENERIC_MOUSE */);
    ASSERT_EQ(device.dwFlags, (uint32_t)RIDEV_INPUTSINK);
  }
}

TEST(NativePointerLock, LockUnlock)
{
  RefPtr<nsWindow> window = new nsWindow();
  std::ignore = window->Create(nullptr, LayoutDeviceIntRect(), InitData());

  std::vector<RAWINPUTDEVICE> unused;
  UINT initialInputDeviceCount = GetRawInputDevices(unused);
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());

  // Should be regular pointer lock.
  window->LockNativePointer(NativePointerLockMode::Regular);
  CheckNativePointerLockState(window, initialInputDeviceCount,
                              Some(NativePointerLockMode::Regular));

  // Should not change lock mode when calls LockNativePointer again with
  // different lock mode.
  window->LockNativePointer(NativePointerLockMode::Unadjusted);
  CheckNativePointerLockState(window, initialInputDeviceCount,
                              Some(NativePointerLockMode::Regular));

  // Release lock.
  window->UnlockNativePointer();
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());

  // Should be unadjusted pointer lock.
  window->LockNativePointer(NativePointerLockMode::Unadjusted);
  CheckNativePointerLockState(window, initialInputDeviceCount + 1,
                              Some(NativePointerLockMode::Unadjusted));

  // Should not change lock mode when calls LockNativePointer again with
  // different lock mode.
  window->LockNativePointer(NativePointerLockMode::Regular);
  CheckNativePointerLockState(window, initialInputDeviceCount + 1,
                              Some(NativePointerLockMode::Unadjusted));

  // Release lock.
  window->UnlockNativePointer();
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());
}

TEST(NativePointerLock, SetLockMode)
{
  RefPtr<nsWindow> window = new nsWindow();
  std::ignore = window->Create(nullptr, LayoutDeviceIntRect(), InitData());

  std::vector<RAWINPUTDEVICE> unused;
  UINT initialInputDeviceCount = GetRawInputDevices(unused);
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());

  // SetNativePointerLockMode() does nothing without locking first.
  window->SetNativePointerLockMode(NativePointerLockMode::Regular);
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());
  window->SetNativePointerLockMode(NativePointerLockMode::Unadjusted);
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());

  // Should be Unadjusted pointer lock.
  window->LockNativePointer(NativePointerLockMode::Unadjusted);
  CheckNativePointerLockState(window, initialInputDeviceCount + 1,
                              Some(NativePointerLockMode::Unadjusted));

  // Should switch lock mode.
  window->SetNativePointerLockMode(NativePointerLockMode::Regular);
  CheckNativePointerLockState(window, initialInputDeviceCount,
                              Some(NativePointerLockMode::Regular));

  // Should switch lock mode.
  window->SetNativePointerLockMode(NativePointerLockMode::Unadjusted);
  CheckNativePointerLockState(window, initialInputDeviceCount + 1,
                              Some(NativePointerLockMode::Unadjusted));

  // Release lock.
  window->UnlockNativePointer();
  CheckNativePointerLockState(window, initialInputDeviceCount, Nothing());
}

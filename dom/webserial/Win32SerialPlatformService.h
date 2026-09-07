/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_Win32SerialPlatformService_h
#define mozilla_dom_Win32SerialPlatformService_h

// Including windows.h needs to come before including cfgmgr32.h, so
// disable clang-format here.

// clang-format off
#include <windows.h>
#include <cfgmgr32.h>
// clang-format on

#include "mozilla/Atomics.h"
#include "mozilla/DataMutex.h"
#include "mozilla/EventTargetCapability.h"
#include "mozilla/dom/SerialPlatformService.h"
#include "nsTHashMap.h"

namespace mozilla::dom {

class Win32SerialPlatformService final : public SerialPlatformService {
 public:
  Win32SerialPlatformService();

  nsresult Init() override;
  void Shutdown() override;

 private:
  nsresult EnumeratePortsImpl(SerialPortList& aPorts,
                              bool* aLikelyAccessDenied) override;
  nsresult OpenImpl(const nsString& aPortId,
                    const IPCSerialOptions& aOptions) override;
  nsresult CloseImpl(const nsString& aPortId) override;
  nsresult WriteImpl(const nsString& aPortId,
                     Span<const uint8_t> aData) override;
  nsresult DrainImpl(const nsString& aPortId) override;
  nsresult FlushImpl(const nsString& aPortId, bool aReceive) override;
  nsresult SetSignalsImpl(const nsString& aPortId,
                          const IPCSerialOutputSignals& aSignals) override;
  nsresult GetSignalsImpl(const nsString& aPortId,
                          IPCSerialInputSignals& aSignals) override;
  nsresult GetReadStreamImpl(const nsString& aPortId, uint32_t aBufferSize,
                             nsIAsyncInputStream** aStream) override;
  ~Win32SerialPlatformService() override;

  HANDLE FindPortHandle(const nsString& aPortId);
  nsresult ConfigurePort(HANDLE aHandle, const IPCSerialOptions& aOptions);

  nsresult StartMonitoringDeviceChanges();
  void StopMonitoringDeviceChanges();
  static DWORD CALLBACK DeviceNotificationCallback(
      HCMNOTIFICATION hNotify, PVOID Context, CM_NOTIFY_ACTION Action,
      PCM_NOTIFY_EVENT_DATA EventData, DWORD EventDataSize);
  void CheckForDeviceChanges();

  HCMNOTIFICATION mDeviceNotification = nullptr;
  bool mMonitoring = false;

  Atomic<bool> mCheckPending{false};

  // Separate queue for device monitoring (EnumeratePorts, change detection).
  // Kept independent from the I/O queue so device notifications aren't blocked
  // when a serial I/O call hangs during device disconnect.
  nsCOMPtr<nsISerialEventTarget> mMonitorThread;
  mozilla::EventTargetCapability<nsISerialEventTarget> mIOCapability;
  nsTHashMap<nsString, HANDLE> mOpenPorts MOZ_GUARDED_BY(mIOCapability);

  DataMutex<SerialPortList> mCachedPortList{
      "Win32SerialPlatformService::mCachedPortList"};
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_Win32SerialPlatformService_h

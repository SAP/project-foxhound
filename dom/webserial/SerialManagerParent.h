/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SerialManagerParent_h
#define mozilla_dom_SerialManagerParent_h

#include "mozilla/Mutex.h"
#include "mozilla/dom/PSerialManagerParent.h"
#include "mozilla/dom/SerialPlatformService.h"
#include "mozilla/ipc/Endpoint.h"
#include "nsIObserver.h"

namespace mozilla::dom {

class SerialPermissionRequest;
class SerialPortParent;

// Thread-safe proxy that forwards device change notifications to port actors
// that were created by this manager on the IO thread. Holds a copy of the
// port actor list so it can dispatch without going through the main thread
// manager. Also observes serial-permission-revoked notifications on the main
// thread and closes all PSerialPort actors for the matching browser.
class SerialDeviceChangeProxy final : public SerialDeviceChangeObserver,
                                      public nsIObserver {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIOBSERVER

  explicit SerialDeviceChangeProxy(uint64_t aBrowserId);

  void AddPortActor(SerialPortParent* aActor);
  void RemovePortActor(SerialPortParent* aActor);

  // Close all tracked port actors (dispatched to IO thread). Used when
  // serial permissions are revoked for the owning browsing context.
  void RevokeAllPorts();

  void OnPortConnected(const IPCSerialPortInfo& aPortInfo) override;
  void OnPortDisconnected(const nsAString& aPortId) override;

 private:
  ~SerialDeviceChangeProxy();
  nsTArray<RefPtr<SerialPortParent>> ActorsById(const nsAString& aPortId);

  Mutex mMutex{"SerialDeviceChangeProxy"};

  nsTArray<RefPtr<SerialPortParent>> mPortActors MOZ_GUARDED_BY(mMutex);
  const uint64_t mBrowserId;
};

// Parent-side actor for PSerialManager, managed by PWindowGlobal.
// Runs on the main thread.
class SerialManagerParent final : public PSerialManagerParent {
 public:
  NS_INLINE_DECL_REFCOUNTING(SerialManagerParent, override)

  SerialManagerParent();

  void Init(uint64_t aBrowserId);

  void ActorDestroy(ActorDestroyReason aWhy) override;

  mozilla::ipc::IPCResult RecvRequestPort(
      nsTArray<IPCSerialPortFilter>&& aFilters, bool aAutoselect,
      RequestPortResolver&& aResolver);

  mozilla::ipc::IPCResult RecvSimulateDeviceConnection(
      const nsString& aDeviceId, const nsString& aDevicePath,
      uint16_t aVendorId, uint16_t aProductId,
      SimulateDeviceConnectionResolver&& aResolver);

  mozilla::ipc::IPCResult RecvSimulateDeviceDisconnection(
      const nsString& aDeviceId,
      SimulateDeviceDisconnectionResolver&& aResolver);

  mozilla::ipc::IPCResult RecvRemoveAllMockDevices(
      RemoveAllMockDevicesResolver&& aResolver);

  mozilla::ipc::IPCResult RecvResetToDefaultMockDevices(
      ResetToDefaultMockDevicesResolver&& aResolver);

 private:
  ~SerialManagerParent();

  // Main-thread continuation of RecvRequestPort. Constructs the chooser
  // request from the (now main-thread-safe) actor state and starts it.
  void StartChooserRequest(bool aAutoselect,
                           nsTArray<IPCSerialPortInfo>&& aPorts,
                           RequestPortResolver&& aResolver);

  // Creates a PSerialPort endpoint pair and binds the parent endpoint to a
  // new SerialPortParent on the IO thread. Returns the child endpoint, or a
  // default-constructed invalid endpoint on failure.
  mozilla::ipc::Endpoint<PSerialPortChild> CreateAndBindPortActor(
      const nsAString& aPortId);

  template <typename TWork, typename TResolver>
  mozilla::ipc::IPCResult DispatchTestOperation(const char* aName,
                                                TWork&& aWork,
                                                TResolver&& aResolver);

  uint64_t mBrowserId = 0;
  RefPtr<SerialDeviceChangeProxy> mProxy;

  // Whether there is a currently outstanding chooser request. If true,
  // a new chooser request is rejected.
  bool mChooserRequestInFlight = false;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_SerialManagerParent_h

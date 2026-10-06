/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SerialManagerParent.h"

#include "SerialLogging.h"
#include "SerialPermissionRequest.h"
#include "TestSerialPlatformService.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/PSerialPort.h"
#include "mozilla/dom/Serial.h"
#include "mozilla/dom/SerialPlatformService.h"
#include "mozilla/dom/SerialPortParent.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/ipc/Endpoint.h"
#include "nsContentUtils.h"
#include "nsIObserverService.h"
#include "nsIScriptError.h"
#include "nsThreadUtils.h"

namespace mozilla::dom {

NS_IMPL_ISUPPORTS(SerialDeviceChangeProxy, nsIObserver)

SerialDeviceChangeProxy::SerialDeviceChangeProxy(uint64_t aBrowserId)
    : mBrowserId(aBrowserId) {}

SerialDeviceChangeProxy::~SerialDeviceChangeProxy() = default;

void SerialDeviceChangeProxy::AddPortActor(SerialPortParent* aActor) {
  MutexAutoLock lock(mMutex);
  mPortActors.AppendElement(aActor);
}

void SerialDeviceChangeProxy::RemovePortActor(SerialPortParent* aActor) {
  MutexAutoLock lock(mMutex);
  mPortActors.RemoveElement(aActor);
}

nsTArray<RefPtr<SerialPortParent>> SerialDeviceChangeProxy::ActorsById(
    const nsAString& aPortId) {
  nsTArray<RefPtr<SerialPortParent>> actors;
  MutexAutoLock lock(mMutex);
  for (const auto& actor : mPortActors) {
    if (actor->PortIdMatches(aPortId)) {
      actors.AppendElement(actor);
    }
  }
  return actors;
}

void SerialDeviceChangeProxy::RevokeAllPorts() {
  nsTArray<RefPtr<SerialPortParent>> actors;
  {
    MutexAutoLock lock(mMutex);
    actors.SwapElements(mPortActors);
  }

  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  if (!service || actors.IsEmpty()) {
    return;
  }

  service->IOThread()->Dispatch(
      NS_NewRunnableFunction("SerialDeviceChangeProxy::RevokeAllPorts",
                             [actors = std::move(actors)]() {
                               for (const auto& actor : actors) {
                                 if (actor->CanSend()) {
                                   actor->Close();
                                 }
                               }
                             }));
}

void SerialDeviceChangeProxy::OnPortConnected(
    const IPCSerialPortInfo& aPortInfo) {
  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  if (!service) {
    return;
  }

  auto actors = ActorsById(aPortInfo.id());
  if (!actors.IsEmpty()) {
    service->IOThread()->Dispatch(
        NS_NewRunnableFunction("SerialDeviceChangeProxy::OnPortDisconnected",
                               [actors = std::move(actors)]() {
                                 for (const auto& actor : actors) {
                                   actor->NotifyConnected();
                                 }
                               }));
  }
}

void SerialDeviceChangeProxy::OnPortDisconnected(const nsAString& aPortId) {
  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  if (!service) {
    return;
  }

  auto actors = ActorsById(aPortId);
  if (!actors.IsEmpty()) {
    service->IOThread()->Dispatch(
        NS_NewRunnableFunction("SerialDeviceChangeProxy::OnPortDisconnected",
                               [actors = std::move(actors)]() {
                                 for (const auto& actor : actors) {
                                   actor->NotifyDisconnected();
                                 }
                               }));
  }
}

NS_IMETHODIMP
SerialDeviceChangeProxy::Observe(nsISupports* aSubject, const char* aTopic,
                                 const char16_t* aData) {
  if (strcmp(aTopic, "serial-permission-revoked") == 0 && aSubject) {
    AssertIsOnMainThread();
    nsCOMPtr<BrowsingContext> revokedBC = do_QueryInterface(aSubject);
    if (!revokedBC) {
      return NS_OK;
    }
    uint64_t revokedBrowserId = revokedBC->GetBrowserId();

    if (mBrowserId != revokedBrowserId) {
      return NS_OK;
    }

    RevokeAllPorts();
  }
  return NS_OK;
}

SerialManagerParent::SerialManagerParent() { AssertIsOnMainThread(); }

SerialManagerParent::~SerialManagerParent() {
  AssertIsOnMainThread();
  MOZ_ASSERT(!mProxy, "Proxy should have been cleared");
}

void SerialManagerParent::Init(uint64_t aBrowserId) {
  AssertIsOnMainThread();
  MOZ_ASSERT(CanSend(), "Actor should have already been initialized");
  mBrowserId = aBrowserId;

  RefPtr<SerialPlatformService> platformService =
      SerialPlatformService::GetInstance();
  if (!platformService) {
    // If the SerialPlatformService is null, nothing is going to work
    // (and we don't try to create it again later)
    // We already log something in GetInstance(), so just exit here
    // after tearing down the newly created actor.
    (void)PSerialManagerParent::Send__delete__(this);
    return;
  }
  mProxy = MakeRefPtr<SerialDeviceChangeProxy>(mBrowserId);
  platformService->AddDeviceChangeObserver(mProxy);
  nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
  if (obs) {
    obs->AddObserver(mProxy, "serial-permission-revoked", false);
  }
}

// https://wicg.github.io/serial/#dfn-matches-the-filter
// A port matches a filter if for each present member of the filter,
// the port has a matching value.
// Note that bluetoothServiceClassId UUIDs have already been canonicalized by
// the content process.
static void ApplyPortFilters(nsTArray<IPCSerialPortInfo>& aPorts,
                             const nsTArray<IPCSerialPortFilter>& aFilters) {
  if (aFilters.IsEmpty()) {
    return;
  }

  aPorts.RemoveElementsBy([&](const IPCSerialPortInfo& port) {
    for (const auto& filter : aFilters) {
      // Step 1: If filter.usbVendorId is present and port's USB vendor ID
      // does not match, this filter fails.
      bool vendorMatches =
          filter.usbVendorId().isNothing() ||
          (port.usbVendorId() &&
           port.usbVendorId().value() == filter.usbVendorId().value());

      // Step 2: If filter.usbProductId is present and port's USB product ID
      // does not match, this filter fails.
      bool productMatches =
          filter.usbProductId().isNothing() ||
          (port.usbProductId() &&
           port.usbProductId().value() == filter.usbProductId().value());

      // Step 3: If filter.bluetoothServiceClassId is present and port's
      // Bluetooth service class ID does not match, this filter fails.
      bool bluetoothMatches = true;
      if (filter.bluetoothServiceClassId().isSome()) {
        if (port.bluetoothServiceClassId().isNothing()) {
          bluetoothMatches = false;
        } else {
          bluetoothMatches = port.bluetoothServiceClassId().value() ==
                             filter.bluetoothServiceClassId().value();
        }
      }

      if (vendorMatches && productMatches && bluetoothMatches) {
        return false;
      }
    }
    return true;
  });
}

mozilla::ipc::Endpoint<PSerialPortChild>
SerialManagerParent::CreateAndBindPortActor(const nsAString& aPortId) {
  AssertIsOnMainThread();

  mozilla::ipc::Endpoint<PSerialPortParent> parentEndpoint;
  mozilla::ipc::Endpoint<PSerialPortChild> childEndpoint;
  if (NS_WARN_IF(NS_FAILED(
          PSerialPort::CreateEndpoints(&parentEndpoint, &childEndpoint)))) {
    return {};
  }

  RefPtr<SerialPlatformService> service = SerialPlatformService::GetInstance();
  RefPtr<SerialDeviceChangeProxy> proxy = mProxy;
  if (!service || !proxy) {
    return {};
  }

  service->IOThread()->Dispatch(NS_NewRunnableFunction(
      "SerialPortParent::Bind",
      [portId = nsString(aPortId), browserId = mBrowserId, proxy = proxy,
       endpoint = std::move(parentEndpoint)]() mutable {
        auto actor = MakeRefPtr<SerialPortParent>(portId, browserId, proxy);
        if (!endpoint.Bind(actor)) {
          MOZ_LOG(gWebSerialLog, LogLevel::Error,
                  ("SerialPortParent::Bind failed"));
          return;
        }
        proxy->AddPortActor(actor);
      }));

  return childEndpoint;
}

namespace {
struct EnumeratePortsResult {
  SerialPortList mPorts;
  bool mLikelyAccessDenied = false;
};
using EnumeratePortsPromise = MozPromise<EnumeratePortsResult, nsresult, true>;
}  // namespace

mozilla::ipc::IPCResult SerialManagerParent::RecvRequestPort(
    nsTArray<IPCSerialPortFilter>&& aFilters, bool aAutoselect,
    RequestPortResolver&& aResolver) {
  AssertIsOnMainThread();

  auto rejectInternal = MakeScopeExit([&aResolver]() {
    IPCRequestPortResult result;
    result.reason() = RequestPortReason::InternalError;
    aResolver(std::make_tuple(std::move(result),
                              mozilla::ipc::Endpoint<PSerialPortChild>()));
  });

  if (!StaticPrefs::dom_webserial_enabled()) {
    return IPC_OK();
  }

  if (aAutoselect && !StaticPrefs::dom_webserial_testing_enabled()) {
    return IPC_OK();
  }

  if (mChooserRequestInFlight) {
    // Only one chooser at a time per PSerialManager.
    return IPC_OK();
  }

  RefPtr<SerialPlatformService> platformService =
      SerialPlatformService::GetInstance();
  if (!platformService) {
    return IPC_OK();
  }

  // Below this point we either succeed (or are returning a different error)
  rejectInternal.release();

  nsCString unusedFailureReason;
  for (const auto& filter : aFilters) {
    if (!Serial::ValidatePortFilter(
            filter.usbVendorId().isSome(), filter.usbProductId().isSome(),
            filter.bluetoothServiceClassId().isSome(), unusedFailureReason) ||
        (filter.bluetoothServiceClassId().isSome() &&
         !Serial::IsValidBluetoothUUID(
             filter.bluetoothServiceClassId().value()))) {
      return IPC_FAIL(this, "invalid filter");
    }
  }

  // Claim the chooser slot synchronously so a second RecvRequestPort
  // arriving on the main thread while we're enumerating on the IO thread
  // is rejected.
  mChooserRequestInFlight = true;

  // Enumerate on the IO thread; only primitive/thread-safe captures cross
  // thread boundaries. Once the enumeration is done we hop back to the main
  // thread to construct the SerialPermissionRequest (which holds main-
  // thread-only Element/Principal references).
  nsCOMPtr<nsISerialEventTarget> ioThread = platformService->IOThread();

  InvokeAsync(ioThread, __func__,
              [service = RefPtr{platformService}] {
                EnumeratePortsResult enumerated;
                nsresult rv = service->EnumeratePorts(
                    enumerated.mPorts, &enumerated.mLikelyAccessDenied);
                if (NS_WARN_IF(NS_FAILED(rv))) {
                  return EnumeratePortsPromise::CreateAndReject(rv, __func__);
                }
                return EnumeratePortsPromise::CreateAndResolve(
                    std::move(enumerated), __func__);
              })
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [self = RefPtr{this}, filters = std::move(aFilters), aAutoselect,
           resolver = std::move(aResolver)](
              EnumeratePortsPromise::ResolveOrRejectValue&& aValue) mutable {
            if (aValue.IsReject()) {
              self->mChooserRequestInFlight = false;
              IPCRequestPortResult result;
              result.reason() = RequestPortReason::InternalError;
              resolver(
                  std::make_tuple(std::move(result),
                                  mozilla::ipc::Endpoint<PSerialPortChild>()));
              return;
            }
            EnumeratePortsResult enumerated = std::move(aValue.ResolveValue());
            if (enumerated.mLikelyAccessDenied) {
              uint64_t innerWindowId =
                  static_cast<WindowGlobalParent*>(self->Manager())
                      ->InnerWindowId();
              nsContentUtils::ReportToConsoleByWindowID(
                  u"WebSerial: No serial ports could be accessed. On "
                  u"Linux this may mean the current user does not have "
                  u"permission to access serial devices (for example, "
                  u"is not in the \"dialout\" group), or the browser is "
                  u"running in a Snap or Flatpak sandbox without "
                  u"serial port access."_ns,
                  nsIScriptError::warningFlag, "WebSerial"_ns, innerWindowId);
            }
            ApplyPortFilters(enumerated.mPorts, filters);
            self->StartChooserRequest(aAutoselect, std::move(enumerated.mPorts),
                                      std::move(resolver));
          });

  return IPC_OK();
}

void SerialManagerParent::StartChooserRequest(
    bool aAutoselect, nsTArray<IPCSerialPortInfo>&& aPorts,
    RequestPortResolver&& aResolver) {
  AssertIsOnMainThread();
  // should have been set by RecvRequestPort()
  MOZ_ASSERT(mChooserRequestInFlight);

  auto rejectInternal = MakeScopeExit([this, &aResolver]() {
    mChooserRequestInFlight = false;
    IPCRequestPortResult result;
    result.reason() = RequestPortReason::InternalError;
    aResolver(std::make_tuple(std::move(result),
                              mozilla::ipc::Endpoint<PSerialPortChild>()));
  });

  if (!CanSend()) {
    return;
  }

  auto request = MakeRefPtr<SerialPermissionRequest>(
      static_cast<WindowGlobalParent*>(Manager()), aAutoselect,
      std::move(aPorts));
  rejectInternal.release();

  request->Run()->Then(
      GetMainThreadSerialEventTarget(), __func__,
      [self = RefPtr{this}, resolver = std::move(aResolver)](
          SerialChooserPromise::ResolveOrRejectValue&& aValue) mutable {
        self->mChooserRequestInFlight = false;

        IPCRequestPortResult result;
        mozilla::ipc::Endpoint<PSerialPortChild> childEndpoint;

        if (aValue.IsResolve()) {
          const IPCSerialPortInfo& port = aValue.ResolveValue();
          childEndpoint = self->CreateAndBindPortActor(port.id());
          if (childEndpoint.IsValid()) {
            result.reason() = RequestPortReason::Granted;
            result.port() = Some(port);
          } else {
            result.reason() = RequestPortReason::InternalError;
          }
        } else {
          result.reason() = aValue.RejectValue();
        }

        resolver(std::make_tuple(result, std::move(childEndpoint)));
      });
}

template <typename TWork, typename TResolver>
mozilla::ipc::IPCResult SerialManagerParent::DispatchTestOperation(
    const char* aName, TWork&& aWork, TResolver&& aResolver) {
  AssertIsOnMainThread();
  if (!StaticPrefs::dom_webserial_testing_enabled()) {
    return IPC_FAIL(this, "Testing not enabled");
  }

  RefPtr<SerialPlatformService> platformService =
      SerialPlatformService::GetInstance();
  if (!platformService) {
    aResolver(NS_ERROR_FAILURE);
    return IPC_OK();
  }
  RefPtr<TestSerialPlatformService> testService =
      platformService->AsTestService();
  if (!testService) {
    aResolver(NS_ERROR_FAILURE);
    return IPC_OK();
  }

  platformService->IOThread()->Dispatch(
      NS_NewRunnableFunction(aName, [testService, aWork, aResolver]() {
        aWork(testService);
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "SerialManagerParent::DispatchTestOperation::Resolve",
            [aResolver]() { aResolver(NS_OK); }));
      }));

  return IPC_OK();
}

mozilla::ipc::IPCResult SerialManagerParent::RecvSimulateDeviceConnection(
    const nsString& aDeviceId, const nsString& aDevicePath, uint16_t aVendorId,
    uint16_t aProductId, SimulateDeviceConnectionResolver&& aResolver) {
  return DispatchTestOperation(
      "SerialManagerParent::SimulateDeviceConnection",
      [deviceId = nsString(aDeviceId), devicePath = nsString(aDevicePath),
       aVendorId, aProductId](TestSerialPlatformService* testService) {
        testService->SimulateDeviceConnection(deviceId, devicePath, aVendorId,
                                              aProductId);
      },
      std::move(aResolver));
}

mozilla::ipc::IPCResult SerialManagerParent::RecvSimulateDeviceDisconnection(
    const nsString& aDeviceId,
    SimulateDeviceDisconnectionResolver&& aResolver) {
  return DispatchTestOperation(
      "SerialManagerParent::SimulateDeviceDisconnection",
      [deviceId = nsString(aDeviceId)](TestSerialPlatformService* testService) {
        testService->SimulateDeviceDisconnection(deviceId);
      },
      std::move(aResolver));
}

mozilla::ipc::IPCResult SerialManagerParent::RecvRemoveAllMockDevices(
    RemoveAllMockDevicesResolver&& aResolver) {
  return DispatchTestOperation(
      "SerialManagerParent::RemoveAllMockDevices",
      [](TestSerialPlatformService* testService) {
        testService->RemoveAllMockDevices();
      },
      std::move(aResolver));
}

mozilla::ipc::IPCResult SerialManagerParent::RecvResetToDefaultMockDevices(
    ResetToDefaultMockDevicesResolver&& aResolver) {
  return DispatchTestOperation(
      "SerialManagerParent::ResetToDefaultMockDevices",
      [](TestSerialPlatformService* testService) {
        testService->ResetToDefaultMockDevices();
      },
      std::move(aResolver));
}

void SerialManagerParent::ActorDestroy(ActorDestroyReason aWhy) {
  AssertIsOnMainThread();

  RefPtr<SerialDeviceChangeProxy> proxy = mProxy.forget();
  if (proxy) {
    proxy->RevokeAllPorts();
    RefPtr<SerialPlatformService> platformService =
        SerialPlatformService::GetInstance();
    if (platformService) {
      platformService->RemoveDeviceChangeObserver(proxy);
    }

    nsCOMPtr<nsIObserverService> obs = mozilla::services::GetObserverService();
    if (obs) {
      obs->RemoveObserver(proxy, "serial-permission-revoked");
    }
  }
}

}  // namespace mozilla::dom

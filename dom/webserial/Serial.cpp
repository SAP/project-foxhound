/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/Serial.h"

#include "Navigator.h"
#include "SerialLogging.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/FeaturePolicyUtils.h"
#include "mozilla/dom/PSerialPort.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/SerialBinding.h"
#include "mozilla/dom/SerialManagerChild.h"
#include "mozilla/dom/SerialPort.h"
#include "mozilla/dom/SerialPortChild.h"
#include "mozilla/dom/WindowContext.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "mozilla/dom/WorkerCommon.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/dom/WorkerRef.h"
#include "nsContentUtils.h"
#include "nsPIDOMWindow.h"
#include "nsThreadUtils.h"

namespace mozilla::dom {

// Forward declaration for use in RequestPort below; the implementation lives
// further down with the other Bluetooth UUID helpers.
static bool ResolveBluetoothServiceUUID(const OwningStringOrUnsignedLong& aName,
                                        nsAutoString& aResult);

static Serial* FindWindowSerialForWorkerPrivate(WorkerPrivate* aWorkerPrivate) {
  AssertIsOnMainThread();
  MOZ_ASSERT(aWorkerPrivate);
  nsPIDOMWindowInner* inner = aWorkerPrivate->GetAncestorWindow();
  if (!inner) {
    return nullptr;
  }
  return inner->Navigator()->GetExistingSerial();
}

using TestingIpcPromise =
    MozPromise<nsresult, mozilla::ipc::ResponseRejectReason, true>;

// Runs aSendFn(child) on the main thread, where |child| is the
// SerialManagerChild owned by aMainThreadSerial.
template <typename SendFn>
static RefPtr<TestingIpcPromise> InvokeTestingSendOnMainThread(
    Serial* aMainThreadSerial, const SendFn&& aSendFn) {
  AssertIsOnMainThread();
  if (!aMainThreadSerial) {
    return TestingIpcPromise::CreateAndReject(
        mozilla::ipc::ResponseRejectReason::ChannelClosed, __func__);
  }
  SerialManagerChild* child = aMainThreadSerial->GetOrCreateManagerChild();
  if (!child) {
    return TestingIpcPromise::CreateAndReject(
        mozilla::ipc::ResponseRejectReason::ChannelClosed, __func__);
  }
  return aSendFn(child);
}

// Common implementation for the four test-only methods. SerialManagerChild
// is a main-thread-only IPC actor, so when called from a worker, the Send*
// call has to be bounced to the main thread (via the window's Serial),
// and the resulting JS Promise resolved back on the worker.
//
// aSendFn is a callable taking SerialManagerChild* and returning
// RefPtr<TestingIpcPromise> (i.e. the result of one of the Send* methods).
template <typename SendFn>
static already_AddRefed<Promise> RunTestingIpc(
    Serial* aSerial, ErrorResult& aRv, const nsLiteralCString& aIpcErrorMessage,
    SendFn&& aSendFn) {
  if (!StaticPrefs::dom_webserial_testing_enabled()) {
    aRv.ThrowNotSupportedError("Testing is not enabled");
    return nullptr;
  }

  nsIGlobalObject* global = aSerial->GetRelevantGlobal();
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  RefPtr<Promise> promise = Promise::Create(global, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  if (NS_IsMainThread()) {
    InvokeTestingSendOnMainThread(aSerial, std::forward<SendFn>(aSendFn))
        ->Then(
            GetMainThreadSerialEventTarget(), __func__,
            [promise](nsresult) { promise->MaybeResolveWithUndefined(); },
            [promise, aIpcErrorMessage](mozilla::ipc::ResponseRejectReason) {
              promise->MaybeRejectWithAbortError(aIpcErrorMessage);
            });
    return promise.forget();
  }

  WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
  if (!workerPrivate) {
    promise->MaybeRejectWithNotSupportedError("Worker context not available");
    return promise.forget();
  }

  RefPtr<StrongWorkerRef> strongRef =
      StrongWorkerRef::Create(workerPrivate, "Serial::RunTestingIpc");
  if (!strongRef) {
    promise->MaybeRejectWithAbortError("Worker is shutting down");
    return promise.forget();
  }
  auto tsRef = MakeRefPtr<ThreadSafeWorkerRef>(strongRef);

  InvokeAsync(GetMainThreadSerialEventTarget(), __func__,
              [tsRef, sendFn = std::forward<SendFn>(aSendFn)]() {
                Serial* windowSerial =
                    FindWindowSerialForWorkerPrivate(tsRef->Private());
                return InvokeTestingSendOnMainThread(windowSerial,
                                                     std::move(sendFn));
              })
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          [promise](nsresult) { promise->MaybeResolveWithUndefined(); },
          [promise, aIpcErrorMessage](mozilla::ipc::ResponseRejectReason) {
            promise->MaybeRejectWithAbortError(aIpcErrorMessage);
          });

  return promise.forget();
}

NS_IMPL_CYCLE_COLLECTION_WEAK_PTR_INHERITED(Serial, DOMEventTargetHelper,
                                            mPorts)

NS_IMPL_ADDREF_INHERITED(Serial, DOMEventTargetHelper)
NS_IMPL_RELEASE_INHERITED(Serial, DOMEventTargetHelper)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(Serial)
NS_INTERFACE_MAP_END_INHERITING(DOMEventTargetHelper)

LazyLogModule gWebSerialLog("WebSerial");

Serial::Serial(nsPIDOMWindowInner* aWindow) : DOMEventTargetHelper(aWindow) {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("Serial[%p] created for window", this));
  AssertIsOnMainThread();
}

Serial::Serial(nsIGlobalObject* aGlobal) : DOMEventTargetHelper(aGlobal) {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("Serial[%p] created for global", this));
  MOZ_ASSERT(!NS_IsMainThread());
}

Serial::~Serial() {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug, ("Serial[%p] destroyed", this));
  MOZ_ASSERT(mHasShutdown);
}

void Serial::Shutdown() {
  if (mHasShutdown) {
    return;
  }
  MOZ_LOG(gWebSerialLog, LogLevel::Debug, ("Serial[%p] shutting down", this));
  mHasShutdown = true;
  mManagerChild = nullptr;
  for (const auto& port : mPorts) {
    port->Shutdown();
  }
  mPorts.Clear();
}

void Serial::DisconnectFromOwner() {
  Shutdown();
  DOMEventTargetHelper::DisconnectFromOwner();
}

JSObject* Serial::WrapObject(JSContext* aCx,
                             JS::Handle<JSObject*> aGivenProto) {
  return Serial_Binding::Wrap(aCx, this, aGivenProto);
}

SerialManagerChild* Serial::GetOrCreateManagerChild() {
  if (mManagerChild) {
    return mManagerChild;
  }

  AssertIsOnMainThread();

  nsPIDOMWindowInner* window = GetOwnerWindow();
  if (!window) {
    return nullptr;
  }

  WindowGlobalChild* wgc = window->GetWindowGlobalChild();
  if (!wgc) {
    return nullptr;
  }

  auto child = MakeRefPtr<SerialManagerChild>(this);
  if (!wgc->SendPSerialManagerConstructor(child)) {
    return nullptr;
  }

  mManagerChild = child;
  return mManagerChild;
}

// Returns whether the security check was passed. If this method returns
// false, the promise has been rejected.
static bool PortSecurityCheck(Promise& aPromise, nsIGlobalObject* aGlobal,
                              const nsCString& aFunctionName) {
  if (nsPIDOMWindowInner* window = aGlobal->GetAsInnerWindow()) {
    Document* doc = window->GetExtantDoc();
    if (!doc) {
      aPromise.MaybeRejectWithSecurityError(
          aFunctionName + "() is not allowed without a document"_ns);
      return false;
    }

    // web-platform-tests seem to indicate this is necessary, but the spec does
    // not. spec issue: https://github.com/WICG/serial/issues/223
    if (doc->NodePrincipal()->GetIsNullPrincipal()) {
      aPromise.MaybeRejectWithSecurityError(
          aFunctionName + "() is not allowed for opaque origins"_ns);
      return false;
    }

    if (!FeaturePolicyUtils::IsFeatureAllowed(doc, u"serial"_ns)) {
      nsAutoString message;
      message.AssignLiteral("WebSerial access request was denied: ");
      message.Append(NS_ConvertUTF8toUTF16(aFunctionName));
      message.AppendLiteral("() is not allowed in this context");
      nsContentUtils::ReportToConsoleNonLocalized(
          message, nsIScriptError::errorFlag, "Security"_ns, doc);
      aPromise.MaybeRejectWithSecurityError(
          aFunctionName + "() is not allowed in this context"_ns);
      return false;
    }
    return true;
  }
  WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
  if (!workerPrivate) {
    aPromise.MaybeRejectWithSecurityError(
        aFunctionName + "() is not allowed without a window or worker"_ns);
    return false;
  }
  if (!workerPrivate->SerialAllowed()) {
    aPromise.MaybeRejectWithSecurityError(
        aFunctionName + "() is not allowed in this context"_ns);
    return false;
  }
  return true;
}

bool Serial::ValidatePortFilter(bool aHasUsbVendorId, bool aHasUsbProductId,
                                bool aHasBluetoothServiceClassId,
                                nsACString& aFailureReason) {
  // https://wicg.github.io/serial/#ref-for-dom-serialportrequestoptions-filters-1
  if (aHasBluetoothServiceClassId) {
    if (aHasUsbVendorId || aHasUsbProductId) {
      aFailureReason =
          "A filter cannot specify both bluetoothServiceClassId and "
          "usbVendorId or usbProductId."_ns;
      return false;
    }
  } else {
    if (!aHasUsbVendorId) {
      if (!aHasUsbProductId) {
        aFailureReason = "A filter must provide a property to filter by."_ns;
      } else {
        aFailureReason =
            "A filter containing a usbProductId must also specify a usbVendorId."_ns;
      }
      return false;
    }
  }
  return true;
}

already_AddRefed<Promise> Serial::RequestPort(
    const SerialPortRequestOptions& aOptions, ErrorResult& aRv) {
  AssertIsOnMainThread();
  // RequestPort() doesn't work in workers, so we can skip straight to the
  // window.
  nsPIDOMWindowInner* window = GetOwnerWindow();
  if (!window) {
    MOZ_LOG(gWebSerialLog, LogLevel::Error,
            ("Serial[%p]::RequestPort failed: no window available", this));
    return nullptr;
  }

  // https://wicg.github.io/serial/#dom-serial-requestport
  // Step 1: Let promise be a new promise.
  RefPtr<Promise> promise = Promise::Create(window->AsGlobal(), aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  MOZ_LOG(
      gWebSerialLog, LogLevel::Info,
      ("Serial[%p]::RequestPort called (filters: %s, allowedBluetoothUUIDs: "
       "%s)",
       this, aOptions.mFilters.WasPassed() ? "provided" : "none",
       aOptions.mAllowedBluetoothServiceClassIds.WasPassed() ? "provided"
                                                             : "none"));

  // Step 2: If this's relevant global object's associated Document is not
  // allowed to use the "serial" feature, reject with a SecurityError.
  if (!PortSecurityCheck(*promise, window->AsGlobal(), "requestPort"_ns)) {
    MOZ_LOG(gWebSerialLog, LogLevel::Warning,
            ("Serial[%p]::RequestPort failed security check", this));
    return promise.forget();
  }

  // Step 3: If the relevant global object does not have transient activation,
  // reject with a SecurityError.
  WindowContext* context = window->GetWindowContext();
  if (!context) {
    MOZ_LOG(
        gWebSerialLog, LogLevel::Error,
        ("Serial[%p]::RequestPort failed: no window context available", this));
    promise->MaybeRejectWithNotSupportedError("No window context available");
    return promise.forget();
  }
  if (!context->HasValidTransientUserGestureActivation()) {
    MOZ_LOG(gWebSerialLog, LogLevel::Warning,
            ("Serial[%p]::RequestPort failed: no user activation", this));
    promise->MaybeRejectWithSecurityError(
        "requestPort() requires user activation");
    return promise.forget();
  }

  // Step 4: If options["filters"] is present, validate each filter.
  if (aOptions.mFilters.WasPassed()) {
    MOZ_LOG(gWebSerialLog, LogLevel::Debug,
            ("Serial[%p]::RequestPort validating %zu filters", this,
             aOptions.mFilters.Value().Length()));
    nsAutoCString validatePortFailureReason;
    for (const auto& filter : aOptions.mFilters.Value()) {
      if (!ValidatePortFilter(filter.mUsbVendorId.WasPassed(),
                              filter.mUsbProductId.WasPassed(),
                              filter.mBluetoothServiceClassId.WasPassed(),
                              validatePortFailureReason)) {
        promise->MaybeRejectWithTypeError(validatePortFailureReason);
        MOZ_LOG(gWebSerialLog, LogLevel::Warning,
                ("Serial[%p]::RequestPort failed filter validation", this));
        return promise.forget();
      }
    }
  }

  // Step 5 (in parallel): ask the parent process to enumerate, prompt the
  // user, and record the granted port id.
  SerialManagerChild* child = GetOrCreateManagerChild();
  if (!child) {
    promise->MaybeRejectWithNotSupportedError("Request failed");
    return promise.forget();
  }

  nsTArray<IPCSerialPortFilter> ipcFilters;
  if (aOptions.mFilters.WasPassed()) {
    for (const auto& filter : aOptions.mFilters.Value()) {
      IPCSerialPortFilter ipcFilter;
      if (filter.mUsbVendorId.WasPassed()) {
        ipcFilter.usbVendorId() = Some(filter.mUsbVendorId.Value());
      }
      if (filter.mUsbProductId.WasPassed()) {
        ipcFilter.usbProductId() = Some(filter.mUsbProductId.Value());
      }
      if (filter.mBluetoothServiceClassId.WasPassed()) {
        nsAutoString uuid;
        if (!ResolveBluetoothServiceUUID(
                filter.mBluetoothServiceClassId.Value(), uuid)) {
          promise->MaybeRejectWithTypeError(
              "Invalid bluetoothServiceClassId in port filter");
          return promise.forget();
        }
        ipcFilter.bluetoothServiceClassId() = Some(uuid);
      }
      ipcFilters.AppendElement(std::move(ipcFilter));
    }
  }

  bool autoselect =
      StaticPrefs::dom_webserial_testing_enabled() && mAutoselectPorts;

  child->SendRequestPort(ipcFilters, autoselect)
      ->Then(
          GetMainThreadSerialEventTarget(), __func__,
          [promise, self = RefPtr{this}](
              std::tuple<IPCRequestPortResult,
                         mozilla::ipc::Endpoint<PSerialPortChild>>&& aTuple) {
            IPCRequestPortResult& result = std::get<0>(aTuple);
            mozilla::ipc::Endpoint<PSerialPortChild> endpoint =
                std::move(std::get<1>(aTuple));
            switch (result.reason()) {
              case RequestPortReason::Granted: {
                if (result.port().isNothing()) {
                  promise->MaybeRejectWithNotSupportedError(
                      "Granted port info missing");
                  return;
                }
                RefPtr<SerialPort> port = self->GetOrCreatePort(
                    result.port().value(), std::move(endpoint));
                if (!port) {
                  promise->MaybeRejectWithNotSupportedError(
                      "Failed to create port actor");
                  return;
                }
                port->MarkPhysicallyPresent();
                promise->MaybeResolve(port);
                return;
              }
              case RequestPortReason::UserCancelled:
              case RequestPortReason::AddonDenied:
                promise->MaybeRejectWithNotFoundError("No port selected");
                return;
              case RequestPortReason::InternalError:
                promise->MaybeRejectWithNotSupportedError("Request failed");
                return;
              case RequestPortReason::EndGuard_:
                MOZ_ASSERT_UNREACHABLE("Bad RequestPortReason");
                promise->MaybeRejectWithNotSupportedError("Request failed");
                return;
            }
            promise->MaybeRejectWithNotSupportedError("Request failed");
          },
          [promise](mozilla::ipc::ResponseRejectReason) {
            promise->MaybeRejectWithNotSupportedError("Request failed");
          });

  // Step 6: Return promise.
  return promise.forget();
}

already_AddRefed<Promise> Serial::GetPorts(ErrorResult& aRv) {
  nsIGlobalObject* global = GetRelevantGlobal();
  if (!global) {
    aRv.ThrowInvalidStateError("No global object available");
    return nullptr;
  }

  // https://wicg.github.io/serial/#dom-serial-getports
  // Step 1: Let promise be a new promise.
  RefPtr<Promise> promise = Promise::Create(global, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("Serial[%p]::GetPorts called", this));

  // Step 2: If this's relevant global object's associated Document is not
  // allowed to use the "serial" feature, reject with a SecurityError.
  if (!PortSecurityCheck(*promise, global, "getPorts"_ns)) {
    MOZ_LOG(gWebSerialLog, LogLevel::Warning,
            ("Serial[%p]::GetPorts failed security check", this));
    return promise.forget();
  }

  // Step 3 (in parallel): Get the sequence of available serial ports the user
  // has granted access to, then queue a task to resolve the promise.
  if (NS_IsMainThread()) {
    nsTArray<RefPtr<SerialPort>> result;
    for (const auto& port : mPorts) {
      if (!port->IsForgotten() && port->PhysicallyPresent()) {
        result.AppendElement(port);
      }
    }

    MOZ_LOG(
        gWebSerialLog, LogLevel::Info,
        ("Serial[%p]::GetPorts returning %zu ports", this, result.Length()));

    // Queue a task to resolve the promise per spec step 3.3
    NS_DispatchToCurrentThread(NS_NewRunnableFunction(
        "Serial::GetPorts resolve",
        [promise = RefPtr{promise}, result = std::move(result)]() mutable {
          promise->MaybeResolve(result);
        }));

    // Step 4: Return promise.
    return promise.forget();
  }

  // Worker path: collect known port IDs, dispatch to main thread to get
  // new grants and clone their actors, then dispatch back to create
  // SerialPort objects for any new ports.
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("Serial[%p]::GetPorts called from worker, dispatching to main "
           "thread",
           this));

  WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
  if (!workerPrivate) {
    MOZ_LOG(gWebSerialLog, LogLevel::Error,
            ("Serial[%p]::GetPorts failed: no worker private", this));
    promise->MaybeRejectWithNotSupportedError("Worker context not available");
    return promise.forget();
  }

  nsTArray<nsString> knownPortIds;
  for (const auto& port : mPorts) {
    knownPortIds.AppendElement(port->Id());
  }

  RefPtr<StrongWorkerRef> strongRef =
      StrongWorkerRef::Create(workerPrivate, "Serial::GetPorts");
  if (!strongRef) {
    promise->MaybeRejectWithAbortError("Worker is shutting down");
    return promise.forget();
  }

  auto tsRef = MakeRefPtr<ThreadSafeWorkerRef>(strongRef);

  struct NewPortData {
    IPCSerialPortInfo mInfo;
    mozilla::ipc::Endpoint<PSerialPortChild> mEndpoint;
  };
  struct GetPortsData {
    nsTArray<NewPortData> mNewPorts;
    nsTArray<nsString> mIdsToForget;
  };
  using GetPortsPromise = MozPromise<GetPortsData, nsresult, true>;

  // InvokeAsync dispatches the lambda to the main thread and returns a
  // MozPromise. No non-threadsafe RefPtrs cross thread boundaries.
  InvokeAsync(
      GetMainThreadSerialEventTarget(), __func__,
      [tsRef, knownPortIds = std::move(knownPortIds)]() {
        Serial* windowSerial =
            FindWindowSerialForWorkerPrivate(tsRef->Private());

        GetPortsData getPortsData;
        if (windowSerial) {
          for (const auto& port : windowSerial->mPorts) {
            if (port->IsForgotten()) {
              continue;
            }

            bool alreadyKnown = false;
            for (const auto& id : knownPortIds) {
              if (id == port->Id()) {
                alreadyKnown = true;
                break;
              }
            }
            if (alreadyKnown) {
              continue;
            }

            RefPtr<SerialPortChild> child = port->GetChild();
            if (!child || !child->CanSend()) {
              continue;
            }

            mozilla::ipc::Endpoint<PSerialPortParent> parentEp;
            mozilla::ipc::Endpoint<PSerialPortChild> childEp;
            if (NS_FAILED(PSerialPort::CreateEndpoints(&parentEp, &childEp))) {
              continue;
            }

            child->SendClone(std::move(parentEp));

            NewPortData data;
            data.mInfo = port->GetPortInfo();
            data.mEndpoint = std::move(childEp);
            getPortsData.mNewPorts.AppendElement(std::move(data));
          }

          // Determine which ports the worker knows about that have been
          // forgotten or removed on the main thread.
          for (const auto& id : knownPortIds) {
            bool stillActive = false;
            for (const auto& port : windowSerial->mPorts) {
              if (!port->IsForgotten() && port->Id() == id) {
                stillActive = true;
                break;
              }
            }
            if (!stillActive) {
              getPortsData.mIdsToForget.AppendElement(id);
            }
          }
        } else {
          // Window Serial is gone; forget all known ports.
          getPortsData.mIdsToForget = knownPortIds.Clone();
        }

        return GetPortsPromise::CreateAndResolve(std::move(getPortsData),
                                                 __func__);
      })
      ->Then(
          GetCurrentSerialEventTarget(), __func__,
          // Capture tsRef here to avoid a race with the worker losing the
          // workerref.
          [self = RefPtr{this}, tsRef, promise](GetPortsData&& aData) {
            for (auto& data : aData.mNewPorts) {
              RefPtr<SerialPort> port =
                  MakeRefPtr<SerialPort>(data.mInfo, self);
              auto actor = MakeRefPtr<SerialPortChild>();
              if (data.mEndpoint.Bind(actor)) {
                actor->SetPort(port);
                port->SetChild(actor);
              }
              self->mPorts.AppendElement(std::move(port));
            }

            for (const auto& id : aData.mIdsToForget) {
              self->ForgetPort(id);
            }

            nsTArray<RefPtr<SerialPort>> result;
            for (const auto& port : self->mPorts) {
              if (!port->IsForgotten() && port->PhysicallyPresent()) {
                result.AppendElement(port);
              }
            }
            promise->MaybeResolve(result);
          },
          [promise](nsresult aRv) {
            promise->MaybeRejectWithNotSupportedError(
                "Failed to get ports from main thread");
          });

  return promise.forget();
}

// https://webbluetoothcg.github.io/web-bluetooth/#dom-bluetoothuuid-canonicaluuid
// Replaces the top 32 bits of 00000000-0000-1000-8000-00805f9b34fb with the
// alias. E.g. canonicalUUID(0xDEADBEEF) =>
// "deadbeef-0000-1000-8000-00805f9b34fb"
static nsAutoString BluetoothCanonicalUUID(uint32_t aAlias) {
  nsAutoString result;
  result.AppendPrintf("%08x-0000-1000-8000-00805f9b34fb", aAlias);
  return result;
}

// A valid UUID is a lowercase string matching
// /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// https://webbluetoothcg.github.io/web-bluetooth/#valid-uuid
bool Serial::IsValidBluetoothUUID(const nsAString& aString) {
  // 8-4-4-4-12 = 32 hex chars + 4 dashes = 36 chars
  if (aString.Length() != 36) {
    return false;
  }
  const char16_t* data = aString.BeginReading();
  for (uint32_t i = 0; i < 36; i++) {
    if (i == 8 || i == 13 || i == 18 || i == 23) {
      if (data[i] != '-') {
        return false;
      }
    } else if (!((data[i] >= '0' && data[i] <= '9') ||
                 (data[i] >= 'a' && data[i] <= 'f'))) {
      return false;
    }
  }
  return true;
}

// Implements ResolveUUIDName(name, GATT assigned services) from the
// Web Bluetooth spec, used by BluetoothUUID.getService().
// https://webbluetoothcg.github.io/web-bluetooth/#resolveuuidname
// Returns true on success and sets aResult; returns false on error (step 4).
static bool ResolveBluetoothServiceUUID(const OwningStringOrUnsignedLong& aName,
                                        nsAutoString& aResult) {
  // Step 1: If name is an unsigned long, return canonicalUUID(name).
  if (aName.IsUnsignedLong()) {
    aResult = BluetoothCanonicalUUID(aName.GetAsUnsignedLong());
    return true;
  }

  const nsString& name = aName.GetAsString();

  // Step 2: If name is a valid UUID, return name.
  if (Serial::IsValidBluetoothUUID(name)) {
    aResult = name;
    return true;
  }

  // Step 3: If name is a valid name and maps to a UUID in GATT assigned
  // services, return canonicalUUID(alias).
  // We do not currently support GATT assigned service name lookup (bug 2013908)

  // Step 4: Otherwise, throw a TypeError.
  return false;
}

void Serial::ForgetAllPorts() {
  if (mHasShutdown) {
    return;
  }

  nsTArray<RefPtr<SerialPort>> portsToForget;
  for (const auto& port : mPorts) {
    if (!port->IsForgotten()) {
      portsToForget.AppendElement(port);
    }
  }

  MOZ_LOG(gWebSerialLog, LogLevel::Info,
          ("Serial[%p]::ForgetAllPorts forgetting %zu ports", this,
           portsToForget.Length()));

  for (const RefPtr<SerialPort>& port : portsToForget) {
    RefPtr<SerialPort> strongPort = port;
    IgnoredErrorResult rv;
    RefPtr<Promise> promise = strongPort->Forget(rv);
  }
}

RefPtr<SerialPort> Serial::GetOrCreatePort(
    const IPCSerialPortInfo& aInfo,
    mozilla::ipc::Endpoint<PSerialPortChild>&& aEndpoint) {
  // Look for an existing port with the same ID. If present, drop the
  // newly-minted endpoint; letting it fall out of scope closes its
  // channel, which will destroy the orphan SerialPortParent on the
  // other side.
  for (const auto& existing : mPorts) {
    if (existing->Id() == aInfo.id() && !existing->IsForgotten()) {
      return existing;
    }
  }

  if (!aEndpoint.IsValid()) {
    return nullptr;
  }

  auto actor = MakeRefPtr<SerialPortChild>();
  if (!aEndpoint.Bind(actor)) {
    return nullptr;
  }
  RefPtr<SerialPort> port = MakeRefPtr<SerialPort>(aInfo, this);
  actor->SetPort(port);
  port->SetChild(actor);

  mPorts.AppendElement(port);
  return port;
}

void Serial::ForgetPort(const nsAString& aPortId) {
  for (const auto& port : mPorts) {
    if (port->Id() == aPortId && !port->IsForgotten()) {
      RefPtr<SerialPort> strongPort(port);
      strongPort->MarkForgotten();
    }
  }
  mPorts.RemoveElementsBy([&aPortId](const RefPtr<SerialPort>& port) {
    return port->Id() == aPortId;
  });

  // If on a worker, also remove from the main thread's Serial.
  if (!NS_IsMainThread()) {
    WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
    if (workerPrivate) {
      RefPtr<StrongWorkerRef> strongRef =
          StrongWorkerRef::Create(workerPrivate, "Serial::ForgetPort");
      if (strongRef) {
        auto tsRef = MakeRefPtr<ThreadSafeWorkerRef>(strongRef);
        nsString portId(aPortId);
        NS_DispatchToMainThread(NS_NewRunnableFunction(
            "Serial::ForgetPort cross-context",
            [tsRef = std::move(tsRef), portId]() {
              RefPtr<Serial> windowSerial =
                  FindWindowSerialForWorkerPrivate(tsRef->Private());
              if (windowSerial) {
                windowSerial->ForgetPort(portId);
              }
            }));
      }
    }
  }
}

already_AddRefed<Promise> Serial::SimulateDeviceConnection(
    const nsAString& aDeviceId, const nsAString& aDevicePath,
    uint16_t aVendorId, uint16_t aProductId, ErrorResult& aRv) {
  return RunTestingIpc(
      this, aRv, nsLiteralCString("SimulateDeviceConnection IPC error"),
      [deviceId = nsString(aDeviceId), devicePath = nsString(aDevicePath),
       aVendorId, aProductId](SerialManagerChild* aChild) {
        return aChild->SendSimulateDeviceConnection(deviceId, devicePath,
                                                    aVendorId, aProductId);
      });
}

already_AddRefed<Promise> Serial::SimulateDeviceDisconnection(
    const nsAString& aDeviceId, ErrorResult& aRv) {
  return RunTestingIpc(
      this, aRv, nsLiteralCString("SimulateDeviceDisconnection IPC error"),
      [deviceId = nsString(aDeviceId)](SerialManagerChild* aChild) {
        return aChild->SendSimulateDeviceDisconnection(deviceId);
      });
}

already_AddRefed<Promise> Serial::RemoveAllMockDevices(ErrorResult& aRv) {
  return RunTestingIpc(this, aRv,
                       nsLiteralCString("RemoveAllMockDevices IPC error"),
                       [](SerialManagerChild* aChild) {
                         return aChild->SendRemoveAllMockDevices();
                       });
}

already_AddRefed<Promise> Serial::ResetToDefaultMockDevices(ErrorResult& aRv) {
  return RunTestingIpc(this, aRv,
                       nsLiteralCString("ResetToDefaultMockDevices IPC error"),
                       [](SerialManagerChild* aChild) {
                         return aChild->SendResetToDefaultMockDevices();
                       });
}

bool Serial::GetAutoselectPorts(ErrorResult& aRv) const {
  if (!StaticPrefs::dom_webserial_testing_enabled()) {
    aRv.ThrowNotSupportedError("Testing is not enabled");
    return false;
  }
  return mAutoselectPorts;
}

void Serial::SetAutoselectPorts(bool aAutoselect, ErrorResult& aRv) {
  if (!StaticPrefs::dom_webserial_testing_enabled()) {
    aRv.ThrowNotSupportedError("Testing is not enabled");
    return;
  }
  mAutoselectPorts = aAutoselect;
}

}  // namespace mozilla::dom

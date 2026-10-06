/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SerialPlatformService.h"

#include "SerialLogging.h"
#include "TestSerialPlatformService.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ShutdownPhase.h"
#include "mozilla/StaticMutex.h"
#include "mozilla/StaticPrefs_dom.h"
#include "nsThreadUtils.h"

namespace mozilla::dom {

#if !defined(XP_WIN) && !defined(XP_MACOSX) && \
    !(defined(XP_LINUX) && !defined(ANDROID))
already_AddRefed<SerialPlatformService>
SerialPlatformService::GetInstanceImpl() {
  return MakeAndAddRef<TestSerialPlatformService>();
}
#endif

SerialPlatformService::SerialPlatformService() {
  auto ioThread = mIOThread.Lock();
  MOZ_ALWAYS_SUCCEEDS(NS_CreateBackgroundTaskQueue("SerialTaskQueue",
                                                   getter_AddRefs(*ioThread)));
}

nsISerialEventTarget* SerialPlatformService::IOThread() {
  auto ioThread = mIOThread.Lock();
  return *ioThread;
}

already_AddRefed<SerialPlatformService> SerialPlatformService::GetInstance() {
  struct Holder {
    Holder() {
      bool useMockService = StaticPrefs::dom_webserial_testing_enabled();

      if (useMockService) {
        mPtr = MakeRefPtr<TestSerialPlatformService>();
      } else {
        mPtr = GetInstanceImpl();
      }

      nsresult rv = mPtr->Init();
      if (NS_WARN_IF(NS_FAILED(rv))) {
        MOZ_LOG(gWebSerialLog, LogLevel::Error,
                ("SerialPlatformService::GetInstance Init failed: 0x%08x",
                 static_cast<uint32_t>(rv)));
        mPtr = nullptr;
      }

      NS_DispatchToMainThread(NS_NewRunnableFunction(
          "SerialPlatformService::GetInstance::Shutdown", [this] {
            RunOnShutdown(
                [this] {
                  if (mPtr) {
                    mPtr->Shutdown();
                    mPtr = nullptr;
                  }
                },
                ShutdownPhase::XPCOMShutdownThreads);
          }));
    }
    RefPtr<SerialPlatformService> mPtr;
  };
  static Holder holder;
  return do_AddRef(holder.mPtr);
}

void SerialPlatformService::Shutdown() {
  MOZ_LOG(gWebSerialLog, LogLevel::Info,
          ("SerialPlatformService[%p]::Shutdown", this));
  auto observerState = mObserverState.Lock();
  observerState->shutdown = true;
  observerState->observers.Clear();
  // Don't clear mIOThread, as things may still be running on it. Setting
  // shutdown to true above will ensure that we don't queue any new work
  // to it.
}

bool SerialPlatformService::IsShutdown() {
  auto observerState = mObserverState.Lock();
  return observerState->shutdown;
}

nsresult SerialPlatformService::EnumeratePorts(SerialPortList& aPorts,
                                               bool* aLikelyAccessDenied) {
  if (aLikelyAccessDenied) {
    *aLikelyAccessDenied = false;
  }
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return EnumeratePortsImpl(aPorts, aLikelyAccessDenied);
}

nsresult SerialPlatformService::Open(const nsString& aPortId,
                                     const IPCSerialOptions& aOptions) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return OpenImpl(aPortId, aOptions);
}

nsresult SerialPlatformService::Close(const nsString& aPortId) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return CloseImpl(aPortId);
}

nsresult SerialPlatformService::Write(const nsString& aPortId,
                                      Span<const uint8_t> aData) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return WriteImpl(aPortId, aData);
}

nsresult SerialPlatformService::Drain(const nsString& aPortId) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return DrainImpl(aPortId);
}

nsresult SerialPlatformService::Flush(const nsString& aPortId, bool aReceive) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return FlushImpl(aPortId, aReceive);
}

nsresult SerialPlatformService::SetSignals(
    const nsString& aPortId, const IPCSerialOutputSignals& aSignals) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return SetSignalsImpl(aPortId, aSignals);
}

nsresult SerialPlatformService::GetSignals(const nsString& aPortId,
                                           IPCSerialInputSignals& aSignals) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return GetSignalsImpl(aPortId, aSignals);
}

nsresult SerialPlatformService::GetReadStream(const nsString& aPortId,
                                              uint32_t aBufferSize,
                                              nsIAsyncInputStream** aStream) {
  {
    auto observerState = mObserverState.Lock();
    if (observerState->shutdown) {
      return NS_ERROR_NOT_AVAILABLE;
    }
  }
  return GetReadStreamImpl(aPortId, aBufferSize, aStream);
}

void SerialPlatformService::AddDeviceChangeObserver(
    SerialDeviceChangeObserver* aObserver) {
  auto observerState = mObserverState.Lock();
  if (observerState->shutdown) {
    return;
  }
  if (!observerState->observers.Contains(aObserver)) {
    observerState->observers.AppendElement(aObserver);
  }
}

void SerialPlatformService::RemoveDeviceChangeObserver(
    SerialDeviceChangeObserver* aObserver) {
  auto observerState = mObserverState.Lock();
  if (observerState->shutdown) {
    return;
  }
  observerState->observers.RemoveElement(aObserver);
}

void SerialPlatformService::NotifyPortConnected(
    const IPCSerialPortInfo& aPortInfo) {
  auto observerState = mObserverState.Lock();
  if (observerState->shutdown) {
    return;
  }
  for (const auto& observer : observerState->observers) {
    observer->OnPortConnected(aPortInfo);
  }
}

void SerialPlatformService::NotifyPortDisconnected(const nsAString& aPortId) {
  auto observerState = mObserverState.Lock();
  if (observerState->shutdown) {
    return;
  }
  for (const auto& observer : observerState->observers) {
    observer->OnPortDisconnected(aPortId);
  }
}

}  // namespace mozilla::dom

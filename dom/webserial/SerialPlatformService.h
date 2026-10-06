/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SerialPlatformService_h
#define mozilla_dom_SerialPlatformService_h

#include "mozilla/DataMutex.h"
#include "mozilla/Span.h"
#include "mozilla/dom/SerialPortInfo.h"
#include "mozilla/dom/SerialTypes.h"
#include "nsIAsyncInputStream.h"
#include "nsISupportsImpl.h"
#include "nsTArray.h"

namespace mozilla::dom {

class TestSerialPlatformService;

class SerialDeviceChangeObserver {
 public:
  NS_INLINE_DECL_PURE_VIRTUAL_REFCOUNTING

  virtual void OnPortConnected(const IPCSerialPortInfo& aPortInfo) = 0;
  virtual void OnPortDisconnected(const nsAString& aPortId) = 0;

 protected:
  virtual ~SerialDeviceChangeObserver() = default;
};

class SerialPlatformService {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(SerialPlatformService)

  static already_AddRefed<SerialPlatformService> GetInstance();

  virtual nsresult Init() { return NS_OK; }

  virtual void Shutdown();
  bool IsShutdown();

  nsISerialEventTarget* IOThread();

  void AssertIsOnIOThread() {
    MOZ_DIAGNOSTIC_ASSERT(IOThread()->IsOnCurrentThread());
  }

  nsresult EnumeratePorts(SerialPortList& aPorts,
                          bool* aLikelyAccessDenied = nullptr);
  nsresult Open(const nsString& aPortId, const IPCSerialOptions& aOptions);
  nsresult Close(const nsString& aPortId);
  nsresult Write(const nsString& aPortId, Span<const uint8_t> aData);
  nsresult Drain(const nsString& aPortId);
  nsresult Flush(const nsString& aPortId, bool aReceive);
  nsresult SetSignals(const nsString& aPortId,
                      const IPCSerialOutputSignals& aSignals);
  nsresult GetSignals(const nsString& aPortId, IPCSerialInputSignals& aSignals);
  nsresult GetReadStream(const nsString& aPortId, uint32_t aBufferSize,
                         nsIAsyncInputStream** aStream);

  void AddDeviceChangeObserver(SerialDeviceChangeObserver* aObserver);
  void RemoveDeviceChangeObserver(SerialDeviceChangeObserver* aObserver);

  virtual TestSerialPlatformService* AsTestService() { return nullptr; }

 protected:
  SerialPlatformService();
  virtual ~SerialPlatformService() = default;

  void NotifyPortConnected(const IPCSerialPortInfo& aPortInfo);
  void NotifyPortDisconnected(const nsAString& aPortId);

 private:
  static already_AddRefed<SerialPlatformService> GetInstanceImpl();

  virtual nsresult EnumeratePortsImpl(SerialPortList& aPorts,
                                      bool* aLikelyAccessDenied) = 0;
  virtual nsresult OpenImpl(const nsString& aPortId,
                            const IPCSerialOptions& aOptions) = 0;
  virtual nsresult CloseImpl(const nsString& aPortId) = 0;
  virtual nsresult WriteImpl(const nsString& aPortId,
                             Span<const uint8_t> aData) = 0;
  virtual nsresult DrainImpl(const nsString& aPortId) = 0;
  virtual nsresult FlushImpl(const nsString& aPortId, bool aReceive) = 0;
  virtual nsresult SetSignalsImpl(const nsString& aPortId,
                                  const IPCSerialOutputSignals& aSignals) = 0;
  virtual nsresult GetSignalsImpl(const nsString& aPortId,
                                  IPCSerialInputSignals& aSignals) = 0;
  virtual nsresult GetReadStreamImpl(const nsString& aPortId,
                                     uint32_t aBufferSize,
                                     nsIAsyncInputStream** aStream) = 0;

  struct ObserverState {
    bool shutdown = false;
    nsTArray<RefPtr<SerialDeviceChangeObserver>> observers;
  };

  DataMutex<ObserverState> mObserverState{
      "SerialPlatformService::mObserverState"};
  DataMutex<nsCOMPtr<nsISerialEventTarget>> mIOThread{
      "SerialPlatformService::mIOThread"};
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_SerialPlatformService_h

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_TestSerialPlatformService_h
#define mozilla_dom_TestSerialPlatformService_h

#include "mozilla/dom/SerialPlatformService.h"
#include "nsIAsyncInputStream.h"
#include "nsIAsyncOutputStream.h"
#include "nsTArray.h"

namespace mozilla::dom {

struct MockSerialPort {
  IPCSerialPortInfo mInfo;
  bool mIsOpen = false;
  IPCSerialOptions mOptions;
  IPCSerialOutputSignals mOutputSignals = {Some(false), Some(false),
                                           Some(false)};
  nsCOMPtr<nsIAsyncInputStream> mPipeReadStream;
  nsCOMPtr<nsIAsyncOutputStream> mPipeWriteStream;
};

class TestSerialPlatformService final : public SerialPlatformService {
 public:
  TestSerialPlatformService();

  void Shutdown() override;

  void AddMockDevice(const nsString& aId, const nsString& aPath,
                     uint16_t aVendorId = 0, uint16_t aProductId = 0);

  void SimulateDeviceConnection(const nsString& aId, const nsString& aPath,
                                uint16_t aVendorId = 0,
                                uint16_t aProductId = 0);

  void SimulateDeviceDisconnection(const nsString& aId);

  void RemoveAllMockDevices();

  void ResetToDefaultMockDevices();

  virtual TestSerialPlatformService* AsTestService() override;

 private:
  ~TestSerialPlatformService() override = default;

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

  MockSerialPort* FindPort(const nsString& aPortId);
  void RemoveMockDevice(const nsString& aId);
  MockSerialPort CreateMockPort(const nsString& aId, const nsString& aPath,
                                uint16_t aVendorId, uint16_t aProductId);
  void AddDefaultMockPorts();

  nsTArray<MockSerialPort> mMockPorts;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_TestSerialPlatformService_h

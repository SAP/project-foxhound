/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SerialPortChild_h
#define mozilla_dom_SerialPortChild_h

#include "mozilla/dom/PSerialPortChild.h"
#include "mozilla/dom/SerialPortInfo.h"
#include "mozilla/ipc/Endpoint.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla::dom {

class SerialPort;

// Child-side actor for a serial port. Bound via Endpoint on the thread that
// owns the SerialPort DOM object (main thread or worker thread).
class SerialPortChild final : public PSerialPortChild, public nsISupports {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS_FINAL
  NS_DECL_CYCLE_COLLECTION_CLASS(SerialPortChild)

  SerialPortChild() = default;

  void SetPort(SerialPort* aPort);

  MOZ_CAN_RUN_SCRIPT_BOUNDARY mozilla::ipc::IPCResult RecvConnected();
  MOZ_CAN_RUN_SCRIPT_BOUNDARY mozilla::ipc::IPCResult RecvDisconnected();

  MOZ_CAN_RUN_SCRIPT_BOUNDARY void ActorDestroy(
      ActorDestroyReason aWhy) override;

  void Shutdown();

 private:
  ~SerialPortChild();

  RefPtr<SerialPort> mPort;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_SerialPortChild_h

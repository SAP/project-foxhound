/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/SerialPortChild.h"

#include "SerialLogging.h"
#include "mozilla/dom/SerialPort.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION(SerialPortChild, mPort)

NS_IMPL_CYCLE_COLLECTING_ADDREF(SerialPortChild)
NS_IMPL_CYCLE_COLLECTING_RELEASE(SerialPortChild)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(SerialPortChild)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

SerialPortChild::~SerialPortChild() {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("SerialPortChild[%p] destroyed", this));
  MOZ_ASSERT(!CanSend());
}

void SerialPortChild::SetPort(SerialPort* aPort) {
  MOZ_ASSERT(aPort);
  mPort = aPort;
}

mozilla::ipc::IPCResult SerialPortChild::RecvConnected() {
  if (!mPort) {
    return IPC_OK();
  }
  RefPtr<SerialPort> port = mPort;
  port->NotifyConnected();
  return IPC_OK();
}

mozilla::ipc::IPCResult SerialPortChild::RecvDisconnected() {
  if (!mPort) {
    return IPC_OK();
  }
  RefPtr<SerialPort> port = mPort;
  port->NotifyDisconnected();
  return IPC_OK();
}

void SerialPortChild::ActorDestroy(ActorDestroyReason aWhy) {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("SerialPortChild[%p]::ActorDestroy (reason: %d)", this, (int)aWhy));
  if (RefPtr<SerialPort> port = mPort) {
    port->OnActorDestroyed();
    mPort = nullptr;
  }
}

void SerialPortChild::Shutdown() {
  MOZ_LOG(gWebSerialLog, LogLevel::Debug,
          ("SerialPortChild[%p]::Shutdown", this));
  mPort = nullptr;

  Close();
}

}  // namespace mozilla::dom

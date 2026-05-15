/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
// Copyright (c) 2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_COMMON_IPC_CHANNEL_MACH_H_
#define CHROME_COMMON_IPC_CHANNEL_MACH_H_

#include "chrome/common/ipc_channel.h"

#include "base/message_loop.h"
#include "base/process.h"

#include "mozilla/EventTargetAndLockCapability.h"
#include "mozilla/Maybe.h"
#include "mozilla/Mutex.h"
#include "mozilla/Queue.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/UniquePtrExtensions.h"
#include "nsISupports.h"

namespace IPC {

// An implementation of ChannelImpl for macOS and iOS that works via
// mach ports.  See the .cc file for an overview of the implementation.
class ChannelMach final : public Channel,
                          public MessageLoopForIO::MachPortWatcher {
 public:
  ChannelMach(mozilla::UniqueMachReceiveRight receive,
              mozilla::UniqueMachSendRight send, Mode mode,
              base::ProcessId other_pid);

  bool Connect(Listener* listener) MOZ_EXCLUDES(SendMutex()) override;
  void Close() MOZ_EXCLUDES(SendMutex()) override;

  // NOTE: `Send` may be called on threads other than the I/O thread.
  bool Send(mozilla::UniquePtr<Message> message)
      MOZ_EXCLUDES(SendMutex()) override;

  void SetOtherPid(base::ProcessId other_pid) override;

  // These are only relevant to ChannelPosix, so we ignore them.
  void SetOtherMachTask(task_t) override {}

  const ChannelKind* GetKind() const override { return &sKind; }

  static const ChannelKind sKind;

 private:
  ~ChannelMach() { Close(); }

  static bool CreateRawPipe(ChannelHandle* server, ChannelHandle* client);
  static bool CreateRawPipe(mozilla::UniqueMachReceiveRight* server,
                            mozilla::UniqueMachSendRight* client);
  static uint32_t NumRelayedAttachments(const Message& message);
  static bool IsValidHandle(const ChannelHandle& handle);

  bool EnqueueHelloMessage() MOZ_REQUIRES(SendMutex(), IOThread());
  bool ContinueConnect(mozilla::UniqueMachSendRight send_port)
      MOZ_REQUIRES(SendMutex(), IOThread());
  void CloseLocked() MOZ_REQUIRES(SendMutex(), IOThread());

  bool ProcessIncomingMessage() MOZ_REQUIRES(IOThread());
  bool ProcessOutgoingMessages() MOZ_REQUIRES(SendMutex());

  // MessageLoopForIO::MachPortWatcher implementation.
  virtual void OnMachMessageReceived(mach_port_t port) override;

  void OutputQueuePush(mozilla::UniquePtr<Message> msg)
      MOZ_REQUIRES(SendMutex());
  void OutputQueuePop() MOZ_REQUIRES(SendMutex());

  // Watch controller for |receive_port_|, calls OnMachMessageReceived() when
  // new messages are available.
  MessageLoopForIO::MachPortWatchController watch_controller_;

  // We always initialize |receive_port_| in the constructor, but |send_port_|
  // may not be initialized until we've received a message from our peer.
  mozilla::UniqueMachReceiveRight receive_port_ MOZ_GUARDED_BY(chan_cap_);
  mozilla::UniqueMachSendRight send_port_ MOZ_GUARDED_BY(chan_cap_);

  Listener* listener_ MOZ_GUARDED_BY(IOThread()) = nullptr;

  // Buffers used for constructing mach IPC message payloads.
  mozilla::UniquePtr<char[]> send_buffer_ MOZ_GUARDED_BY(SendMutex());
  mozilla::UniquePtr<char[]> receive_buffer_ MOZ_GUARDED_BY(IOThread());

  // Messages to be sent are queued here.
  mozilla::Queue<mozilla::UniquePtr<Message>, 64> output_queue_
      MOZ_GUARDED_BY(SendMutex());

  // Indicates whether we've already serialized into the send buffer.
  bool send_buffer_has_message_ MOZ_GUARDED_BY(SendMutex()) = false;

  // Will be set to `true` until `Connect()` has been called and communication
  // is ready.
  bool waiting_connect_ MOZ_GUARDED_BY(chan_cap_) = true;

  // We keep track of the PID of the other side of this channel so that we can
  // record this when generating logs of IPC messages.
  base::ProcessId other_pid_ MOZ_GUARDED_BY(chan_cap_) =
      base::kInvalidProcessId;

  mozilla::Maybe<audit_token_t> peer_audit_token_ MOZ_GUARDED_BY(IOThread());
};

}  // namespace IPC

#endif  // CHROME_COMMON_IPC_CHANNEL_MACH_H_

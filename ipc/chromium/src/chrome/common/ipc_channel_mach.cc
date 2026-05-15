/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ipc_channel_mach.h"

#include <mach/mach.h>
#include <sys/fileport.h>

#ifdef XP_MACOSX
#  include <bsm/libbsm.h>
#endif

#include "base/process_util.h"
#include "chrome/common/ipc_channel_utils.h"
#include "mozilla/ipc/ProtocolUtils.h"

using namespace mozilla::ipc;

namespace IPC {

static constexpr mach_msg_id_t kIPDLMessageId = 'IPDL';

const Channel::ChannelKind ChannelMach::sKind{
    .create_raw_pipe = &ChannelMach::CreateRawPipe,
    .num_relayed_attachments = &ChannelMach::NumRelayedAttachments,
    .is_valid_handle = &ChannelMach::IsValidHandle,
};

ChannelMach::ChannelMach(mozilla::UniqueMachReceiveRight receive,
                         mozilla::UniqueMachSendRight send, Mode mode,
                         base::ProcessId other_pid)
    : receive_port_(std::move(receive)),
      send_port_(std::move(send)),
      send_buffer_(mozilla::MakeUnique<char[]>(Channel::kReadBufferSize)),
      receive_buffer_(mozilla::MakeUnique<char[]>(Channel::kReadBufferSize)),
      other_pid_(other_pid) {
  EnqueueHelloMessage();
}

bool ChannelMach::EnqueueHelloMessage() {
  chan_cap_.NoteExclusiveAccess();

  mozilla::UniquePtr<Message> msg(
      new Message(MSG_ROUTING_NONE, HELLO_MESSAGE_TYPE));
  if (!msg->WriteInt(base::GetCurrentProcId())) {
    CloseLocked();
    return false;
  }

  // If we don't have a receive_port_ when we're queueing the "hello" message,
  // build one, and send the corresponding send right in the hello message.
  mozilla::UniqueMachSendRight peer_send;
  if (!receive_port_ && !CreateRawPipe(&receive_port_, &peer_send)) {
    CloseLocked();
    return false;
  }
  if (!msg->WriteMachSendRight(std::move(peer_send))) {
    CloseLocked();
    return false;
  }

  OutputQueuePush(std::move(msg));
  return true;
}

bool ChannelMach::Connect(Listener* listener) {
  IOThread().AssertOnCurrentThread();
  mozilla::MutexAutoLock lock(SendMutex());
  chan_cap_.NoteExclusiveAccess();

  if (!receive_port_) {
    return false;
  }

  listener_ = listener;

  // Mark this port as receiving IPC from our peer process. This allows the
  // kernel to boost the QoS of the receiver based on the QoS of the sender.
  // (ignore failures to set this, as it's non-fatal).
  kern_return_t kr =
      mach_port_set_attributes(mach_task_self(), receive_port_.get(),
                               MACH_PORT_IMPORTANCE_RECEIVER, nullptr, 0);
  if (kr != KERN_SUCCESS) {
    CHROMIUM_LOG(ERROR) << "mach_port_set_attributes failed: "
                        << mach_error_string(kr);
  }

  // Register to receive a notification when all send rights for this port have
  // been destroyed.
  // NOTE: MACH_NOTIFY_NO_SENDERS does not consider send-once rights to be send
  // rights for the purposes of there being "no senders", so the send-once right
  // used for the notification will not prevent it from being sent.
  mozilla::UniqueMachSendRight previous;
  kr = mach_port_request_notification(
      mach_task_self(), receive_port_.get(), MACH_NOTIFY_NO_SENDERS, 0,
      receive_port_.get(), MACH_MSG_TYPE_MAKE_SEND_ONCE,
      mozilla::getter_Transfers(previous));
  if (kr != KERN_SUCCESS) {
    CHROMIUM_LOG(ERROR) << "mach_port_request_notification: "
                        << mach_error_string(kr);
    return false;
  }

  // Begin listening for messages on our receive port.
  MessageLoopForIO::current()->WatchMachReceivePort(receive_port_.get(),
                                                    &watch_controller_, this);

  return ContinueConnect(nullptr);
}

bool ChannelMach::ContinueConnect(mozilla::UniqueMachSendRight send_port) {
  chan_cap_.NoteExclusiveAccess();
  MOZ_ASSERT(receive_port_);

  // If we're still waiting for a mach send right from our peer, don't clear
  // waiting_connect_ yet.
  if (!send_port_) {
    if (!send_port) {
      MOZ_ASSERT(waiting_connect_);
      return true;
    }
    send_port_ = std::move(send_port);
  }

  waiting_connect_ = false;

  return ProcessOutgoingMessages();
}

void ChannelMach::SetOtherPid(base::ProcessId other_pid) {
  IOThread().AssertOnCurrentThread();
  mozilla::MutexAutoLock lock(SendMutex());
  chan_cap_.NoteExclusiveAccess();
  MOZ_RELEASE_ASSERT(
      other_pid_ == base::kInvalidProcessId || other_pid_ == other_pid,
      "Multiple sources of SetOtherPid disagree!");
  other_pid_ = other_pid;
}

namespace {

// Small helper type for safely working with Mach message buffers, which consist
// of a sequence of C structs.
struct MsgBufferHelper {
 public:
  MsgBufferHelper(char* buf, size_t size)
      : start_(buf), current_(start_), end_(start_ + size) {}

  template <typename T>
  T* Next() {
    MOZ_RELEASE_ASSERT(Remaining().size() >= sizeof(T));
    T* obj = reinterpret_cast<T*>(current_);
    current_ += sizeof(T);
    return obj;
  }

  template <typename T, typename U>
  T* CastLast(U* previous) {
    static_assert(sizeof(T) >= sizeof(U), "casting to a smaller type?");
    MOZ_RELEASE_ASSERT(reinterpret_cast<char*>(previous + 1) == current_);
    current_ = reinterpret_cast<char*>(previous);
    return Next<T>();
  }

  template <typename T>
  T* SetTrailerOffset(size_t offset) {
    MOZ_RELEASE_ASSERT(offset < size_t(end_ - start_) - sizeof(T));
    // Limit any future reads to the region before the trailer.
    end_ = start_ + offset;
    return reinterpret_cast<T*>(end_);
  }

  template <typename T>
  void WriteDescriptor(mach_msg_base_t* base, T descriptor) {
    MOZ_ASSERT(base->header.msgh_size == Offset(), "unexpected size?");
    *Next<T>() = descriptor;
    base->header.msgh_size = Offset();
    base->header.msgh_bits |= MACH_MSGH_BITS_COMPLEX;
    base->body.msgh_descriptor_count++;
  }

  char* WriteBytes(mach_msg_base_t* base, size_t size) {
    MOZ_ASSERT(base->header.msgh_size == Offset(), "unexpected size?");
    MOZ_RELEASE_ASSERT(Remaining().size() >= round_msg(size));
    char* bytes = current_;
    current_ += round_msg(size);
    base->header.msgh_size = Offset();
    return bytes;
  }

  mozilla::Span<char> Remaining() { return {current_, end_}; }

 private:
  size_t Offset() { return current_ - start_; }

  char* start_;
  char* current_;
  char* end_;
};

}  // namespace

static bool SenderIs(mach_msg_audit_trailer_t* trailer,
                     const audit_token_t& expected) {
  return memcmp(&trailer->msgh_audit, &expected, sizeof(audit_token_t)) == 0;
}

bool ChannelMach::ProcessIncomingMessage() {
  chan_cap_.NoteOnTarget();

  MsgBufferHelper buf_helper(receive_buffer_.get(), Channel::kReadBufferSize);

  auto* header = buf_helper.Next<mach_msg_header_t>();
  *header = mach_msg_header_t{.msgh_size = Channel::kReadBufferSize,
                              .msgh_local_port = receive_port_.get()};
  auto destroy_msg =
      mozilla::MakeScopeExit([header] { mach_msg_destroy(header); });

  kern_return_t kr = mach_msg(
      header,
      MACH_RCV_MSG | MACH_RCV_TIMEOUT |
          MACH_RCV_TRAILER_TYPE(MACH_MSG_TRAILER_FORMAT_0) |
          MACH_RCV_TRAILER_ELEMENTS(MACH_RCV_TRAILER_AUDIT) | MACH_RCV_VOUCHER,
      0, header->msgh_size, receive_port_.get(), /* timeout */ 0,
      MACH_PORT_NULL);
  if (kr != KERN_SUCCESS) {
    if (kr == MACH_RCV_TIMED_OUT) {
      return true;
    }
    CHROMIUM_LOG(ERROR) << "mach_msg receive failed: " << mach_error_string(kr);
    return false;
  }

  // Get a pointer to the message audit trailer. This contains information
  // about which entitiy sent the particular notification.
  auto* trailer =
      buf_helper.SetTrailerOffset<mach_msg_audit_trailer_t>(header->msgh_size);
  if (!trailer) {
    CHROMIUM_LOG(ERROR) << "buffer doesn't have space for audit trailer";
    return false;
  }

  // Respond to notifications from the kernel.
  if (SenderIs(trailer, KERNEL_AUDIT_TOKEN_VALUE)) {
    // If we've received MACH_NOTIFY_NO_SENDERS, the other side has gone away,
    // so we return `false` to close the channel. Otherwise the notification is
    // ignored, and we return `true`.
    return header->msgh_id != MACH_NOTIFY_NO_SENDERS;
  }

  if (header->msgh_id != kIPDLMessageId) {
    CHROMIUM_LOG(ERROR) << "unknown mach message type from peer: "
                        << header->msgh_id;
    return false;
  }

  // If we have an audit token for our peer, ensure it matches the one we
  // recorded from our HELLO message.
  if (peer_audit_token_ && !SenderIs(trailer, *peer_audit_token_)) {
    CHROMIUM_LOG(ERROR) << "message not sent by expected peer";
    return false;
  }

  if (buf_helper.Remaining().Length() < sizeof(mach_msg_body_t)) {
    CHROMIUM_LOG(ERROR) << "message is too small";
    return false;
  }

  // Read out descriptors from the sent message.
  auto* msg_body = buf_helper.Next<mach_msg_body_t>();
  if ((msg_body->msgh_descriptor_count > 0) !=
      MACH_MSGH_BITS_IS_COMPLEX(header->msgh_bits)) {
    CHROMIUM_LOG(ERROR)
        << "expected msgh_descriptor_count to match MACH_MSGH_BITS_COMPLEX";
    return false;
  }

  mach_msg_ool_descriptor_t* ool_descr = nullptr;
  nsTArray<mozilla::UniqueMachSendRight> send_rights;
  nsTArray<mozilla::UniqueMachReceiveRight> receive_rights;
  for (size_t i = 0; i < msg_body->msgh_descriptor_count; ++i) {
    auto* descr = buf_helper.Next<mach_msg_type_descriptor_t>();
    switch (descr->type) {
      case MACH_MSG_OOL_DESCRIPTOR: {
        if (ool_descr) {
          CHROMIUM_LOG(ERROR) << "unexpected duplicate MACH_MSG_OOL_DESCRIPTOR";
          return false;
        }
        ool_descr = buf_helper.CastLast<mach_msg_ool_descriptor_t>(descr);
        break;
      }
      case MACH_MSG_PORT_DESCRIPTOR: {
        auto* port_descr =
            buf_helper.CastLast<mach_msg_port_descriptor_t>(descr);
        switch (port_descr->disposition) {
          case MACH_MSG_TYPE_MOVE_SEND:
            send_rights.EmplaceBack(
                std::exchange(port_descr->name, MACH_PORT_NULL));
            break;
          case MACH_MSG_TYPE_MOVE_RECEIVE:
            receive_rights.EmplaceBack(
                std::exchange(port_descr->name, MACH_PORT_NULL));
            break;
          default:
            CHROMIUM_LOG(ERROR) << "unexpected port descriptor disposition";
            return false;
        }
        break;
      }
      case MACH_MSG_OOL_PORTS_DESCRIPTOR: {
        auto* ool_ports_descr =
            buf_helper.CastLast<mach_msg_ool_ports_descriptor_t>(descr);
        mozilla::Span<mach_port_t> names(
            reinterpret_cast<mach_port_t*>(ool_ports_descr->address),
            ool_ports_descr->count);
        switch (ool_ports_descr->disposition) {
          case MACH_MSG_TYPE_MOVE_SEND:
            send_rights.SetCapacity(names.Length());
            for (mach_port_t& name : names) {
              send_rights.EmplaceBack(std::exchange(name, MACH_PORT_NULL));
            }
            break;
          case MACH_MSG_TYPE_MOVE_RECEIVE:
            receive_rights.SetCapacity(names.Length());
            for (mach_port_t& name : names) {
              receive_rights.EmplaceBack(std::exchange(name, MACH_PORT_NULL));
            }
            break;
          default:
            CHROMIUM_LOG(ERROR) << "unexpected port descriptor disposition";
            return false;
        }
        break;
      }
      default:
        CHROMIUM_LOG(ERROR) << "unexpected descriptor type";
        return false;
    }
  }

  // If we have an OOL descriptor, the payload is in that buffer, otherwise, it
  // is the remainder of the message buffer.
  mozilla::Span<const char> payload =
      ool_descr
          ? mozilla::Span{reinterpret_cast<const char*>(ool_descr->address),
                          static_cast<size_t>(ool_descr->size)}
          : buf_helper.Remaining();

  // Check that the payload contains a complete message of the expected size
  // before constructing it.
  uint32_t hdr_size =
      Message::MessageSize(payload.data(), payload.data() + payload.size());
  if (!hdr_size || round_msg(hdr_size) != payload.size()) {
    CHROMIUM_LOG(ERROR) << "Message size does not match transferred payload";
    return false;
  }

  mozilla::UniquePtr<Message> message =
      mozilla::MakeUnique<Message>(payload.data(), payload.size());

  // Transfer ownership of the voucher port into the IPC::Message.
  if (MACH_MSGH_BITS_VOUCHER(header->msgh_bits) == MACH_MSG_TYPE_MOVE_SEND) {
    message->mach_voucher_.reset(header->msgh_voucher_port);
    header->msgh_voucher_port = MACH_PORT_NULL;
    header->msgh_bits &= ~MACH_MSGH_BITS_VOUCHER_MASK;
  }

  // Unwrap any fileports attached to this message into FDs. FDs are always
  // added after other mach port rights, so we can assume the last
  // |num_handles| rights are fileports.
  if (message->header()->num_handles > send_rights.Length()) {
    CHROMIUM_LOG(ERROR) << "Missing send rights in message";
    return false;
  }
  for (auto& wrapped_fd :
       mozilla::Span{send_rights}.Last(message->header()->num_handles)) {
    message->attached_handles_.AppendElement(
        mozilla::UniqueFileHandle(fileport_makefd(wrapped_fd.get())));
  }
  send_rights.TruncateLength(send_rights.Length() -
                             message->header()->num_handles);
  message->attached_send_rights_ = std::move(send_rights);
  message->attached_receive_rights_ = std::move(receive_rights);

  // Note: We set other_pid_ below when we receive a Hello message (which has no
  // routing ID), but we only emit a profiler marker for messages with a routing
  // ID, so there's no conflict here.
  AddIPCProfilerMarker(*message, other_pid_, MessageDirection::eReceiving,
                       MessagePhase::TransferEnd);

#ifdef IPC_MESSAGE_DEBUG_EXTRA
  DLOG(INFO) << "received message on channel @" << this << " with type "
             << m.type();
#endif

  if (message->routing_id() == MSG_ROUTING_NONE &&
      message->type() == HELLO_MESSAGE_TYPE) {
    // The hello message contains the process ID, as well as an optional
    // send_port if the channel was initialized with a receive port.
    if (peer_audit_token_) {
      CHROMIUM_LOG(ERROR) << "Unexpected duplicate HELLO message";
      return false;
    }
    peer_audit_token_.emplace(trailer->msgh_audit);

    // Read the hello message.
    IPC::MessageReader reader(*message);
    int32_t other_pid = -1;
    mozilla::UniqueMachSendRight send_port;
    if (!reader.ReadInt(&other_pid) ||
        !reader.ConsumeMachSendRight(&send_port)) {
      return false;
    }
    if (send_port_ && send_port) {
      CHROMIUM_LOG(ERROR) << "Unexpected send_port in HELLO message";
      return false;
    }
    if (!send_port_ && !send_port) {
      CHROMIUM_LOG(ERROR) << "Expected send_port in HELLO message";
      return false;
    }
#ifdef XP_MACOSX
    if (XRE_IsParentProcess() &&
        audit_token_to_pid(trailer->msgh_audit) != other_pid) {
      CHROMIUM_LOG(ERROR) << "audit token does not correspond to given pid";
      return false;
    }
#endif

    SetOtherPid(other_pid);
    if (!send_port_) {
      mozilla::MutexAutoLock lock(SendMutex());
      if (!ContinueConnect(std::move(send_port))) {
        CHROMIUM_LOG(ERROR) << "ContinueConnect failed";
        return false;
      }
    }

    listener_->OnChannelConnected(other_pid);
  } else {
    if (!peer_audit_token_) {
      CHROMIUM_LOG(ERROR) << "Unexpected message before HELLO message";
      return false;
    }

    mozilla::LogIPCMessage::Run run(message.get());
    listener_->OnMessageReceived(std::move(message));
  }
  return true;
}

template <class T>
static T* VmAllocateBuffer(size_t count) {
  size_t bytes = count * sizeof(T);
  vm_address_t address;
  kern_return_t kr =
      vm_allocate(mach_task_self(), &address, bytes,
                  VM_MAKE_TAG(VM_MEMORY_MACH_MSG) | VM_FLAGS_ANYWHERE);
  if (kr != KERN_SUCCESS) {
    NS_ABORT_OOM(bytes);
  }
  return reinterpret_cast<T*>(address);
}

template <class UniquePort>
static void WritePorts(MsgBufferHelper& buf_helper, mach_msg_base_t* base,
                       mach_msg_type_name_t disposition,
                       nsTArray<UniquePort>& attachments, bool send_inline) {
  if (send_inline) {
    for (auto& port : attachments) {
      buf_helper.WriteDescriptor<mach_msg_port_descriptor_t>(
          base, {
                    .name = port.release(),
                    .disposition = disposition,
                    .type = MACH_MSG_PORT_DESCRIPTOR,
                });
    }
  } else if (!attachments.IsEmpty()) {
    mach_port_t* ports = VmAllocateBuffer<mach_port_t>(attachments.Length());
    for (size_t i = 0; i < attachments.Length(); ++i) {
      ports[i] = attachments[i].release();
    }
    buf_helper.WriteDescriptor<mach_msg_ool_ports_descriptor_t>(
        base, {
                  .address = ports,
                  .deallocate = true,
                  .copy = MACH_MSG_VIRTUAL_COPY,
                  .disposition = disposition,
                  .type = MACH_MSG_OOL_PORTS_DESCRIPTOR,
                  .count = (mach_msg_size_t)attachments.Length(),
              });
  }
}

bool ChannelMach::ProcessOutgoingMessages() {
  chan_cap_.NoteLockHeld();

  DCHECK(!waiting_connect_);  // Why are we trying to send messages if there's
                              // no connection?

  while (!output_queue_.IsEmpty()) {
    if (!send_port_) {
      return false;
    }

    Message* msg = output_queue_.FirstElement().get();

    if (!send_buffer_has_message_) {
      AddIPCProfilerMarker(*msg, other_pid_, MessageDirection::eSending,
                           MessagePhase::TransferStart);

      // Reserve |sizeof(mach_msg_audit_trailer_t)| bytes at the end of the
      // buffer, as the receiving side will need enough space for the trailer.
      mach_msg_size_t max_size =
          Channel::kReadBufferSize - sizeof(mach_msg_audit_trailer_t);
      MsgBufferHelper buf_helper(send_buffer_.get(), max_size);

      // Clear out the message header to an initial state so we can build it.
      auto* base = buf_helper.Next<mach_msg_base_t>();
      *base = {{
          .msgh_bits = MACH_MSGH_BITS(/* remote */ MACH_MSG_TYPE_COPY_SEND,
                                      /* local */ 0),
          .msgh_size = sizeof(mach_msg_base_t),
          .msgh_remote_port = send_port_.get(),
          .msgh_id = kIPDLMessageId,
      }};
      send_buffer_has_message_ = true;

      // Convert FDs to send rights using `fileport_makeport`.
      // The number of handles is recorded in the header so that they can be
      // split out on the other side.
      msg->header()->num_handles = msg->attached_handles_.Length();
      msg->attached_send_rights_.SetCapacity(
          msg->attached_send_rights_.Length() +
          msg->attached_handles_.Length());
      for (auto& fd : msg->attached_handles_) {
        mach_port_t fileport;
        kern_return_t kr = fileport_makeport(fd.get(), &fileport);
        if (kr != KERN_SUCCESS) {
          CHROMIUM_LOG(ERROR)
              << "fileport_makeport failed: " << mach_error_string(kr);
          return false;
        }
        msg->attached_send_rights_.AppendElement(
            mozilla::UniqueMachSendRight(fileport));
      }

      // Check if there's enough space in the buffer to fit a port descriptor
      // for every attached handle + a mach_msg_ool_descriptor_t for the
      // payload. If there isn't, send them out-of-line.
      size_t inline_descr_size = sizeof(mach_msg_port_descriptor_t) *
                                     (msg->attached_send_rights_.Length() +
                                      msg->attached_receive_rights_.Length()) +
                                 sizeof(mach_msg_ool_descriptor_t);
      bool send_inline = buf_helper.Remaining().size() > inline_descr_size;
      WritePorts(buf_helper, base, MACH_MSG_TYPE_MOVE_SEND,
                 msg->attached_send_rights_, send_inline);
      WritePorts(buf_helper, base, MACH_MSG_TYPE_MOVE_RECEIVE,
                 msg->attached_receive_rights_, send_inline);

      // Determine where to write the message payload. We'll write it inline if
      // there's space, otherwise it'll be sent out-of-line.
      char* payload = nullptr;
      if (buf_helper.Remaining().size() > msg->size()) {
        payload = buf_helper.WriteBytes(base, msg->size());
      } else {
        // NOTE: If `msg` holds the message in a single buffer, we could pass it
        // down without copying by passing a pointer in an ool descriptor with
        // `deallocate = false`.
        payload = VmAllocateBuffer<char>(round_msg(msg->size()));
        buf_helper.WriteDescriptor<mach_msg_ool_descriptor_t>(
            base, {
                      .address = payload,
                      .deallocate = true,
                      .copy = MACH_MSG_VIRTUAL_COPY,
                      .type = MACH_MSG_OOL_DESCRIPTOR,
                      .size = (mach_msg_size_t)round_msg(msg->size()),
                  });
      }

      // Write the full message payload into the payload buffer.
      auto iter = msg->Buffers().Iter();
      MOZ_ALWAYS_TRUE(msg->Buffers().ReadBytes(iter, payload, msg->size()));
    }

    MOZ_ASSERT(send_buffer_has_message_, "Failed to build a message?");
    auto* header = reinterpret_cast<mach_msg_header_t*>(send_buffer_.get());
    kern_return_t kr = mach_msg(header, MACH_SEND_MSG | MACH_SEND_TIMEOUT,
                                header->msgh_size, 0, MACH_PORT_NULL,
                                /* timeout */ 0, MACH_PORT_NULL);
    if (kr == KERN_SUCCESS) {
      // Don't clean up the message anymore.
      send_buffer_has_message_ = false;

      AddIPCProfilerMarker(*msg, other_pid_, MessageDirection::eSending,
                           MessagePhase::TransferEnd);

#ifdef IPC_MESSAGE_DEBUG_EXTRA
      DLOG(INFO) << "sent message @" << msg << " on channel @" << this
                 << " with type " << msg->type();
#endif

      OutputQueuePop();
    } else {
      if (kr == MACH_SEND_TIMED_OUT) {
        // The message timed out, set up a runnable to re-try the send on the
        // IPC I/O thread.
        //
        // NOTE: It'd be nice to use MACH_NOTIFY_SEND_POSSIBLE here, but using
        // it naively can lead to port leaks when the port becomes a DEAD_NAME
        // due to issues in the port subsystem.
        XRE_GetAsyncIOEventTarget()->Dispatch(NS_NewRunnableFunction(
            "ChannelMach::Retry", [self = RefPtr{this}]() {
              mozilla::MutexAutoLock lock(self->SendMutex());
              self->chan_cap_.NoteLockHeld();
              if (self->receive_port_) {
                self->ProcessOutgoingMessages();
              }
            }));
        return true;
      }

      if (kr != MACH_SEND_INVALID_DEST) {
        CHROMIUM_LOG(ERROR)
            << "mach_msg send failed: " << mach_error_string(kr);
      }
      return false;
    }
  }
  return true;
}

bool ChannelMach::Send(mozilla::UniquePtr<Message> message) {
  // NOTE: This method may be called on threads other than `IOThread()`.
  mozilla::MutexAutoLock lock(SendMutex());
  chan_cap_.NoteLockHeld();

#ifdef IPC_MESSAGE_DEBUG_EXTRA
  DLOG(INFO) << "sending message @" << message.get() << " on channel @" << this
             << " with type " << message->type() << " ("
             << output_queue_.Count() << " in queue)";
#endif

  // If the channel has been closed, ProcessOutgoingMessages() is never going
  // to pop anything off output_queue; output_queue will only get emptied when
  // the channel is destructed.  We might as well delete message now, instead
  // of waiting for the channel to be destructed.
  if (!receive_port_) {
    if (mozilla::ipc::LoggingEnabled()) {
      printf_stderr("Can't send message %s, because this channel is closed.\n",
                    message->name());
    }
    return false;
  }

  OutputQueuePush(std::move(message));
  if (!waiting_connect_ && !send_buffer_has_message_) {
    return ProcessOutgoingMessages();
  }

  return true;
}

void ChannelMach::OnMachMessageReceived(mach_port_t port) {
  IOThread().AssertOnCurrentThread();
  chan_cap_.NoteOnTarget();

  if (receive_port_) {
    if (!ProcessIncomingMessage()) {
      Close();
      listener_->OnChannelError();
      // The OnChannelError() call may delete this, so we need to exit now.
      return;
    }
  }
}

void ChannelMach::OutputQueuePush(mozilla::UniquePtr<Message> msg) {
  chan_cap_.NoteLockHeld();

  mozilla::LogIPCMessage::LogDispatchWithPid(msg.get(), other_pid_);

  MOZ_DIAGNOSTIC_ASSERT(receive_port_);
  msg->AssertAsLargeAsHeader();
  output_queue_.Push(std::move(msg));
}

void ChannelMach::OutputQueuePop() {
  if (send_buffer_has_message_) {
    mach_msg_destroy(reinterpret_cast<mach_msg_header_t*>(send_buffer_.get()));
    send_buffer_has_message_ = false;
  }

  mozilla::UniquePtr<Message> message = output_queue_.Pop();
}

void ChannelMach::Close() {
  IOThread().AssertOnCurrentThread();
  mozilla::MutexAutoLock lock(SendMutex());
  CloseLocked();
}

void ChannelMach::CloseLocked() {
  chan_cap_.NoteExclusiveAccess();

  // Close can be called multiple times, so we need to make sure we're
  // idempotent.

  watch_controller_.StopWatchingMachPort();
  receive_port_ = nullptr;
  send_port_ = nullptr;

  while (!output_queue_.IsEmpty()) {
    OutputQueuePop();
  }
}

// static
bool ChannelMach::CreateRawPipe(ChannelHandle* server, ChannelHandle* client) {
  return CreateRawPipe(&server->emplace<mozilla::UniqueMachReceiveRight>(),
                       &client->emplace<mozilla::UniqueMachSendRight>());
}

// static
bool ChannelMach::CreateRawPipe(mozilla::UniqueMachReceiveRight* server,
                                mozilla::UniqueMachSendRight* client) {
  mach_port_options_t options{};
  options.flags = MPO_INSERT_SEND_RIGHT | MPO_QLIMIT;
  options.mpl.mpl_qlimit = MACH_PORT_QLIMIT_LARGE;

  mach_port_t port = MACH_PORT_NULL;
  kern_return_t kr = mach_port_construct(mach_task_self(), &options, 0, &port);
  if (kr != KERN_SUCCESS) {
    CHROMIUM_LOG(ERROR) << "mach_port_construct failed: "
                        << mach_error_string(kr);
    return false;
  }

  // Within a single task, all references to the same port have the same name.
  // Thanks to `MPO_INSERT_SEND_RIGHT`, both a send and receive right were
  // inserted for this name.
  server->reset(port);
  client->reset(port);
  return true;
}

// static
uint32_t ChannelMach::NumRelayedAttachments(const Message& message) {
  return 0;
}

// static
bool ChannelMach::IsValidHandle(const ChannelHandle& handle) {
  if (const auto* server =
          std::get_if<mozilla::UniqueMachReceiveRight>(&handle)) {
    return !!*server;
  }
  if (const auto* client =
          std::get_if<mozilla::UniqueMachReceiveRight>(&handle)) {
    return !!*client;
  }
  return false;
}

}  // namespace IPC

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ipc/NodeChannel.h"
#include "chrome/common/ipc_message.h"
#include "chrome/common/ipc_message_utils.h"
#include "mojo/core/ports/name.h"
#include "mozilla/ipc/BrowserProcessSubThread.h"
#include "mozilla/ipc/ProtocolMessageUtils.h"
#include "mozilla/ipc/ProtocolUtils.h"
#include "nsThreadUtils.h"
#include "nsXULAppAPI.h"

#ifdef FUZZING_SNAPSHOT
#  include "mozilla/fuzzing/IPCFuzzController.h"
#endif

template <>
struct IPC::ParamTraits<mozilla::ipc::NodeChannel::Introduction> {
  using paramType = mozilla::ipc::NodeChannel::Introduction;
  static void Write(MessageWriter* aWriter, paramType&& aParam) {
    WriteParam(aWriter, aParam.mName);
    WriteParam(aWriter, std::move(aParam.mHandle));
    WriteParam(aWriter, aParam.mMode);
    WriteParam(aWriter, aParam.mMyPid);
    WriteParam(aWriter, aParam.mOtherPid);
  }
  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mName) &&
           ReadParam(aReader, &aResult->mHandle) &&
           ReadParam(aReader, &aResult->mMode) &&
           ReadParam(aReader, &aResult->mMyPid) &&
           ReadParam(aReader, &aResult->mOtherPid);
  }
};

namespace mozilla::ipc {

NodeChannel::NodeChannel(const NodeName& aName,
                         UniquePtr<IPC::Channel> aChannel, Listener* aListener,
                         base::ProcessId aPid)
    : mListener(aListener),
      mName(aName),
      mOtherPid(aPid),
      mChannel(std::move(aChannel)) {}

NodeChannel::~NodeChannel() { Close(); }

// Called when the NodeChannel's refcount drops to `0`.
void NodeChannel::Destroy() {
  // Dispatch the `delete` operation to the IO thread. We need to do this even
  // if we're already on the IO thread, as we could be in an `IPC::Channel`
  // callback which unfortunately will not hold a strong reference to keep
  // `this` alive.
  MessageLoop* ioThread = XRE_GetIOMessageLoop();
  if (ioThread->IsAcceptingTasks()) {
    ioThread->PostTask(NewNonOwningRunnableMethod("NodeChannel::Destroy", this,
                                                  &NodeChannel::FinalDestroy));
    return;
  }

  // If the IOThread has already been destroyed, we must be shutting it down and
  // need to synchronously invoke `FinalDestroy` to ensure we're cleaned up
  // before the thread dies. This is safe as we can't be in a non-owning
  // IPC::Channel callback at this point.
  if (MessageLoop::current() == ioThread) {
    FinalDestroy();
    return;
  }

  MOZ_ASSERT_UNREACHABLE("Leaking NodeChannel after IOThread destroyed!");
}

void NodeChannel::FinalDestroy() {
  AssertIOThread();
  delete this;
}

void NodeChannel::Start(bool aCallConnect) {
  AssertIOThread();

  mExistingListener = mChannel->set_listener(this);

  std::queue<UniquePtr<IPC::Message>> pending;
  if (mExistingListener) {
    mExistingListener->GetQueuedMessages(pending);
  }

  if (aCallConnect) {
    MOZ_ASSERT(pending.empty(), "unopened channel with pending messages?");
    if (!mChannel->Connect()) {
      OnChannelError();
    }
  } else {
    // Check if our channel has already been connected, and knows the other PID.
    base::ProcessId otherPid = mChannel->OtherPid();
    if (otherPid != base::kInvalidProcessId) {
      SetOtherPid(otherPid);
    }

    // Handle any events the previous listener had queued up. Make sure to stop
    // if an error causes our channel to become closed.
    while (!pending.empty() && mState != State::Closed) {
      OnMessageReceived(std::move(pending.front()));
      pending.pop();
    }
  }
}

void NodeChannel::Close() {
  AssertIOThread();

  if (mState.exchange(State::Closed) != State::Closed) {
    mChannel->Close();
    mChannel->set_listener(mExistingListener);
  }
}

void NodeChannel::SetOtherPid(base::ProcessId aNewPid) {
  AssertIOThread();
  MOZ_ASSERT(aNewPid != base::kInvalidProcessId);

  base::ProcessId previousPid = base::kInvalidProcessId;
  if (!mOtherPid.compare_exchange_strong(previousPid, aNewPid)) {
    // The PID was already set before this call, double-check that it's correct.
    MOZ_RELEASE_ASSERT(previousPid == aNewPid,
                       "Different sources disagree on the correct pid?");
  }
}

#ifdef XP_MACOSX
void NodeChannel::SetMachTaskPort(task_t aTask) {
  AssertIOThread();

  if (mState != State::Closed) {
    mChannel->SetOtherMachTask(aTask);
  }
}
#endif

void NodeChannel::SendEventMessage(UniquePtr<IPC::Message> aMessage) {
  // Make sure we're not sending a message with one of our special internal
  // types ,as those should only be sent using the corresponding methods on
  // NodeChannel.
  MOZ_DIAGNOSTIC_ASSERT(aMessage->type() != BROADCAST_MESSAGE_TYPE &&
                        aMessage->type() != INTRODUCE_MESSAGE_TYPE &&
                        aMessage->type() != REQUEST_INTRODUCTION_MESSAGE_TYPE &&
                        aMessage->type() != ACCEPT_INVITE_MESSAGE_TYPE);
  SendMessage(std::move(aMessage));
}

void NodeChannel::RequestIntroduction(const NodeName& aPeerName) {
  MOZ_ASSERT(aPeerName != mojo::core::ports::kInvalidNodeName);
  auto message = MakeUnique<IPC::Message>(MSG_ROUTING_CONTROL,
                                          REQUEST_INTRODUCTION_MESSAGE_TYPE);
  IPC::MessageWriter writer(*message);
  WriteParam(&writer, aPeerName);
  SendMessage(std::move(message));
}

void NodeChannel::Introduce(Introduction aIntroduction) {
  auto message =
      MakeUnique<IPC::Message>(MSG_ROUTING_CONTROL, INTRODUCE_MESSAGE_TYPE);
  IPC::MessageWriter writer(*message);
  WriteParam(&writer, std::move(aIntroduction));
  SendMessage(std::move(message));
}

void NodeChannel::Broadcast(UniquePtr<IPC::Message> aMessage) {
  MOZ_DIAGNOSTIC_ASSERT(aMessage->type() == BROADCAST_MESSAGE_TYPE,
                        "Can only broadcast messages with the correct type");
  SendMessage(std::move(aMessage));
}

void NodeChannel::AcceptInvite(const NodeName& aRealName,
                               const PortName& aInitialPort) {
  MOZ_ASSERT(aRealName != mojo::core::ports::kInvalidNodeName);
  MOZ_ASSERT(aInitialPort != mojo::core::ports::kInvalidPortName);
  auto message =
      MakeUnique<IPC::Message>(MSG_ROUTING_CONTROL, ACCEPT_INVITE_MESSAGE_TYPE);
  IPC::MessageWriter writer(*message);
  WriteParam(&writer, aRealName);
  WriteParam(&writer, aInitialPort);
  SendMessage(std::move(message));
}

void NodeChannel::SendMessage(UniquePtr<IPC::Message> aMessage) {
  if (aMessage->size() > IPC::Channel::kMaximumMessageSize) {
    CrashReporter::AnnotateCrashReport(
        CrashReporter::Annotation::IPCMessageName,
        nsDependentCString(aMessage->name()));
    CrashReporter::AnnotateCrashReport(
        CrashReporter::Annotation::IPCMessageSize,
        static_cast<unsigned int>(aMessage->size()));
    MOZ_CRASH("IPC message size is too large");
  }
  aMessage->AssertAsLargeAsHeader();

#ifdef FUZZING_SNAPSHOT
  if (mBlockSendRecv) {
    return;
  }
#endif

  if (mState != State::Active) {
    NS_WARNING("Dropping message as channel has been closed");
    return;
  }

  // NOTE: As this is not guaranteed to be running on the I/O thread, the
  // channel may have become closed since we checked above. IPC::Channel will
  // handle that and return `false` here, so we can re-check `mState`.
  if (!mChannel->Send(std::move(aMessage))) {
    NS_WARNING("Call to Send() failed");

    // If we're still active, update `mState` to `State::Closing`, and dispatch
    // a runnable to actually close our channel.
    State expected = State::Active;
    if (mState.compare_exchange_strong(expected, State::Closing)) {
      XRE_GetIOMessageLoop()->PostTask(
          NewRunnableMethod("NodeChannel::CloseForSendError", this,
                            &NodeChannel::OnChannelError));
    }
  }
}

void NodeChannel::OnMessageReceived(UniquePtr<IPC::Message> aMessage) {
  AssertIOThread();

#ifdef FUZZING_SNAPSHOT
  if (mBlockSendRecv && !aMessage->IsFuzzMsg()) {
    return;
  }
#endif

  IPC::MessageReader reader(*aMessage);
  switch (aMessage->type()) {
    case REQUEST_INTRODUCTION_MESSAGE_TYPE: {
      NodeName name;
      if (IPC::ReadParam(&reader, &name)) {
        mListener->OnRequestIntroduction(mName, name);
        return;
      }
      break;
    }
    case INTRODUCE_MESSAGE_TYPE: {
      Introduction introduction;
      if (IPC::ReadParam(&reader, &introduction)) {
        mListener->OnIntroduce(mName, std::move(introduction));
        return;
      }
      break;
    }
    case BROADCAST_MESSAGE_TYPE: {
      mListener->OnBroadcast(mName, std::move(aMessage));
      return;
    }
    case ACCEPT_INVITE_MESSAGE_TYPE: {
      NodeName realName;
      PortName initialPort;
      if (IPC::ReadParam(&reader, &realName) &&
          IPC::ReadParam(&reader, &initialPort)) {
        mListener->OnAcceptInvite(mName, realName, initialPort);
        return;
      }
      break;
    }
    // Assume all unrecognized types are intended as user event messages, and
    // deliver them to our listener as such. This allows us to use the same type
    // field for both internal messages and protocol messages.
    //
    // FIXME: Consider doing something cleaner in the future?
    case EVENT_MESSAGE_TYPE:
    default: {
#ifdef FUZZING_SNAPSHOT
      if (!fuzzing::IPCFuzzController::instance().ObserveIPCMessage(
              this, *aMessage)) {
        return;
      }
#endif

      mListener->OnEventMessage(mName, std::move(aMessage));
      return;
    }
  }

  // If we got to this point without early returning the message was malformed
  // in some way. Report an error.

  NS_WARNING("NodeChannel received a malformed message");
  OnChannelError();
}

void NodeChannel::OnChannelConnected(base::ProcessId aPeerPid) {
  AssertIOThread();

  SetOtherPid(aPeerPid);

  // We may need to tell our original listener (which will be the process launch
  // code) that the the channel has been connected to unblock completing the
  // process launch.
  // FIXME: This is super sketchy, but it's also what we were already doing. We
  // should swap this out for something less sketchy.
  if (mExistingListener) {
    mExistingListener->OnChannelConnected(aPeerPid);
  }
}

void NodeChannel::OnChannelError() {
  AssertIOThread();

  State prev = mState.exchange(State::Closed);
  if (prev == State::Closed) {
    return;
  }

  // Clean up the channel and make sure we're no longer the active listener.
  mChannel->Close();
  MOZ_ALWAYS_TRUE(this == mChannel->set_listener(mExistingListener));

  // Tell our listener about the error.
  mListener->OnChannelError(mName);
}

}  // namespace mozilla::ipc

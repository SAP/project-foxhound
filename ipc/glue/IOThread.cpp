/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/ipc/IOThread.h"
#include "mozilla/ipc/NodeController.h"
#include "mozilla/Preferences.h"

#if defined(XP_WIN)
#  include <objbase.h>
#endif

#if defined(XP_WIN)
#  include "chrome/common/ipc_channel_win.h"
#else
#  if defined(XP_DARWIN)
#    include "chrome/common/ipc_channel_mach.h"
#  endif
#  include "chrome/common/ipc_channel_posix.h"
#endif

namespace mozilla {
namespace ipc {

//
// IOThread
//

/* static */
IOThread* IOThread::sSingleton = nullptr;

IOThread::IOThread(const char* aName) : base::Thread(aName) {
  sSingleton = this;
}

IOThread::~IOThread() {
  MOZ_ASSERT(!IsRunning());
  sSingleton = nullptr;
}

void IOThread::Startup() {
  if (XRE_IsParentProcess()) {
    // Destroyed in IOThread::Shutdown
    auto* thread = new IOThreadParent();
    MOZ_RELEASE_ASSERT(thread == sSingleton);
  }
  MOZ_ASSERT(sSingleton);
}

void IOThread::Shutdown() {
  if (XRE_IsParentProcess()) {
    delete static_cast<IOThreadParent*>(sSingleton);
    MOZ_ASSERT(!sSingleton);
  }
}

void IOThread::StartThread() {
  // Failure to create the IPC I/O thread is unrecoverable.
  // NOTE: This will block if successful for the `Init()` virtual method to have
  // been run.
  if (!StartWithOptions(
          base::Thread::Options{MessageLoop::TYPE_IO, /* stack size */ 0})) {
    MOZ_CRASH("Failed to create IPC I/O Thread");
  }
}

void IOThread::StopThread() {
  // This will block until CleanUp() has been called, and the IPC I/O thread has
  // been joined.
  Stop();
}

//
// IOThreadParent
//

IOThreadParent::IOThreadParent() : IOThread("IPC I/O Parent") {
  MOZ_RELEASE_ASSERT(XRE_IsParentProcess());

  // Select which type of channel will be used for IPC.
  mChannelKind = [] {
#if defined(XP_WIN)
    return &IPC::ChannelWin::sKind;
#else
#  if defined(XP_DARWIN)
    if (Preferences::GetBool("dom.ipc.backend.mach")) {
      return &IPC::ChannelMach::sKind;
    }
#  endif
    return &IPC::ChannelPosix::sKind;
#endif
  }();

  StartThread();
}

IOThreadParent::~IOThreadParent() { StopThread(); }

void IOThreadParent::Init() {
#if defined(XP_WIN)
  // Initializes the COM library on the current thread.
  CoInitialize(nullptr);
#endif

  // Initialize the ports library in the current thread.
  NodeController::InitBrokerProcess(mChannelKind);
}

void IOThreadParent::CleanUp() {
  NodeController::CleanUp();

#if defined(XP_WIN)
  // Closes the COM library on the current thread. CoInitialize must
  // be balanced by a corresponding call to CoUninitialize.
  CoUninitialize();
#endif
}

//
// IOThreadChild
//

IOThreadChild::IOThreadChild(IPC::Channel::ChannelHandle aClientHandle,
                             base::ProcessId aParentPid)
    : IOThread("IPC I/O Child"),
      mClientHandle(std::move(aClientHandle)),
      mParentPid(std::move(aParentPid)) {
  StartThread();
}

IOThreadChild::~IOThreadChild() { StopThread(); }

void IOThreadChild::Init() {
  mInitialPort =
      NodeController::InitChildProcess(std::move(mClientHandle), mParentPid);
}

void IOThreadChild::CleanUp() { NodeController::CleanUp(); }

}  // namespace ipc
}  // namespace mozilla

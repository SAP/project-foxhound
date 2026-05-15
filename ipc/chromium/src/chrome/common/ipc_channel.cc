/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
// Copyright (c) 2006-2008 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "ipc_channel.h"

#include "base/message_loop.h"
#include "mozilla/ipc/ProtocolUtils.h"

#ifdef XP_WIN
#  include "chrome/common/ipc_channel_win.h"
#else
#  include "chrome/common/ipc_channel_posix.h"
#endif
#ifdef XP_DARWIN
#  include "chrome/common/ipc_channel_mach.h"
#endif

namespace IPC {

Channel::Channel()
    : chan_cap_("ChannelImpl::SendMutex",
                MessageLoopForIO::current()->SerialEventTarget()) {}

Channel::~Channel() = default;

already_AddRefed<Channel> Channel::Create(ChannelHandle pipe, Mode mode,
                                          base::ProcessId other_pid) {
  if (auto* handle = std::get_if<mozilla::UniqueFileHandle>(&pipe)) {
#ifdef XP_WIN
    return mozilla::MakeAndAddRef<ChannelWin>(std::move(*handle), mode,
                                              other_pid);
#else
    return mozilla::MakeAndAddRef<ChannelPosix>(std::move(*handle), mode,
                                                other_pid);
#endif
  }
#if XP_DARWIN
  if (auto* receive = std::get_if<mozilla::UniqueMachReceiveRight>(&pipe)) {
    return mozilla::MakeAndAddRef<ChannelMach>(std::move(*receive), nullptr,
                                               mode, other_pid);
  }
  if (auto* send = std::get_if<mozilla::UniqueMachSendRight>(&pipe)) {
    return mozilla::MakeAndAddRef<ChannelMach>(nullptr, std::move(*send), mode,
                                               other_pid);
  }
#endif
  MOZ_ASSERT_UNREACHABLE("unhandled pipe type");
  return nullptr;
}

}  // namespace IPC

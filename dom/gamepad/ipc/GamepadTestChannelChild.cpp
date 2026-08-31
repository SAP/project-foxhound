/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GamepadTestChannelChild.h"

#include "mozilla/dom/GamepadServiceTest.h"

namespace mozilla::dom {

already_AddRefed<GamepadTestChannelChild> GamepadTestChannelChild::Create(
    GamepadServiceTest* aGamepadServiceTest) {
  return RefPtr<GamepadTestChannelChild>(
             new GamepadTestChannelChild(aGamepadServiceTest))
      .forget();
}

GamepadTestChannelChild::GamepadTestChannelChild(
    GamepadServiceTest* aGamepadServiceTest)
    : mGamepadServiceTest(aGamepadServiceTest) {}

mozilla::ipc::IPCResult GamepadTestChannelChild::RecvReplyGamepadHandle(
    const uint32_t& aID, const GamepadHandle& aHandle) {
  RefPtr<GamepadServiceTest> gst(mGamepadServiceTest.get());
  if (!gst) {
    return IPC_OK();
  }
  gst->ReplyGamepadHandle(aID, aHandle);
  return IPC_OK();
}

}  // namespace mozilla::dom

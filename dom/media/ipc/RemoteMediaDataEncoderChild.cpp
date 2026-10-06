/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RemoteMediaDataEncoderChild.h"

namespace mozilla {

extern LazyLogModule sPEMLog;

#define LOGD(fmt, ...)                           \
  MOZ_LOG_FMT(sPEMLog, mozilla::LogLevel::Debug, \
              "[RemoteMediaDataEncoderChild] {}: " fmt, __func__, __VA_ARGS__)
#define LOGV(fmt, ...)                             \
  MOZ_LOG_FMT(sPEMLog, mozilla::LogLevel::Verbose, \
              "[RemoteMediaDataEncoderChild] {}: " fmt, __func__, __VA_ARGS__)

RemoteMediaDataEncoderChild::RemoteMediaDataEncoderChild()
    : ShmemRecycleAllocator(this) {
  LOGV("[{}]", fmt::ptr(this));
}

RemoteMediaDataEncoderChild::~RemoteMediaDataEncoderChild() {
  LOGV("[{}]", fmt::ptr(this));
}

void RemoteMediaDataEncoderChild::ActorDestroy(ActorDestroyReason aWhy) {
  LOGD("[{}]", fmt::ptr(this));
  mRemoteCrashed = aWhy == ActorDestroyReason::AbnormalShutdown;
  CleanupShmemRecycleAllocator();
}

}  // namespace mozilla

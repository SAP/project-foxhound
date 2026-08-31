/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "InputChannelThrottleQueueChild.h"
#include "nsThreadUtils.h"

namespace mozilla {
namespace net {

NS_IMPL_ISUPPORTS_INHERITED0(InputChannelThrottleQueueChild, ThrottleQueue)

NS_IMETHODIMP
InputChannelThrottleQueueChild::RecordRead(uint32_t aBytesRead) {
  ThrottleQueue::RecordRead(aBytesRead);

  RefPtr<InputChannelThrottleQueueChild> self = this;
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "InputChannelThrottleQueueChild::RecordRead", [self, aBytesRead]() {
        if (self->CanSend()) {
          (void)self->SendRecordRead(aBytesRead);
        }
      }));
  return NS_OK;
}

}  // namespace net
}  // namespace mozilla

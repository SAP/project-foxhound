/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_NativeLayerRemoteParent_h
#define mozilla_layers_NativeLayerRemoteParent_h

#include "mozilla/layers/PNativeLayerRemoteParent.h"

namespace mozilla {
namespace layers {

class NativeLayerRemoteParent : public PNativeLayerRemoteParent {
 public:
  virtual mozilla::ipc::IPCResult RecvCommitNativeLayerCommands(
      nsTArray<mozilla::layers::NativeLayerCommand>&& aCommands) = 0;

  virtual mozilla::ipc::IPCResult RecvRequestReadback(IntSize aSize,
                                                      Shmem* const aPixels) = 0;

  virtual mozilla::ipc::IPCResult RecvFlush() = 0;
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_NativeLayerRemoteParent_h

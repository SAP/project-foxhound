/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_NativeLayerRemoteChild_h
#define mozilla_layers_NativeLayerRemoteChild_h

#include "mozilla/layers/PNativeLayerRemoteChild.h"

namespace mozilla {
namespace layers {

class NativeLayerRemoteChild : public PNativeLayerRemoteChild {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(NativeLayerRemoteChild);

 protected:
  ~NativeLayerRemoteChild() {}
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_NativeLayerRemoteChild_h

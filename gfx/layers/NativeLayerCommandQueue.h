/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_NativeLayerCommandQueue_h
#define mozilla_layers_NativeLayerCommandQueue_h

#include "mozilla/DataMutex.h"
#include "mozilla/layers/PNativeLayerRemoteChild.h"

namespace mozilla {
namespace layers {

class NativeLayerCommandQueue {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(NativeLayerCommandQueue)

  NativeLayerCommandQueue();

  void AppendCommand(mozilla::layers::NativeLayerCommand&& aCommand);
  void FlushToArray(nsTArray<mozilla::layers::NativeLayerCommand>& aQueue);

 protected:
  ~NativeLayerCommandQueue() = default;

  DataMutex<nsTArray<mozilla::layers::NativeLayerCommand>> mQueue;
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_NativeLayerCommandQueue_h

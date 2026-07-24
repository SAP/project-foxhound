/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/layers/NativeLayerCommandQueue.h"

namespace mozilla {
namespace layers {

NativeLayerCommandQueue::NativeLayerCommandQueue()
    : mQueue("NativeLayerCommandQueue") {}

void NativeLayerCommandQueue::AppendCommand(
    mozilla::layers::NativeLayerCommand&& aCommand) {
  auto q = mQueue.Lock();
  q->AppendElement(std::move(aCommand));
}

void NativeLayerCommandQueue::FlushToArray(
    nsTArray<mozilla::layers::NativeLayerCommand>& aQueue) {
  auto q = mQueue.Lock();
  aQueue.AppendElements(std::move(*q));
}

}  // namespace layers
}  // namespace mozilla

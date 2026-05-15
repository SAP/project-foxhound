/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CommandBuffer.h"

#include "CommandEncoder.h"
#include "Device.h"
#include "ExternalTexture.h"
#include "ipc/WebGPUChild.h"
#include "mozilla/dom/WebGPUBinding.h"
#include "mozilla/webgpu/CanvasContext.h"
#include "nsTArray.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(CommandBuffer, mParent, mExternalTextures)
GPU_IMPL_JS_WRAP(CommandBuffer)

CommandBuffer::CommandBuffer(
    Device* const aParent, RawId aId,
    nsTArray<WeakPtr<CanvasContext>>&& aPresentationContexts,
    nsTArray<RefPtr<ExternalTexture>>&& aExternalTextures)
    : ObjectBase(aParent->GetChild(), aId,
                 ffi::wgpu_client_drop_command_buffer),
      ChildOf(aParent),
      mPresentationContexts(std::move(aPresentationContexts)),
      mExternalTextures(std::move(aExternalTextures)) {
  MOZ_RELEASE_ASSERT(aId);
}

CommandBuffer::~CommandBuffer() = default;

RawId CommandBuffer::Commit() {
  for (const auto& presentationContext : mPresentationContexts) {
    if (presentationContext) {
      presentationContext->MaybeQueueSwapChainPresent();
    }
  }
  return GetId();
}

}  // namespace mozilla::webgpu

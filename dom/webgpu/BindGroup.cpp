/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BindGroup.h"

#include "Device.h"
#include "ExternalTexture.h"
#include "ipc/WebGPUChild.h"
#include "mozilla/dom/WebGPUBinding.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(BindGroup, mParent, mExternalTextures)
GPU_IMPL_JS_WRAP(BindGroup)

BindGroup::BindGroup(Device* const aParent, RawId aId,
                     CanvasContextArray&& aCanvasContexts,
                     nsTArray<RefPtr<ExternalTexture>>&& aExternalTextures)
    : ObjectBase(aParent->GetChild(), aId, ffi::wgpu_client_drop_bind_group),
      ChildOf(aParent),
      mUsedCanvasContexts(std::move(aCanvasContexts)),
      mExternalTextures(std::move(aExternalTextures)) {}

BindGroup::~BindGroup() = default;

}  // namespace mozilla::webgpu

/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RenderBundle.h"

#include "Device.h"
#include "mozilla/dom/WebGPUBinding.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(RenderBundle, mParent)
GPU_IMPL_JS_WRAP(RenderBundle)

RenderBundle::RenderBundle(Device* const aParent, RawId aId,
                           CanvasContextArray&& aCanvasContexts)
    : ObjectBase(aParent->GetChild(), aId, ffi::wgpu_client_drop_render_bundle),
      ChildOf(aParent),
      mUsedCanvasContexts(std::move(aCanvasContexts)) {}

RenderBundle::~RenderBundle() = default;

}  // namespace mozilla::webgpu

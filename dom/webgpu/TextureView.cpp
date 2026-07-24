/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TextureView.h"

#include "Device.h"
#include "ipc/WebGPUChild.h"
#include "mozilla/dom/WebGPUBinding.h"
#include "mozilla/webgpu/CanvasContext.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(TextureView, mParent)
GPU_IMPL_JS_WRAP(TextureView)

TextureView::TextureView(Texture* const aParent, RawId aId)
    : ObjectBase(aParent->GetChild(), aId, ffi::wgpu_client_drop_texture_view),
      ChildOf(aParent) {}

TextureView::~TextureView() = default;

WeakPtr<CanvasContext> TextureView::GetTargetContext() const {
  return mParent->mTargetContext;
}  // namespace webgpu

}  // namespace mozilla::webgpu

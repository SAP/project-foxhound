/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GPU_BindGroup_H_
#define GPU_BindGroup_H_

#include "CanvasContext.h"
#include "ObjectModel.h"
#include "mozilla/Span.h"
#include "mozilla/webgpu/WebGPUTypes.h"
#include "nsTArrayForwardDeclare.h"
#include "nsWrapperCache.h"

namespace mozilla::webgpu {

class Device;
class ExternalTexture;

class BindGroup final : public nsWrapperCache,
                        public ObjectBase,
                        public ChildOf<Device> {
 public:
  GPU_DECL_CYCLE_COLLECTION(BindGroup)
  GPU_DECL_JS_WRAP(BindGroup)

  BindGroup(Device* const aParent, RawId aId,
            CanvasContextArray&& aCanvasContexts,
            nsTArray<RefPtr<ExternalTexture>>&& aExternalTextures);

  mozilla::Span<const WeakPtr<CanvasContext>> GetCanvasContexts() const {
    return mUsedCanvasContexts;
  }

  mozilla::Span<const RefPtr<ExternalTexture>> GetExternalTextures() const {
    return mExternalTextures;
  }

 private:
  virtual ~BindGroup();

  // The canvas contexts of any canvas textures used in this bind group.
  CanvasContextArray mUsedCanvasContexts;
  // List of external textures used in this bind group.
  nsTArray<RefPtr<ExternalTexture>> mExternalTextures;
};

}  // namespace mozilla::webgpu

#endif  // GPU_BindGroup_H_

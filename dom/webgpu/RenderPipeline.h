/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GPU_RenderPipeline_H_
#define GPU_RenderPipeline_H_

#include "ObjectModel.h"
#include "mozilla/webgpu/WebGPUTypes.h"
#include "nsWrapperCache.h"

namespace mozilla::webgpu {

class BindGroupLayout;
class Device;

class RenderPipeline final : public nsWrapperCache,
                             public ObjectBase,
                             public ChildOf<Device> {
 public:
  GPU_DECL_CYCLE_COLLECTION(RenderPipeline)
  GPU_DECL_JS_WRAP(RenderPipeline)

  RenderPipeline(Device* const aParent, RawId aId);
  already_AddRefed<BindGroupLayout> GetBindGroupLayout(uint32_t index) const;

 private:
  virtual ~RenderPipeline();
};

}  // namespace mozilla::webgpu

#endif  // GPU_RenderPipeline_H_

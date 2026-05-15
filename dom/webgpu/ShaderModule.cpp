/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ShaderModule.h"

#include "CompilationInfo.h"
#include "Device.h"
#include "ipc/WebGPUChild.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/WebGPUBinding.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(ShaderModule, mParent, mCompilationInfo)
GPU_IMPL_JS_WRAP(ShaderModule)

ShaderModule::ShaderModule(Device* const aParent, RawId aId,
                           const RefPtr<dom::Promise>& aCompilationInfo)
    : ObjectBase(aParent->GetChild(), aId, ffi::wgpu_client_drop_shader_module),
      ChildOf(aParent),
      mCompilationInfo(aCompilationInfo) {}

ShaderModule::~ShaderModule() = default;

already_AddRefed<dom::Promise> ShaderModule::GetCompilationInfo(
    ErrorResult& aRv) {
  RefPtr<dom::Promise> tmp = mCompilationInfo;
  return tmp.forget();
}

}  // namespace mozilla::webgpu

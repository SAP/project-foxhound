/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ObjectModel.h"

#include "Adapter.h"
#include "CommandEncoder.h"
#include "CompilationInfo.h"
#include "Device.h"
#include "Instance.h"
#include "ShaderModule.h"
#include "Texture.h"
#include "ipc/WebGPUChild.h"
#include "nsIGlobalObject.h"

namespace mozilla::webgpu {

template <typename T>
ChildOf<T>::ChildOf(T* const parent) : mParent(parent) {}

template <typename T>
ChildOf<T>::~ChildOf() = default;

template <typename T>
nsIGlobalObject* ChildOf<T>::GetParentObject() const {
  return mParent->GetParentObject();
}

void ObjectBase::GetLabel(nsAString& aValue) const { aValue = mLabel; }
void ObjectBase::SetLabel(const nsAString& aLabel) { mLabel = aLabel; }

WebGPUChild* ObjectBase::GetChild() const { return mChild; }
ffi::WGPUClient* ObjectBase::GetClient() const { return mChild->GetClient(); }

ObjectBase::ObjectBase(WebGPUChild* const aChild, RawId aId,
                       void (*aDropFnPtr)(const struct ffi::WGPUClient* aClient,
                                          RawId aId))
    : mChild(aChild), mId(aId), mDropFnPtr(aDropFnPtr) {
  MOZ_RELEASE_ASSERT(aId);
}

ObjectBase::~ObjectBase() { mDropFnPtr(GetClient(), mId); }

template class ChildOf<Adapter>;
template class ChildOf<ShaderModule>;
template class ChildOf<CompilationInfo>;
template class ChildOf<CommandEncoder>;
template class ChildOf<Device>;
template class ChildOf<Instance>;
template class ChildOf<Texture>;

}  // namespace mozilla::webgpu

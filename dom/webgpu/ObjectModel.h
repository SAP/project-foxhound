/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GPU_OBJECT_MODEL_H_
#define GPU_OBJECT_MODEL_H_

#include "mozilla/webgpu/WebGPUTypes.h"
#include "mozilla/webgpu/ffi/wgpu.h"
#include "nsString.h"
#include "nsWrapperCache.h"

class nsIGlobalObject;

namespace mozilla::webgpu {
class WebGPUChild;

template <typename T>
class ChildOf {
 protected:
  explicit ChildOf(T* const parent);
  virtual ~ChildOf();

  RefPtr<T> mParent;

 public:
  nsIGlobalObject* GetParentObject() const;
};

/// This class is used to interface with the WebGPUChild IPDL actor.
///
/// WebGPU DOM objects that have equivalents in wgpu-core need to
/// communicate with the parent actor and should inherit from this class.
///
/// It provides access to the WebGPUChild, rust Client, object ID,
/// and automatically sends a drop message on object destruction.
class ObjectBase {
 protected:
  virtual ~ObjectBase();

 public:
  ObjectBase(WebGPUChild* const aChild, RawId aId,
             void (*aDropFnPtr)(const struct ffi::WGPUClient* aClient,
                                RawId aId));

  void GetLabel(nsAString& aValue) const;
  void SetLabel(const nsAString& aLabel);

  auto CLabel() const { return NS_ConvertUTF16toUTF8(mLabel); }

  WebGPUChild* GetChild() const;
  ffi::WGPUClient* GetClient() const;
  RawId GetId() const { return mId; };

 private:
  RefPtr<WebGPUChild> mChild;
  RawId mId;
  void (*mDropFnPtr)(const struct ffi::WGPUClient* aClient, RawId aId);

  // Object label, initialized from GPUObjectDescriptorBase.label.
  nsString mLabel;
};

}  // namespace mozilla::webgpu

#define GPU_DECL_JS_WRAP(T)                                             \
  JSObject* WrapObject(JSContext* cx, JS::Handle<JSObject*> givenProto) \
      override;

// Declare cycle collection support in a normal WebGPU DOM class.
//
// This macro is not appropriate for classes that have base classes with their
// own cycle collection machinery: those require an `_INHERITED` variant of the
// macro. See `mozilla::webgpu::Device` for an example.
#define GPU_DECL_CYCLE_COLLECTION(T)                    \
  NS_DECL_CYCLE_COLLECTION_NATIVE_WRAPPERCACHE_CLASS(T) \
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(T)

#define GPU_IMPL_JS_WRAP(T)                                                  \
  JSObject* T::WrapObject(JSContext* cx, JS::Handle<JSObject*> givenProto) { \
    return dom::GPU##T##_Binding::Wrap(cx, this, givenProto);                \
  }

// Implement cycle collection support for a normal WebGPU DOM class.
//
// This macro is not appropriate for classes that have base classes with their
// own cycle collection machinery: those require an `_INHERITED` variant of the
// macro. See `mozilla::webgpu::Device` for an example.
//
// This macro is not appropriate for classes that inherit from
// `SupportsWeakPtr`: those require a `_WEAK_PTR` variant of the macro. See
// `mozilla::webgpu::Device` for an example.
#define GPU_IMPL_CYCLE_COLLECTION(T, ...) \
  NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(T, __VA_ARGS__)

template <typename T>
void ImplCycleCollectionTraverse(nsCycleCollectionTraversalCallback& callback,
                                 nsTArray<RefPtr<const T>>& field,
                                 const char* name, uint32_t flags) {
  for (auto& element : field) {
    CycleCollectionNoteChild(callback, const_cast<T*>(element.get()), name,
                             flags);
  }
}

template <typename T>
void ImplCycleCollectionUnlink(nsTArray<RefPtr<const T>>& field) {
  for (auto& element : field) {
    ImplCycleCollectionUnlink(element);
  }
  field.Clear();
}

#endif  // GPU_OBJECT_MODEL_H_

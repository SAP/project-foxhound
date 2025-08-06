/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GPU_Adapter_H_
#define GPU_Adapter_H_

#include <memory>

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/webgpu/WebGPUTypes.h"
#include "mozilla/IntegerPrintfMacros.h"
#include "nsPrintfCString.h"
#include "nsString.h"
#include "ObjectModel.h"

namespace mozilla {
class ErrorResult;
namespace dom {
class Promise;
struct GPUDeviceDescriptor;
struct GPUExtensions;
struct GPUFeatures;
enum class GPUFeatureName : uint8_t;
enum class WgpuBackend : uint8_t;
enum class WgpuDeviceType : uint8_t;
template <typename T>
class Sequence;
}  // namespace dom

namespace webgpu {
class Adapter;
class Device;
class Instance;
class SupportedFeatures;
class SupportedLimits;
class WebGPUChild;
namespace ffi {
struct WGPUAdapterInformation;
}  // namespace ffi

class AdapterInfo final : public nsWrapperCache, public ChildOf<Adapter> {
 public:
  GPU_DECL_CYCLE_COLLECTION(AdapterInfo)
  GPU_DECL_JS_WRAP(AdapterInfo)

 protected:
  const std::shared_ptr<ffi::WGPUAdapterInformation> mAboutSupportInfo;
  ~AdapterInfo() = default;
  void Cleanup() {}

 public:
  explicit AdapterInfo(
      Adapter* const aParent,
      const std::shared_ptr<ffi::WGPUAdapterInformation>& aAboutSupportInfo)
      : ChildOf(aParent), mAboutSupportInfo(aAboutSupportInfo) {}

  void GetVendor(nsString& s) const { s = nsString(); }
  void GetArchitecture(nsString& s) const { s = nsString(); }
  void GetDevice(nsString& s) const { s = nsString(); }
  void GetDescription(nsString& s) const { s = nsString(); }

  // Non-standard field getters; see also TODO BUGZILLA LINK
  void GetWgpuName(nsString&) const;
  uint32_t WgpuVendor() const;
  uint32_t WgpuDevice() const;
  void GetWgpuDeviceType(nsString&) const;
  void GetWgpuDriver(nsString&) const;
  void GetWgpuDriverInfo(nsString&) const;
  void GetWgpuBackend(nsString&) const;
};

inline auto ToHexCString(const uint64_t v) {
  return nsPrintfCString("0x%" PRIx64, v);
}

class Adapter final : public ObjectBase, public ChildOf<Instance> {
 public:
  GPU_DECL_CYCLE_COLLECTION(Adapter)
  GPU_DECL_JS_WRAP(Adapter)

  RefPtr<WebGPUChild> mBridge;

 private:
  ~Adapter();
  void Cleanup();

  const RawId mId;
  // Cant have them as `const` right now, since we wouldn't be able
  // to unlink them in CC unlink.
  RefPtr<SupportedFeatures> mFeatures;
  RefPtr<SupportedLimits> mLimits;
  RefPtr<AdapterInfo> mInfo;
  const std::shared_ptr<ffi::WGPUAdapterInformation> mInfoInner;

 public:
  Adapter(Instance* const aParent, WebGPUChild* const aBridge,
          const std::shared_ptr<ffi::WGPUAdapterInformation>& aInfo);
  const RefPtr<SupportedFeatures>& Features() const;
  const RefPtr<SupportedLimits>& Limits() const;
  const RefPtr<AdapterInfo>& Info() const;
  bool IsFallbackAdapter() const;
  bool SupportExternalTextureInSwapChain() const;

  nsCString LabelOrId() const {
    nsCString ret = this->CLabel();
    if (ret.IsEmpty()) {
      ret = ToHexCString(mId);
    }
    return ret;
  }

  already_AddRefed<dom::Promise> RequestDevice(
      const dom::GPUDeviceDescriptor& aDesc, ErrorResult& aRv);
};

}  // namespace webgpu
}  // namespace mozilla

#endif  // GPU_Adapter_H_

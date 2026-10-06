/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "VulkanDeviceHolder.h"

#include <cstring>

#include "FFmpegLibWrapper.h"
#include "FFmpegLog.h"
#include "PlatformDecoderModule.h"
#include "libavutil/hwcontext.h"
#include "mozilla/DataMutex.h"

namespace mozilla {

constinit static StaticDataMutex<ThreadSafeWeakPtr<VulkanDeviceHolder>>
    sDeviceHolder("VulkanDeviceHolder::sDeviceHolder");

/* static */
RefPtr<VulkanDeviceHolder> VulkanDeviceHolder::GetOrCreate(
    const FFmpegLibWrapper* aLib, const char* aDeviceName,
    const char* aDeviceExtensions) {
  {
    auto weakInstance = sDeviceHolder.Lock();
    RefPtr<VulkanDeviceHolder> instance(*weakInstance);
    if (instance) {
      if (strcmp(instance->mDeviceName, aDeviceName) == 0) {
        FFMPEGP_LOG("VulkanDeviceHolder: reusing shared VkDevice for {}",
                    aDeviceName);
        return instance;
      }
      FFMPEGP_LOG(
          "VulkanDeviceHolder: device name mismatch ('{}' vs '{}'), creating "
          "new device",
          instance->mDeviceName, aDeviceName);
    }
  }

  // Create the VkDevice outside the lock: av_hwdevice_ctx_create can take
  // hundreds of milliseconds and must not hold sDeviceHolder while it runs.
  AVDictionary* opts = nullptr;
  if (aDeviceExtensions) {
    aLib->av_dict_set(&opts, "device_extensions", aDeviceExtensions, 0);
  }
  AVBufferRef* ctx = nullptr;
  int ret = aLib->av_hwdevice_ctx_create(&ctx, AV_HWDEVICE_TYPE_VULKAN,
                                         aDeviceName, opts, 0);
  if (opts) {
    aLib->av_dict_free(&opts);
  }
  if (ret < 0 || !ctx) {
    FFMPEGP_LOG("VulkanDeviceHolder: av_hwdevice_ctx_create failed for {}",
                aDeviceName);
    return nullptr;
  }

  RefPtr<VulkanDeviceHolder> instance =
      new VulkanDeviceHolder(aLib, ctx, aDeviceName);
  FFMPEGP_LOG("VulkanDeviceHolder: created shared VkDevice for {}",
              aDeviceName);

  auto weakInstance = sDeviceHolder.Lock();
  // A concurrent caller may have created a device while we were unlocked.
  // Prefer the one already stored if it matches our device name.
  RefPtr<VulkanDeviceHolder> existing(*weakInstance);
  if (existing && strcmp(existing->mDeviceName, aDeviceName) == 0) {
    FFMPEGP_LOG("VulkanDeviceHolder: discarding redundant VkDevice for {}",
                aDeviceName);
    return existing;
  }
  *weakInstance = instance;
  return instance;
}

AVBufferRef* VulkanDeviceHolder::Ref() const {
  return mLib->av_buffer_ref(mDeviceContext);
}

VulkanDeviceHolder::VulkanDeviceHolder(const FFmpegLibWrapper* aLib,
                                       AVBufferRef* aDeviceContext,
                                       const char* aDeviceName)
    : mLib(aLib), mDeviceContext(aDeviceContext) {
  strncpy(mDeviceName, aDeviceName, sizeof(mDeviceName) - 1);
  mDeviceName[sizeof(mDeviceName) - 1] = '\0';
}

VulkanDeviceHolder::~VulkanDeviceHolder() {
  FFMPEGP_LOG("VulkanDeviceHolder: destroying shared VkDevice");
  mLib->av_buffer_unref(&mDeviceContext);
}

}  // namespace mozilla

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=8 et :
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstdio>
#include <cstdlib>
#include <dlfcn.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <string.h>
#include <getopt.h>
#include <stdint.h>

#ifdef __linux__
#  include <sys/sysmacros.h>
#elif defined(XP_SOLARIS) || defined(__sun)
#  include <sys/mkdev.h>  // major(), minor() for st_rdev
#elif defined(XP_FREEBSD) || defined(XP_OPENBSD) || defined(XP_NETBSD)
#  include <sys/types.h>  // major(), minor() for st_rdev (BSD)
#endif

#if defined(MOZ_ASAN) || defined(FUZZING)
#  include <signal.h>
#endif

#include "mozilla/ScopeExit.h"

#ifdef __SUNPRO_CC
#  include <stdio.h>
#endif

#include <vulkan/vulkan.h>

#include "mozilla/GfxInfoUtils.h"

#define OUTPUT_PIPE 1

constexpr int CODEC_HW_DEC_H264 = 1 << 4;
constexpr int CODEC_HW_DEC_HEVC = 1 << 12;
constexpr int CODEC_HW_DEC_VP9 = 1 << 8;
constexpr int CODEC_HW_DEC_AV1 = 1 << 10;

// Supported codecs are derived from physical device extension list; drivers
// only expose VK_KHR_video_decode_* when the device supports that codec.
static const char* const kVideoDecodeExtensions[][2] = {
    {"VK_KHR_video_decode_h264", "H264"},
    {"VK_KHR_video_decode_h265", "HEVC"},
    {"VK_KHR_video_decode_vp9", "VP9"},
    {"VK_KHR_video_decode_av1", "AV1"},
};

static const char kInstanceExtension[] =
    "VK_KHR_get_physical_device_properties2";

static const char* const kVulkanVideoDecodeCoreExtensions[] = {
    "VK_KHR_video_queue",
    "VK_KHR_video_decode_queue",
};

struct InstanceFunctions {
  PFN_vkDestroyInstance vkDestroyInstance;
  PFN_vkEnumeratePhysicalDevices vkEnumeratePhysicalDevices;
  PFN_vkGetPhysicalDeviceProperties vkGetPhysicalDeviceProperties;
  PFN_vkGetPhysicalDeviceProperties2 vkGetPhysicalDeviceProperties2;
  PFN_vkEnumerateDeviceExtensionProperties vkEnumerateDeviceExtensionProperties;
};

static bool LoadInstanceFunctions(PFN_vkGetInstanceProcAddr aGetProcAddr,
                                  VkInstance aInstance,
                                  InstanceFunctions* aOut) {
  aOut->vkDestroyInstance =
      (PFN_vkDestroyInstance)aGetProcAddr(aInstance, "vkDestroyInstance");
  aOut->vkEnumeratePhysicalDevices =
      (PFN_vkEnumeratePhysicalDevices)aGetProcAddr(
          aInstance, "vkEnumeratePhysicalDevices");
  aOut->vkGetPhysicalDeviceProperties =
      (PFN_vkGetPhysicalDeviceProperties)aGetProcAddr(
          aInstance, "vkGetPhysicalDeviceProperties");
  aOut->vkGetPhysicalDeviceProperties2 =
      (PFN_vkGetPhysicalDeviceProperties2)aGetProcAddr(
          aInstance, "vkGetPhysicalDeviceProperties2");
  aOut->vkEnumerateDeviceExtensionProperties =
      (PFN_vkEnumerateDeviceExtensionProperties)aGetProcAddr(
          aInstance, "vkEnumerateDeviceExtensionProperties");
  return aOut->vkDestroyInstance && aOut->vkEnumeratePhysicalDevices &&
         aOut->vkGetPhysicalDeviceProperties &&
         aOut->vkEnumerateDeviceExtensionProperties;
}

static bool DeviceHasVulkanVideoDecodeCoreExtensions(
    const InstanceFunctions* aInst, VkPhysicalDevice aDevice) {
  uint32_t extensionCount = 0;
  VkResult res = aInst->vkEnumerateDeviceExtensionProperties(
      aDevice, nullptr, &extensionCount, nullptr);
  if (res != VK_SUCCESS || extensionCount == 0) {
    return false;
  }
  VkExtensionProperties* extensions = (VkExtensionProperties*)malloc(
      extensionCount * sizeof(VkExtensionProperties));
  if (!extensions) {
    return false;
  }
  res = aInst->vkEnumerateDeviceExtensionProperties(
      aDevice, nullptr, &extensionCount, extensions);
  if (res != VK_SUCCESS) {
    free(extensions);
    return false;
  }
  bool decodeExtensionsMatched = false;
  for (const char* req : kVulkanVideoDecodeCoreExtensions) {
    decodeExtensionsMatched = false;
    for (uint32_t e = 0; e < extensionCount; e++) {
      if (strcmp(extensions[e].extensionName, req) == 0) {
        decodeExtensionsMatched = true;
        break;
      }
    }
    if (!decodeExtensionsMatched) {
      log("vulkantest: missing required extension %s\n", req);
      free(extensions);
      return false;
    }
  }
  free(extensions);
  return true;
}

struct DeviceCandidate {
  VkPhysicalDevice device;
  VkPhysicalDeviceProperties props;
  int matchesRenderer;
};

static int DeviceTypePriority(VkPhysicalDeviceType t) {
  switch (t) {
    case VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU:
      return 3;
    case VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU:
      return 2;
    case VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU:
      return 1;
    default:
      return 0;
  }
}

static int CompareCandidates(const void* a, const void* b) {
  const DeviceCandidate* p1 = (const DeviceCandidate*)a;
  const DeviceCandidate* p2 = (const DeviceCandidate*)b;
  if (p1->matchesRenderer != p2->matchesRenderer) {
    return p2->matchesRenderer - p1->matchesRenderer;
  }
  return DeviceTypePriority(p2->props.deviceType) -
         DeviceTypePriority(p1->props.deviceType);
}

static int GetDeviceCodecs(const InstanceFunctions* aInst,
                           VkPhysicalDevice aDevice, uint32_t aDeviceIndex) {
  VkPhysicalDeviceProperties props = {};
  aInst->vkGetPhysicalDeviceProperties(aDevice, &props);
  if (props.deviceType == VK_PHYSICAL_DEVICE_TYPE_CPU) {
    return 0;
  }
  log("vulkantest: device %u: %s\n", (unsigned int)aDeviceIndex,
      props.deviceName);
  uint32_t extensionCount = 0;
  VkResult res = aInst->vkEnumerateDeviceExtensionProperties(
      aDevice, nullptr, &extensionCount, nullptr);
  if (res != VK_SUCCESS || extensionCount == 0) {
    return 0;
  }
  VkExtensionProperties* extensions = (VkExtensionProperties*)malloc(
      extensionCount * sizeof(VkExtensionProperties));
  if (!extensions) {
    return 0;
  }
  res = aInst->vkEnumerateDeviceExtensionProperties(
      aDevice, nullptr, &extensionCount, extensions);
  int codecs = 0;
  if (res == VK_SUCCESS) {
    for (uint32_t e = 0; e < extensionCount; e++) {
      if (strstr(extensions[e].extensionName, "decode") != nullptr) {
        log("vulkantest: device %u extension %s\n", (unsigned int)aDeviceIndex,
            extensions[e].extensionName);
      }
    }
    for (uint32_t e = 0; e < extensionCount; e++) {
      for (const auto& pair : kVideoDecodeExtensions) {
        if (strcmp(extensions[e].extensionName, pair[0]) == 0) {
          log("vulkantest: device %u has %s\n", (unsigned int)aDeviceIndex,
              pair[0]);
          if (strcmp(pair[1], "H264") == 0) {
            codecs |= CODEC_HW_DEC_H264;
          } else if (strcmp(pair[1], "HEVC") == 0) {
            codecs |= CODEC_HW_DEC_HEVC;
          } else if (strcmp(pair[1], "VP9") == 0) {
            codecs |= CODEC_HW_DEC_VP9;
          } else if (strcmp(pair[1], "AV1") == 0) {
            codecs |= CODEC_HW_DEC_AV1;
          }
          break;
        }
      }
    }
  }
  free(extensions);
  return codecs;
}

extern "C" {

// Query Vulkan Video Decode Support for the GPU decoder device,
// following the existing selection logic in FFmpegVideoDecoder.cpp
static void vulkantest(const char* aDrmRenderPath) {
  void* libvulkan = nullptr;
  void* vkGetInstanceProcAddrPtr = nullptr;
  VkInstance instance = VK_NULL_HANDLE;
  uint32_t rendererDrmMajor = 0;
  uint32_t rendererDrmMinor = 0;

  log("vulkantest start\n");

#ifdef __linux__
  if (aDrmRenderPath && *aDrmRenderPath) {
    struct stat st = {};
    if (stat(aDrmRenderPath, &st) == 0) {
      rendererDrmMajor = major(st.st_rdev);
      rendererDrmMinor = minor(st.st_rdev);
    }
  }
#endif

  auto autoRelease = mozilla::MakeScopeExit([&] {
    if (instance != VK_NULL_HANDLE && libvulkan) {
      InstanceFunctions inst = {};
      if (LoadInstanceFunctions(
              (PFN_vkGetInstanceProcAddr)vkGetInstanceProcAddrPtr, instance,
              &inst) &&
          inst.vkDestroyInstance) {
        inst.vkDestroyInstance(instance, nullptr);
      }
    }
    if (libvulkan) {
      dlclose(libvulkan);
    }
  });

  libvulkan = dlopen("libvulkan.so.1", RTLD_NOW);
  if (!libvulkan) {
    libvulkan = dlopen("libvulkan.so", RTLD_NOW);
  }
  if (!libvulkan) {
    log("vulkantest: libvulkan not found\n");
    record_value("VULKAN_SUPPORTED\nFALSE\n");
    return;
  }

  vkGetInstanceProcAddrPtr = (void*)dlsym(libvulkan, "vkGetInstanceProcAddr");
  if (!vkGetInstanceProcAddrPtr) {
    record_error("Vulkan test failed: vkGetInstanceProcAddr not found.");
    return;
  }

  PFN_vkGetInstanceProcAddr vkGetInstanceProcAddr =
      (PFN_vkGetInstanceProcAddr)vkGetInstanceProcAddrPtr;

  PFN_vkCreateInstance vkCreateInstance =
      (PFN_vkCreateInstance)vkGetInstanceProcAddr(VK_NULL_HANDLE,
                                                  "vkCreateInstance");
  if (!vkCreateInstance) {
    record_error("Vulkan test failed: vkCreateInstance not found.");
    return;
  }

  PFN_vkEnumerateInstanceExtensionProperties
      vkEnumerateInstanceExtensionProperties =
          (PFN_vkEnumerateInstanceExtensionProperties)vkGetInstanceProcAddr(
              VK_NULL_HANDLE, "vkEnumerateInstanceExtensionProperties");
  bool useProperties2 = false;
  if (vkEnumerateInstanceExtensionProperties) {
    uint32_t extCount = 0;
    VkResult r =
        vkEnumerateInstanceExtensionProperties(nullptr, &extCount, nullptr);
    if (r == VK_SUCCESS && extCount > 0) {
      VkExtensionProperties* exts = (VkExtensionProperties*)malloc(
          extCount * sizeof(VkExtensionProperties));
      if (exts) {
        r = vkEnumerateInstanceExtensionProperties(nullptr, &extCount, exts);
        if (r == VK_SUCCESS) {
          for (uint32_t i = 0; i < extCount; i++) {
            if (strcmp(exts[i].extensionName, kInstanceExtension) == 0) {
              useProperties2 = true;
              break;
            }
          }
        }
        free(exts);
      }
    }
  }

  VkApplicationInfo appInfo = {};
  appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
  appInfo.pApplicationName = "vulkantest";
  appInfo.applicationVersion = 1;
  appInfo.pEngineName = "vulkantest";
  appInfo.engineVersion = 1;
  appInfo.apiVersion = VK_API_VERSION_1_0;

  VkInstanceCreateInfo createInfo = {};
  createInfo.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
  createInfo.pApplicationInfo = &appInfo;
  const char* enabledExt = nullptr;
  if (useProperties2) {
    enabledExt = kInstanceExtension;
    createInfo.enabledExtensionCount = 1;
    createInfo.ppEnabledExtensionNames = &enabledExt;
  }

  VkResult res = vkCreateInstance(&createInfo, nullptr, &instance);
  if (res != VK_SUCCESS) {
    log("vulkantest: vkCreateInstance failed %d\n", (int)res);
    record_value("VULKAN_SUPPORTED\nFALSE\n");
    return;
  }

  InstanceFunctions inst = {};
  if (!LoadInstanceFunctions(vkGetInstanceProcAddr, instance, &inst)) {
    record_error("Vulkan test failed: required entry points not found.");
    return;
  }

  uint32_t physicalDeviceCount = 0;
  res =
      inst.vkEnumeratePhysicalDevices(instance, &physicalDeviceCount, nullptr);
  if (res != VK_SUCCESS || physicalDeviceCount == 0) {
    log("vulkantest: no physical devices\n");
    record_value("VULKAN_SUPPORTED\nFALSE\n");
    return;
  }

  VkPhysicalDevice* physicalDevices =
      (VkPhysicalDevice*)malloc(physicalDeviceCount * sizeof(VkPhysicalDevice));
  if (!physicalDevices) {
    record_error("Vulkan test failed: out of memory.");
    return;
  }
  mozilla::ScopeExit freeDevices([&] { free(physicalDevices); });

  res = inst.vkEnumeratePhysicalDevices(instance, &physicalDeviceCount,
                                        physicalDevices);
  if (res != VK_SUCCESS) {
    record_value("VULKAN_SUPPORTED\nFALSE\n");
    return;
  }

  log("vulkantest: %u physical device(s)\n", (unsigned int)physicalDeviceCount);

  size_t candidateCap = 8;
  DeviceCandidate* candidates =
      (DeviceCandidate*)malloc(candidateCap * sizeof(DeviceCandidate));
  if (!candidates) {
    record_error("Vulkan test failed: out of memory.");
    return;
  }
  mozilla::ScopeExit freeCandidates([&] { free(candidates); });

  int idx = 0;
  for (int i = 0; i < (int)physicalDeviceCount; i++) {
    VkPhysicalDeviceProperties p = {};
    int isDecoderMatchesRendererFound = 0;
    if (rendererDrmMajor && rendererDrmMinor &&
        inst.vkGetPhysicalDeviceProperties2) {
      VkPhysicalDeviceDrmPropertiesEXT drmProps = {};
      drmProps.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_DRM_PROPERTIES_EXT;
      VkPhysicalDeviceProperties2 props2 = {};
      props2.sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_PROPERTIES_2;
      props2.pNext = &drmProps;
      inst.vkGetPhysicalDeviceProperties2(physicalDevices[i], &props2);
      p = props2.properties;
      isDecoderMatchesRendererFound =
          (drmProps.hasRender &&
           (uint32_t)rendererDrmMajor == (uint32_t)drmProps.renderMajor &&
           (uint32_t)rendererDrmMinor == (uint32_t)drmProps.renderMinor) ||
                  (drmProps.hasPrimary &&
                   (uint32_t)rendererDrmMajor ==
                       (uint32_t)drmProps.primaryMajor &&
                   (uint32_t)rendererDrmMinor ==
                       (uint32_t)drmProps.primaryMinor)
              ? 1
              : 0;
    } else {
      inst.vkGetPhysicalDeviceProperties(physicalDevices[i], &p);
    }

    uint32_t vmaj = VK_API_VERSION_MAJOR(p.apiVersion);
    uint32_t vmin = VK_API_VERSION_MINOR(p.apiVersion);
    log("vulkantest: physdev[%d] %s type=%d vulkan=%u.%u "
        "matches_renderer=%d\n",
        i, p.deviceName, (int)p.deviceType, (unsigned int)vmaj,
        (unsigned int)vmin, isDecoderMatchesRendererFound);

    if (p.deviceType == VK_PHYSICAL_DEVICE_TYPE_CPU) {
      log("vulkantest: physdev[%d] skip (CPU)\n", i);
      continue;
    }
    if (!(vmaj > 1 || (vmaj == 1 && vmin >= 3))) {
      log("vulkantest: physdev[%d] skip (need Vulkan 1.3+)\n", i);
      continue;
    }
    if (!DeviceHasVulkanVideoDecodeCoreExtensions(&inst, physicalDevices[i])) {
      log("vulkantest: physdev[%d] skip (no VK_KHR_video_queue / "
          "VK_KHR_video_decode_queue)\n",
          i);
      continue;
    }

    if ((size_t)idx >= candidateCap) {
      candidateCap *= 2;
      DeviceCandidate* next = (DeviceCandidate*)realloc(
          candidates, candidateCap * sizeof(DeviceCandidate));
      if (!next) {
        record_error("Vulkan test failed: out of memory.");
        return;
      }
      candidates = next;
    }
    candidates[idx].device = physicalDevices[i];
    candidates[idx].props = p;
    candidates[idx].matchesRenderer = isDecoderMatchesRendererFound;
    log("vulkantest: physdev[%d] -> decode candidate[%d]\n", i, idx);
    idx++;
  }

  if (idx <= 0) {
    log("vulkantest: no suitable devices (need non-CPU, Vulkan 1.3+, "
        "VK_KHR_video_queue + VK_KHR_video_decode_queue)\n");
    record_value("VULKAN_SUPPORTED\nFALSE\n");
    return;
  }

  qsort(candidates, idx, sizeof(DeviceCandidate), CompareCandidates);

  const DeviceCandidate* chosen = &candidates[0];
  log("vulkantest: selected: %s (matches_renderer=%d)\n",
      chosen->props.deviceName, chosen->matchesRenderer);
  record_value("VULKAN_DEVICE\n%s\n", chosen->props.deviceName);

  int codecs = GetDeviceCodecs(&inst, chosen->device, 0);

  log("vulkantest: codecs bitmask %d\n", codecs);
  if (codecs != 0) {
    record_value("VULKAN_SUPPORTED\nTRUE\n");
    record_value("VULKAN_HWCODECS\n%d\n", codecs);
  } else {
    record_value("VULKAN_SUPPORTED\nFALSE\n");
  }
  log("vulkantest finished\n");
}

}  // extern "C"

static void PrintUsage() {
  printf(
      "Firefox Vulkan video decode probe utility\n"
      "\n"
      "usage: vulkantest [options]\n"
      "\n"
      "Options:\n"
      "\n"
      "  -h --help                 show this message\n"
      "  -p --probe               probe Vulkan (no DRM device)\n"
      "  -d --drm drm_device       probe Vulkan (drm_device is ignored)\n"
      "\n");
}

int main(int argc, char** argv) {
  struct option longOptions[] = {{"help", no_argument, nullptr, 'h'},
                                 {"probe", no_argument, nullptr, 'p'},
                                 {"drm", required_argument, nullptr, 'd'},
                                 {nullptr, 0, nullptr, 0}};
  const char* shortOptions = "hpd:";
  int c;
  bool doProbe = false;
  const char* drmPath = nullptr;
  while ((c = getopt_long(argc, argv, shortOptions, longOptions, nullptr)) !=
         -1) {
    switch (c) {
      case 'p':
        doProbe = true;
        break;
      case 'd':
        doProbe = true;
        drmPath = optarg;
        break;
      case 'h':
      default:
        break;
    }
  }
  if (doProbe || optind < argc) {
#if defined(MOZ_ASAN) || defined(FUZZING)
    signal(SIGSEGV, SIG_DFL);
#endif
    const char* env = getenv("MOZ_GFX_DEBUG");
    enable_logging = env && *env == '1';
    output_pipe = OUTPUT_PIPE;
    if (!enable_logging) {
      close_logging();
    }
    vulkantest(drmPath);
    record_flush();
    return EXIT_SUCCESS;
  }
  PrintUsage();
  return 0;
}

Khronos **Vulkan-Headers** vendored for `<vulkan/vulkan.h>` and video-related
headers under `include/vk_video/`, without using the ANGLE checkout path.

- **Git tag:** `vulkan-sdk-1.4.341.0` (Vulkan SDK 1.4.341 line)
- **Commit:** `b5c8f996196ba4aa6d8f97e52b5d3b6e70f7e4e2`
- **Upstream:** https://github.com/KhronosGroup/Vulkan-Headers

Snapshot:

```sh
git archive vulkan-sdk-1.4.341.0 include/vulkan include/vk_video LICENSE.md LICENSES .reuse | tar -x -C third_party/khronos/vulkan-headers
```

Refresh: repeat from a checkout of [Vulkan-Headers](https://github.com/KhronosGroup/Vulkan-Headers) and update the tag/commit above.

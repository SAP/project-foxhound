/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GFX_VR_LAYERPARENT_H
#define GFX_VR_LAYERPARENT_H

#include "mozilla/gfx/PVRLayerParent.h"
#include "gfxVR.h"

namespace mozilla {
namespace gfx {

class VRLayerParent final : public PVRLayerParent {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(VRLayerParent, final)

 public:
  VRLayerParent(uint32_t aVRDisplayID, const uint32_t aGroup);
  virtual mozilla::ipc::IPCResult RecvSubmitFrame(
      const layers::SurfaceDescriptor& aTexture, const uint64_t& aFrameId,
      const gfx::Rect& aLeftEyeRect, const gfx::Rect& aRightEyeRect) override;
  virtual mozilla::ipc::IPCResult RecvDestroy() override;
  uint32_t GetGroup() const { return mGroup; }

 protected:
  virtual ~VRLayerParent();
  void Destroy();

  bool mDestroyed;
  gfx::Rect mLeftEyeRect;
  gfx::Rect mRightEyeRect;
  uint32_t mGroup;
};

}  // namespace gfx
}  // namespace mozilla

#endif

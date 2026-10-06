/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GFX_VR_LAYERCHILD_H
#define GFX_VR_LAYERCHILD_H

#include "VRManagerChild.h"

#include "mozilla/RefPtr.h"
#include "mozilla/gfx/PVRLayerChild.h"
#include "gfxVR.h"

class nsICanvasRenderingContextInternal;

namespace mozilla {
class WebGLContext;
class WebGLFramebufferJS;
namespace dom {
class HTMLCanvasElement;
}
namespace layers {
class SharedSurfaceTextureClient;
}
namespace gl {
class SurfaceFactory;
}
namespace gfx {

class VRLayerChild final : public PVRLayerChild {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(VRLayerChild, final)

  VRLayerChild();

 public:
  static already_AddRefed<VRLayerChild> CreateIPDLActor();

  void Initialize(dom::HTMLCanvasElement* aCanvasElement,
                  const gfx::Rect& aLeftEyeRect,
                  const gfx::Rect& aRightEyeRect);
  void SetXRFramebuffer(WebGLFramebufferJS*);
  void SubmitFrame(const VRDisplayInfo& aDisplayInfo);

 private:
  virtual ~VRLayerChild();
  void ClearSurfaces();

  RefPtr<dom::HTMLCanvasElement> mCanvasElement;

  gfx::Rect mLeftEyeRect;
  gfx::Rect mRightEyeRect;
  RefPtr<WebGLFramebufferJS> mFramebuffer;

  Maybe<layers::SurfaceDescriptor> mThisFrameTextureDesc;
  Maybe<layers::SurfaceDescriptor> mLastFrameTextureDesc;

  uint64_t mLastSubmittedFrameId = 0;
};

}  // namespace gfx
}  // namespace mozilla

#endif

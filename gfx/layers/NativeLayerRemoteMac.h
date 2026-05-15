/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_NativeLayerRemoteMac_h
#define mozilla_layers_NativeLayerRemoteMac_h

#include <IOSurface/IOSurfaceRef.h>

#include "mozilla/layers/NativeLayer.h"
#include "mozilla/layers/NativeLayerCommandQueue.h"
#include "mozilla/layers/NativeLayerMacSurfaceHandler.h"
#include "NativeLayerCA.h"
#include "nsRegion.h"

namespace mozilla {
namespace layers {

class SurfacePoolHandleCA;

// NativeLayerRemoteMac is a macOS-specific NativeLayer offered up by
// NativeLayerRemoteMacChild, which can be rendered into and then sent to
// the NativeLayerRemoteMacParent.
class NativeLayerRemoteMac final : public NativeLayer {
  friend class NativeLayerRootRemoteMacChild;

 public:
  // Overridden methods
  NativeLayerRemoteMac* AsNativeLayerRemoteMac() override { return this; }

  gfx::IntSize GetSize() override;
  void SetPosition(const gfx::IntPoint& aPosition) override;
  gfx::IntPoint GetPosition() override;
  void SetTransform(const gfx::Matrix4x4& aTransform) override;
  gfx::Matrix4x4 GetTransform() override;
  gfx::IntRect GetRect() override;
  void SetSamplingFilter(gfx::SamplingFilter aSamplingFilter) override;
  gfx::SamplingFilter SamplingFilter() override;
  RefPtr<gfx::DrawTarget> NextSurfaceAsDrawTarget(
      const gfx::IntRect& aDisplayRect, const gfx::IntRegion& aUpdateRegion,
      gfx::BackendType aBackendType) override;
  Maybe<GLuint> NextSurfaceAsFramebuffer(const gfx::IntRect& aDisplayRect,
                                         const gfx::IntRegion& aUpdateRegion,
                                         bool aNeedsDepth) override;

  void NotifySurfaceReady() override;
  void DiscardBackbuffers() override;

  bool IsOpaque() override;
  bool IsDRM() { return mIsDRM; }
  bool IsHDR() { return mIsHDR; }
  void SetClipRect(const Maybe<gfx::IntRect>& aClipRect) override;
  Maybe<gfx::IntRect> ClipRect() override;
  void SetRoundedClipRect(
      const Maybe<gfx::RoundedRect>& aRoundedClipRect) override;
  Maybe<gfx::RoundedRect> RoundedClipRect() override;
  gfx::IntRect CurrentSurfaceDisplayRect() override;
  void SetSurfaceIsFlipped(bool aIsFlipped) override;
  bool SurfaceIsFlipped() override;

  void AttachExternalImage(wr::RenderTextureHost* aExternalImage) override;
  GpuFence* GetGpuFence() override;

  Maybe<SurfaceWithInvalidRegion> FrontSurface();

  NativeLayerRemoteMac(const gfx::IntSize& aSize, bool aIsOpaque,
                       SurfacePoolHandleCA* aSurfacePoolHandle);
  explicit NativeLayerRemoteMac(bool aIsOpaque);
  explicit NativeLayerRemoteMac(gfx::DeviceColor aColor);
  ~NativeLayerRemoteMac() override;

  // If dirty, add a CommandLayerInfo to the queue. Clear dirty flag.
  void FlushDirtyLayerInfoToCommandQueue();

  void UpdateSnapshotLayer();
  CALayer* CALayerForSnapshot();

 protected:
  NativeLayerCARepresentation mSnapshotLayer;
  Maybe<NativeLayerMacSurfaceHandler> mSurfaceHandler;
  RefPtr<NativeLayerCommandQueue> mCommandQueue;
  const Maybe<gfx::DeviceColor> mColor;
  const bool mIsOpaque = false;

  bool mDirtyLayerInfo = true;
  // mDirtyLayerInfo is set when any of these change:
  gfx::IntPoint mPosition;
  gfx::Matrix4x4 mTransform;
  gfx::IntRect mDisplayRect;
  Maybe<gfx::IntRect> mClipRect;
  Maybe<gfx::RoundedRect> mRoundedClipRect;
  gfx::SamplingFilter mSamplingFilter = gfx::SamplingFilter::POINT;
  float mBackingScale = 1.0f;
  bool mSurfaceIsFlipped = false;

  bool mDirtyChangedSurface = true;
  // mDirtyChangedSurface is set when any of these change, or when the
  // value returned by FrontSurface() changes:
  CFTypeRefPtr<IOSurfaceRef> mExternalImage;
  bool mIsDRM = false;
  bool mIsHDR = false;
  gfx::IntSize mSize;
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_NativeLayerRemoteMac_h

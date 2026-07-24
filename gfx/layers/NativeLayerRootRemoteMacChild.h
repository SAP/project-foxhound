/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_layers_NativeLayerRootRemoteMacChild_h
#define mozilla_layers_NativeLayerRootRemoteMacChild_h

#include "mozilla/layers/NativeLayerCommandQueue.h"
#include "mozilla/layers/NativeLayerRemoteChild.h"
#include "mozilla/layers/NativeLayerRemoteMac.h"

namespace mozilla {
namespace layers {

// NativeLayerRootRemoteMacChild is a macOS-specific implementation of
// NativeLayerRoot that runs on the GPU process, and sends updates
// to the parent process.
class NativeLayerRootRemoteMacChild final : public NativeLayerRoot {
 public:
  NativeLayerRootRemoteMacChild();

  already_AddRefed<NativeLayer> CreateLayer(
      const gfx::IntSize& aSize, bool aIsOpaque,
      SurfacePoolHandle* aSurfacePoolHandle) override;
  already_AddRefed<NativeLayer> CreateLayerForExternalTexture(
      bool aIsOpaque) override;
  already_AddRefed<NativeLayer> CreateLayerForColor(
      gfx::DeviceColor aColor) override;

  void AppendLayer(NativeLayer* aLayer) override;
  void RemoveLayer(NativeLayer* aLayer) override;
  void SetLayers(const nsTArray<RefPtr<NativeLayer>>& aLayers) override;
  UniquePtr<NativeLayerRootSnapshotter> CreateSnapshotter() override;

  // Called before any layer content changes.
  void PrepareForCommit() override;

  // Publish the layer changes to the screen. Returns whether the commit was
  // successful.
  bool CommitToScreen() override;

  // Send a sync message to the parent to make sure it has seen our layer
  // commands message.
  void WaitUntilCommitToScreenHasBeenProcessed() override;

  RefPtr<NativeLayerRemoteChild> GetRemoteChild() { return mRemoteChild; }

 protected:
  friend class NativeLayerRootRemoteMacSnapshotter;

  virtual ~NativeLayerRootRemoteMacChild();

  void CommitForSnapshot(CALayer* aRootCALayer);
  void OnNativeLayerRootSnapshotterDestroyed(
      NativeLayerRootSnapshotterCA* aNativeLayerRootSnapshotter);

  // An implementation of SnapshotterCADelegate, backed by a
  // NativeLayerRootRemoteMacChild.
  struct SnapshotterDelegate final : public SnapshotterCADelegate {
    explicit SnapshotterDelegate(NativeLayerRootRemoteMacChild* aLayerRoot);
    virtual ~SnapshotterDelegate() override;
    virtual void UpdateSnapshotterLayers(CALayer* aRootCALayer) override {
      mLayerRoot->CommitForSnapshot(aRootCALayer);
    }
    virtual bool DoCustomReadbackForReftestsIfDesired(
        const gfx::IntSize& aReadbackSize, gfx::SurfaceFormat aReadbackFormat,
        const Range<uint8_t>& aReadbackBuffer) override {
      return mLayerRoot->ReadbackPixelsFromParent(
          aReadbackSize, aReadbackFormat, aReadbackBuffer);
    }
    virtual void OnSnapshotterDestroyed(
        NativeLayerRootSnapshotterCA* aSnapshotter) override {
      mLayerRoot->OnNativeLayerRootSnapshotterDestroyed(aSnapshotter);
    }
    RefPtr<NativeLayerRootRemoteMacChild> mLayerRoot;
  };

  RefPtr<NativeLayerRemoteChild> mRemoteChild;
  RefPtr<NativeLayerCommandQueue> mCommandQueue;
  nsTArray<RefPtr<NativeLayerRemoteMac>> mNativeLayers;
  NativeLayerRootSnapshotterCA* mWeakSnapshotter = nullptr;

  bool mNativeLayersChanged = false;
  bool mNativeLayersChangedForSnapshot = false;

  // Send a sync message to the parent to get the window pixels.
  // Used for reftests.
  //
  // This is different from what we do for "window recorder" and
  // "profiler screenshot" snapshotting, where we do the snapshotting
  // within the GPU process, using CARenderer on a CALayer tree we
  // construct within the GPU process.
  //
  // Here's why we have two different snapshotting paths:
  // - Profiler screenshots and window recording care about minimal overhead
  //   and need to minimize blocking on the GPU.
  // - Reftests care about catching bugs, and don't need maximum performance.
  //   By doing the readback in the parent, we can catch more bugs, for
  //   example bugs in the IPC serialization of layer updates and how those
  //   updates are applied on the parent side.
  bool ReadbackPixelsFromParent(const gfx::IntSize& aSize,
                                gfx::SurfaceFormat aFormat,
                                const Range<uint8_t>& aBuffer);
};

}  // namespace layers
}  // namespace mozilla

#endif  // mozilla_layers_NativeLayerRootRemoteMacChild_h

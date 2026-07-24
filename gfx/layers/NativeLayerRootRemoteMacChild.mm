/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/layers/NativeLayerRemoteMac.h"
#include "mozilla/layers/NativeLayerRootRemoteMacChild.h"
#include "mozilla/layers/SurfacePool.h"

namespace mozilla {
namespace layers {

already_AddRefed<NativeLayer> NativeLayerRootRemoteMacChild::CreateLayer(
    const gfx::IntSize& aSize, bool aIsOpaque,
    SurfacePoolHandle* aSurfacePoolHandle) {
  RefPtr<NativeLayerRemoteMac> layer = new NativeLayerRemoteMac(
      aSize, aIsOpaque, aSurfacePoolHandle->AsSurfacePoolHandleCA());
  mCommandQueue->AppendCommand(mozilla::layers::CommandCreateLayer(
      reinterpret_cast<uint64_t>(layer.get()), aSize, aIsOpaque));
  // Share our command queue.
  layer->mCommandQueue = mCommandQueue;
  return layer.forget();
}

already_AddRefed<NativeLayer>
NativeLayerRootRemoteMacChild::CreateLayerForExternalTexture(bool aIsOpaque) {
  RefPtr<NativeLayerRemoteMac> layer = new NativeLayerRemoteMac(aIsOpaque);
  mCommandQueue->AppendCommand(
      mozilla::layers::CommandCreateLayerForExternalTexture(
          reinterpret_cast<uint64_t>(layer.get()), aIsOpaque));
  // Share our command queue.
  layer->mCommandQueue = mCommandQueue;
  return layer.forget();
}

already_AddRefed<NativeLayer>
NativeLayerRootRemoteMacChild::CreateLayerForColor(gfx::DeviceColor aColor) {
  RefPtr<NativeLayerRemoteMac> layer = new NativeLayerRemoteMac(aColor);
  mCommandQueue->AppendCommand(mozilla::layers::CommandCreateLayerForColor(
      reinterpret_cast<uint64_t>(layer.get()), aColor));
  // Share our command queue.
  layer->mCommandQueue = mCommandQueue;
  return layer.forget();
}

void NativeLayerRootRemoteMacChild::AppendLayer(NativeLayer* aLayer) {
  RefPtr<NativeLayerRemoteMac> layerRemoteMac =
      aLayer->AsNativeLayerRemoteMac();
  mNativeLayers.AppendElement(std::move(layerRemoteMac));
  mNativeLayersChanged = true;
  mNativeLayersChangedForSnapshot = true;
}

void NativeLayerRootRemoteMacChild::RemoveLayer(NativeLayer* aLayer) {
  if (mNativeLayers.RemoveElement(aLayer)) {
    mNativeLayersChanged = true;
    mNativeLayersChangedForSnapshot = true;
  }
}

void NativeLayerRootRemoteMacChild::SetLayers(
    const nsTArray<RefPtr<NativeLayer>>& aLayers) {
  // We don't create a command for this, because we don't care
  // about the layers until CommitToScreen().
  nsTArray<RefPtr<NativeLayerRemoteMac>> layers(aLayers.Length());
  for (const auto& layer : aLayers) {
    RefPtr<NativeLayerRemoteMac> layerRemoteMac =
        layer->AsNativeLayerRemoteMac();
    MOZ_ASSERT(layerRemoteMac);
    layers.AppendElement(std::move(layerRemoteMac));
  }

  if (mNativeLayers == layers) {
    // A no-op.
    return;
  }

  mNativeLayersChanged = true;
  mNativeLayersChangedForSnapshot = true;
  mNativeLayers.Clear();
  mNativeLayers.AppendElements(layers);
}

UniquePtr<NativeLayerRootSnapshotter>
NativeLayerRootRemoteMacChild::CreateSnapshotter() {
#ifdef XP_MACOSX
  MOZ_RELEASE_ASSERT(!mWeakSnapshotter,
                     "No NativeLayerRootSnapshotter for this NativeLayerRoot "
                     "should exist when this is called");
  auto cr = NativeLayerRootSnapshotterCA::Create(
      MakeUnique<SnapshotterDelegate>(this));
  if (cr) {
    mWeakSnapshotter = cr.get();
  }
  return cr;
#else
  return nullptr;
#endif
}

void NativeLayerRootRemoteMacChild::OnNativeLayerRootSnapshotterDestroyed(
    NativeLayerRootSnapshotterCA* aNativeLayerRootSnapshotter) {
  MOZ_RELEASE_ASSERT(mWeakSnapshotter == aNativeLayerRootSnapshotter);
  mWeakSnapshotter = nullptr;
}

void NativeLayerRootRemoteMacChild::PrepareForCommit() {
  // Intentionally ignored.
}

bool NativeLayerRootRemoteMacChild::CommitToScreen() {
  // Prepare and send all commands to the parent actor.

  // Our shared command queue has all of our CreateLayer and LayerDestroyed
  // commands. That's good, because the commands that we're adding to the
  // queue rely upon those CreateLayer commands appearing first.

  // Iterate our layers to get the LayerInfo and ChangedSurface commands
  // into our shared command queue.
  for (const auto& layer : mNativeLayers) {
    layer->FlushDirtyLayerInfoToCommandQueue();
  }

  if (mNativeLayersChanged) {
    // If mNativeLayersChanged is set, we will send a SetLayers
    // command of this array filled with the IDs of everything
    // in mNativeLayers.
    nsTArray<uint64_t> setLayerIDs;
    for (const auto& layer : mNativeLayers) {
      auto ID = reinterpret_cast<uint64_t>(layer.get());
      setLayerIDs.AppendElement(ID);
    }
    mCommandQueue->AppendCommand(
        mozilla::layers::CommandSetLayers(setLayerIDs));
    mNativeLayersChanged = false;
  }

  // Now flush the shared command queue to our local command array,
  // which is suitable for sending to the parent process.
  nsTArray<NativeLayerCommand> commands;
  mCommandQueue->FlushToArray(commands);

  if (!commands.IsEmpty()) {
    // Send all the queued commands, including the ones we just added.
    MOZ_ASSERT(mRemoteChild);
    mRemoteChild->SendCommitNativeLayerCommands(std::move(commands));
  }
  return true;
}

void NativeLayerRootRemoteMacChild::WaitUntilCommitToScreenHasBeenProcessed() {
  mRemoteChild->SendFlush();
}

void NativeLayerRootRemoteMacChild::CommitForSnapshot(CALayer* aRootCALayer) {
  [CATransaction begin];
  [CATransaction setDisableActions:YES];  // disable cross-fade

  NSMutableArray<CALayer*>* sublayers =
      [NSMutableArray arrayWithCapacity:mNativeLayers.Length()];
  for (const auto& layer : mNativeLayers) {
    layer->UpdateSnapshotLayer();
    if (CALayer* caLayer = layer->CALayerForSnapshot()) {
      [sublayers addObject:caLayer];
    }
  }

  aRootCALayer.sublayers = sublayers;
  [CATransaction commit];

  mNativeLayersChangedForSnapshot = false;
}

bool NativeLayerRootRemoteMacChild::ReadbackPixelsFromParent(
    const gfx::IntSize& aSize, gfx::SurfaceFormat aFormat,
    const Range<uint8_t>& aBuffer) {
  // In this process we only have the pixels of the individual layers,
  // but here we're asked to return the result of compositing all the
  // layers together. Computing the composited result is currently
  // only implemented in NativeLayerRootCA, which runs in the parent
  // process, so we send a sync IPC message to the parent to ask for
  // the composited result.
  if (aFormat != gfx::SurfaceFormat::B8G8R8A8) {
    return false;
  }

  ipc::Shmem pixels;
  if (!mRemoteChild->SendRequestReadback(aSize, &pixels)) {
    return false;
  }

  // Copy pixels into aBuffer.
  // TODO: Figure out a more idiomatic way to do this.
  auto byteCount = pixels.Size<uint8_t>();
  MOZ_RELEASE_ASSERT(aBuffer.length() >= byteCount);
  PodCopy(aBuffer.begin().get(), pixels.get<uint8_t>(), byteCount);

  return true;
}

NativeLayerRootRemoteMacChild::NativeLayerRootRemoteMacChild()
    : mRemoteChild(MakeRefPtr<NativeLayerRemoteChild>()),
      mCommandQueue(MakeRefPtr<NativeLayerCommandQueue>()) {}

NativeLayerRootRemoteMacChild::~NativeLayerRootRemoteMacChild() {}

NativeLayerRootRemoteMacChild::SnapshotterDelegate::SnapshotterDelegate(
    NativeLayerRootRemoteMacChild* aLayerRoot)
    : mLayerRoot(aLayerRoot) {}
NativeLayerRootRemoteMacChild::SnapshotterDelegate::~SnapshotterDelegate() =
    default;

}  // namespace layers
}  // namespace mozilla

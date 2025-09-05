/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "TextureRecorded.h"
#include "mozilla/gfx/DrawTargetRecording.h"
#include "mozilla/layers/CompositableForwarder.h"

#include "RecordedCanvasEventImpl.h"

namespace mozilla {
namespace layers {

RecordedTextureData::RecordedTextureData(
    already_AddRefed<CanvasChild> aCanvasChild, gfx::IntSize aSize,
    gfx::SurfaceFormat aFormat, TextureType aTextureType,
    TextureType aWebglTextureType)
    : mRemoteTextureOwnerId(RemoteTextureOwnerId::GetNext()),
      mCanvasChild(aCanvasChild),
      mSize(aSize),
      mFormat(aFormat) {}

RecordedTextureData::~RecordedTextureData() {
  // We need the translator to drop its reference for the DrawTarget first,
  // because the TextureData might need to destroy its DrawTarget within a lock.
  mSnapshot = nullptr;
  DetachSnapshotWrapper();
  if (mDT) {
    mDT->DetachTextureData(this);
    mDT = nullptr;
  }
  mCanvasChild->RecordEvent(RecordedTextureDestruction(
      mRemoteTextureOwnerId, ToRemoteTextureTxnType(mFwdTransactionTracker),
      ToRemoteTextureTxnId(mFwdTransactionTracker)));
}

void RecordedTextureData::FillInfo(TextureData::Info& aInfo) const {
  aInfo.size = mSize;
  aInfo.format = mFormat;
  aInfo.supportsMoz2D = true;
  aInfo.hasSynchronization = true;
}

void RecordedTextureData::InvalidateContents() { mInvalidContents = true; }

bool RecordedTextureData::Lock(OpenMode aMode) {
  if (!mCanvasChild->EnsureBeginTransaction()) {
    return false;
  }

  if (!mDT && mInited) {
    return false;
  }

  // If modifying the texture, then allocate a new remote texture id.
  if (aMode & OpenMode::OPEN_WRITE) {
    mUsedRemoteTexture = false;
  }

  bool wasInvalidContents = mInvalidContents;
  mInvalidContents = false;

  if (!mDT && !mInited) {
    mInited = true;
    mDT = mCanvasChild->CreateDrawTarget(mRemoteTextureOwnerId, mSize, mFormat);
    if (!mDT) {
      return false;
    }

    mDT->AttachTextureData(this);

    // We lock the TextureData when we create it to get the remote DrawTarget.
    mLockedMode = aMode;
    return true;
  }

  mCanvasChild->RecordEvent(
      RecordedTextureLock(mRemoteTextureOwnerId, aMode, wasInvalidContents));
  mLockedMode = aMode;
  return true;
}

void RecordedTextureData::DetachSnapshotWrapper(bool aInvalidate,
                                                bool aRelease) {
  if (mSnapshotWrapper) {
    // If the snapshot only has one ref, then we don't need to worry about
    // copying before invalidation since it is about to be deleted. Otherwise,
    // we need to ensure any internal data is appropriately copied before
    // shmems are potentially overwritten if there are still existing users.
    mCanvasChild->DetachSurface(mSnapshotWrapper,
                                aInvalidate && !mSnapshotWrapper->hasOneRef());
    if (aRelease) {
      mSnapshotWrapper = nullptr;
    }
  }
}

void RecordedTextureData::Unlock() {
  if ((mLockedMode == OpenMode::OPEN_READ_WRITE) &&
      mCanvasChild->ShouldCacheDataSurface()) {
    DetachSnapshotWrapper();
    mSnapshot = mDT->Snapshot();
    mDT->DetachAllSnapshots();
    mCanvasChild->RecordEvent(RecordedCacheDataSurface(mSnapshot.get()));
  }

  mCanvasChild->RecordEvent(RecordedTextureUnlock(mRemoteTextureOwnerId));

  mLockedMode = OpenMode::OPEN_NONE;
}

already_AddRefed<gfx::DrawTarget> RecordedTextureData::BorrowDrawTarget() {
  if (mLockedMode & OpenMode::OPEN_WRITE) {
    // The snapshot will be invalidated.
    mSnapshot = nullptr;
    DetachSnapshotWrapper(true);
  }
  return do_AddRef(mDT);
}

void RecordedTextureData::EndDraw() {
  MOZ_ASSERT(mDT->hasOneRef());
  MOZ_ASSERT(mLockedMode == OpenMode::OPEN_READ_WRITE);

  if (mCanvasChild->ShouldCacheDataSurface()) {
    DetachSnapshotWrapper();
    mSnapshot = mDT->Snapshot();
    mCanvasChild->RecordEvent(RecordedCacheDataSurface(mSnapshot.get()));
  }
}

void RecordedTextureData::DrawTargetWillChange() {
  // The DrawTargetRecording will be modified, so ensure that possibly the last
  // reference to a snapshot is discarded so that it does not inadvertently
  // force a copy.
  mSnapshot = nullptr;
  DetachSnapshotWrapper(true);
}

already_AddRefed<gfx::SourceSurface> RecordedTextureData::BorrowSnapshot() {
  if (mSnapshotWrapper) {
    // The DT is unmodified since the last time snapshot was borrowed, so it
    // is safe to reattach the snapshot for shmem readbacks.
    mCanvasChild->AttachSurface(mSnapshotWrapper);
    return do_AddRef(mSnapshotWrapper);
  }

  // There are some failure scenarios where we have no DrawTarget and
  // BorrowSnapshot is called in an attempt to copy to a new texture.
  if (!mDT) {
    return nullptr;
  }

  RefPtr<gfx::SourceSurface> wrapper = mCanvasChild->WrapSurface(
      mSnapshot ? mSnapshot : mDT->Snapshot(), mRemoteTextureOwnerId);
  mSnapshotWrapper = wrapper;
  return wrapper.forget();
}

void RecordedTextureData::ReturnSnapshot(
    already_AddRefed<gfx::SourceSurface> aSnapshot) {
  RefPtr<gfx::SourceSurface> snapshot = aSnapshot;
  // The snapshot needs to be marked detached but we keep the wrapper around
  // so that it can be reused without repeatedly creating it and accidentally
  // reading back data for each new instantiation.
  DetachSnapshotWrapper(false, false);
}

void RecordedTextureData::Deallocate(LayersIPCChannel* aAllocator) {}

bool RecordedTextureData::Serialize(SurfaceDescriptor& aDescriptor) {
  // If something is querying the id, assume it is going to be composited.
  if (!mUsedRemoteTexture) {
    mLastRemoteTextureId = RemoteTextureId::GetNext();
    mCanvasChild->RecordEvent(
        RecordedPresentTexture(mRemoteTextureOwnerId, mLastRemoteTextureId));
    mUsedRemoteTexture = true;
  }

  aDescriptor = SurfaceDescriptorRemoteTexture(mLastRemoteTextureId,
                                               mRemoteTextureOwnerId);
  return true;
}

already_AddRefed<FwdTransactionTracker>
RecordedTextureData::UseCompositableForwarder(
    CompositableForwarder* aForwarder) {
  return FwdTransactionTracker::GetOrCreate(mFwdTransactionTracker);
}

void RecordedTextureData::OnForwardedToHost() {
  // Compositing with RecordedTextureData requires RemoteTextureMap.
  MOZ_CRASH("OnForwardedToHost not supported!");
}

TextureFlags RecordedTextureData::GetTextureFlags() const {
  // With WebRender, resource open happens asynchronously on RenderThread.
  // Use WAIT_HOST_USAGE_END to keep TextureClient alive during host side usage.
  return TextureFlags::WAIT_HOST_USAGE_END;
}

bool RecordedTextureData::RequiresRefresh() const {
  return mCanvasChild->RequiresRefresh(mRemoteTextureOwnerId);
}

}  // namespace layers
}  // namespace mozilla

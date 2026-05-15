/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SourceSurfaceWebgl.h"

#include "DrawTargetWebglInternal.h"
#include "WebGLBuffer.h"
#include "mozilla/gfx/Swizzle.h"

namespace mozilla::gfx {

SourceSurfaceWebgl::SourceSurfaceWebgl(DrawTargetWebgl* aDT)
    : mFormat(aDT->GetFormat()),
      mSize(aDT->GetSize()),
      mDT(aDT),
      mSharedContext(aDT->mSharedContext) {}

SourceSurfaceWebgl::SourceSurfaceWebgl(
    const RefPtr<SharedContextWebgl>& aSharedContext)
    : mSharedContext(aSharedContext) {}

SourceSurfaceWebgl::~SourceSurfaceWebgl() {
  if (mHandle) {
    // Signal that the texture handle is not being used now.
    mHandle->ClearSurface();
  }
  if (mReadBuffer) {
    if (RefPtr<SharedContextWebgl> sharedContext = {mSharedContext}) {
      sharedContext->RemoveSnapshotPBO(this, mReadBuffer.forget());
    }
    mReadBuffer = nullptr;
  }
}

// Read back the contents of the target or texture handle for data use. This
// may attempt a readback into a PBO for performance, unless forced to
// immediately read into data.
inline bool SourceSurfaceWebgl::EnsureData(bool aForce, uint8_t* aData,
                                           int32_t aStride) {
  if (mData) {
    if (aData) {
      DataSourceSurface::ScopedMap map(mData, MapType::READ);
      if (!map.IsMapped()) {
        return false;
      }
      SwizzleData(map.GetData(), map.GetStride(), mFormat, aData, aStride,
                  mFormat, mSize);
    }
    return true;
  }

  if (mReadBuffer) {
    // If there is a pending PBO readback, then copy the contents of the PBO.
    if (RefPtr<SharedContextWebgl> sharedContext = {mSharedContext}) {
      mData = sharedContext->ReadSnapshotFromPBO(mReadBuffer, mFormat, mSize,
                                                 aData, aStride);
      mOwnsData = !mData || !aData;
      sharedContext->RemoveSnapshotPBO(this, mReadBuffer.forget());
    }
    mReadBuffer = nullptr;
    return !!mData;
  }

  if (RefPtr<DrawTargetWebgl> dt = {mDT}) {
    if (!aForce) {
      mReadBuffer = dt->ReadSnapshotIntoPBO(this);
    }
    if (!mReadBuffer) {
      mData = dt->ReadSnapshot(aData, aStride);
      mOwnsData = !mData || !aData;
    }
  } else if (mHandle) {
    // Assume that the target changed, so there should be a texture handle
    // holding a copy. Try to read data from the copy since we can't read
    // from the target.
    if (RefPtr<SharedContextWebgl> sharedContext = {mSharedContext}) {
      if (!aForce) {
        mReadBuffer = sharedContext->ReadSnapshotIntoPBO(this, mHandle);
      }
      if (!mReadBuffer) {
        mData = sharedContext->ReadSnapshot(mHandle, aData, aStride);
        mOwnsData = !mData || !aData;
      }
    }
  }
  return mData || mReadBuffer;
}

bool SourceSurfaceWebgl::ReadDataInto(uint8_t* aData, int32_t aStride) {
  return EnsureData(true, aData, aStride);
}

bool SourceSurfaceWebgl::ForceReadFromPBO() {
  if (mReadBuffer && EnsureData()) {
    MOZ_ASSERT(!mReadBuffer);
    return true;
  }
  return false;
}

uint8_t* SourceSurfaceWebgl::GetData() {
  if (!EnsureData()) {
    return nullptr;
  }
  if (!mOwnsData) {
    mData = Factory::CopyDataSourceSurface(mData);
    mOwnsData = true;
  }
  return mData ? mData->GetData() : nullptr;
}

int32_t SourceSurfaceWebgl::Stride() {
  if (!EnsureData()) {
    return 0;
  }
  return mData->Stride();
}

bool SourceSurfaceWebgl::Map(MapType aType, MappedSurface* aMappedSurface) {
  if (!EnsureData()) {
    return false;
  }
  if (!mOwnsData && aType != MapType::READ) {
    mData = Factory::CopyDataSourceSurface(mData);
    mOwnsData = true;
  }
  return mData && mData->Map(aType, aMappedSurface);
}

void SourceSurfaceWebgl::Unmap() {
  if (mData) {
    mData->Unmap();
  }
}

// Handler for when the owner DrawTargetWebgl is about to modify its internal
// framebuffer, and so this snapshot must be copied into a new texture, if
// possible, or read back into data, if necessary, to preserve this particular
// version of the framebuffer.
void SourceSurfaceWebgl::DrawTargetWillChange(bool aNeedHandle) {
  RefPtr<DrawTargetWebgl> dt(mDT);
  if (!dt) {
    MOZ_ASSERT_UNREACHABLE("No DrawTargetWebgl for SourceSurfaceWebgl");
    return;
  }
  // Only try to copy into a new texture handle if we don't already have data.
  // However, we still might need to immediately draw this snapshot to a WebGL
  // target, which would require a subsequent upload, so also copy into a new
  // handle even if we already have data in that case since it is faster than
  // uploading.
  if ((aNeedHandle || (!mData && !mReadBuffer)) && !mHandle) {
    // Prefer copying the framebuffer to a texture if possible.
    mHandle = dt->CopySnapshot();
    if (mHandle) {
      // Link this surface to the handle.
      mHandle->SetSurface(this);
    } else {
      // If that fails, then try to just read the data to a surface.
      EnsureData(false);
    }
  }
  mDT = nullptr;
}

// Handler for when the owner DrawTargetWebgl is itself being destroyed and
// needs to transfer ownership of its internal backing texture to the snapshot.
void SourceSurfaceWebgl::GiveTexture(RefPtr<TextureHandle> aHandle) {
  // If we get here, then the target still points to this surface as its
  // snapshot and needs to hand off its backing texture before it is destroyed.
  MOZ_ASSERT(mDT);
  MOZ_ASSERT(!mHandle);
  mHandle = aHandle.forget();
  mHandle->SetSurface(this);
  mDT = nullptr;
}

void SourceSurfaceWebgl::SetHandle(TextureHandle* aHandle) {
  MOZ_ASSERT(!mHandle);
  mFormat = aHandle->GetFormat();
  mSize = aHandle->GetSize();
  mHandle = aHandle;
  mHandle->SetSurface(this);
}

// Handler for when the owner DrawTargetWebgl is destroying the cached texture
// handle that has been allocated for this snapshot, or if the surface has
// uploaded data.
void SourceSurfaceWebgl::OnUnlinkTexture(SharedContextWebgl* aContext,
                                         TextureHandle* aHandle, bool aForce) {
  // If the snapshot was mapped before the target changed, we may have read
  // data instead of holding a copied texture handle. If subsequently we then
  // try to draw with this snapshot, we might have allocated an external texture
  // handle in the texture cache that still links to this snapshot and can cause
  // us to end up here inside OnUnlinkTexture.
  if (mHandle != aHandle) {
    return;
  }
  if (!mData && !mReadBuffer) {
    if (!aForce) {
      mReadBuffer = aContext->ReadSnapshotIntoPBO(this, mHandle);
    }
    if (!mReadBuffer) {
      mData = aContext->ReadSnapshot(mHandle);
      mOwnsData = true;
    }
  }
  mHandle = nullptr;
}

already_AddRefed<SourceSurface> SourceSurfaceWebgl::ExtractSubrect(
    const IntRect& aRect) {
  // Ensure the subrect is actually in bounds.
  if (aRect.IsEmpty() || !GetRect().Contains(aRect)) {
    return nullptr;
  }
  RefPtr<TextureHandle> subHandle;
  RefPtr<SharedContextWebgl> sharedContext;
  if (RefPtr<DrawTargetWebgl> dt = {mDT}) {
    // If this is still a snapshot linked to a target, then copy from the
    // target.
    subHandle = dt->CopySnapshot(aRect);
    sharedContext = dt->mSharedContext;
  } else if (mHandle) {
    // Otherwise, we have a handle, but we need to verify it is still linked to
    // a valid context.
    sharedContext = mSharedContext;
    if (sharedContext) {
      // Try to copy directly from the handle using the context.
      subHandle = sharedContext->CopySnapshot(aRect, mHandle);
    }
  }
  if (subHandle && sharedContext) {
    RefPtr<SourceSurfaceWebgl> surface = new SourceSurfaceWebgl(sharedContext);
    surface->SetHandle(subHandle);
    return surface.forget();
  }
  return nullptr;
}

}  // namespace mozilla::gfx

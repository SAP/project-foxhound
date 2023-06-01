/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DrawTargetWebglInternal.h"
#include "SourceSurfaceWebgl.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPrefs_gfx.h"
#include "mozilla/gfx/AAStroke.h"
#include "mozilla/gfx/Blur.h"
#include "mozilla/gfx/DrawTargetSkia.h"
#include "mozilla/gfx/gfxVars.h"
#include "mozilla/gfx/Helpers.h"
#include "mozilla/gfx/HelpersSkia.h"
#include "mozilla/gfx/Logging.h"
#include "mozilla/gfx/PathSkia.h"
#include "mozilla/gfx/Swizzle.h"
#include "mozilla/layers/ImageDataSerializer.h"

#include "ClientWebGLContext.h"
#include "WebGLChild.h"

#include "gfxPlatform.h"

namespace mozilla::gfx {

// Inserts (allocates) a rectangle of the requested size into the tree.
Maybe<IntPoint> TexturePacker::Insert(const IntSize& aSize) {
  // Check if the available space could possibly fit the requested size. If
  // not, there is no reason to continue searching within this sub-tree.
  if (mAvailable < std::min(aSize.width, aSize.height) ||
      mBounds.width < aSize.width || mBounds.height < aSize.height) {
    return Nothing();
  }
  if (mChildren) {
    // If this node has children, then try to insert into each of the children
    // in turn.
    Maybe<IntPoint> inserted = mChildren[0].Insert(aSize);
    if (!inserted) {
      inserted = mChildren[1].Insert(aSize);
    }
    // If the insertion succeeded, adjust the available state to reflect the
    // remaining space in the children.
    if (inserted) {
      mAvailable = std::max(mChildren[0].mAvailable, mChildren[1].mAvailable);
      if (!mAvailable) {
        DiscardChildren();
      }
    }
    return inserted;
  }
  // If we get here, we've encountered a leaf node. First check if its size is
  // exactly the requested size. If so, mark the node as unavailable and return
  // its offset.
  if (mBounds.Size() == aSize) {
    mAvailable = 0;
    return Some(mBounds.TopLeft());
  }
  // The node is larger than the requested size. Choose the axis which has the
  // most excess space beyond the requested size and split it so that at least
  // one of the children matches the requested size for that axis.
  if (mBounds.width - aSize.width > mBounds.height - aSize.height) {
    mChildren.reset(new TexturePacker[2]{
        TexturePacker(
            IntRect(mBounds.x, mBounds.y, aSize.width, mBounds.height)),
        TexturePacker(IntRect(mBounds.x + aSize.width, mBounds.y,
                              mBounds.width - aSize.width, mBounds.height))});
  } else {
    mChildren.reset(new TexturePacker[2]{
        TexturePacker(
            IntRect(mBounds.x, mBounds.y, mBounds.width, aSize.height)),
        TexturePacker(IntRect(mBounds.x, mBounds.y + aSize.height,
                              mBounds.width, mBounds.height - aSize.height))});
  }
  // After splitting, try to insert into the first child, which should usually
  // be big enough to accomodate the request. Adjust the available state to the
  // remaining space.
  Maybe<IntPoint> inserted = mChildren[0].Insert(aSize);
  mAvailable = std::max(mChildren[0].mAvailable, mChildren[1].mAvailable);
  return inserted;
}

// Removes (frees) a rectangle with the given bounds from the tree.
bool TexturePacker::Remove(const IntRect& aBounds) {
  if (!mChildren) {
    // If there are no children, we encountered a leaf node. Non-zero available
    // state means that this node was already removed previously. Also, if the
    // bounds don't contain the request, and assuming the tree was previously
    // split during insertion, then this node is not the node we're searching
    // for.
    if (mAvailable > 0 || !mBounds.Contains(aBounds)) {
      return false;
    }
    // The bounds match exactly and it was previously inserted, so in this case
    // we can just remove it.
    if (mBounds == aBounds) {
      mAvailable = std::min(mBounds.width, mBounds.height);
      return true;
    }
    // We need to split this leaf node so that it can exactly match the removed
    // bounds. We know the leaf node at least contains the removed bounds, but
    // needs to be subdivided until it has a child node that exactly matches.
    // Choose the axis to split with the largest amount of excess space. Within
    // that axis, choose the larger of the space before or after the subrect as
    // the split point to the new children.
    if (mBounds.width - aBounds.width > mBounds.height - aBounds.height) {
      int split = aBounds.x - mBounds.x > mBounds.XMost() - aBounds.XMost()
                      ? aBounds.x
                      : aBounds.XMost();
      mChildren.reset(new TexturePacker[2]{
          TexturePacker(
              IntRect(mBounds.x, mBounds.y, split - mBounds.x, mBounds.height),
              false),
          TexturePacker(IntRect(split, mBounds.y, mBounds.XMost() - split,
                                mBounds.height),
                        false)});
    } else {
      int split = aBounds.y - mBounds.y > mBounds.YMost() - aBounds.YMost()
                      ? aBounds.y
                      : aBounds.YMost();
      mChildren.reset(new TexturePacker[2]{
          TexturePacker(
              IntRect(mBounds.x, mBounds.y, mBounds.width, split - mBounds.y),
              false),
          TexturePacker(
              IntRect(mBounds.x, split, mBounds.width, mBounds.YMost() - split),
              false)});
    }
  }
  // We've encountered a branch node. Determine which of the two child nodes
  // would possibly contain the removed bounds. We first check which axis the
  // children were split on and then whether the removed bounds on that axis
  // are past the start of the second child. Proceed to recurse into that
  // child node for removal.
  bool next = mChildren[0].mBounds.x < mChildren[1].mBounds.x
                  ? aBounds.x >= mChildren[1].mBounds.x
                  : aBounds.y >= mChildren[1].mBounds.y;
  bool removed = mChildren[next ? 1 : 0].Remove(aBounds);
  if (removed) {
    if (mChildren[0].IsFullyAvailable() && mChildren[1].IsFullyAvailable()) {
      DiscardChildren();
      mAvailable = std::min(mBounds.width, mBounds.height);
    } else {
      mAvailable = std::max(mChildren[0].mAvailable, mChildren[1].mAvailable);
    }
  }
  return removed;
}

SharedTexture::SharedTexture(const IntSize& aSize, SurfaceFormat aFormat,
                             const RefPtr<WebGLTextureJS>& aTexture)
    : mPacker(IntRect(IntPoint(0, 0), aSize)),
      mFormat(aFormat),
      mTexture(aTexture) {}

SharedTextureHandle::SharedTextureHandle(const IntRect& aBounds,
                                         SharedTexture* aTexture)
    : mBounds(aBounds), mTexture(aTexture) {}

already_AddRefed<SharedTextureHandle> SharedTexture::Allocate(
    const IntSize& aSize) {
  RefPtr<SharedTextureHandle> handle;
  if (Maybe<IntPoint> origin = mPacker.Insert(aSize)) {
    handle = new SharedTextureHandle(IntRect(*origin, aSize), this);
    ++mAllocatedHandles;
  }
  return handle.forget();
}

bool SharedTexture::Free(const SharedTextureHandle& aHandle) {
  if (aHandle.mTexture != this) {
    return false;
  }
  if (!mPacker.Remove(aHandle.mBounds)) {
    return false;
  }
  --mAllocatedHandles;
  return true;
}

StandaloneTexture::StandaloneTexture(const IntSize& aSize,
                                     SurfaceFormat aFormat,
                                     const RefPtr<WebGLTextureJS>& aTexture)
    : mSize(aSize), mFormat(aFormat), mTexture(aTexture) {}

DrawTargetWebgl::DrawTargetWebgl() = default;

inline void DrawTargetWebgl::SharedContext::ClearLastTexture() {
  mLastTexture = nullptr;
  mLastClipMask = nullptr;
}

// Attempts to clear the snapshot state. If the snapshot is only referenced by
// this target, then it should simply be destroyed. If it is a WebGL surface in
// use by something else, then special cleanup such as reusing the texture or
// copy-on-write may be possible.
void DrawTargetWebgl::ClearSnapshot(bool aCopyOnWrite, bool aNeedHandle) {
  if (!mSnapshot) {
    return;
  }
  mSharedContext->ClearLastTexture();
  if (mSnapshot->hasOneRef() || mSnapshot->GetType() != SurfaceType::WEBGL) {
    mSnapshot = nullptr;
    return;
  }
  RefPtr<SourceSurfaceWebgl> snapshot =
      mSnapshot.forget().downcast<SourceSurfaceWebgl>();
  if (aCopyOnWrite) {
    // WebGL snapshots must be notified that the framebuffer contents will be
    // changing so that it can copy the data.
    snapshot->DrawTargetWillChange(aNeedHandle);
  } else {
    // If not copying, then give the backing texture to the surface for reuse.
    snapshot->GiveTexture(
        mSharedContext->WrapSnapshot(GetSize(), GetFormat(), mTex.forget()));
  }
}

DrawTargetWebgl::~DrawTargetWebgl() {
  ClearSnapshot(false);
  if (mSharedContext) {
    if (mShmem.IsWritable()) {
      // Force any Skia snapshots to copy the shmem before it deallocs.
      mSkia->DetachAllSnapshots();
      // Ensure we're done using the shmem before dealloc.
      mSharedContext->WaitForShmem(this);
      auto* child = mSharedContext->mWebgl->GetChild();
      if (child && child->CanSend()) {
        child->DeallocShmem(mShmem);
      }
    }
    if (mClipMask) {
      mSharedContext->mWebgl->DeleteTexture(mClipMask);
    }
    if (mFramebuffer) {
      mSharedContext->mWebgl->DeleteFramebuffer(mFramebuffer);
    }
    if (mTex) {
      mSharedContext->mWebgl->DeleteTexture(mTex);
    }
  }
}

DrawTargetWebgl::SharedContext::SharedContext() = default;

DrawTargetWebgl::SharedContext::~SharedContext() {
  if (sSharedContext.init() && sSharedContext.get() == this) {
    sSharedContext.set(nullptr);
  }
  // Detect context loss before deletion.
  if (mWebgl) {
    mWebgl->ActiveTexture(LOCAL_GL_TEXTURE0);
  }
  ClearAllTextures();
  UnlinkSurfaceTextures();
  UnlinkGlyphCaches();
}

// Remove any SourceSurface user data associated with this TextureHandle.
inline void DrawTargetWebgl::SharedContext::UnlinkSurfaceTexture(
    const RefPtr<TextureHandle>& aHandle) {
  if (SourceSurface* surface = aHandle->GetSurface()) {
    // Ensure any WebGL snapshot textures get unlinked.
    if (surface->GetType() == SurfaceType::WEBGL) {
      static_cast<SourceSurfaceWebgl*>(surface)->OnUnlinkTexture(this);
    }
    surface->RemoveUserData(aHandle->IsShadow() ? &mShadowTextureKey
                                                : &mTextureHandleKey);
  }
}

// Unlinks TextureHandles from any SourceSurface user data.
void DrawTargetWebgl::SharedContext::UnlinkSurfaceTextures() {
  for (RefPtr<TextureHandle> handle = mTextureHandles.getFirst(); handle;
       handle = handle->getNext()) {
    UnlinkSurfaceTexture(handle);
  }
}

// Unlinks GlyphCaches from any ScaledFont user data.
void DrawTargetWebgl::SharedContext::UnlinkGlyphCaches() {
  GlyphCache* cache = mGlyphCaches.getFirst();
  while (cache) {
    ScaledFont* font = cache->GetFont();
    // Access the next cache before removing the user data, as it might destroy
    // the cache.
    cache = cache->getNext();
    font->RemoveUserData(&mGlyphCacheKey);
  }
}

void DrawTargetWebgl::SharedContext::OnMemoryPressure() {
  mShouldClearCaches = true;
}

// Clear out the entire list of texture handles from any source.
void DrawTargetWebgl::SharedContext::ClearAllTextures() {
  while (!mTextureHandles.isEmpty()) {
    PruneTextureHandle(mTextureHandles.popLast());
    --mNumTextureHandles;
  }
}

// Scan through the shared texture pages looking for any that are empty and
// delete them.
void DrawTargetWebgl::SharedContext::ClearEmptyTextureMemory() {
  for (auto pos = mSharedTextures.begin(); pos != mSharedTextures.end();) {
    if (!(*pos)->HasAllocatedHandles()) {
      RefPtr<SharedTexture> shared = *pos;
      size_t usedBytes = shared->UsedBytes();
      mEmptyTextureMemory -= usedBytes;
      mTotalTextureMemory -= usedBytes;
      pos = mSharedTextures.erase(pos);
      mWebgl->DeleteTexture(shared->GetWebGLTexture());
    } else {
      ++pos;
    }
  }
}

// If there is a request to clear out the caches because of memory pressure,
// then first clear out all the texture handles in the texture cache. If there
// are still empty texture pages being kept around, then clear those too.
void DrawTargetWebgl::SharedContext::ClearCachesIfNecessary() {
  if (!mShouldClearCaches.exchange(false)) {
    return;
  }
  mZeroBuffer = nullptr;
  ClearAllTextures();
  if (mEmptyTextureMemory) {
    ClearEmptyTextureMemory();
  }
  ClearLastTexture();
}

// If a non-recoverable error occurred that would stop the canvas from initing.
static Atomic<bool> sContextInitError(false);

MOZ_THREAD_LOCAL(DrawTargetWebgl::SharedContext*)
DrawTargetWebgl::sSharedContext;

RefPtr<DrawTargetWebgl::SharedContext> DrawTargetWebgl::sMainSharedContext;

// Try to initialize a new WebGL context. Verifies that the requested size does
// not exceed the available texture limits and that shader creation succeeded.
bool DrawTargetWebgl::Init(const IntSize& size, const SurfaceFormat format) {
  MOZ_ASSERT(format == SurfaceFormat::B8G8R8A8 ||
             format == SurfaceFormat::B8G8R8X8);

  mSize = size;
  mFormat = format;

  if (!sSharedContext.init()) {
    return false;
  }

  DrawTargetWebgl::SharedContext* sharedContext = sSharedContext.get();
  if (!sharedContext || sharedContext->IsContextLost()) {
    mSharedContext = new DrawTargetWebgl::SharedContext;
    if (!mSharedContext->Initialize()) {
      mSharedContext = nullptr;
      return false;
    }

    sSharedContext.set(mSharedContext.get());

    if (NS_IsMainThread()) {
      // Keep the shared context alive for the main thread by adding a ref.
      // Ensure the ref will get cleared on shutdown so it doesn't leak.
      if (!sMainSharedContext) {
        ClearOnShutdown(&sMainSharedContext);
      }
      sMainSharedContext = mSharedContext;
    }
  } else {
    mSharedContext = sharedContext;
  }

  if (size_t(std::max(size.width, size.height)) >
      mSharedContext->mMaxTextureSize) {
    return false;
  }

  if (!CreateFramebuffer()) {
    return false;
  }

  auto* child = mSharedContext->mWebgl->GetChild();
  if (child && child->CanSend()) {
    size_t byteSize = layers::ImageDataSerializer::ComputeRGBBufferSize(
        mSize, SurfaceFormat::B8G8R8A8);
    if (byteSize) {
      (void)child->AllocUnsafeShmem(byteSize, &mShmem);
    }
  }
  mSkia = new DrawTargetSkia;
  if (mShmem.IsWritable()) {
    auto stride = layers::ImageDataSerializer::ComputeRGBStride(
        SurfaceFormat::B8G8R8A8, size.width);
    if (!mSkia->Init(mShmem.get<uint8_t>(), size, stride,
                     SurfaceFormat::B8G8R8A8, true)) {
      return false;
    }
  } else if (!mSkia->Init(size, SurfaceFormat::B8G8R8A8)) {
    return false;
  }

  // Allocate an unclipped copy of the DT pointing to its data.
  uint8_t* dtData = nullptr;
  IntSize dtSize;
  int32_t dtStride = 0;
  SurfaceFormat dtFormat = SurfaceFormat::UNKNOWN;
  if (!mSkia->LockBits(&dtData, &dtSize, &dtStride, &dtFormat)) {
    return false;
  }
  mSkiaNoClip = new DrawTargetSkia;
  if (!mSkiaNoClip->Init(dtData, dtSize, dtStride, dtFormat, true)) {
    mSkia->ReleaseBits(dtData);
    return false;
  }
  mSkia->ReleaseBits(dtData);

  SetPermitSubpixelAA(IsOpaque(format));
  return true;
}

bool DrawTargetWebgl::SharedContext::Initialize() {
  WebGLContextOptions options = {};
  options.alpha = true;
  options.depth = false;
  options.stencil = false;
  options.antialias = false;
  options.preserveDrawingBuffer = true;
  options.failIfMajorPerformanceCaveat = true;

  mWebgl = new ClientWebGLContext(true);
  mWebgl->SetContextOptions(options);
  if (mWebgl->SetDimensions(1, 1) != NS_OK) {
    // There was a non-recoverable error when trying to create a host context.
    sContextInitError = true;
    mWebgl = nullptr;
    return false;
  }
  if (mWebgl->IsContextLost()) {
    mWebgl = nullptr;
    return false;
  }

  mMaxTextureSize = mWebgl->Limits().maxTex2dSize;

  if (kIsMacOS) {
    mRasterizationTruncates = mWebgl->Vendor() == gl::GLVendor::ATI;
  }

  CachePrefs();

  if (!CreateShaders()) {
    // There was a non-recoverable error when trying to init shaders.
    sContextInitError = true;
    mWebgl = nullptr;
    return false;
  }

  return true;
}

void DrawTargetWebgl::SharedContext::SetBlendState(
    CompositionOp aOp, const Maybe<DeviceColor>& aColor) {
  if (aOp == mLastCompositionOp && mLastBlendColor == aColor) {
    return;
  }
  mLastCompositionOp = aOp;
  mLastBlendColor = aColor;
  // AA is not supported for all composition ops, so switching blend modes may
  // cause a toggle in AA state. Certain ops such as OP_SOURCE require output
  // alpha that is blended separately from AA coverage. This would require two
  // stage blending which can incur a substantial performance penalty, so to
  // work around this currently we just disable AA for those ops.
  mDirtyAA = true;

  // Map the composition op to a WebGL blend mode, if possible.
  mWebgl->Enable(LOCAL_GL_BLEND);
  switch (aOp) {
    case CompositionOp::OP_OVER:
      if (aColor) {
        // If a color is supplied, then we blend subpixel text.
        mWebgl->BlendColor(aColor->b, aColor->g, aColor->r, 1.0f);
        mWebgl->BlendFunc(LOCAL_GL_CONSTANT_COLOR,
                          LOCAL_GL_ONE_MINUS_SRC_COLOR);
      } else {
        mWebgl->BlendFunc(LOCAL_GL_ONE, LOCAL_GL_ONE_MINUS_SRC_ALPHA);
      }
      break;
    case CompositionOp::OP_ADD:
      mWebgl->BlendFunc(LOCAL_GL_ONE, LOCAL_GL_ONE);
      break;
    case CompositionOp::OP_ATOP:
      mWebgl->BlendFunc(LOCAL_GL_DST_ALPHA, LOCAL_GL_ONE_MINUS_SRC_ALPHA);
      break;
    case CompositionOp::OP_SOURCE:
      if (aColor) {
        // If a color is supplied, then we assume there is clipping or AA. This
        // requires that we still use an over blend func with the clip/AA alpha,
        // while filling the interior with the unaltered color. Normally this
        // would require dual source blending, but we can emulate it with only
        // a blend color.
        mWebgl->BlendColor(aColor->b, aColor->g, aColor->r, aColor->a);
        mWebgl->BlendFunc(LOCAL_GL_CONSTANT_COLOR,
                          LOCAL_GL_ONE_MINUS_SRC_COLOR);
      } else {
        mWebgl->Disable(LOCAL_GL_BLEND);
      }
      break;
    default:
      mWebgl->Disable(LOCAL_GL_BLEND);
      break;
  }
}

// Ensure the WebGL framebuffer is set to the current target.
bool DrawTargetWebgl::SharedContext::SetTarget(DrawTargetWebgl* aDT) {
  if (!mWebgl || mWebgl->IsContextLost()) {
    return false;
  }
  if (aDT != mCurrentTarget) {
    mCurrentTarget = aDT;
    if (aDT) {
      mWebgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, aDT->mFramebuffer);
      mViewportSize = aDT->GetSize();
      mWebgl->Viewport(0, 0, mViewportSize.width, mViewportSize.height);
      // Force the viewport to be reset.
      mDirtyViewport = true;
    }
  }
  return true;
}

bool DrawTargetWebgl::SharedContext::SetClipMask(
    const RefPtr<WebGLTextureJS>& aTex) {
  if (mLastClipMask != aTex) {
    if (!mWebgl) {
      return false;
    }
    mWebgl->ActiveTexture(LOCAL_GL_TEXTURE1);
    mWebgl->BindTexture(LOCAL_GL_TEXTURE_2D, aTex);
    mWebgl->ActiveTexture(LOCAL_GL_TEXTURE0);
    mLastClipMask = aTex;
  }
  return true;
}

bool DrawTargetWebgl::SharedContext::SetNoClipMask() {
  if (mNoClipMask) {
    return SetClipMask(mNoClipMask);
  }
  if (!mWebgl) {
    return false;
  }
  mNoClipMask = mWebgl->CreateTexture();
  if (!mNoClipMask) {
    return false;
  }
  mWebgl->ActiveTexture(LOCAL_GL_TEXTURE1);
  mWebgl->BindTexture(LOCAL_GL_TEXTURE_2D, mNoClipMask);
  static const uint8_t solidMask[4] = {0xFF, 0xFF, 0xFF, 0xFF};
  mWebgl->RawTexImage(
      0, LOCAL_GL_RGBA8, {0, 0, 0}, {LOCAL_GL_RGBA, LOCAL_GL_UNSIGNED_BYTE},
      {LOCAL_GL_TEXTURE_2D,
       {1, 1, 1},
       gfxAlphaType::NonPremult,
       Some(RawBuffer(Range<const uint8_t>(solidMask, sizeof(solidMask))))});
  InitTexParameters(mNoClipMask, false);
  mWebgl->ActiveTexture(LOCAL_GL_TEXTURE0);
  mLastClipMask = mNoClipMask;
  return true;
}

inline bool DrawTargetWebgl::ClipStack::operator==(
    const DrawTargetWebgl::ClipStack& aOther) const {
  // Verify the transform and bounds match.
  if (!mTransform.FuzzyEquals(aOther.mTransform) ||
      !mRect.IsEqualInterior(aOther.mRect)) {
    return false;
  }
  // Verify the paths match.
  if (!mPath) {
    return !aOther.mPath;
  }
  if (!aOther.mPath ||
      mPath->GetBackendType() != aOther.mPath->GetBackendType()) {
    return false;
  }
  if (mPath->GetBackendType() != BackendType::SKIA) {
    return mPath == aOther.mPath;
  }
  return static_cast<const PathSkia*>(mPath.get())->GetPath() ==
         static_cast<const PathSkia*>(aOther.mPath.get())->GetPath();
}

// If the clip region can't be approximated by a simple clip rect, then we need
// to generate a clip mask that can represent the clip region per-pixel. We
// render to the Skia target temporarily, transparent outside the clip region,
// opaque inside, and upload this to a texture that can be used by the shaders.
bool DrawTargetWebgl::GenerateComplexClipMask() {
  if (!mClipChanged || (mClipMask && mCachedClipStack == mClipStack)) {
    mClipChanged = false;
    // If the clip mask was already generated, use the cached mask and bounds.
    mSharedContext->SetClipMask(mClipMask);
    mSharedContext->SetClipRect(mClipBounds);
    return true;
  }
  if (!mWebglValid) {
    // If the Skia target is currently being used, then we can't render the mask
    // in it.
    return false;
  }
  RefPtr<ClientWebGLContext> webgl = mSharedContext->mWebgl;
  if (!webgl) {
    return false;
  }
  bool init = false;
  if (!mClipMask) {
    mClipMask = webgl->CreateTexture();
    if (!mClipMask) {
      return false;
    }
    init = true;
  }
  // Try to get the bounds of the clip to limit the size of the mask.
  if (Maybe<IntRect> clip = mSkia->GetDeviceClipRect(true)) {
    mClipBounds = *clip;
  } else {
    // If we can't get bounds, then just use the entire viewport.
    mClipBounds = IntRect(IntPoint(), mSize);
  }
  // If initializing the clip mask, then allocate the entire texture to ensure
  // all pixels get filled with an empty mask regardless. Otherwise, restrict
  // uploading to only the clip region.
  RefPtr<DrawTargetSkia> dt = new DrawTargetSkia;
  if (!dt->Init(mClipBounds.Size(), SurfaceFormat::A8)) {
    return false;
  }
  // Set the clip region and fill the entire inside of it
  // with opaque white.
  mCachedClipStack.clear();
  for (auto& clipStack : mClipStack) {
    // Record the current state of the clip stack for this mask.
    mCachedClipStack.push_back(clipStack);
    dt->SetTransform(
        Matrix(clipStack.mTransform).PostTranslate(-mClipBounds.TopLeft()));
    if (clipStack.mPath) {
      dt->PushClip(clipStack.mPath);
    } else {
      dt->PushClipRect(clipStack.mRect);
    }
  }
  dt->SetTransform(Matrix::Translation(-mClipBounds.TopLeft()));
  dt->FillRect(Rect(mClipBounds), ColorPattern(DeviceColor(1, 1, 1, 1)));
  // Bind the clip mask for uploading.
  webgl->ActiveTexture(LOCAL_GL_TEXTURE1);
  webgl->BindTexture(LOCAL_GL_TEXTURE_2D, mClipMask);
  if (init) {
    mSharedContext->InitTexParameters(mClipMask, false);
  }
  RefPtr<DataSourceSurface> data;
  if (RefPtr<SourceSurface> snapshot = dt->Snapshot()) {
    data = snapshot->GetDataSurface();
  }
  // Finally, upload the texture data and initialize texture storage if
  // necessary.
  if (init && mClipBounds.Size() != mSize) {
    mSharedContext->UploadSurface(nullptr, SurfaceFormat::A8,
                                  IntRect(IntPoint(), mSize), IntPoint(), true,
                                  true);
    init = false;
  }
  mSharedContext->UploadSurface(data, SurfaceFormat::A8,
                                IntRect(IntPoint(), mClipBounds.Size()),
                                mClipBounds.TopLeft(), init);
  webgl->ActiveTexture(LOCAL_GL_TEXTURE0);
  // We already bound the texture, so notify the shared context that the clip
  // mask changed to it.
  mSharedContext->mLastClipMask = mClipMask;
  mSharedContext->SetClipRect(mClipBounds);
  // We uploaded a surface, just as if we missed the texture cache, so account
  // for that here.
  mProfile.OnCacheMiss();
  return !!data;
}

bool DrawTargetWebgl::SetSimpleClipRect() {
  // Determine whether the clipping rectangle is simple enough to accelerate.
  // Check if there is a device space clip rectangle available from the Skia
  // target.
  Maybe<IntRect> clip = mSkia->GetDeviceClipRect(false);
  if (!clip) {
    return false;
  }
  // If the clip is empty, leave the final integer clip rectangle empty to
  // trivially discard the draw request.
  // If the clip rect is larger than the viewport, just set it to the
  // viewport.
  if (!clip->IsEmpty() && clip->Contains(IntRect(IntPoint(), mSize))) {
    clip = Some(IntRect(IntPoint(), mSize));
  }
  mSharedContext->SetClipRect(*clip);
  mSharedContext->SetNoClipMask();
  return true;
}

// Installs the Skia clip rectangle, if applicable, onto the shared WebGL
// context as well as sets the WebGL framebuffer to the current target.
bool DrawTargetWebgl::PrepareContext(bool aClipped) {
  if (!aClipped) {
    // If no clipping requested, just set the clip rect to the viewport.
    mSharedContext->SetClipRect(IntRect(IntPoint(), mSize));
    mSharedContext->SetNoClipMask();
    // Ensure the clip gets reset if clipping is later requested for the target.
    mRefreshClipState = true;
  } else if (mRefreshClipState || !mSharedContext->IsCurrentTarget(this)) {
    // Try to use a simple clip rect if possible. Otherwise, fall back to
    // generating a clip mask texture that can represent complex clip regions.
    if (!SetSimpleClipRect() && !GenerateComplexClipMask()) {
      return false;
    }
    mClipChanged = false;
    mRefreshClipState = false;
  }
  return mSharedContext->SetTarget(this);
}

bool DrawTargetWebgl::SharedContext::IsContextLost() const {
  return !mWebgl || mWebgl->IsContextLost();
}

// Signal to CanvasRenderingContext2D when the WebGL context is lost.
bool DrawTargetWebgl::IsValid() const {
  return mSharedContext && !mSharedContext->IsContextLost();
}

already_AddRefed<DrawTargetWebgl> DrawTargetWebgl::Create(
    const IntSize& aSize, SurfaceFormat aFormat) {
  if (!gfxVars::UseAcceleratedCanvas2D()) {
    return nullptr;
  }

  // If context initialization would fail, don't even try to create a context.
  if (sContextInitError) {
    return nullptr;
  }

  if (!Factory::AllowedSurfaceSize(aSize)) {
    return nullptr;
  }

  // The interpretation of the min-size and max-size follows from the old
  // SkiaGL prefs. First just ensure that the context is not unreasonably
  // small.
  static const int32_t kMinDimension = 16;
  if (std::min(aSize.width, aSize.height) < kMinDimension) {
    return nullptr;
  }

  int32_t minSize = StaticPrefs::gfx_canvas_accelerated_min_size();
  if (aSize.width * aSize.height < minSize * minSize) {
    return nullptr;
  }

  // Maximum pref allows 3 different options:
  //  0 means unlimited size,
  //  > 0 means use value as an absolute threshold,
  //  < 0 means use the number of screen pixels as a threshold.
  int32_t maxSize = StaticPrefs::gfx_canvas_accelerated_max_size();
  if (maxSize > 0) {
    if (std::max(aSize.width, aSize.height) > maxSize) {
      return nullptr;
    }
  } else if (maxSize < 0) {
    // Default to historical mobile screen size of 980x480, like FishIEtank.
    // In addition, allow acceleration up to this size even if the screen is
    // smaller. A lot content expects this size to work well. See Bug 999841
    static const int32_t kScreenPixels = 980 * 480;
    IntSize screenSize = gfxPlatform::GetPlatform()->GetScreenSize();
    if (aSize.width * aSize.height >
        std::max(screenSize.width * screenSize.height, kScreenPixels)) {
      return nullptr;
    }
  }

  RefPtr<DrawTargetWebgl> dt = new DrawTargetWebgl;
  if (!dt->Init(aSize, aFormat) || !dt->IsValid()) {
    return nullptr;
  }

  return dt.forget();
}

void* DrawTargetWebgl::GetNativeSurface(NativeSurfaceType aType) {
  switch (aType) {
    case NativeSurfaceType::WEBGL_CONTEXT:
      // If the context is lost, then don't attempt to access it.
      if (mSharedContext->IsContextLost()) {
        return nullptr;
      }
      if (!mWebglValid) {
        FlushFromSkia();
      }
      return mSharedContext->mWebgl.get();
    default:
      return nullptr;
  }
}

// Wrap a WebGL texture holding a snapshot with a texture handle. Note that
// while the texture is still in use as the backing texture of a framebuffer,
// it's texture memory is not currently tracked with other texture handles.
// Once it is finally orphaned and used as a texture handle, it must be added
// to the resource usage totals.
already_AddRefed<TextureHandle> DrawTargetWebgl::SharedContext::WrapSnapshot(
    const IntSize& aSize, SurfaceFormat aFormat, RefPtr<WebGLTextureJS> aTex) {
  // Ensure there is enough space for the texture.
  size_t usedBytes = TextureHandle::UsedBytes(aFormat, aSize);
  PruneTextureMemory(usedBytes, false);
  // Allocate a handle for the texture
  RefPtr<StandaloneTexture> handle =
      new StandaloneTexture(aSize, aFormat, aTex.forget());
  mStandaloneTextures.push_back(handle);
  mTextureHandles.insertFront(handle);
  mTotalTextureMemory += usedBytes;
  mUsedTextureMemory += usedBytes;
  ++mNumTextureHandles;
  return handle.forget();
}

void DrawTargetWebgl::SharedContext::SetTexFilter(WebGLTextureJS* aTex,
                                                  bool aFilter) {
  mWebgl->TexParameteri(LOCAL_GL_TEXTURE_2D, LOCAL_GL_TEXTURE_MAG_FILTER,
                        aFilter ? LOCAL_GL_LINEAR : LOCAL_GL_NEAREST);
  mWebgl->TexParameteri(LOCAL_GL_TEXTURE_2D, LOCAL_GL_TEXTURE_MIN_FILTER,
                        aFilter ? LOCAL_GL_LINEAR : LOCAL_GL_NEAREST);
}

void DrawTargetWebgl::SharedContext::InitTexParameters(WebGLTextureJS* aTex,
                                                       bool aFilter) {
  mWebgl->TexParameteri(LOCAL_GL_TEXTURE_2D, LOCAL_GL_TEXTURE_WRAP_S,
                        LOCAL_GL_CLAMP_TO_EDGE);
  mWebgl->TexParameteri(LOCAL_GL_TEXTURE_2D, LOCAL_GL_TEXTURE_WRAP_T,
                        LOCAL_GL_CLAMP_TO_EDGE);
  SetTexFilter(aTex, aFilter);
}

// Copy the contents of the WebGL framebuffer into a WebGL texture.
already_AddRefed<TextureHandle> DrawTargetWebgl::SharedContext::CopySnapshot(
    const IntRect& aRect, TextureHandle* aHandle) {
  if (!mWebgl || mWebgl->IsContextLost()) {
    return nullptr;
  }

  // If the target is going away, then we can just directly reuse the
  // framebuffer texture since it will never change.
  RefPtr<WebGLTextureJS> tex = mWebgl->CreateTexture();
  if (!tex) {
    return nullptr;
  }

  // If copying from a non-DT source, we have to bind a scratch framebuffer for
  // reading.
  if (aHandle) {
    if (!mScratchFramebuffer) {
      mScratchFramebuffer = mWebgl->CreateFramebuffer();
    }
    mWebgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, mScratchFramebuffer);
    mWebgl->FramebufferTexture2D(
        LOCAL_GL_FRAMEBUFFER, LOCAL_GL_COLOR_ATTACHMENT0, LOCAL_GL_TEXTURE_2D,
        aHandle->GetWebGLTexture(), 0);
  }

  // Create a texture to hold the copy
  mWebgl->BindTexture(LOCAL_GL_TEXTURE_2D, tex);
  mWebgl->TexStorage2D(LOCAL_GL_TEXTURE_2D, 1, LOCAL_GL_RGBA8, aRect.width,
                       aRect.height);
  InitTexParameters(tex);
  // Copy the framebuffer into the texture
  mWebgl->CopyTexSubImage2D(LOCAL_GL_TEXTURE_2D, 0, 0, 0, aRect.x, aRect.y,
                            aRect.width, aRect.height);
  ClearLastTexture();

  SurfaceFormat format =
      aHandle ? aHandle->GetFormat() : mCurrentTarget->GetFormat();
  already_AddRefed<TextureHandle> result =
      WrapSnapshot(aRect.Size(), format, tex.forget());

  // Restore the actual framebuffer after reading is done.
  if (aHandle && mCurrentTarget) {
    mWebgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, mCurrentTarget->mFramebuffer);
  }

  return result;
}

inline DrawTargetWebgl::AutoRestoreContext::AutoRestoreContext(
    DrawTargetWebgl* aTarget)
    : mTarget(aTarget),
      mClipRect(aTarget->mSharedContext->mClipRect),
      mLastClipMask(aTarget->mSharedContext->mLastClipMask) {}

inline DrawTargetWebgl::AutoRestoreContext::~AutoRestoreContext() {
  mTarget->mSharedContext->SetClipRect(mClipRect);
  if (mLastClipMask) {
    mTarget->mSharedContext->SetClipMask(mLastClipMask);
  }
  mTarget->mRefreshClipState = true;
}

// Utility method to install the target before copying a snapshot.
already_AddRefed<TextureHandle> DrawTargetWebgl::CopySnapshot(
    const IntRect& aRect) {
  AutoRestoreContext restore(this);
  if (!PrepareContext(false)) {
    return nullptr;
  }
  return mSharedContext->CopySnapshot(aRect);
}

// Borrow a snapshot that may be used by another thread for composition. Only
// Skia snapshots are safe to pass around.
already_AddRefed<SourceSurface> DrawTargetWebgl::GetDataSnapshot() {
  if (!mSkiaValid) {
    ReadIntoSkia();
  } else if (mSkiaLayer) {
    FlattenSkia();
  }
  return mSkia->Snapshot(mFormat);
}

already_AddRefed<SourceSurface> DrawTargetWebgl::Snapshot() {
  // If already using the Skia fallback, then just snapshot that.
  if (mSkiaValid) {
    return GetDataSnapshot();
  }

  // There's no valid Skia snapshot, so we need to get one from the WebGL
  // context.
  if (!mSnapshot) {
    // Create a copy-on-write reference to this target.
    mSnapshot = new SourceSurfaceWebgl(this);
  }
  return do_AddRef(mSnapshot);
}

// If we need to provide a snapshot for another DrawTargetWebgl that shares the
// same WebGL context, then it is safe to directly return a snapshot. Otherwise,
// we may be exporting to another thread and require a data snapshot.
already_AddRefed<SourceSurface> DrawTargetWebgl::GetOptimizedSnapshot(
    DrawTarget* aTarget) {
  if (aTarget && aTarget->GetBackendType() == BackendType::WEBGL &&
      static_cast<DrawTargetWebgl*>(aTarget)->mSharedContext ==
          mSharedContext) {
    return Snapshot();
  }
  return GetDataSnapshot();
}

// Read from the WebGL context into a buffer. This handles both swizzling BGRA
// to RGBA and flipping the image.
bool DrawTargetWebgl::SharedContext::ReadInto(uint8_t* aDstData,
                                              int32_t aDstStride,
                                              SurfaceFormat aFormat,
                                              const IntRect& aBounds,
                                              TextureHandle* aHandle) {
  MOZ_ASSERT(aFormat == SurfaceFormat::B8G8R8A8 ||
             aFormat == SurfaceFormat::B8G8R8X8);

  // If reading into a new texture, we have to bind it to a scratch framebuffer
  // for reading.
  if (aHandle) {
    if (!mScratchFramebuffer) {
      mScratchFramebuffer = mWebgl->CreateFramebuffer();
    }
    mWebgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, mScratchFramebuffer);
    mWebgl->FramebufferTexture2D(
        LOCAL_GL_FRAMEBUFFER, LOCAL_GL_COLOR_ATTACHMENT0, LOCAL_GL_TEXTURE_2D,
        aHandle->GetWebGLTexture(), 0);
  }

  webgl::ReadPixelsDesc desc;
  desc.srcOffset = *ivec2::From(aBounds);
  desc.size = *uvec2::FromSize(aBounds);
  desc.packState.rowLength = aDstStride / 4;

  bool success = false;
  if (mCurrentTarget && mCurrentTarget->mShmem.IsWritable() &&
      aDstData == mCurrentTarget->mShmem.get<uint8_t>()) {
    success = mWebgl->DoReadPixels(desc, mCurrentTarget->mShmem);
  } else {
    Range<uint8_t> range = {aDstData, size_t(aDstStride) * aBounds.height};
    success = mWebgl->DoReadPixels(desc, range);
  }

  // Restore the actual framebuffer after reading is done.
  if (aHandle && mCurrentTarget) {
    mWebgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, mCurrentTarget->mFramebuffer);
  }

  return success;
}

already_AddRefed<DataSourceSurface>
DrawTargetWebgl::SharedContext::ReadSnapshot(TextureHandle* aHandle) {
  // Allocate a data surface, map it, and read from the WebGL context into the
  // surface.
  SurfaceFormat format = SurfaceFormat::UNKNOWN;
  IntRect bounds;
  if (aHandle) {
    format = aHandle->GetFormat();
    bounds = aHandle->GetBounds();
  } else {
    format = mCurrentTarget->GetFormat();
    bounds = mCurrentTarget->GetRect();
  }
  RefPtr<DataSourceSurface> surface =
      Factory::CreateDataSourceSurface(bounds.Size(), format);
  if (!surface) {
    return nullptr;
  }
  DataSourceSurface::ScopedMap dstMap(surface, DataSourceSurface::WRITE);
  if (!dstMap.IsMapped() || !ReadInto(dstMap.GetData(), dstMap.GetStride(),
                                      format, bounds, aHandle)) {
    return nullptr;
  }
  return surface.forget();
}

// Utility method to install the target before reading a snapshot.
bool DrawTargetWebgl::ReadInto(uint8_t* aDstData, int32_t aDstStride) {
  if (!PrepareContext(false)) {
    return false;
  }

  return mSharedContext->ReadInto(aDstData, aDstStride, GetFormat(), GetRect());
}

// Utility method to install the target before reading a snapshot.
already_AddRefed<DataSourceSurface> DrawTargetWebgl::ReadSnapshot() {
  AutoRestoreContext restore(this);
  if (!PrepareContext(false)) {
    return nullptr;
  }
  mProfile.OnReadback();
  return mSharedContext->ReadSnapshot();
}

already_AddRefed<SourceSurface> DrawTargetWebgl::GetBackingSurface() {
  return Snapshot();
}

void DrawTargetWebgl::DetachAllSnapshots() {
  mSkia->DetachAllSnapshots();
  ClearSnapshot();
}

// Prepare the framebuffer for accelerated drawing. Any cached snapshots will
// be invalidated if not detached and copied here. Ensure the WebGL
// framebuffer's contents are updated if still somehow stored in the Skia
// framebuffer.
bool DrawTargetWebgl::MarkChanged() {
  if (mSnapshot) {
    // Try to copy the target into a new texture if possible.
    ClearSnapshot(true, true);
  }
  if (!mWebglValid && !FlushFromSkia()) {
    return false;
  }
  mSkiaValid = false;
  return true;
}

bool DrawTargetWebgl::LockBits(uint8_t** aData, IntSize* aSize,
                               int32_t* aStride, SurfaceFormat* aFormat,
                               IntPoint* aOrigin) {
  // Can only access pixels if there is valid, flattened Skia data.
  if (mSkiaValid && !mSkiaLayer) {
    MarkSkiaChanged();
    return mSkia->LockBits(aData, aSize, aStride, aFormat, aOrigin);
  }
  return false;
}

void DrawTargetWebgl::ReleaseBits(uint8_t* aData) {
  // Can only access pixels if there is valid, flattened Skia data.
  if (mSkiaValid && !mSkiaLayer) {
    mSkia->ReleaseBits(aData);
  }
}

// Format is x, y, alpha
static const float kRectVertexData[12] = {0.0f, 0.0f, 1.0f, 1.0f, 0.0f, 1.0f,
                                          1.0f, 1.0f, 1.0f, 0.0f, 1.0f, 1.0f};

// Orphans the contents of the path vertex buffer. The beginning of the buffer
// always contains data for a simple rectangle draw to avoid needing to switch
// buffers.
void DrawTargetWebgl::SharedContext::ResetPathVertexBuffer(bool aChanged) {
  mWebgl->BindBuffer(LOCAL_GL_ARRAY_BUFFER, mPathVertexBuffer.get());
  mWebgl->RawBufferData(
      LOCAL_GL_ARRAY_BUFFER, nullptr,
      std::max(size_t(mPathVertexCapacity), sizeof(kRectVertexData)),
      LOCAL_GL_DYNAMIC_DRAW);
  mWebgl->RawBufferSubData(LOCAL_GL_ARRAY_BUFFER, 0,
                           (const uint8_t*)kRectVertexData,
                           sizeof(kRectVertexData));
  mPathVertexOffset = sizeof(kRectVertexData);
  if (aChanged) {
    mWGROutputBuffer.reset(
        mPathVertexCapacity > 0
            ? new (fallible) WGR::OutputVertex[mPathVertexCapacity /
                                               sizeof(WGR::OutputVertex)]
            : nullptr);
  }
}

// Attempts to create all shaders and resources to be used for drawing commands.
// Returns whether or not this succeeded.
bool DrawTargetWebgl::SharedContext::CreateShaders() {
  if (!mPathVertexArray) {
    mPathVertexArray = mWebgl->CreateVertexArray();
  }
  if (!mPathVertexBuffer) {
    mPathVertexBuffer = mWebgl->CreateBuffer();
    mWebgl->BindVertexArray(mPathVertexArray.get());
    ResetPathVertexBuffer();
    mWebgl->EnableVertexAttribArray(0);
    mWebgl->VertexAttribPointer(0, 3, LOCAL_GL_FLOAT, LOCAL_GL_FALSE, 0, 0);
  }
  if (!mSolidProgram) {
    // AA is computed by using the basis vectors of the transform to determine
    // both the scale and orientation. The scale is then used to extrude the
    // rectangle outward by 1 screen-space pixel to account for the AA region.
    // The distance to the rectangle edges is passed to the fragment shader in
    // an interpolant, biased by 0.5 so it represents the desired coverage. The
    // minimum coverage is then chosen by the fragment shader to use as an AA
    // coverage value to modulate the color.
    auto vsSource =
        u"attribute vec3 a_vertex;\n"
        "uniform vec2 u_transform[3];\n"
        "uniform vec2 u_viewport;\n"
        "uniform float u_aa;\n"
        "varying vec2 v_cliptc;\n"
        "varying vec4 v_dist;\n"
        "varying float v_alpha;\n"
        "void main() {\n"
        "   vec2 scale = vec2(dot(u_transform[0], u_transform[0]),\n"
        "                     dot(u_transform[1], u_transform[1]));\n"
        "   vec2 invScale = u_aa * inversesqrt(scale + 1.0e-6);\n"
        "   scale *= invScale;\n"
        "   vec2 extrude = a_vertex.xy + invScale * (2.0 * a_vertex.xy - "
        "1.0);\n"
        "   vec2 vertex = u_transform[0] * extrude.x +\n"
        "                 u_transform[1] * extrude.y +\n"
        "                 u_transform[2];\n"
        "   gl_Position = vec4(vertex * 2.0 / u_viewport - 1.0, 0.0, 1.0);\n"
        "   v_cliptc = vertex / u_viewport;\n"
        "   v_dist = vec4(extrude, 1.0 - extrude) * scale.xyxy + 1.5 - u_aa;\n"
        "   v_alpha = a_vertex.z;\n"
        "}\n"_ns;
    auto fsSource =
        u"precision mediump float;\n"
        "uniform vec4 u_color;\n"
        "uniform sampler2D u_clipmask;\n"
        "varying vec2 v_cliptc;\n"
        "varying vec4 v_dist;\n"
        "varying float v_alpha;\n"
        "void main() {\n"
        "   float clip = texture2D(u_clipmask, v_cliptc).r;\n"
        "   vec2 dist = min(v_dist.xy, v_dist.zw);\n"
        "   float aa = v_alpha * clamp(min(dist.x, dist.y), 0.0, 1.0);\n"
        "   gl_FragColor = clip * aa * u_color;\n"
        "}\n"_ns;
    RefPtr<WebGLShaderJS> vsId = mWebgl->CreateShader(LOCAL_GL_VERTEX_SHADER);
    mWebgl->ShaderSource(*vsId, vsSource);
    mWebgl->CompileShader(*vsId);
    if (!mWebgl->GetCompileResult(*vsId).success) {
      return false;
    }
    RefPtr<WebGLShaderJS> fsId = mWebgl->CreateShader(LOCAL_GL_FRAGMENT_SHADER);
    mWebgl->ShaderSource(*fsId, fsSource);
    mWebgl->CompileShader(*fsId);
    if (!mWebgl->GetCompileResult(*fsId).success) {
      return false;
    }
    mSolidProgram = mWebgl->CreateProgram();
    mWebgl->AttachShader(*mSolidProgram, *vsId);
    mWebgl->AttachShader(*mSolidProgram, *fsId);
    mWebgl->BindAttribLocation(*mSolidProgram, 0, u"a_vertex"_ns);
    mWebgl->LinkProgram(*mSolidProgram);
    if (!mWebgl->GetLinkResult(*mSolidProgram).success) {
      return false;
    }
    mSolidProgramViewport =
        mWebgl->GetUniformLocation(*mSolidProgram, u"u_viewport"_ns);
    mSolidProgramAA = mWebgl->GetUniformLocation(*mSolidProgram, u"u_aa"_ns);
    mSolidProgramTransform =
        mWebgl->GetUniformLocation(*mSolidProgram, u"u_transform"_ns);
    mSolidProgramColor =
        mWebgl->GetUniformLocation(*mSolidProgram, u"u_color"_ns);
    mSolidProgramClipMask =
        mWebgl->GetUniformLocation(*mSolidProgram, u"u_clipmask"_ns);
    if (!mSolidProgramViewport || !mSolidProgramAA || !mSolidProgramTransform ||
        !mSolidProgramColor || !mSolidProgramClipMask) {
      return false;
    }
    mWebgl->UseProgram(mSolidProgram);
    int32_t clipMaskData = 1;
    mWebgl->UniformData(LOCAL_GL_INT, mSolidProgramClipMask, false,
                        {(const uint8_t*)&clipMaskData, sizeof(clipMaskData)});
  }

  if (!mImageProgram) {
    auto vsSource =
        u"attribute vec3 a_vertex;\n"
        "uniform vec2 u_viewport;\n"
        "uniform float u_aa;\n"
        "uniform vec2 u_transform[3];\n"
        "uniform vec2 u_texmatrix[3];\n"
        "varying vec2 v_cliptc;\n"
        "varying vec2 v_texcoord;\n"
        "varying vec4 v_dist;\n"
        "varying float v_alpha;\n"
        "void main() {\n"
        "   vec2 scale = vec2(dot(u_transform[0], u_transform[0]),\n"
        "                     dot(u_transform[1], u_transform[1]));\n"
        "   vec2 invScale = u_aa * inversesqrt(scale + 1.0e-6);\n"
        "   scale *= invScale;\n"
        "   vec2 extrude = a_vertex.xy + invScale * (2.0 * a_vertex.xy - "
        "1.0);\n"
        "   vec2 vertex = u_transform[0] * extrude.x +\n"
        "                 u_transform[1] * extrude.y +\n"
        "                 u_transform[2];\n"
        "   gl_Position = vec4(vertex * 2.0 / u_viewport - 1.0, 0.0, 1.0);\n"
        "   v_cliptc = vertex / u_viewport;\n"
        "   v_texcoord = u_texmatrix[0] * extrude.x +\n"
        "                u_texmatrix[1] * extrude.y +\n"
        "                u_texmatrix[2];\n"
        "   v_dist = vec4(extrude, 1.0 - extrude) * scale.xyxy + 1.5 - u_aa;\n"
        "   v_alpha = a_vertex.z;\n"
        "}\n"_ns;
    auto fsSource =
        u"precision mediump float;\n"
        "uniform vec4 u_texbounds;\n"
        "uniform vec4 u_color;\n"
        "uniform float u_swizzle;\n"
        "uniform sampler2D u_sampler;\n"
        "uniform sampler2D u_clipmask;\n"
        "varying vec2 v_cliptc;\n"
        "varying vec2 v_texcoord;\n"
        "varying vec4 v_dist;\n"
        "varying float v_alpha;\n"
        "void main() {\n"
        "   vec2 tc = clamp(v_texcoord, u_texbounds.xy, u_texbounds.zw);\n"
        "   vec4 image = texture2D(u_sampler, tc);\n"
        "   float clip = texture2D(u_clipmask, v_cliptc).r;\n"
        "   vec2 dist = min(v_dist.xy, v_dist.zw);\n"
        "   float aa = v_alpha * clamp(min(dist.x, dist.y), 0.0, 1.0);\n"
        "   gl_FragColor = clip * aa * u_color *\n"
        "                  mix(image, image.rrrr, u_swizzle);\n"
        "}\n"_ns;
    RefPtr<WebGLShaderJS> vsId = mWebgl->CreateShader(LOCAL_GL_VERTEX_SHADER);
    mWebgl->ShaderSource(*vsId, vsSource);
    mWebgl->CompileShader(*vsId);
    if (!mWebgl->GetCompileResult(*vsId).success) {
      return false;
    }
    RefPtr<WebGLShaderJS> fsId = mWebgl->CreateShader(LOCAL_GL_FRAGMENT_SHADER);
    mWebgl->ShaderSource(*fsId, fsSource);
    mWebgl->CompileShader(*fsId);
    if (!mWebgl->GetCompileResult(*fsId).success) {
      return false;
    }
    mImageProgram = mWebgl->CreateProgram();
    mWebgl->AttachShader(*mImageProgram, *vsId);
    mWebgl->AttachShader(*mImageProgram, *fsId);
    mWebgl->BindAttribLocation(*mImageProgram, 0, u"a_vertex"_ns);
    mWebgl->LinkProgram(*mImageProgram);
    if (!mWebgl->GetLinkResult(*mImageProgram).success) {
      return false;
    }
    mImageProgramViewport =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_viewport"_ns);
    mImageProgramAA = mWebgl->GetUniformLocation(*mImageProgram, u"u_aa"_ns);
    mImageProgramTransform =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_transform"_ns);
    mImageProgramTexMatrix =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_texmatrix"_ns);
    mImageProgramTexBounds =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_texbounds"_ns);
    mImageProgramSwizzle =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_swizzle"_ns);
    mImageProgramColor =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_color"_ns);
    mImageProgramSampler =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_sampler"_ns);
    mImageProgramClipMask =
        mWebgl->GetUniformLocation(*mImageProgram, u"u_clipmask"_ns);
    if (!mImageProgramViewport || !mImageProgramAA || !mImageProgramTransform ||
        !mImageProgramTexMatrix || !mImageProgramTexBounds ||
        !mImageProgramSwizzle || !mImageProgramColor || !mImageProgramSampler ||
        !mImageProgramClipMask) {
      return false;
    }
    mWebgl->UseProgram(mImageProgram);
    int32_t samplerData = 0;
    mWebgl->UniformData(LOCAL_GL_INT, mImageProgramSampler, false,
                        {(const uint8_t*)&samplerData, sizeof(samplerData)});
    int32_t clipMaskData = 1;
    mWebgl->UniformData(LOCAL_GL_INT, mImageProgramClipMask, false,
                        {(const uint8_t*)&clipMaskData, sizeof(clipMaskData)});
  }
  return true;
}

void DrawTargetWebgl::ClearRect(const Rect& aRect) {
  // OP_SOURCE may not be bounded by a mask, so we ensure that a clip is pushed
  // here to avoid a group being pushed for it.
  PushClipRect(aRect);
  ColorPattern pattern(
      DeviceColor(0.0f, 0.0f, 0.0f, IsOpaque(mFormat) ? 1.0f : 0.0f));
  DrawRect(aRect, pattern, DrawOptions(1.0f, CompositionOp::OP_SOURCE));
  PopClip();
}

// Attempts to create the framebuffer used for drawing and also any relevant
// non-shared resources. Returns whether or not this succeeded.
bool DrawTargetWebgl::CreateFramebuffer() {
  RefPtr<ClientWebGLContext> webgl = mSharedContext->mWebgl;
  if (!mFramebuffer) {
    mFramebuffer = webgl->CreateFramebuffer();
  }
  if (!mTex) {
    mTex = webgl->CreateTexture();
    webgl->BindTexture(LOCAL_GL_TEXTURE_2D, mTex);
    webgl->TexStorage2D(LOCAL_GL_TEXTURE_2D, 1, LOCAL_GL_RGBA8, mSize.width,
                        mSize.height);
    mSharedContext->InitTexParameters(mTex);
    webgl->BindFramebuffer(LOCAL_GL_FRAMEBUFFER, mFramebuffer);
    webgl->FramebufferTexture2D(LOCAL_GL_FRAMEBUFFER,
                                LOCAL_GL_COLOR_ATTACHMENT0, LOCAL_GL_TEXTURE_2D,
                                mTex, 0);
    webgl->Viewport(0, 0, mSize.width, mSize.height);
    webgl->ClearColor(0.0f, 0.0f, 0.0f, IsOpaque(mFormat) ? 1.0f : 0.0f);
    webgl->Clear(LOCAL_GL_COLOR_BUFFER_BIT);
    mSharedContext->ClearTarget();
    mSharedContext->ClearLastTexture();
  }
  return true;
}

void DrawTargetWebgl::CopySurface(SourceSurface* aSurface,
                                  const IntRect& aSourceRect,
                                  const IntPoint& aDestination) {
  if (mSkiaValid) {
    if (mSkiaLayer) {
      if (IntRect(aDestination, aSourceRect.Size()).Contains(GetRect())) {
        // If the the destination would override the entire layer, discard the
        // layer.
        mSkiaLayer = false;
      } else if (!IsOpaque(aSurface->GetFormat())) {
        // If the surface is not opaque, copying it into the layer results in
        // unintended blending rather than a copy to the destination.
        FlattenSkia();
      }
    } else {
      // If there is no layer, copying is safe.
      MarkSkiaChanged();
    }
    mSkia->CopySurface(aSurface, aSourceRect, aDestination);
    return;
  }

  Matrix matrix = Matrix::Translation(aDestination - aSourceRect.TopLeft());
  SurfacePattern pattern(aSurface, ExtendMode::CLAMP, matrix);
  DrawRect(Rect(IntRect(aDestination, aSourceRect.Size())), pattern,
           DrawOptions(1.0f, CompositionOp::OP_SOURCE), Nothing(), nullptr,
           false, false);
}

void DrawTargetWebgl::PushClip(const Path* aPath) {
  if (aPath && aPath->GetBackendType() == BackendType::SKIA) {
    // Detect if the path is really just a rect to simplify caching.
    const PathSkia* pathSkia = static_cast<const PathSkia*>(aPath);
    const SkPath& skPath = pathSkia->GetPath();
    SkRect rect = SkRect::MakeEmpty();
    if (skPath.isRect(&rect)) {
      PushClipRect(SkRectToRect(rect));
      return;
    }
  }

  mClipChanged = true;
  mRefreshClipState = true;
  mSkia->PushClip(aPath);

  mClipStack.push_back({GetTransform(), Rect(), aPath});
}

void DrawTargetWebgl::PushClipRect(const Rect& aRect) {
  mClipChanged = true;
  mRefreshClipState = true;
  mSkia->PushClipRect(aRect);

  mClipStack.push_back({GetTransform(), aRect, nullptr});
}

void DrawTargetWebgl::PushDeviceSpaceClipRects(const IntRect* aRects,
                                               uint32_t aCount) {
  mClipChanged = true;
  mRefreshClipState = true;
  mSkia->PushDeviceSpaceClipRects(aRects, aCount);

  for (uint32_t i = 0; i < aCount; i++) {
    mClipStack.push_back({Matrix(), Rect(aRects[i]), nullptr});
  }
}

void DrawTargetWebgl::PopClip() {
  mClipChanged = true;
  mRefreshClipState = true;
  mSkia->PopClip();

  mClipStack.pop_back();
}

bool DrawTargetWebgl::RemoveAllClips() {
  if (mClipStack.empty()) {
    return true;
  }
  if (!mSkia->RemoveAllClips()) {
    return false;
  }
  mClipChanged = true;
  mRefreshClipState = true;
  mClipStack.clear();
  return true;
}

// Whether a given composition operator can be mapped to a WebGL blend mode.
static inline bool SupportsDrawOptions(const DrawOptions& aOptions) {
  switch (aOptions.mCompositionOp) {
    case CompositionOp::OP_OVER:
    case CompositionOp::OP_ADD:
    case CompositionOp::OP_ATOP:
    case CompositionOp::OP_SOURCE:
      return true;
    default:
      return false;
  }
}

// Whether a pattern can be mapped to an available WebGL shader.
bool DrawTargetWebgl::SharedContext::SupportsPattern(const Pattern& aPattern) {
  switch (aPattern.GetType()) {
    case PatternType::COLOR:
      return true;
    case PatternType::SURFACE: {
      auto surfacePattern = static_cast<const SurfacePattern&>(aPattern);
      if (surfacePattern.mExtendMode != ExtendMode::CLAMP) {
        return false;
      }
      if (surfacePattern.mSurface) {
        IntSize size = surfacePattern.mSurface->GetSize();
        // The maximum size a surface can be before triggering a fallback to
        // software. Bound the maximum surface size by the actual texture size
        // limit.
        int32_t maxSize = int32_t(
            std::min(StaticPrefs::gfx_canvas_accelerated_max_surface_size(),
                     mMaxTextureSize));
        // Check if either of the surface dimensions or the sampling rect,
        // if supplied, exceed the maximum.
        if (std::max(size.width, size.height) > maxSize &&
            (surfacePattern.mSamplingRect.IsEmpty() ||
             std::max(surfacePattern.mSamplingRect.width,
                      surfacePattern.mSamplingRect.height) > maxSize)) {
          return false;
        }
      }
      return true;
    }
    default:
      // Patterns other than colors and surfaces are currently not accelerated.
      return false;
  }
}

// Whether a given composition operator is associative and thus allows drawing
// into a separate layer that can be later composited back into the WebGL
// context.
static inline bool SupportsLayering(const DrawOptions& aOptions) {
  switch (aOptions.mCompositionOp) {
    case CompositionOp::OP_OVER:
      // Layering is only supported for the default source-over composition op.
      return true;
    default:
      return false;
  }
}

// When a texture handle is no longer referenced, it must mark itself unused
// by unlinking its owning surface.
static void ReleaseTextureHandle(void* aPtr) {
  static_cast<TextureHandle*>(aPtr)->SetSurface(nullptr);
}

bool DrawTargetWebgl::DrawRect(const Rect& aRect, const Pattern& aPattern,
                               const DrawOptions& aOptions,
                               Maybe<DeviceColor> aMaskColor,
                               RefPtr<TextureHandle>* aHandle,
                               bool aTransformed, bool aClipped,
                               bool aAccelOnly, bool aForceUpdate,
                               const StrokeOptions* aStrokeOptions) {
  // If there is nothing to draw, then don't draw...
  if (aRect.IsEmpty()) {
    return true;
  }

  // If we're already drawing directly to the WebGL context, then we want to
  // continue to do so. However, if we're drawing into a Skia layer over the
  // WebGL context, then we need to be careful to avoid repeatedly clearing
  // and flushing the layer if we hit a drawing request that can be accelerated
  // in between layered drawing requests, as clearing and flushing the layer
  // can be significantly expensive when repeated. So when a Skia layer is
  // active, if it is possible to continue drawing into the layer, then don't
  // accelerate the drawing request.
  if (mWebglValid || (mSkiaLayer && !mLayerDepth &&
                      (aAccelOnly || !SupportsLayering(aOptions)))) {
    // If we get here, either the WebGL context is being directly drawn to
    // or we are going to flush the Skia layer to it before doing so. The shared
    // context still needs to be claimed and prepared for drawing. If this
    // fails, we just fall back to drawing with Skia below.
    if (PrepareContext(aClipped)) {
      // The shared context is claimed and the framebuffer is now valid, so try
      // accelerated drawing.
      return mSharedContext->DrawRectAccel(
          aRect, aPattern, aOptions, aMaskColor, aHandle, aTransformed,
          aClipped, aAccelOnly, aForceUpdate, aStrokeOptions);
    }
  }

  // Either there is no valid WebGL target to draw into, or we failed to prepare
  // it for drawing. The only thing we can do at this point is fall back to
  // drawing with Skia. If the request explicitly requires accelerated drawing,
  // then draw nothing before returning failure.
  if (!aAccelOnly) {
    DrawRectFallback(aRect, aPattern, aOptions, aMaskColor, aTransformed,
                     aClipped, aStrokeOptions);
  }
  return false;
}

void DrawTargetWebgl::DrawRectFallback(const Rect& aRect,
                                       const Pattern& aPattern,
                                       const DrawOptions& aOptions,
                                       Maybe<DeviceColor> aMaskColor,
                                       bool aTransformed, bool aClipped,
                                       const StrokeOptions* aStrokeOptions) {
  // Invalidate the WebGL target and prepare the Skia target for drawing.
  MarkSkiaChanged(aOptions);

  if (aTransformed) {
    // If transforms are requested, then just translate back to FillRect.
    if (aMaskColor) {
      mSkia->Mask(ColorPattern(*aMaskColor), aPattern, aOptions);
    } else if (aStrokeOptions) {
      mSkia->StrokeRect(aRect, aPattern, *aStrokeOptions, aOptions);
    } else {
      mSkia->FillRect(aRect, aPattern, aOptions);
    }
  } else if (aClipped) {
    // If no transform was requested but clipping is still required, then
    // temporarily reset the transform before translating to FillRect.
    mSkia->SetTransform(Matrix());
    if (aMaskColor) {
      auto surfacePattern = static_cast<const SurfacePattern&>(aPattern);
      if (surfacePattern.mSamplingRect.IsEmpty()) {
        mSkia->MaskSurface(ColorPattern(*aMaskColor), surfacePattern.mSurface,
                           aRect.TopLeft(), aOptions);
      } else {
        mSkia->Mask(ColorPattern(*aMaskColor), aPattern, aOptions);
      }
    } else if (aStrokeOptions) {
      mSkia->StrokeRect(aRect, aPattern, *aStrokeOptions, aOptions);
    } else {
      mSkia->FillRect(aRect, aPattern, aOptions);
    }
    mSkia->SetTransform(mTransform);
  } else if (aPattern.GetType() == PatternType::SURFACE) {
    // No transform nor clipping was requested, so it is essentially just a
    // copy.
    auto surfacePattern = static_cast<const SurfacePattern&>(aPattern);
    mSkia->CopySurface(surfacePattern.mSurface,
                       surfacePattern.mSurface->GetRect(),
                       IntPoint::Round(aRect.TopLeft()));
  } else {
    MOZ_ASSERT(false);
  }
}

inline already_AddRefed<WebGLTextureJS>
DrawTargetWebgl::SharedContext::GetCompatibleSnapshot(SourceSurface* aSurface) {
  if (aSurface->GetType() == SurfaceType::WEBGL) {
    RefPtr<SourceSurfaceWebgl> webglSurf =
        static_cast<SourceSurfaceWebgl*>(aSurface);
    if (this == webglSurf->mSharedContext) {
      // If there is a snapshot copy in a texture handle, use that.
      if (webglSurf->mHandle) {
        return do_AddRef(webglSurf->mHandle->GetWebGLTexture());
      }
      if (RefPtr<DrawTargetWebgl> webglDT = webglSurf->GetTarget()) {
        // If there is a copy-on-write reference to a target, use its backing
        // texture directly. This is only safe if the targets don't match, but
        // MarkChanged should ensure that any snapshots were copied into a
        // texture handle before we ever get here.
        if (!IsCurrentTarget(webglDT)) {
          return do_AddRef(webglDT->mTex);
        }
      }
    }
  }
  return nullptr;
}

bool DrawTargetWebgl::SharedContext::UploadSurface(DataSourceSurface* aData,
                                                   SurfaceFormat aFormat,
                                                   const IntRect& aSrcRect,
                                                   const IntPoint& aDstOffset,
                                                   bool aInit, bool aZero) {
  webgl::TexUnpackBlobDesc texDesc = {
      LOCAL_GL_TEXTURE_2D,
      {uint32_t(aSrcRect.width), uint32_t(aSrcRect.height), 1}};
  if (aData) {
    // The surface needs to be uploaded to its backing texture either to
    // initialize or update the texture handle contents. Map the data
    // contents of the surface so it can be read.
    DataSourceSurface::ScopedMap map(aData, DataSourceSurface::READ);
    if (!map.IsMapped()) {
      return false;
    }
    int32_t stride = map.GetStride();
    int32_t bpp = BytesPerPixel(aFormat);
    if (mCurrentTarget && mCurrentTarget->mShmem.IsWritable() &&
        map.GetData() == mCurrentTarget->mShmem.get<uint8_t>()) {
      texDesc.sd = Some(layers::SurfaceDescriptorBuffer(
          layers::RGBDescriptor(mCurrentTarget->mSize, SurfaceFormat::R8G8B8A8),
          mCurrentTarget->mShmem));
      texDesc.structuredSrcSize =
          uvec2::From(stride / bpp, mCurrentTarget->mSize.height);
      texDesc.unpacking.skipPixels = aSrcRect.x;
      texDesc.unpacking.skipRows = aSrcRect.y;
      mWaitForShmem = true;
    } else {
      // Get the data pointer range considering the sampling rect offset and
      // size.
      Range<const uint8_t> range(
          map.GetData() + aSrcRect.y * size_t(stride) + aSrcRect.x * bpp,
          std::max(aSrcRect.height - 1, 0) * size_t(stride) +
              aSrcRect.width * bpp);
      texDesc.cpuData = Some(RawBuffer(range));
    }
    // If the stride happens to be 4 byte aligned, assume that is the
    // desired alignment regardless of format (even A8). Otherwise, we
    // default to byte alignment.
    texDesc.unpacking.alignmentInTypeElems = stride % 4 ? 1 : 4;
    texDesc.unpacking.rowLength = stride / bpp;
  } else if (aZero) {
    // Create a PBO filled with zero data to initialize the texture data and
    // avoid slow initialization inside WebGL.
    MOZ_ASSERT(aSrcRect.TopLeft() == IntPoint(0, 0));
    size_t size =
        size_t(GetAlignedStride<4>(aSrcRect.width, BytesPerPixel(aFormat))) *
        aSrcRect.height;
    if (!mZeroBuffer || size > mZeroSize) {
      mZeroBuffer = mWebgl->CreateBuffer();
      mZeroSize = size;
      mWebgl->BindBuffer(LOCAL_GL_PIXEL_UNPACK_BUFFER, mZeroBuffer);
      // WebGL will zero initialize the empty buffer, so we don't send zero data
      // explicitly.
      mWebgl->RawBufferData(LOCAL_GL_PIXEL_UNPACK_BUFFER, nullptr, size,
                            LOCAL_GL_STATIC_DRAW);
    } else {
      mWebgl->BindBuffer(LOCAL_GL_PIXEL_UNPACK_BUFFER, mZeroBuffer);
    }
    texDesc.pboOffset = Some(0);
  }
  // Upload as RGBA8 to avoid swizzling during upload. Surfaces provide
  // data as BGRA, but we manually swizzle that in the shader. An A8
  // surface will be stored as an R8 texture that will also be swizzled
  // in the shader.
  GLenum intFormat =
      aFormat == SurfaceFormat::A8 ? LOCAL_GL_R8 : LOCAL_GL_RGBA8;
  GLenum extFormat =
      aFormat == SurfaceFormat::A8 ? LOCAL_GL_RED : LOCAL_GL_RGBA;
  webgl::PackingInfo texPI = {extFormat, LOCAL_GL_UNSIGNED_BYTE};
  // Do the (partial) upload for the shared or standalone texture.
  mWebgl->RawTexImage(0, aInit ? intFormat : 0,
                      {uint32_t(aDstOffset.x), uint32_t(aDstOffset.y), 0},
                      texPI, std::move(texDesc));
  if (!aData && aZero) {
    mWebgl->BindBuffer(LOCAL_GL_PIXEL_UNPACK_BUFFER, 0);
  }
  return true;
}

static inline SamplingFilter GetSamplingFilter(const Pattern& aPattern) {
  return aPattern.GetType() == PatternType::SURFACE
             ? static_cast<const SurfacePattern&>(aPattern).mSamplingFilter
             : SamplingFilter::GOOD;
}

static inline bool UseNearestFilter(const Pattern& aPattern) {
  return GetSamplingFilter(aPattern) == SamplingFilter::POINT;
}

// Determine if the rectangle is still axis-aligned and pixel-aligned.
static inline Maybe<IntRect> IsAlignedRect(bool aTransformed,
                                           const Matrix& aCurrentTransform,
                                           const Rect& aRect) {
  if (!aTransformed || aCurrentTransform.HasOnlyIntegerTranslation()) {
    auto intRect = RoundedToInt(aRect);
    if (aRect.WithinEpsilonOf(Rect(intRect), 1.0e-3f)) {
      if (aTransformed) {
        intRect += RoundedToInt(aCurrentTransform.GetTranslation());
      }
      return Some(intRect);
    }
  }
  return Nothing();
}

// Common rectangle and pattern drawing function shared by many DrawTarget
// commands. If aMaskColor is specified, the provided surface pattern will be
// treated as a mask. If aHandle is specified, then the surface pattern's
// texture will be cached in the supplied handle, as opposed to using the
// surface's user data. If aTransformed or aClipped are false, then transforms
// and/or clipping will be disabled. If aAccelOnly is specified, then this
// function will return before it would have otherwise drawn without
// acceleration. If aForceUpdate is specified, then the provided texture handle
// will be respecified with the provided surface.
bool DrawTargetWebgl::SharedContext::DrawRectAccel(
    const Rect& aRect, const Pattern& aPattern, const DrawOptions& aOptions,
    Maybe<DeviceColor> aMaskColor, RefPtr<TextureHandle>* aHandle,
    bool aTransformed, bool aClipped, bool aAccelOnly, bool aForceUpdate,
    const StrokeOptions* aStrokeOptions, const PathVertexRange* aVertexRange) {
  // If the rect or clip rect is empty, then there is nothing to draw.
  if (aRect.IsEmpty() || mClipRect.IsEmpty()) {
    return true;
  }

  // Check if the drawing options and the pattern support acceleration. Also
  // ensure the framebuffer is prepared for drawing. If not, fall back to using
  // the Skia target.
  if (!SupportsDrawOptions(aOptions) || !SupportsPattern(aPattern) ||
      aStrokeOptions || !mCurrentTarget->MarkChanged()) {
    // If only accelerated drawing was requested, bail out without software
    // drawing fallback.
    if (!aAccelOnly) {
      MOZ_ASSERT(!aVertexRange);
      mCurrentTarget->DrawRectFallback(aRect, aPattern, aOptions, aMaskColor,
                                       aTransformed, aClipped, aStrokeOptions);
    }
    return false;
  }

  const Matrix& currentTransform = GetTransform();

  if (aOptions.mCompositionOp == CompositionOp::OP_SOURCE && aTransformed &&
      aClipped &&
      (HasClipMask() || !currentTransform.PreservesAxisAlignedRectangles() ||
       !currentTransform.TransformBounds(aRect).Contains(Rect(mClipRect)) ||
       (aPattern.GetType() == PatternType::SURFACE &&
        !IsAlignedRect(aTransformed, currentTransform, aRect)))) {
    // Clear outside the mask region for masks that are not bounded by clip.
    return DrawRectAccel(Rect(mClipRect), ColorPattern(DeviceColor(0, 0, 0, 0)),
                         DrawOptions(1.0f, CompositionOp::OP_SOURCE,
                                     aOptions.mAntialiasMode),
                         Nothing(), nullptr, false, aClipped, aAccelOnly) &&
           DrawRectAccel(aRect, aPattern,
                         DrawOptions(aOptions.mAlpha, CompositionOp::OP_ADD,
                                     aOptions.mAntialiasMode),
                         aMaskColor, aHandle, aTransformed, aClipped,
                         aAccelOnly, aForceUpdate, aStrokeOptions,
                         aVertexRange);
  }

  // Set up the scissor test to reflect the clipping rectangle, if supplied.
  bool scissor = false;
  if (!mClipRect.Contains(IntRect(IntPoint(), mViewportSize))) {
    scissor = true;
    mWebgl->Enable(LOCAL_GL_SCISSOR_TEST);
    mWebgl->Scissor(mClipRect.x, mClipRect.y, mClipRect.width,
                    mClipRect.height);
  }

  bool success = false;

  // Now try to actually draw the pattern...
  switch (aPattern.GetType()) {
    case PatternType::COLOR: {
      if (!aVertexRange) {
        // Only an uncached draw if not using the vertex cache.
        mCurrentTarget->mProfile.OnUncachedDraw();
      }
      auto color = static_cast<const ColorPattern&>(aPattern).mColor;
      float a = color.a * aOptions.mAlpha;
      DeviceColor premulColor(color.r * a, color.g * a, color.b * a, a);
      if (((a == 1.0f && aOptions.mCompositionOp == CompositionOp::OP_OVER) ||
           aOptions.mCompositionOp == CompositionOp::OP_SOURCE) &&
          !aStrokeOptions && !aVertexRange && !HasClipMask()) {
        // Certain color patterns can be mapped to scissored clears. The
        // composition op must effectively overwrite the destination, and the
        // transform must map to an axis-aligned integer rectangle.
        if (Maybe<IntRect> intRect =
                IsAlignedRect(aTransformed, currentTransform, aRect)) {
          if (!intRect->Contains(mClipRect)) {
            scissor = true;
            mWebgl->Enable(LOCAL_GL_SCISSOR_TEST);
            auto scissorRect = intRect->Intersect(mClipRect);
            mWebgl->Scissor(scissorRect.x, scissorRect.y, scissorRect.width,
                            scissorRect.height);
          }
          mWebgl->ClearColor(premulColor.b, premulColor.g, premulColor.r,
                             premulColor.a);
          mWebgl->Clear(LOCAL_GL_COLOR_BUFFER_BIT);
          success = true;
          break;
        }
      }
      // Map the composition op to a WebGL blend mode, if possible.
      Maybe<DeviceColor> blendColor;
      if (aOptions.mCompositionOp == CompositionOp::OP_SOURCE) {
        // The source operator can support clipping and AA by emulating it with
        // the over op. Supply the color with blend state, and set the shader
        // color to white, to avoid needing dual-source blending.
        blendColor = Some(premulColor);
        premulColor = DeviceColor(1, 1, 1, 1);
      }
      SetBlendState(aOptions.mCompositionOp, blendColor);
      // Since it couldn't be mapped to a scissored clear, we need to use the
      // solid color shader with supplied transform.
      if (mLastProgram != mSolidProgram) {
        mWebgl->UseProgram(mSolidProgram);
        mLastProgram = mSolidProgram;
        // Ensure viewport and AA state is current.
        mDirtyViewport = true;
        mDirtyAA = true;
      }
      if (mDirtyViewport) {
        float viewportData[2] = {float(mViewportSize.width),
                                 float(mViewportSize.height)};
        mWebgl->UniformData(
            LOCAL_GL_FLOAT_VEC2, mSolidProgramViewport, false,
            {(const uint8_t*)viewportData, sizeof(viewportData)});
        mDirtyViewport = false;
      }
      if (mDirtyAA || aVertexRange) {
        // Generated paths provide their own AA as vertex alpha.
        float aaData = aVertexRange ? 0.0f : 1.0f;
        mWebgl->UniformData(LOCAL_GL_FLOAT, mSolidProgramAA, false,
                            {(const uint8_t*)&aaData, sizeof(aaData)});
        mDirtyAA = aaData == 0.0f;
      }
      float colorData[4] = {premulColor.b, premulColor.g, premulColor.r,
                            premulColor.a};
      Matrix xform(aRect.width, 0.0f, 0.0f, aRect.height, aRect.x, aRect.y);
      if (aTransformed) {
        xform *= currentTransform;
      }
      float xformData[6] = {xform._11, xform._12, xform._21,
                            xform._22, xform._31, xform._32};
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC2, mSolidProgramTransform, false,
                          {(const uint8_t*)xformData, sizeof(xformData)});
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC4, mSolidProgramColor, false,
                          {(const uint8_t*)colorData, sizeof(colorData)});
      // Finally draw the colored rectangle.
      if (aVertexRange) {
        // If there's a vertex range, then we need to draw triangles within from
        // generated from a path stored in the path vertex buffer.
        mWebgl->DrawArrays(LOCAL_GL_TRIANGLES, GLint(aVertexRange->mOffset),
                           GLsizei(aVertexRange->mLength));
      } else {
        // Otherwise we're drawing a simple filled rectangle.
        mWebgl->DrawArrays(LOCAL_GL_TRIANGLE_FAN, 0, 4);
      }
      success = true;
      break;
    }
    case PatternType::SURFACE: {
      auto surfacePattern = static_cast<const SurfacePattern&>(aPattern);
      // If a texture handle was supplied, or if the surface already has an
      // assigned texture handle stashed in its used data, try to use it.
      RefPtr<TextureHandle> handle =
          aHandle ? aHandle->get()
                  : (surfacePattern.mSurface
                         ? static_cast<TextureHandle*>(
                               surfacePattern.mSurface->GetUserData(
                                   &mTextureHandleKey))
                         : nullptr);
      IntSize texSize;
      IntPoint offset;
      SurfaceFormat format;
      // Check if the found handle is still valid and if its sampling rect
      // matches the requested sampling rect.
      if (handle && handle->IsValid() &&
          (surfacePattern.mSamplingRect.IsEmpty() ||
           handle->GetSamplingRect().IsEqualEdges(
               surfacePattern.mSamplingRect))) {
        texSize = handle->GetSize();
        format = handle->GetFormat();
        offset = handle->GetSamplingOffset();
      } else {
        // Otherwise, there is no handle that can be used yet, so extract
        // information from the surface pattern.
        handle = nullptr;
        if (!surfacePattern.mSurface) {
          // If there was no actual surface supplied, then we tried to draw
          // using a texture handle, but the texture handle wasn't valid.
          break;
        }
        texSize = surfacePattern.mSurface->GetSize();
        format = surfacePattern.mSurface->GetFormat();
        if (!surfacePattern.mSamplingRect.IsEmpty()) {
          texSize = surfacePattern.mSamplingRect.Size();
          offset = surfacePattern.mSamplingRect.TopLeft();
        }
      }

      // We need to be able to transform from local space into texture space.
      Matrix invMatrix = surfacePattern.mMatrix;
      if (!invMatrix.Invert()) {
        break;
      }

      RefPtr<WebGLTextureJS> tex;
      IntRect bounds;
      IntSize backingSize;
      RefPtr<DataSourceSurface> data;
      bool init = false;
      if (handle) {
        if (aForceUpdate) {
          data = surfacePattern.mSurface->GetDataSurface();
          if (!data) {
            break;
          }
          // The size of the texture may change if we update contents.
          mUsedTextureMemory -= handle->UsedBytes();
          handle->UpdateSize(texSize);
          mUsedTextureMemory += handle->UsedBytes();
          handle->SetSamplingOffset(surfacePattern.mSamplingRect.TopLeft());
        }
        // If using an existing handle, move it to the front of the MRU list.
        handle->remove();
        mTextureHandles.insertFront(handle);
      } else if ((tex = GetCompatibleSnapshot(surfacePattern.mSurface))) {
        backingSize = surfacePattern.mSurface->GetSize();
        bounds = IntRect(offset, texSize);
        // Count reusing a snapshot texture (no readback) as a cache hit.
        mCurrentTarget->mProfile.OnCacheHit();
      } else {
        // If we get here, we need a data surface for a texture upload.
        data = surfacePattern.mSurface->GetDataSurface();
        if (!data) {
          break;
        }
        // There is no existing handle. Calculate the bytes that would be used
        // by this texture, and prune enough other textures to ensure we have
        // that much usable texture space available to allocate.
        size_t usedBytes = TextureHandle::UsedBytes(format, texSize);
        PruneTextureMemory(usedBytes, false);
        // The requested page size for shared textures.
        int32_t pageSize = int32_t(
            std::min(StaticPrefs::gfx_canvas_accelerated_shared_page_size(),
                     mMaxTextureSize));
        if (!aForceUpdate &&
            std::max(texSize.width, texSize.height) <= pageSize / 2) {
          // Ensure that the surface size won't change via forced update and
          // that the surface is no bigger than a quadrant of a shared texture
          // page. If so, try to allocate it to a shared texture. Look for any
          // existing shared texture page with a matching format and allocate
          // from that if possible.
          for (auto& shared : mSharedTextures) {
            if (shared->GetFormat() == format) {
              bool wasEmpty = !shared->HasAllocatedHandles();
              handle = shared->Allocate(texSize);
              if (handle) {
                if (wasEmpty) {
                  // If the page was previously empty, then deduct it from the
                  // empty memory reserves.
                  mEmptyTextureMemory -= shared->UsedBytes();
                }
                break;
              }
            }
          }
          // If we couldn't find an existing shared texture page with matching
          // format, then allocate a new page to put the request in.
          if (!handle) {
            tex = mWebgl->CreateTexture();
            if (!tex) {
              MOZ_ASSERT(false);
              break;
            }
            RefPtr<SharedTexture> shared =
                new SharedTexture(IntSize(pageSize, pageSize), format, tex);
            mSharedTextures.push_back(shared);
            mTotalTextureMemory += shared->UsedBytes();
            handle = shared->Allocate(texSize);
            if (!handle) {
              MOZ_ASSERT(false);
              break;
            }
            init = true;
          }
        } else {
          // The surface wouldn't fit in a shared texture page, so we need to
          // allocate a standalone texture for it instead.
          tex = mWebgl->CreateTexture();
          if (!tex) {
            MOZ_ASSERT(false);
            break;
          }
          RefPtr<StandaloneTexture> standalone =
              new StandaloneTexture(texSize, format, tex);
          mStandaloneTextures.push_back(standalone);
          mTotalTextureMemory += standalone->UsedBytes();
          handle = standalone;
          init = true;
        }

        // Insert the new texture handle into the front of the MRU list and
        // update used space for it.
        mTextureHandles.insertFront(handle);
        ++mNumTextureHandles;
        mUsedTextureMemory += handle->UsedBytes();
        // Link the handle to the surface's user data.
        handle->SetSamplingOffset(surfacePattern.mSamplingRect.TopLeft());
        if (aHandle) {
          *aHandle = handle;
        } else {
          handle->SetSurface(surfacePattern.mSurface);
          surfacePattern.mSurface->AddUserData(&mTextureHandleKey, handle.get(),
                                               ReleaseTextureHandle);
        }
      }

      // Map the composition op to a WebGL blend mode, if possible. If there is
      // a mask color and a texture with multiple channels, assume subpixel
      // blending. If we encounter the source op here, then assume the surface
      // is opaque (non-opaque is handled above) and emulate it with over.
      SetBlendState(aOptions.mCompositionOp,
                    format != SurfaceFormat::A8 ? aMaskColor : Nothing());
      // Switch to the image shader and set up relevant transforms.
      if (mLastProgram != mImageProgram) {
        mWebgl->UseProgram(mImageProgram);
        mLastProgram = mImageProgram;
        // Ensure viewport and AA state is current.
        mDirtyViewport = true;
        mDirtyAA = true;
      }
      if (mDirtyViewport) {
        float viewportData[2] = {float(mViewportSize.width),
                                 float(mViewportSize.height)};
        mWebgl->UniformData(
            LOCAL_GL_FLOAT_VEC2, mImageProgramViewport, false,
            {(const uint8_t*)viewportData, sizeof(viewportData)});
        mDirtyViewport = false;
      }
      if (mDirtyAA || aVertexRange) {
        // AA is not supported for OP_SOURCE. Generated paths provide their own
        // AA as vertex alpha.

        float aaData =
            mLastCompositionOp == CompositionOp::OP_SOURCE || aVertexRange
                ? 0.0f
                : 1.0f;
        mWebgl->UniformData(LOCAL_GL_FLOAT, mImageProgramAA, false,
                            {(const uint8_t*)&aaData, sizeof(aaData)});
        mDirtyAA = aaData == 0.0f;
      }
      DeviceColor color = aMaskColor && format != SurfaceFormat::A8
                              ? DeviceColor::Mask(1.0f, aMaskColor->a)
                              : aMaskColor.valueOr(DeviceColor(1, 1, 1, 1));
      float a = color.a * aOptions.mAlpha;
      float colorData[4] = {color.b * a, color.g * a, color.r * a, a};
      float swizzleData =
          aMaskColor && format == SurfaceFormat::A8 ? 1.0f : 0.0f;
      Matrix xform(aRect.width, 0.0f, 0.0f, aRect.height, aRect.x, aRect.y);
      if (aTransformed) {
        xform *= currentTransform;
      }
      float xformData[6] = {xform._11, xform._12, xform._21,
                            xform._22, xform._31, xform._32};
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC2, mImageProgramTransform, false,
                          {(const uint8_t*)xformData, sizeof(xformData)});
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC4, mImageProgramColor, false,
                          {(const uint8_t*)colorData, sizeof(colorData)});
      mWebgl->UniformData(LOCAL_GL_FLOAT, mImageProgramSwizzle, false,
                          {(const uint8_t*)&swizzleData, sizeof(swizzleData)});

      // Start binding the WebGL state for the texture.
      if (handle) {
        if (!tex) {
          tex = handle->GetWebGLTexture();
        }
        bounds = handle->GetBounds();
        backingSize = handle->GetBackingSize();
      }
      if (mLastTexture != tex) {
        mWebgl->BindTexture(LOCAL_GL_TEXTURE_2D, tex);
        mLastTexture = tex;
      }

      if (init) {
        // If this is the first time the texture is used, we need to initialize
        // the clamping and filtering state.
        InitTexParameters(tex);
        if (texSize != backingSize) {
          // If this is a shared texture handle whose actual backing texture is
          // larger than it, then we need to allocate the texture page to the
          // full backing size before we can do a partial upload of the surface.
          UploadSurface(nullptr, format, IntRect(IntPoint(), backingSize),
                        IntPoint(), true, true);
        }
      }

      if (data) {
        UploadSurface(data, format, IntRect(offset, texSize), bounds.TopLeft(),
                      texSize == backingSize);
        // Signal that we had to upload new data to the texture cache.
        mCurrentTarget->mProfile.OnCacheMiss();
      } else {
        // Signal that we are reusing data from the texture cache.
        mCurrentTarget->mProfile.OnCacheHit();
      }

      // Set up the texture coordinate matrix to map from the input rectangle to
      // the backing texture subrect.
      Size backingSizeF(backingSize);
      Matrix uvMatrix(aRect.width, 0.0f, 0.0f, aRect.height, aRect.x, aRect.y);
      uvMatrix *= invMatrix;
      uvMatrix *= Matrix(1.0f / backingSizeF.width, 0.0f, 0.0f,
                         1.0f / backingSizeF.height,
                         float(bounds.x - offset.x) / backingSizeF.width,
                         float(bounds.y - offset.y) / backingSizeF.height);
      float uvData[6] = {uvMatrix._11, uvMatrix._12, uvMatrix._21,
                         uvMatrix._22, uvMatrix._31, uvMatrix._32};
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC2, mImageProgramTexMatrix, false,
                          {(const uint8_t*)uvData, sizeof(uvData)});

      // Clamp sampling to within the bounds of the backing texture subrect.
      float texBounds[4] = {
          (bounds.x + 0.5f) / backingSizeF.width,
          (bounds.y + 0.5f) / backingSizeF.height,
          (bounds.XMost() - 0.5f) / backingSizeF.width,
          (bounds.YMost() - 0.5f) / backingSizeF.height,
      };
      mWebgl->UniformData(LOCAL_GL_FLOAT_VEC4, mImageProgramTexBounds, false,
                          {(const uint8_t*)texBounds, sizeof(texBounds)});

      // Ensure we use nearest filtering when no antialiasing is requested.
      if (UseNearestFilter(surfacePattern)) {
        SetTexFilter(tex, false);
      }

      // Finally draw the image rectangle.
      if (aVertexRange) {
        // If there's a vertex range, then we need to draw triangles within from
        // generated from a path stored in the path vertex buffer.
        mWebgl->DrawArrays(LOCAL_GL_TRIANGLES, GLint(aVertexRange->mOffset),
                           GLsizei(aVertexRange->mLength));
      } else {
        // Otherwise we're drawing a simple filled rectangle.
        mWebgl->DrawArrays(LOCAL_GL_TRIANGLE_FAN, 0, 4);
      }

      // Restore the default linear filter if overridden.
      if (UseNearestFilter(surfacePattern)) {
        SetTexFilter(tex, true);
      }

      success = true;
      break;
    }
    default:
      gfxWarning() << "Unknown DrawTargetWebgl::DrawRect pattern type: "
                   << (int)aPattern.GetType();
      break;
  }
  // mWebgl->Disable(LOCAL_GL_BLEND);

  // Clean up any scissor state if there was clipping.
  if (scissor) {
    mWebgl->Disable(LOCAL_GL_SCISSOR_TEST);
  }

  return success;
}

bool DrawTargetWebgl::SharedContext::RemoveSharedTexture(
    const RefPtr<SharedTexture>& aTexture) {
  auto pos =
      std::find(mSharedTextures.begin(), mSharedTextures.end(), aTexture);
  if (pos == mSharedTextures.end()) {
    return false;
  }
  // Keep around a reserve of empty pages to avoid initialization costs from
  // allocating shared pages. If still below the limit of reserved pages, then
  // just add it to the reserve. Otherwise, erase the empty texture page.
  size_t maxBytes = StaticPrefs::gfx_canvas_accelerated_reserve_empty_cache()
                    << 20;
  size_t usedBytes = aTexture->UsedBytes();
  if (mEmptyTextureMemory + usedBytes <= maxBytes) {
    mEmptyTextureMemory += usedBytes;
  } else {
    mTotalTextureMemory -= usedBytes;
    mSharedTextures.erase(pos);
    ClearLastTexture();
    mWebgl->DeleteTexture(aTexture->GetWebGLTexture());
  }
  return true;
}

void SharedTextureHandle::Cleanup(DrawTargetWebgl::SharedContext& aContext) {
  mTexture->Free(*this);

  // Check if the shared handle's owning page has no more allocated handles
  // after we freed it. If so, remove the empty shared texture page also.
  if (!mTexture->HasAllocatedHandles()) {
    aContext.RemoveSharedTexture(mTexture);
  }
}

bool DrawTargetWebgl::SharedContext::RemoveStandaloneTexture(
    const RefPtr<StandaloneTexture>& aTexture) {
  auto pos = std::find(mStandaloneTextures.begin(), mStandaloneTextures.end(),
                       aTexture);
  if (pos == mStandaloneTextures.end()) {
    return false;
  }
  mTotalTextureMemory -= aTexture->UsedBytes();
  mStandaloneTextures.erase(pos);
  ClearLastTexture();
  mWebgl->DeleteTexture(aTexture->GetWebGLTexture());
  return true;
}

void StandaloneTexture::Cleanup(DrawTargetWebgl::SharedContext& aContext) {
  aContext.RemoveStandaloneTexture(this);
}

// Prune a given texture handle and release its associated resources.
void DrawTargetWebgl::SharedContext::PruneTextureHandle(
    const RefPtr<TextureHandle>& aHandle) {
  // Invalidate the handle so nothing will subsequently use its contents.
  aHandle->Invalidate();
  // If the handle has an associated SourceSurface, unlink it.
  UnlinkSurfaceTexture(aHandle);
  // If the handle has an associated CacheEntry, unlink it.
  if (RefPtr<CacheEntry> entry = aHandle->GetCacheEntry()) {
    entry->Unlink();
  }
  // Deduct the used space from the total.
  mUsedTextureMemory -= aHandle->UsedBytes();
  // Ensure any allocated shared or standalone texture regions get freed.
  aHandle->Cleanup(*this);
}

// Prune any texture memory above the limit (or margin below the limit) or any
// least-recently-used handles that are no longer associated with any usable
// surface.
bool DrawTargetWebgl::SharedContext::PruneTextureMemory(size_t aMargin,
                                                        bool aPruneUnused) {
  // The maximum amount of texture memory that may be used by textures.
  size_t maxBytes = StaticPrefs::gfx_canvas_accelerated_cache_size() << 20;
  maxBytes -= std::min(maxBytes, aMargin);
  size_t maxItems = StaticPrefs::gfx_canvas_accelerated_cache_items();
  size_t oldItems = mNumTextureHandles;
  while (!mTextureHandles.isEmpty() &&
         (mUsedTextureMemory > maxBytes || mNumTextureHandles > maxItems ||
          (aPruneUnused && !mTextureHandles.getLast()->IsUsed()))) {
    PruneTextureHandle(mTextureHandles.popLast());
    --mNumTextureHandles;
  }
  return mNumTextureHandles < oldItems;
}

// Ensure that the rect, after transform, is within reasonable precision limits
// such that when transformed and clipped in the shader it will not round bits
// from the mantissa in a way that will diverge in a noticeable way from path
// geometry calculated by the path fallback.
static inline bool RectInsidePrecisionLimits(const Rect& aRect,
                                             const Matrix& aTransform) {
  return Rect(-(1 << 20), -(1 << 20), 2 << 20, 2 << 20)
      .Contains(aTransform.TransformBounds(aRect));
}

void DrawTargetWebgl::FillRect(const Rect& aRect, const Pattern& aPattern,
                               const DrawOptions& aOptions) {
  if (SupportsPattern(aPattern) &&
      RectInsidePrecisionLimits(aRect, GetTransform())) {
    DrawRect(aRect, aPattern, aOptions);
  } else if (!mWebglValid) {
    MarkSkiaChanged(aOptions);
    mSkia->FillRect(aRect, aPattern, aOptions);
  } else {
    // If the pattern is unsupported, then transform the rect to a path so it
    // can be cached.
    SkPath skiaPath;
    skiaPath.addRect(RectToSkRect(aRect));
    RefPtr<PathSkia> path = new PathSkia(skiaPath, FillRule::FILL_WINDING);
    DrawPath(path, aPattern, aOptions);
  }
}

void CacheEntry::Link(const RefPtr<TextureHandle>& aHandle) {
  mHandle = aHandle;
  mHandle->SetCacheEntry(this);
}

// When the CacheEntry becomes unused, it marks the corresponding
// TextureHandle as unused and unlinks it from the CacheEntry. The
// entry is removed from its containing Cache, if applicable.
void CacheEntry::Unlink() {
  // The entry may not have a valid handle if rasterization failed.
  if (mHandle) {
    mHandle->SetCacheEntry(nullptr);
    mHandle = nullptr;
  }

  RemoveFromList();
}

// Hashes a path and pattern to a single hash value that can be used for quick
// comparisons. This currently avoids to expensive hashing of internal path
// and pattern data for speed, relying instead on later exact comparisons for
// disambiguation.
HashNumber PathCacheEntry::HashPath(const QuantizedPath& aPath,
                                    const Pattern* aPattern,
                                    const Matrix& aTransform,
                                    const IntRect& aBounds,
                                    const Point& aOrigin) {
  HashNumber hash = 0;
  hash = AddToHash(hash, aPath.mPath.num_types);
  hash = AddToHash(hash, aPath.mPath.num_points);
  // Quantize the relative offset of the path to its bounds.
  IntPoint offset = RoundedToInt((aOrigin - Point(aBounds.TopLeft())) * 16.0f);
  hash = AddToHash(hash, offset.x);
  hash = AddToHash(hash, offset.y);
  hash = AddToHash(hash, aBounds.width);
  hash = AddToHash(hash, aBounds.height);
  if (aPattern) {
    hash = AddToHash(hash, (int)aPattern->GetType());
  }
  return hash;
}

// When caching rendered geometry, we need to ensure the scale and orientation
// is approximately the same. The offset will be considered separately.
static inline bool HasMatchingScale(const Matrix& aTransform1,
                                    const Matrix& aTransform2) {
  return FuzzyEqual(aTransform1._11, aTransform2._11) &&
         FuzzyEqual(aTransform1._12, aTransform2._12) &&
         FuzzyEqual(aTransform1._21, aTransform2._21) &&
         FuzzyEqual(aTransform1._22, aTransform2._22);
}

// Determines if an existing path cache entry matches an incoming path and
// pattern.
inline bool PathCacheEntry::MatchesPath(const QuantizedPath& aPath,
                                        const Pattern* aPattern,
                                        const StrokeOptions* aStrokeOptions,
                                        const Matrix& aTransform,
                                        const IntRect& aBounds,
                                        const Point& aOrigin, HashNumber aHash,
                                        float aSigma) {
  return aHash == mHash && HasMatchingScale(aTransform, mTransform) &&
         // Ensure the clipped relative bounds fit inside those of the entry
         aBounds.x - aOrigin.x >= mBounds.x - mOrigin.x &&
         (aBounds.x - aOrigin.x) + aBounds.width <=
             (mBounds.x - mOrigin.x) + mBounds.width &&
         aBounds.y - aOrigin.y >= mBounds.y - mOrigin.y &&
         (aBounds.y - aOrigin.y) + aBounds.height <=
             (mBounds.y - mOrigin.y) + mBounds.height &&
         aPath == mPath &&
         (!aPattern ? !mPattern : mPattern && *aPattern == *mPattern) &&
         (!aStrokeOptions
              ? !mStrokeOptions
              : mStrokeOptions && *aStrokeOptions == *mStrokeOptions) &&
         aSigma == mSigma;
}

PathCacheEntry::PathCacheEntry(QuantizedPath&& aPath, Pattern* aPattern,
                               StoredStrokeOptions* aStrokeOptions,
                               const Matrix& aTransform, const IntRect& aBounds,
                               const Point& aOrigin, HashNumber aHash,
                               float aSigma)
    : CacheEntryImpl<PathCacheEntry>(aTransform, aBounds, aHash),
      mPath(std::move(aPath)),
      mOrigin(aOrigin),
      mPattern(aPattern),
      mStrokeOptions(aStrokeOptions),
      mSigma(aSigma) {}

// Attempt to find a matching entry in the path cache. If one isn't found,
// a new entry will be created. The caller should check whether the contained
// texture handle is valid to determine if it will need to render the text run
// or just reuse the cached texture.
already_AddRefed<PathCacheEntry> PathCache::FindOrInsertEntry(
    QuantizedPath aPath, const Pattern* aPattern,
    const StrokeOptions* aStrokeOptions, const Matrix& aTransform,
    const IntRect& aBounds, const Point& aOrigin, float aSigma) {
  HashNumber hash =
      PathCacheEntry::HashPath(aPath, aPattern, aTransform, aBounds, aOrigin);
  for (const RefPtr<PathCacheEntry>& entry : GetChain(hash)) {
    if (entry->MatchesPath(aPath, aPattern, aStrokeOptions, aTransform, aBounds,
                           aOrigin, hash, aSigma)) {
      return do_AddRef(entry);
    }
  }
  Pattern* pattern = nullptr;
  if (aPattern) {
    pattern = aPattern->CloneWeak();
    if (!pattern) {
      return nullptr;
    }
  }
  StoredStrokeOptions* strokeOptions = nullptr;
  if (aStrokeOptions) {
    strokeOptions = aStrokeOptions->Clone();
    if (!strokeOptions) {
      return nullptr;
    }
  }
  RefPtr<PathCacheEntry> entry =
      new PathCacheEntry(std::move(aPath), pattern, strokeOptions, aTransform,
                         aBounds, aOrigin, hash, aSigma);
  Insert(entry);
  return entry.forget();
}

void DrawTargetWebgl::Fill(const Path* aPath, const Pattern& aPattern,
                           const DrawOptions& aOptions) {
  if (!aPath || aPath->GetBackendType() != BackendType::SKIA) {
    return;
  }

  const SkPath& skiaPath = static_cast<const PathSkia*>(aPath)->GetPath();
  SkRect skiaRect = SkRect::MakeEmpty();
  // Draw the path as a simple rectangle with a supported pattern when possible.
  if (skiaPath.isRect(&skiaRect) && SupportsPattern(aPattern)) {
    Rect rect = SkRectToRect(skiaRect);
    if (RectInsidePrecisionLimits(rect, GetTransform())) {
      DrawRect(rect, aPattern, aOptions);
      return;
    }
  }

  DrawPath(aPath, aPattern, aOptions);
}

QuantizedPath::QuantizedPath(const WGR::Path& aPath) : mPath(aPath) {}

QuantizedPath::QuantizedPath(QuantizedPath&& aPath) noexcept
    : mPath(aPath.mPath) {
  aPath.mPath.points = nullptr;
  aPath.mPath.num_points = 0;
  aPath.mPath.types = nullptr;
  aPath.mPath.num_types = 0;
}

QuantizedPath::~QuantizedPath() {
  if (mPath.points || mPath.types) {
    WGR::wgr_path_release(mPath);
  }
}

bool QuantizedPath::operator==(const QuantizedPath& aOther) const {
  return mPath.num_types == aOther.mPath.num_types &&
         mPath.num_points == aOther.mPath.num_points &&
         mPath.fill_mode == aOther.mPath.fill_mode &&
         !memcmp(mPath.types, aOther.mPath.types,
                 mPath.num_types * sizeof(uint8_t)) &&
         !memcmp(mPath.points, aOther.mPath.points,
                 mPath.num_points * sizeof(WGR::Point));
}

// Generate a quantized path from the Skia path using WGR. The supplied
// transform will be applied to the path. The path is stored relative to its
// bounds origin to support translation later.
static Maybe<QuantizedPath> GenerateQuantizedPath(const SkPath& aPath,
                                                  const Rect& aBounds,
                                                  const Matrix& aTransform) {
  WGR::PathBuilder* pb = WGR::wgr_new_builder();
  if (!pb) {
    return Nothing();
  }
  WGR::wgr_builder_set_fill_mode(
      pb, aPath.getFillType() == SkPath::kWinding_FillType
              ? WGR::FillMode::Winding
              : WGR::FillMode::EvenOdd);

  SkPath::RawIter iter(aPath);
  SkPoint params[4];
  SkPath::Verb currentVerb;

  // printf_stderr("bounds: (%d, %d) %d x %d\n", aBounds.x, aBounds.y,
  // aBounds.width, aBounds.height);
  Matrix transform = aTransform;
  transform.PostTranslate(-aBounds.TopLeft());
  while ((currentVerb = iter.next(params)) != SkPath::kDone_Verb) {
    switch (currentVerb) {
      case SkPath::kMove_Verb: {
        Point p0 = transform.TransformPoint(SkPointToPoint(params[0]));
        WGR::wgr_builder_move_to(pb, p0.x, p0.y);
        break;
      }
      case SkPath::kLine_Verb: {
        Point p1 = transform.TransformPoint(SkPointToPoint(params[1]));
        WGR::wgr_builder_line_to(pb, p1.x, p1.y);
        break;
      }
      case SkPath::kCubic_Verb: {
        Point p1 = transform.TransformPoint(SkPointToPoint(params[1]));
        Point p2 = transform.TransformPoint(SkPointToPoint(params[2]));
        Point p3 = transform.TransformPoint(SkPointToPoint(params[3]));
        // printf_stderr("cubic (%f, %f), (%f, %f), (%f, %f)\n", p1.x, p1.y,
        // p2.x, p2.y, p3.x, p3.y);
        WGR::wgr_builder_curve_to(pb, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        break;
      }
      case SkPath::kQuad_Verb: {
        Point p1 = transform.TransformPoint(SkPointToPoint(params[1]));
        Point p2 = transform.TransformPoint(SkPointToPoint(params[2]));
        // printf_stderr("quad (%f, %f), (%f, %f)\n", p1.x, p1.y, p2.x, p2.y);
        WGR::wgr_builder_quad_to(pb, p1.x, p1.y, p2.x, p2.y);
        break;
      }
      case SkPath::kConic_Verb: {
        Point p0 = transform.TransformPoint(SkPointToPoint(params[0]));
        Point p1 = transform.TransformPoint(SkPointToPoint(params[1]));
        Point p2 = transform.TransformPoint(SkPointToPoint(params[2]));
        float w = iter.conicWeight();
        std::vector<Point> quads;
        int numQuads = ConvertConicToQuads(p0, p1, p2, w, quads);
        for (int i = 0; i < numQuads; i++) {
          Point q1 = quads[2 * i + 1];
          Point q2 = quads[2 * i + 2];
          // printf_stderr("conic quad (%f, %f), (%f, %f)\n", q1.x, q1.y, q2.x,
          // q2.y);
          WGR::wgr_builder_quad_to(pb, q1.x, q1.y, q2.x, q2.y);
        }
        break;
      }
      case SkPath::kClose_Verb:
        // printf_stderr("close\n");
        WGR::wgr_builder_close(pb);
        break;
      default:
        MOZ_ASSERT(false);
        // Unexpected verb found in path!
        WGR::wgr_builder_release(pb);
        return Nothing();
    }
  }

  WGR::Path p = WGR::wgr_builder_get_path(pb);
  WGR::wgr_builder_release(pb);
  if (!p.num_points || !p.num_types) {
    WGR::wgr_path_release(p);
    return Nothing();
  }
  return Some(QuantizedPath(p));
}

// Get the output vertex buffer using WGR from an input quantized path.
static Maybe<WGR::VertexBuffer> GeneratePathVertexBuffer(
    const QuantizedPath& aPath, const IntRect& aClipRect,
    bool aRasterizationTruncates, WGR::OutputVertex* aBuffer,
    size_t aBufferCapacity) {
  WGR::VertexBuffer vb = WGR::wgr_path_rasterize_to_tri_list(
      &aPath.mPath, aClipRect.x, aClipRect.y, aClipRect.width, aClipRect.height,
      true, false, aRasterizationTruncates, aBuffer, aBufferCapacity);
  if (!vb.len || (aBuffer && vb.len > aBufferCapacity)) {
    WGR::wgr_vertex_buffer_release(vb);
    return Nothing();
  }
  return Some(vb);
}

static inline AAStroke::LineJoin ToAAStrokeLineJoin(JoinStyle aJoin) {
  switch (aJoin) {
    case JoinStyle::BEVEL:
      return AAStroke::LineJoin::Bevel;
    case JoinStyle::ROUND:
      return AAStroke::LineJoin::Round;
    case JoinStyle::MITER:
    case JoinStyle::MITER_OR_BEVEL:
      return AAStroke::LineJoin::Miter;
  }
  return AAStroke::LineJoin::Miter;
}

static inline AAStroke::LineCap ToAAStrokeLineCap(CapStyle aCap) {
  switch (aCap) {
    case CapStyle::BUTT:
      return AAStroke::LineCap::Butt;
    case CapStyle::ROUND:
      return AAStroke::LineCap::Round;
    case CapStyle::SQUARE:
      return AAStroke::LineCap::Square;
  }
  return AAStroke::LineCap::Butt;
}

static inline Point WGRPointToPoint(const WGR::Point& aPoint) {
  return Point(IntPoint(aPoint.x, aPoint.y)) * (1.0f / 16.0f);
}

// Generates a vertex buffer for a stroked path using aa-stroke.
static Maybe<AAStroke::VertexBuffer> GenerateStrokeVertexBuffer(
    const QuantizedPath& aPath, const StrokeOptions* aStrokeOptions,
    float aScale, WGR::OutputVertex* aBuffer, size_t aBufferCapacity) {
  AAStroke::StrokeStyle style = {aStrokeOptions->mLineWidth * aScale,
                                 ToAAStrokeLineCap(aStrokeOptions->mLineCap),
                                 ToAAStrokeLineJoin(aStrokeOptions->mLineJoin),
                                 aStrokeOptions->mMiterLimit};
  if (style.width <= 0.0f || !IsFinite(style.width) ||
      style.miter_limit <= 0.0f || !IsFinite(style.miter_limit)) {
    return Nothing();
  }
  AAStroke::Stroker* s = AAStroke::aa_stroke_new(
      &style, (AAStroke::OutputVertex*)aBuffer, aBufferCapacity);
  bool valid = true;
  size_t curPoint = 0;
  for (size_t curType = 0; valid && curType < aPath.mPath.num_types;) {
    // Verify that we are at the start of a sub-path.
    if ((aPath.mPath.types[curType] & WGR::PathPointTypePathTypeMask) !=
        WGR::PathPointTypeStart) {
      valid = false;
      break;
    }
    // Find where the next sub-path starts so we can locate the end.
    size_t endType = curType + 1;
    for (; endType < aPath.mPath.num_types; endType++) {
      if ((aPath.mPath.types[endType] & WGR::PathPointTypePathTypeMask) ==
          WGR::PathPointTypeStart) {
        break;
      }
    }
    // Check if the path is closed. This is a flag modifying the last type.
    bool closed =
        (aPath.mPath.types[endType - 1] & WGR::PathPointTypeCloseSubpath) != 0;
    for (; curType < endType; curType++) {
      // If this is the last type and the sub-path is not closed, determine if
      // this segment should be capped.
      bool end = curType + 1 == endType && !closed;
      switch (aPath.mPath.types[curType] & WGR::PathPointTypePathTypeMask) {
        case WGR::PathPointTypeStart: {
          if (curPoint + 1 > aPath.mPath.num_points) {
            valid = false;
            break;
          }
          Point p1 = WGRPointToPoint(aPath.mPath.points[curPoint]);
          AAStroke::aa_stroke_move_to(s, p1.x, p1.y, closed);
          if (end) {
            AAStroke::aa_stroke_line_to(s, p1.x, p1.y, true);
          }
          curPoint++;
          break;
        }
        case WGR::PathPointTypeLine: {
          if (curPoint + 1 > aPath.mPath.num_points) {
            valid = false;
            break;
          }
          Point p1 = WGRPointToPoint(aPath.mPath.points[curPoint]);
          AAStroke::aa_stroke_line_to(s, p1.x, p1.y, end);
          curPoint++;
          break;
        }
        case WGR::PathPointTypeBezier: {
          if (curPoint + 3 > aPath.mPath.num_points) {
            valid = false;
            break;
          }
          Point p1 = WGRPointToPoint(aPath.mPath.points[curPoint]);
          Point p2 = WGRPointToPoint(aPath.mPath.points[curPoint + 1]);
          Point p3 = WGRPointToPoint(aPath.mPath.points[curPoint + 2]);
          AAStroke::aa_stroke_curve_to(s, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
                                       end);
          curPoint += 3;
          break;
        }
        default:
          MOZ_ASSERT(false, "Unknown WGR path point type");
          valid = false;
          break;
      }
    }
    // Close the sub-path if necessary.
    if (valid && closed) {
      AAStroke::aa_stroke_close(s);
    }
  }
  Maybe<AAStroke::VertexBuffer> result;
  if (valid) {
    AAStroke::VertexBuffer vb = AAStroke::aa_stroke_finish(s);
    if (!vb.len || (aBuffer && vb.len > aBufferCapacity)) {
      AAStroke::aa_stroke_vertex_buffer_release(vb);
    } else {
      result = Some(vb);
    }
  }
  AAStroke::aa_stroke_release(s);
  return result;
}

// Search the path cache for any entries stored in the path vertex buffer and
// remove them.
void PathCache::ClearVertexRanges() {
  for (auto& chain : mChains) {
    PathCacheEntry* entry = chain.getFirst();
    while (entry) {
      PathCacheEntry* next = entry->getNext();
      if (entry->GetVertexRange().IsValid()) {
        entry->Unlink();
      }
      entry = next;
    }
  }
}

inline bool DrawTargetWebgl::ShouldAccelPath(
    const DrawOptions& aOptions, const StrokeOptions* aStrokeOptions) {
  return mWebglValid && SupportsDrawOptions(aOptions) && PrepareContext();
}

// For now, we only support stroking solid color patterns to limit artifacts
// from blending of overlapping geometry generated by AAStroke.
static inline bool SupportsAAStroke(const Pattern& aPattern,
                                    const DrawOptions& aOptions,
                                    const StrokeOptions& aStrokeOptions) {
  if (aStrokeOptions.mDashPattern) {
    return false;
  }
  switch (aOptions.mCompositionOp) {
    case CompositionOp::OP_SOURCE:
      return true;
    case CompositionOp::OP_OVER:
      return aPattern.GetType() == PatternType::COLOR &&
             static_cast<const ColorPattern&>(aPattern).mColor.a *
                     aOptions.mAlpha ==
                 1.0f;
    default:
      return false;
  }
}

bool DrawTargetWebgl::SharedContext::DrawPathAccel(
    const Path* aPath, const Pattern& aPattern, const DrawOptions& aOptions,
    const StrokeOptions* aStrokeOptions, const ShadowOptions* aShadow,
    bool aCacheable) {
  // Get the transformed bounds for the path and conservatively check if the
  // bounds overlap the canvas.
  const PathSkia* pathSkia = static_cast<const PathSkia*>(aPath);
  const Matrix& currentTransform = GetTransform();
  Rect bounds = pathSkia->GetFastBounds(currentTransform, aStrokeOptions);
  // If the path is empty, then there is nothing to draw.
  if (bounds.IsEmpty()) {
    return true;
  }
  IntRect viewport(IntPoint(), mViewportSize);
  if (aShadow) {
    // Inflate the bounds to account for the blur radius.
    bounds += aShadow->mOffset;
    int32_t blurRadius = aShadow->BlurRadius();
    bounds.Inflate(blurRadius);
    viewport.Inflate(blurRadius);
  }
  Point realOrigin = bounds.TopLeft();
  if (aCacheable) {
    // Quantize the path origin to increase the reuse of cache entries.
    bounds.Scale(4.0f);
    bounds.Round();
    bounds.Scale(0.25f);
  }
  Point quantizedOrigin = bounds.TopLeft();
  // If the path doesn't intersect the viewport, then there is nothing to draw.
  IntRect intBounds = RoundedOut(bounds).Intersect(viewport);
  if (intBounds.IsEmpty()) {
    return true;
  }
  // Nudge the bounds to account for the quantization rounding.
  Rect quantBounds = Rect(intBounds) + (realOrigin - quantizedOrigin);
  // If a stroke path covers too much screen area, it is likely that most is
  // empty space in the interior. This usually imposes too high a cost versus
  // just rasterizing without acceleration.
  if (aStrokeOptions &&
      intBounds.width * intBounds.height >
          (mViewportSize.width / 2) * (mViewportSize.height / 2)) {
    return false;
  }
  // If the pattern is a solid color, then this will be used along with a path
  // mask to render the path, as opposed to baking the pattern into the cached
  // path texture.
  Maybe<DeviceColor> color =
      aPattern.GetType() == PatternType::COLOR
          ? Some(static_cast<const ColorPattern&>(aPattern).mColor)
          : Nothing();
  // Look for an existing path cache entry, if possible, or otherwise create
  // one. If the draw request is not cacheable, then don't create an entry.
  RefPtr<PathCacheEntry> entry;
  RefPtr<TextureHandle> handle;
  if (aCacheable) {
    if (!mPathCache) {
      mPathCache = MakeUnique<PathCache>();
    }
    // Use a quantized, relative (to its bounds origin) version of the path as
    // a cache key to help limit cache bloat.
    Maybe<QuantizedPath> qp = GenerateQuantizedPath(
        pathSkia->GetPath(), quantBounds, currentTransform);
    if (!qp) {
      return false;
    }
    entry = mPathCache->FindOrInsertEntry(
        std::move(*qp), color ? nullptr : &aPattern, aStrokeOptions,
        currentTransform, intBounds, quantizedOrigin,
        aShadow ? aShadow->mSigma : -1.0f);
    if (!entry) {
      return false;
    }
    handle = entry->GetHandle();
  }

  // If there is a shadow, it needs to draw with the shadow color rather than
  // the path color.
  Maybe<DeviceColor> shadowColor = color;
  if (aShadow) {
    shadowColor = Some(aShadow->mColor);
    if (color) {
      shadowColor->a *= color->a;
    }
  }
  SamplingFilter filter =
      aShadow ? SamplingFilter::GOOD : GetSamplingFilter(aPattern);
  if (handle && handle->IsValid()) {
    // If the entry has a valid texture handle still, use it. However, the
    // entry texture is assumed to be located relative to its previous bounds.
    // We need to offset the pattern by the difference between its new unclipped
    // origin and its previous previous unclipped origin. Then when we finally
    // draw a rectangle at the expected new bounds, it will overlap the portion
    // of the old entry texture we actually need to sample from.
    Point offset =
        (realOrigin - entry->GetOrigin()) + entry->GetBounds().TopLeft();
    SurfacePattern pathPattern(nullptr, ExtendMode::CLAMP,
                               Matrix::Translation(offset), filter);
    return DrawRectAccel(quantBounds, pathPattern, aOptions, shadowColor,
                         &handle, false, true, true);
  }

  if (mPathVertexCapacity > 0 && !handle && entry && !aShadow &&
      aOptions.mAntialiasMode != AntialiasMode::NONE &&
      SupportsPattern(aPattern) &&
      entry->GetPath().mPath.num_types <= mPathMaxComplexity) {
    if (entry->GetVertexRange().IsValid()) {
      // If there is a valid cached vertex data in the path vertex buffer, then
      // just draw that. We must draw at integer pixel boundaries (using
      // intBounds instead of quantBounds) due to WGR's reliance on pixel center
      // location.
      mCurrentTarget->mProfile.OnCacheHit();
      return DrawRectAccel(Rect(intBounds.TopLeft(), Size(1, 1)), aPattern,
                           aOptions, Nothing(), nullptr, false, true, true,
                           false, nullptr, &entry->GetVertexRange());
    }

    // printf_stderr("Generating... verbs %d, points %d\n",
    //     int(pathSkia->GetPath().countVerbs()),
    //     int(pathSkia->GetPath().countPoints()));
    WGR::OutputVertex* outputBuffer = nullptr;
    size_t outputBufferCapacity = 0;
    if (mWGROutputBuffer) {
      outputBuffer = mWGROutputBuffer.get();
      outputBufferCapacity = mPathVertexCapacity / sizeof(WGR::OutputVertex);
    }
    Maybe<WGR::VertexBuffer> wgrVB;
    Maybe<AAStroke::VertexBuffer> strokeVB;
    if (!aStrokeOptions) {
      wgrVB = GeneratePathVertexBuffer(
          entry->GetPath(), IntRect(-intBounds.TopLeft(), mViewportSize),
          mRasterizationTruncates, outputBuffer, outputBufferCapacity);
    } else {
      if (mPathAAStroke &&
          SupportsAAStroke(aPattern, aOptions, *aStrokeOptions)) {
        auto scaleFactors = currentTransform.ScaleFactors();
        if (scaleFactors.AreScalesSame()) {
          strokeVB = GenerateStrokeVertexBuffer(
              entry->GetPath(), aStrokeOptions, scaleFactors.xScale,
              outputBuffer, outputBufferCapacity);
        }
      }
      if (!strokeVB && mPathWGRStroke) {
        //  If stroking, then generate a path to fill the stroked region. This
        //  path will need to be quantized again because it differs from the
        //  path used for the cache entry, but this allows us to avoid
        //  generating a fill path on a cache hit.
        SkPaint paint;
        if (StrokeOptionsToPaint(paint, *aStrokeOptions)) {
          Maybe<SkRect> cullRect;
          Matrix invTransform = currentTransform;
          if (invTransform.Invert()) {
            // Transform the stroking clip rect from device space to local
            // space.
            Rect invRect = invTransform.TransformBounds(Rect(mClipRect));
            invRect.RoundOut();
            cullRect = Some(RectToSkRect(invRect));
          }
          SkPath fillPath;
          if (paint.getFillPath(pathSkia->GetPath(), &fillPath,
                                cullRect.ptrOr(nullptr),
                                ComputeResScaleForStroking(currentTransform))) {
            // printf_stderr("    stroke fill... verbs %d, points %d\n",
            //     int(fillPath.countVerbs()),
            //     int(fillPath.countPoints()));
            if (Maybe<QuantizedPath> qp = GenerateQuantizedPath(
                    fillPath, quantBounds, currentTransform)) {
              wgrVB = GeneratePathVertexBuffer(
                  *qp, IntRect(-intBounds.TopLeft(), mViewportSize),
                  mRasterizationTruncates, outputBuffer, outputBufferCapacity);
            }
          }
        }
      }
    }
    if (wgrVB || strokeVB) {
      const uint8_t* vbData =
          wgrVB ? (const uint8_t*)wgrVB->data : (const uint8_t*)strokeVB->data;
      if (outputBuffer && !vbData) {
        vbData = (const uint8_t*)outputBuffer;
      }
      size_t vbLen = wgrVB ? wgrVB->len : strokeVB->len;
      uint32_t vertexBytes = uint32_t(
          std::min(vbLen * sizeof(WGR::OutputVertex), size_t(UINT32_MAX)));
      // printf_stderr("  ... %d verts, %d bytes\n", int(vbLen),
      //     int(vertexBytes));
      if (vertexBytes > mPathVertexCapacity - mPathVertexOffset &&
          vertexBytes <= mPathVertexCapacity - sizeof(kRectVertexData)) {
        // If the vertex data is too large to fit in the remaining path vertex
        // buffer, then orphan the contents of the vertex buffer to make room
        // for it.
        if (mPathCache) {
          mPathCache->ClearVertexRanges();
        }
        ResetPathVertexBuffer(false);
      }
      if (vertexBytes <= mPathVertexCapacity - mPathVertexOffset) {
        // If there is actually room to fit the vertex data in the vertex buffer
        // after orphaning as necessary, then upload the data to the next
        // available offset in the buffer.
        PathVertexRange vertexRange(
            uint32_t(mPathVertexOffset / sizeof(WGR::OutputVertex)),
            uint32_t(vbLen));
        if (entry) {
          entry->SetVertexRange(vertexRange);
        }
        // printf_stderr("      ... offset %d\n", mPathVertexOffset);
        mWebgl->RawBufferSubData(LOCAL_GL_ARRAY_BUFFER, mPathVertexOffset,
                                 vbData, vertexBytes);
        mPathVertexOffset += vertexBytes;
        if (wgrVB) {
          WGR::wgr_vertex_buffer_release(wgrVB.ref());
        } else {
          AAStroke::aa_stroke_vertex_buffer_release(strokeVB.ref());
        }
        // Finally, draw the uploaded vertex data.
        mCurrentTarget->mProfile.OnCacheMiss();
        return DrawRectAccel(Rect(intBounds.TopLeft(), Size(1, 1)), aPattern,
                             aOptions, Nothing(), nullptr, false, true, true,
                             false, nullptr, &vertexRange);
      }
      if (wgrVB) {
        WGR::wgr_vertex_buffer_release(wgrVB.ref());
      } else {
        AAStroke::aa_stroke_vertex_buffer_release(strokeVB.ref());
      }
      // If we failed to draw the vertex data for some reason, then fall through
      // to the texture rasterization path.
    }
  }

  // If there isn't a valid texture handle, then we need to rasterize the
  // path in a software canvas and upload this to a texture. Solid color
  // patterns will be rendered as a path mask that can then be modulated
  // with any color. Other pattern types have to rasterize the pattern
  // directly into the cached texture.
  handle = nullptr;
  RefPtr<DrawTargetSkia> pathDT = new DrawTargetSkia;
  if (pathDT->Init(intBounds.Size(), color || aShadow
                                         ? SurfaceFormat::A8
                                         : SurfaceFormat::B8G8R8A8)) {
    Point offset = -quantBounds.TopLeft();
    if (aShadow) {
      // Ensure the the shadow is drawn at the requested offset
      offset += aShadow->mOffset;
    }
    pathDT->SetTransform(currentTransform * Matrix::Translation(offset));
    DrawOptions drawOptions(1.0f, CompositionOp::OP_OVER,
                            aOptions.mAntialiasMode);
    static const ColorPattern maskPattern(DeviceColor(1.0f, 1.0f, 1.0f, 1.0f));
    const Pattern& cachePattern = color ? maskPattern : aPattern;
    // If the source pattern is a DrawTargetWebgl snapshot, we may shift
    // targets when drawing the path, so back up the old target.
    DrawTargetWebgl* oldTarget = mCurrentTarget;
    if (aStrokeOptions) {
      pathDT->Stroke(aPath, cachePattern, *aStrokeOptions, drawOptions);
    } else {
      pathDT->Fill(aPath, cachePattern, drawOptions);
    }
    if (aShadow && aShadow->mSigma > 0.0f) {
      // Blur the shadow if required.
      uint8_t* data = nullptr;
      IntSize size;
      int32_t stride = 0;
      SurfaceFormat format = SurfaceFormat::UNKNOWN;
      if (pathDT->LockBits(&data, &size, &stride, &format)) {
        AlphaBoxBlur blur(Rect(pathDT->GetRect()), stride, aShadow->mSigma,
                          aShadow->mSigma);
        blur.Blur(data);
        pathDT->ReleaseBits(data);
      }
    }
    RefPtr<SourceSurface> pathSurface = pathDT->Snapshot();
    if (pathSurface) {
      // If the target changed, try to restore it.
      if (mCurrentTarget != oldTarget && !oldTarget->PrepareContext()) {
        return false;
      }
      SurfacePattern pathPattern(pathSurface, ExtendMode::CLAMP,
                                 Matrix::Translation(quantBounds.TopLeft()),
                                 filter);
      // Try and upload the rasterized path to a texture. If there is a
      // valid texture handle after this, then link it to the entry.
      // Otherwise, we might have to fall back to software drawing the
      // path, so unlink it from the entry.
      if (DrawRectAccel(quantBounds, pathPattern, aOptions, shadowColor,
                        &handle, false, true) &&
          handle) {
        if (entry) {
          entry->Link(handle);
        }
      } else if (entry) {
        entry->Unlink();
      }
      return true;
    }
  }

  return false;
}

void DrawTargetWebgl::DrawPath(const Path* aPath, const Pattern& aPattern,
                               const DrawOptions& aOptions,
                               const StrokeOptions* aStrokeOptions) {
  // If there is a WebGL context, then try to cache the path to avoid slow
  // fallbacks.
  if (ShouldAccelPath(aOptions, aStrokeOptions) &&
      mSharedContext->DrawPathAccel(aPath, aPattern, aOptions,
                                    aStrokeOptions)) {
    return;
  }

  // There was no path cache entry available to use, so fall back to drawing the
  // path with Skia.
  MarkSkiaChanged(aOptions);
  if (aStrokeOptions) {
    mSkia->Stroke(aPath, aPattern, *aStrokeOptions, aOptions);
  } else {
    mSkia->Fill(aPath, aPattern, aOptions);
  }
}

void DrawTargetWebgl::DrawSurface(SourceSurface* aSurface, const Rect& aDest,
                                  const Rect& aSource,
                                  const DrawSurfaceOptions& aSurfOptions,
                                  const DrawOptions& aOptions) {
  Matrix matrix = Matrix::Scaling(aDest.width / aSource.width,
                                  aDest.height / aSource.height);
  matrix.PreTranslate(-aSource.x, -aSource.y);
  matrix.PostTranslate(aDest.x, aDest.y);
  SurfacePattern pattern(aSurface, ExtendMode::CLAMP, matrix,
                         aSurfOptions.mSamplingFilter);
  DrawRect(aDest, pattern, aOptions);
}

void DrawTargetWebgl::Mask(const Pattern& aSource, const Pattern& aMask,
                           const DrawOptions& aOptions) {
  if (!SupportsDrawOptions(aOptions) ||
      aMask.GetType() != PatternType::SURFACE ||
      aSource.GetType() != PatternType::COLOR) {
    MarkSkiaChanged(aOptions);
    mSkia->Mask(aSource, aMask, aOptions);
    return;
  }
  auto sourceColor = static_cast<const ColorPattern&>(aSource).mColor;
  auto maskPattern = static_cast<const SurfacePattern&>(aMask);
  DrawRect(Rect(IntRect(IntPoint(), maskPattern.mSurface->GetSize())),
           maskPattern, aOptions, Some(sourceColor));
}

void DrawTargetWebgl::MaskSurface(const Pattern& aSource, SourceSurface* aMask,
                                  Point aOffset, const DrawOptions& aOptions) {
  if (!SupportsDrawOptions(aOptions) ||
      aSource.GetType() != PatternType::COLOR) {
    MarkSkiaChanged(aOptions);
    mSkia->MaskSurface(aSource, aMask, aOffset, aOptions);
  } else {
    auto sourceColor = static_cast<const ColorPattern&>(aSource).mColor;
    SurfacePattern pattern(aMask, ExtendMode::CLAMP,
                           Matrix::Translation(aOffset));
    DrawRect(Rect(aOffset, Size(aMask->GetSize())), pattern, aOptions,
             Some(sourceColor));
  }
}

// Extract the surface's alpha values into an A8 surface.
static already_AddRefed<DataSourceSurface> ExtractAlpha(SourceSurface* aSurface,
                                                        bool aAllowSubpixelAA) {
  RefPtr<DataSourceSurface> surfaceData = aSurface->GetDataSurface();
  if (!surfaceData) {
    return nullptr;
  }
  DataSourceSurface::ScopedMap srcMap(surfaceData, DataSourceSurface::READ);
  if (!srcMap.IsMapped()) {
    return nullptr;
  }
  IntSize size = surfaceData->GetSize();
  RefPtr<DataSourceSurface> alpha =
      Factory::CreateDataSourceSurface(size, SurfaceFormat::A8, false);
  if (!alpha) {
    return nullptr;
  }
  DataSourceSurface::ScopedMap dstMap(alpha, DataSourceSurface::WRITE);
  if (!dstMap.IsMapped()) {
    return nullptr;
  }
  // For subpixel masks, ignore the alpha and instead sample one of the color
  // channels as if they were alpha.
  SwizzleData(
      srcMap.GetData(), srcMap.GetStride(),
      aAllowSubpixelAA ? SurfaceFormat::A8R8G8B8 : surfaceData->GetFormat(),
      dstMap.GetData(), dstMap.GetStride(), SurfaceFormat::A8, size);
  return alpha.forget();
}

void DrawTargetWebgl::DrawShadow(const Path* aPath, const Pattern& aPattern,
                                 const ShadowOptions& aShadow,
                                 const DrawOptions& aOptions,
                                 const StrokeOptions* aStrokeOptions) {
  // If there is a WebGL context, then try to cache the path to avoid slow
  // fallbacks.
  if (ShouldAccelPath(aOptions, aStrokeOptions) &&
      mSharedContext->DrawPathAccel(aPath, aPattern, aOptions, aStrokeOptions,
                                    &aShadow)) {
    return;
  }

  // There was no path cache entry available to use, so fall back to drawing the
  // path with Skia.
  MarkSkiaChanged(aOptions);
  mSkia->DrawShadow(aPath, aPattern, aShadow, aOptions, aStrokeOptions);
}

void DrawTargetWebgl::DrawSurfaceWithShadow(SourceSurface* aSurface,
                                            const Point& aDest,
                                            const ShadowOptions& aShadow,
                                            CompositionOp aOperator) {
  DrawOptions options(1.0f, aOperator);
  if (ShouldAccelPath(options, nullptr)) {
    SurfacePattern pattern(aSurface, ExtendMode::CLAMP,
                           Matrix::Translation(aDest));
    SkPath skiaPath;
    skiaPath.addRect(RectToSkRect(Rect(aSurface->GetRect()) + aDest));
    RefPtr<PathSkia> path = new PathSkia(skiaPath, FillRule::FILL_WINDING);
    AutoRestoreTransform restore(this);
    SetTransform(Matrix());
    if (mSharedContext->DrawPathAccel(path, pattern, options, nullptr, &aShadow,
                                      false)) {
      DrawRect(Rect(aSurface->GetRect()) + aDest, pattern, options);
      return;
    }
  }

  MarkSkiaChanged(options);
  mSkia->DrawSurfaceWithShadow(aSurface, aDest, aShadow, aOperator);
}

already_AddRefed<PathBuilder> DrawTargetWebgl::CreatePathBuilder(
    FillRule aFillRule) const {
  return mSkia->CreatePathBuilder(aFillRule);
}

void DrawTargetWebgl::SetTransform(const Matrix& aTransform) {
  DrawTarget::SetTransform(aTransform);
  mSkia->SetTransform(aTransform);
}

void DrawTargetWebgl::StrokeRect(const Rect& aRect, const Pattern& aPattern,
                                 const StrokeOptions& aStrokeOptions,
                                 const DrawOptions& aOptions) {
  if (!mWebglValid) {
    MarkSkiaChanged(aOptions);
    mSkia->StrokeRect(aRect, aPattern, aStrokeOptions, aOptions);
  } else {
    // If the stroke options are unsupported, then transform the rect to a path
    // so it can be cached.
    SkPath skiaPath;
    skiaPath.addRect(RectToSkRect(aRect));
    RefPtr<PathSkia> path = new PathSkia(skiaPath, FillRule::FILL_WINDING);
    DrawPath(path, aPattern, aOptions, &aStrokeOptions);
  }
}

static inline bool IsThinLine(const Matrix& aTransform,
                              const StrokeOptions& aStrokeOptions) {
  auto scale = aTransform.ScaleFactors();
  return std::max(scale.xScale, scale.yScale) * aStrokeOptions.mLineWidth <= 1;
}

bool DrawTargetWebgl::StrokeLineAccel(const Point& aStart, const Point& aEnd,
                                      const Pattern& aPattern,
                                      const StrokeOptions& aStrokeOptions,
                                      const DrawOptions& aOptions,
                                      bool aClosed) {
  // Approximating a wide line as a rectangle works only with certain cap styles
  // in the general case (butt or square). However, if the line width is
  // sufficiently thin, we can either ignore the round cap (or treat it like
  // square for zero-length lines) without causing objectionable artifacts.
  // Lines may sometimes be used in closed paths that immediately reverse back,
  // in which case we need to use mLineJoin instead of mLineCap to determine the
  // actual cap used.
  CapStyle capStyle =
      aClosed ? (aStrokeOptions.mLineJoin == JoinStyle::ROUND ? CapStyle::ROUND
                                                              : CapStyle::BUTT)
              : aStrokeOptions.mLineCap;
  if (mWebglValid && SupportsPattern(aPattern) &&
      (capStyle != CapStyle::ROUND ||
       IsThinLine(GetTransform(), aStrokeOptions)) &&
      aStrokeOptions.mDashPattern == nullptr && aStrokeOptions.mLineWidth > 0) {
    // Treat the line as a rectangle whose center-line is the supplied line and
    // for which the height is the supplied line width. Generate a matrix that
    // maps the X axis to the orientation of the line and the Y axis to the
    // normal vector to the line. This only works if the line caps are squared,
    // as rounded rectangles are currently not supported for round line caps.
    Point start = aStart;
    Point dirX = aEnd - aStart;
    Point dirY;
    float dirLen = dirX.Length();
    float scale = aStrokeOptions.mLineWidth;
    if (dirLen == 0.0f) {
      // If the line is zero-length, then only a cap is rendered.
      switch (capStyle) {
        case CapStyle::BUTT:
          // The cap doesn't extend beyond the line so nothing is drawn.
          return true;
        case CapStyle::ROUND:
        case CapStyle::SQUARE:
          // Draw a unit square centered at the single point.
          dirX = Point(scale, 0.0f);
          dirY = Point(0.0f, scale);
          // Offset the start by half a unit.
          start.x -= 0.5f * scale;
          break;
      }
    } else {
      // Make the scale map to a single unit length.
      scale /= dirLen;
      dirY = Point(-dirX.y, dirX.x) * scale;
      if (capStyle == CapStyle::SQUARE) {
        // Offset the start by half a unit.
        start -= (dirX * scale) * 0.5f;
        // Ensure the extent also accounts for the start and end cap.
        dirX += dirX * scale;
      }
    }
    Matrix lineXform(dirX.x, dirX.y, dirY.x, dirY.y, start.x - 0.5f * dirY.x,
                     start.y - 0.5f * dirY.y);
    AutoRestoreTransform restore(this);
    ConcatTransform(lineXform);
    if (DrawRect(Rect(0, 0, 1, 1), aPattern, aOptions, Nothing(), nullptr, true,
                 true, true)) {
      return true;
    }
  }
  return false;
}

void DrawTargetWebgl::StrokeLine(const Point& aStart, const Point& aEnd,
                                 const Pattern& aPattern,
                                 const StrokeOptions& aStrokeOptions,
                                 const DrawOptions& aOptions) {
  if (!mWebglValid) {
    MarkSkiaChanged(aOptions);
    mSkia->StrokeLine(aStart, aEnd, aPattern, aStrokeOptions, aOptions);
  } else if (!StrokeLineAccel(aStart, aEnd, aPattern, aStrokeOptions,
                              aOptions)) {
    // If the stroke options are unsupported, then transform the line to a path
    // so it can be cached.
    SkPath skiaPath;
    skiaPath.moveTo(PointToSkPoint(aStart));
    skiaPath.lineTo(PointToSkPoint(aEnd));
    RefPtr<PathSkia> path = new PathSkia(skiaPath, FillRule::FILL_WINDING);
    DrawPath(path, aPattern, aOptions, &aStrokeOptions);
  }
}

void DrawTargetWebgl::Stroke(const Path* aPath, const Pattern& aPattern,
                             const StrokeOptions& aStrokeOptions,
                             const DrawOptions& aOptions) {
  if (!aPath || aPath->GetBackendType() != BackendType::SKIA) {
    return;
  }
  const auto& skiaPath = static_cast<const PathSkia*>(aPath)->GetPath();
  if (!mWebglValid) {
    MarkSkiaChanged(aOptions);
    mSkia->Stroke(aPath, aPattern, aStrokeOptions, aOptions);
    return;
  }

  // Avoid using Skia's isLine here because some paths erroneously include a
  // closePath at the end, causing isLine to not detect the line. In that case
  // we just draw a line in reverse right over the original line.
  int numVerbs = skiaPath.countVerbs();
  if (numVerbs >= 2 && numVerbs <= 3) {
    uint8_t verbs[3];
    skiaPath.getVerbs(verbs, numVerbs);
    if (verbs[0] == SkPath::kMove_Verb && verbs[1] == SkPath::kLine_Verb &&
        (numVerbs < 3 || verbs[2] == SkPath::kClose_Verb)) {
      bool closed = numVerbs >= 3;
      Point start = SkPointToPoint(skiaPath.getPoint(0));
      Point end = SkPointToPoint(skiaPath.getPoint(1));
      if (StrokeLineAccel(start, end, aPattern, aStrokeOptions, aOptions,
                          closed)) {
        if (closed) {
          StrokeLineAccel(end, start, aPattern, aStrokeOptions, aOptions, true);
        }
        return;
      }
      // If accelerated line drawing failed, just treat it as a path.
    }
  }

  DrawPath(aPath, aPattern, aOptions, &aStrokeOptions);
}

bool DrawTargetWebgl::ShouldUseSubpixelAA(ScaledFont* aFont,
                                          const DrawOptions& aOptions) {
  AntialiasMode aaMode = aFont->GetDefaultAAMode();
  if (aOptions.mAntialiasMode != AntialiasMode::DEFAULT) {
    aaMode = aOptions.mAntialiasMode;
  }
  return GetPermitSubpixelAA() &&
         (aaMode == AntialiasMode::DEFAULT ||
          aaMode == AntialiasMode::SUBPIXEL) &&
         aOptions.mCompositionOp == CompositionOp::OP_OVER;
}

void DrawTargetWebgl::StrokeGlyphs(ScaledFont* aFont,
                                   const GlyphBuffer& aBuffer,
                                   const Pattern& aPattern,
                                   const StrokeOptions& aStrokeOptions,
                                   const DrawOptions& aOptions) {
  if (!aFont || !aBuffer.mNumGlyphs) {
    return;
  }

  bool useSubpixelAA = ShouldUseSubpixelAA(aFont, aOptions);

  if (mWebglValid && SupportsDrawOptions(aOptions) &&
      aPattern.GetType() == PatternType::COLOR && PrepareContext() &&
      mSharedContext->DrawGlyphsAccel(aFont, aBuffer, aPattern, aOptions,
                                      &aStrokeOptions, useSubpixelAA)) {
    return;
  }

  if (useSubpixelAA) {
    // Subpixel AA does not support layering because the subpixel masks can't
    // blend with the over op.
    MarkSkiaChanged();
  } else {
    MarkSkiaChanged(aOptions);
  }
  mSkia->StrokeGlyphs(aFont, aBuffer, aPattern, aStrokeOptions, aOptions);
}

// Depending on whether we enable subpixel position for a given font, Skia may
// round transformed coordinates differently on each axis. By default, text is
// subpixel quantized horizontally and snapped to a whole integer vertical
// baseline. Axis-flip transforms instead snap to horizontal boundaries while
// subpixel quantizing along the vertical. For other types of transforms, Skia
// just applies subpixel quantization to both axes.
// We must duplicate the amount of quantization Skia applies carefully as a
// boundary value such as 0.49 may round to 0.5 with subpixel quantization,
// but if Skia actually snapped it to a whole integer instead, it would round
// down to 0. If a subsequent glyph with offset 0.51 came in, we might
// mistakenly round it down to 0.5, whereas Skia would round it up to 1. Thus
// we would alias 0.49 and 0.51 to the same cache entry, while Skia would
// actually snap the offset to 0 or 1, depending, resulting in mismatched
// hinting.
static inline IntPoint QuantizeScale(ScaledFont* aFont,
                                     const Matrix& aTransform) {
  if (!aFont->UseSubpixelPosition()) {
    return {1, 1};
  }
  if (aTransform._12 == 0) {
    // Glyphs are rendered subpixel horizontally, so snap vertically.
    return {4, 1};
  }
  if (aTransform._11 == 0) {
    // Glyphs are rendered subpixel vertically, so snap horizontally.
    return {1, 4};
  }
  // The transform isn't aligned, so don't snap.
  return {4, 4};
}

// Skia only supports subpixel positioning to the nearest 1/4 fraction. It
// would be wasteful to attempt to cache text runs with positioning that is
// anymore precise than this. To prevent this cache bloat, we quantize the
// transformed glyph positions to the nearest 1/4. The scaling factor for
// the quantization is baked into the transform, so that if subpixel rounding
// is used on a given axis, then the axis will be multiplied by 4 before
// rounding. Since the quantized position is not used for rasterization, the
// transform is safe to modify as such.
static inline IntPoint QuantizePosition(const Matrix& aTransform,
                                        const IntPoint& aOffset,
                                        const Point& aPosition) {
  return RoundedToInt(aTransform.TransformPoint(aPosition)) - aOffset;
}

// Get a quantized starting offset for the glyph buffer. We want this offset
// to encapsulate the transform and buffer offset while still preserving the
// relative subpixel positions of the glyphs this offset is subtracted from.
static inline IntPoint QuantizeOffset(const Matrix& aTransform,
                                      const IntPoint& aQuantizeScale,
                                      const GlyphBuffer& aBuffer) {
  IntPoint offset =
      RoundedToInt(aTransform.TransformPoint(aBuffer.mGlyphs[0].mPosition));
  offset.x.value &= ~(aQuantizeScale.x.value - 1);
  offset.y.value &= ~(aQuantizeScale.y.value - 1);
  return offset;
}

// Hashes a glyph buffer to a single hash value that can be used for quick
// comparisons. Each glyph position is transformed and quantized before
// hashing.
HashNumber GlyphCacheEntry::HashGlyphs(const GlyphBuffer& aBuffer,
                                       const Matrix& aTransform,
                                       const IntPoint& aQuantizeScale) {
  HashNumber hash = 0;
  IntPoint offset = QuantizeOffset(aTransform, aQuantizeScale, aBuffer);
  for (size_t i = 0; i < aBuffer.mNumGlyphs; i++) {
    const Glyph& glyph = aBuffer.mGlyphs[i];
    hash = AddToHash(hash, glyph.mIndex);
    IntPoint pos = QuantizePosition(aTransform, offset, glyph.mPosition);
    hash = AddToHash(hash, pos.x);
    hash = AddToHash(hash, pos.y);
  }
  return hash;
}

// Determines if an existing glyph cache entry matches an incoming text run.
inline bool GlyphCacheEntry::MatchesGlyphs(
    const GlyphBuffer& aBuffer, const DeviceColor& aColor,
    const Matrix& aTransform, const IntPoint& aQuantizeOffset,
    const IntPoint& aBoundsOffset, const IntRect& aClipRect, HashNumber aHash,
    const StrokeOptions* aStrokeOptions) {
  // First check if the hash matches to quickly reject the text run before any
  // more expensive checking. If it matches, then check if the color and
  // transform are the same.
  if (aHash != mHash || aBuffer.mNumGlyphs != mBuffer.mNumGlyphs ||
      aColor != mColor || !HasMatchingScale(aTransform, mTransform)) {
    return false;
  }
  // Finally check if all glyphs and their quantized positions match.
  for (size_t i = 0; i < aBuffer.mNumGlyphs; i++) {
    const Glyph& dst = mBuffer.mGlyphs[i];
    const Glyph& src = aBuffer.mGlyphs[i];
    if (dst.mIndex != src.mIndex ||
        dst.mPosition != Point(QuantizePosition(aTransform, aQuantizeOffset,
                                                src.mPosition))) {
      return false;
    }
  }
  // Check that stroke options actually match.
  if (aStrokeOptions) {
    // If stroking, verify that the entry is also stroked with the same options.
    if (!(mStrokeOptions && *aStrokeOptions == *mStrokeOptions)) {
      return false;
    }
  } else if (mStrokeOptions) {
    // If not stroking, check if the entry is stroked. If so, don't match.
    return false;
  }
  // Verify that the full bounds, once translated and clipped, are equal to the
  // clipped bounds.
  return (mFullBounds + aBoundsOffset)
      .Intersect(aClipRect)
      .IsEqualEdges(GetBounds() + aBoundsOffset);
}

GlyphCacheEntry::GlyphCacheEntry(const GlyphBuffer& aBuffer,
                                 const DeviceColor& aColor,
                                 const Matrix& aTransform,
                                 const IntPoint& aQuantizeScale,
                                 const IntRect& aBounds,
                                 const IntRect& aFullBounds, HashNumber aHash,
                                 StoredStrokeOptions* aStrokeOptions)
    : CacheEntryImpl<GlyphCacheEntry>(aTransform, aBounds, aHash),
      mColor(aColor),
      mFullBounds(aFullBounds),
      mStrokeOptions(aStrokeOptions) {
  // Store a copy of the glyph buffer with positions already quantized for fast
  // comparison later.
  Glyph* glyphs = new Glyph[aBuffer.mNumGlyphs];
  IntPoint offset = QuantizeOffset(aTransform, aQuantizeScale, aBuffer);
  // Make the bounds relative to the offset so we can add a new offset later.
  IntPoint boundsOffset(offset.x / aQuantizeScale.x,
                        offset.y / aQuantizeScale.y);
  mBounds -= boundsOffset;
  mFullBounds -= boundsOffset;
  for (size_t i = 0; i < aBuffer.mNumGlyphs; i++) {
    Glyph& dst = glyphs[i];
    const Glyph& src = aBuffer.mGlyphs[i];
    dst.mIndex = src.mIndex;
    dst.mPosition = Point(QuantizePosition(aTransform, offset, src.mPosition));
  }
  mBuffer.mGlyphs = glyphs;
  mBuffer.mNumGlyphs = aBuffer.mNumGlyphs;
}

GlyphCacheEntry::~GlyphCacheEntry() { delete[] mBuffer.mGlyphs; }

// Attempt to find a matching entry in the glyph cache. The caller should check
// whether the contained texture handle is valid to determine if it will need to
// render the text run or just reuse the cached texture.
already_AddRefed<GlyphCacheEntry> GlyphCache::FindEntry(
    const GlyphBuffer& aBuffer, const DeviceColor& aColor,
    const Matrix& aTransform, const IntPoint& aQuantizeScale,
    const IntRect& aClipRect, HashNumber aHash,
    const StrokeOptions* aStrokeOptions) {
  IntPoint offset = QuantizeOffset(aTransform, aQuantizeScale, aBuffer);
  IntPoint boundsOffset(offset.x / aQuantizeScale.x,
                        offset.y / aQuantizeScale.y);
  for (const RefPtr<GlyphCacheEntry>& entry : GetChain(aHash)) {
    if (entry->MatchesGlyphs(aBuffer, aColor, aTransform, offset, boundsOffset,
                             aClipRect, aHash, aStrokeOptions)) {
      return do_AddRef(entry);
    }
  }
  return nullptr;
}

// Insert a new entry in the glyph cache.
already_AddRefed<GlyphCacheEntry> GlyphCache::InsertEntry(
    const GlyphBuffer& aBuffer, const DeviceColor& aColor,
    const Matrix& aTransform, const IntPoint& aQuantizeScale,
    const IntRect& aBounds, const IntRect& aFullBounds, HashNumber aHash,
    const StrokeOptions* aStrokeOptions) {
  StoredStrokeOptions* strokeOptions = nullptr;
  if (aStrokeOptions) {
    strokeOptions = aStrokeOptions->Clone();
    if (!strokeOptions) {
      return nullptr;
    }
  }
  RefPtr<GlyphCacheEntry> entry =
      new GlyphCacheEntry(aBuffer, aColor, aTransform, aQuantizeScale, aBounds,
                          aFullBounds, aHash, strokeOptions);
  Insert(entry);
  return entry.forget();
}

GlyphCache::GlyphCache(ScaledFont* aFont) : mFont(aFont) {}

static void ReleaseGlyphCache(void* aPtr) {
  delete static_cast<GlyphCache*>(aPtr);
}

void DrawTargetWebgl::SetPermitSubpixelAA(bool aPermitSubpixelAA) {
  DrawTarget::SetPermitSubpixelAA(aPermitSubpixelAA);
  mSkia->SetPermitSubpixelAA(aPermitSubpixelAA);
}

// Check for any color glyphs contained within a rasterized BGRA8 text result.
static bool CheckForColorGlyphs(const RefPtr<SourceSurface>& aSurface) {
  if (aSurface->GetFormat() != SurfaceFormat::B8G8R8A8) {
    return false;
  }
  RefPtr<DataSourceSurface> dataSurf = aSurface->GetDataSurface();
  if (!dataSurf) {
    return true;
  }
  DataSourceSurface::ScopedMap map(dataSurf, DataSourceSurface::READ);
  if (!map.IsMapped()) {
    return true;
  }
  IntSize size = dataSurf->GetSize();
  const uint8_t* data = map.GetData();
  int32_t stride = map.GetStride();
  for (int y = 0; y < size.height; y++) {
    const uint32_t* x = (const uint32_t*)data;
    const uint32_t* end = x + size.width;
    for (; x < end; x++) {
      // Verify if all components are the same as for premultiplied grayscale.
      uint32_t color = *x;
      uint32_t gray = color & 0xFF;
      gray |= gray << 8;
      gray |= gray << 16;
      if (color != gray) return true;
    }
    data += stride;
  }
  return false;
}

// Draws glyphs to the WebGL target by trying to generate a cached texture for
// the text run that can be subsequently reused to quickly render the text run
// without using any software surfaces.
bool DrawTargetWebgl::SharedContext::DrawGlyphsAccel(
    ScaledFont* aFont, const GlyphBuffer& aBuffer, const Pattern& aPattern,
    const DrawOptions& aOptions, const StrokeOptions* aStrokeOptions,
    bool aUseSubpixelAA) {
  // Whether the font may use bitmaps. If so, we need to render the glyphs with
  // color as grayscale bitmaps will use the color while color emoji will not,
  // with no easy way to know ahead of time. We currently have to check the
  // rasterized result to see if there are any color glyphs. To render subpixel
  // masks, we need to know that the rasterized result actually represents a
  // subpixel mask rather than try to interpret it as a normal RGBA result such
  // as for color emoji.
  bool useBitmaps = !aStrokeOptions && aFont->MayUseBitmaps();

  // Look for an existing glyph cache on the font. If not there, create it.
  GlyphCache* cache =
      static_cast<GlyphCache*>(aFont->GetUserData(&mGlyphCacheKey));
  if (!cache) {
    cache = new GlyphCache(aFont);
    aFont->AddUserData(&mGlyphCacheKey, cache, ReleaseGlyphCache);
    mGlyphCaches.insertFront(cache);
  }
  // Hash the incoming text run and looking for a matching entry.
  DeviceColor color = static_cast<const ColorPattern&>(aPattern).mColor;
#ifdef XP_MACOSX
  // On macOS, depending on whether the text is classified as light-on-dark or
  // dark-on-light, we may end up with different amounts of dilation applied, so
  // we can't use the same mask in the two circumstances, or the glyphs will be
  // dilated incorrectly.
  bool lightOnDark =
      useBitmaps || (color.r >= 0.33f && color.g >= 0.33f && color.b >= 0.33f &&
                     color.r + color.g + color.b >= 2.0f);
#else
  // On other platforms, we assume no color-dependent dilation.
  const bool lightOnDark = true;
#endif
  // If the font has bitmaps, use the color directly. Otherwise, the texture
  // will hold a grayscale mask, so encode the key's subpixel and light-or-dark
  // state in the color.
  const Matrix& currentTransform = GetTransform();
  IntPoint quantizeScale = QuantizeScale(aFont, currentTransform);
  Matrix quantizeTransform = currentTransform;
  quantizeTransform.PostScale(quantizeScale.x, quantizeScale.y);
  HashNumber hash =
      GlyphCacheEntry::HashGlyphs(aBuffer, quantizeTransform, quantizeScale);
  DeviceColor colorOrMask =
      useBitmaps
          ? color
          : DeviceColor::Mask(aUseSubpixelAA ? 1 : 0, lightOnDark ? 1 : 0);
  IntRect clipRect(IntPoint(), mViewportSize);
  RefPtr<GlyphCacheEntry> entry =
      cache->FindEntry(aBuffer, colorOrMask, quantizeTransform, quantizeScale,
                       clipRect, hash, aStrokeOptions);
  if (!entry) {
    // For small text runs, bounds computations can be expensive relative to the
    // cost of looking up a cache result. Avoid doing local bounds computations
    // until actually inserting the entry into the cache.
    Maybe<Rect> bounds = mCurrentTarget->mSkia->GetGlyphLocalBounds(
        aFont, aBuffer, aPattern, aStrokeOptions, aOptions);
    if (!bounds) {
      return true;
    }
    // Transform the local bounds into device space so that we know how big
    // the cached texture will be.
    Rect xformBounds = currentTransform.TransformBounds(*bounds);
    // Check if the transform flattens out the bounds before rounding.
    if (xformBounds.IsEmpty()) {
      return true;
    }
    IntRect fullBounds = RoundedOut(currentTransform.TransformBounds(*bounds));
    IntRect clipBounds = fullBounds.Intersect(clipRect);
    // Check if the bounds are completely clipped out.
    if (clipBounds.IsEmpty()) {
      return true;
    }
    entry = cache->InsertEntry(aBuffer, colorOrMask, quantizeTransform,
                               quantizeScale, clipBounds, fullBounds, hash,
                               aStrokeOptions);
    if (!entry) {
      return false;
    }
  }

  // The bounds of the entry may have a different transform offset from the
  // bounds of the currently drawn text run. The entry bounds are relative to
  // the entry's quantized offset already, so just move the bounds to the new
  // offset.
  IntRect intBounds = entry->GetBounds();
  IntPoint newOffset =
      QuantizeOffset(quantizeTransform, quantizeScale, aBuffer);
  intBounds +=
      IntPoint(newOffset.x / quantizeScale.x, newOffset.y / quantizeScale.y);
  // Ensure there is a clear border around the text. This must be applied only
  // after clipping so that we always have some border texels for filtering.
  intBounds.Inflate(2);

  RefPtr<TextureHandle> handle = entry->GetHandle();
  if (handle && handle->IsValid()) {
    // If there is an entry with a valid cached texture handle, then try
    // to draw with that. If that for some reason failed, then fall back
    // to using the Skia target as that means we were preventing from
    // drawing to the WebGL context based on something other than the
    // texture.
    SurfacePattern pattern(nullptr, ExtendMode::CLAMP,
                           Matrix::Translation(intBounds.TopLeft()));
    if (DrawRectAccel(Rect(intBounds), pattern, aOptions,
                      useBitmaps ? Nothing() : Some(color), &handle, false,
                      true, true)) {
      return true;
    }
  } else {
    handle = nullptr;

    // If we get here, either there wasn't a cached texture handle or it
    // wasn't valid. Render the text run into a temporary target.
    RefPtr<DrawTargetSkia> textDT = new DrawTargetSkia;
    if (textDT->Init(intBounds.Size(),
                     lightOnDark && !useBitmaps && !aUseSubpixelAA
                         ? SurfaceFormat::A8
                         : SurfaceFormat::B8G8R8A8)) {
      if (!lightOnDark) {
        // If rendering dark-on-light text, we need to clear the background to
        // white while using an opaque alpha value to allow this.
        textDT->FillRect(Rect(IntRect(IntPoint(), intBounds.Size())),
                         ColorPattern(DeviceColor(1, 1, 1, 1)),
                         DrawOptions(1.0f, CompositionOp::OP_OVER));
      }
      textDT->SetTransform(currentTransform *
                           Matrix::Translation(-intBounds.TopLeft()));
      textDT->SetPermitSubpixelAA(aUseSubpixelAA);
      DrawOptions drawOptions(1.0f, CompositionOp::OP_OVER,
                              aOptions.mAntialiasMode);
      // If bitmaps might be used, then we have to supply the color, as color
      // emoji may ignore it while grayscale bitmaps may use it, with no way to
      // know ahead of time. Otherwise, assume the output will be a mask and
      // just render it white to determine intensity. Depending on whether the
      // text is light or dark, we render white or black text respectively.
      ColorPattern colorPattern(
          useBitmaps ? color : DeviceColor::Mask(lightOnDark ? 1 : 0, 1));
      if (aStrokeOptions) {
        textDT->StrokeGlyphs(aFont, aBuffer, colorPattern, *aStrokeOptions,
                             drawOptions);
      } else {
        textDT->FillGlyphs(aFont, aBuffer, colorPattern, drawOptions);
      }
      if (!lightOnDark) {
        uint8_t* data = nullptr;
        IntSize size;
        int32_t stride = 0;
        SurfaceFormat format = SurfaceFormat::UNKNOWN;
        if (!textDT->LockBits(&data, &size, &stride, &format)) {
          return false;
        }
        uint8_t* row = data;
        for (int y = 0; y < size.height; ++y) {
          uint8_t* px = row;
          for (int x = 0; x < size.width; ++x) {
            // If rendering dark-on-light text, we need to invert the final mask
            // so that it is in the expected white text on transparent black
            // format. The alpha will be initialized to the largest of the
            // values.
            px[0] = 255 - px[0];
            px[1] = 255 - px[1];
            px[2] = 255 - px[2];
            px[3] = std::max(px[0], std::max(px[1], px[2]));
            px += 4;
          }
          row += stride;
        }
        textDT->ReleaseBits(data);
      }
      RefPtr<SourceSurface> textSurface = textDT->Snapshot();
      if (textSurface) {
        // If we don't expect the text surface to contain color glyphs
        // such as from subpixel AA, then do one final check to see if
        // any ended up in the result. If not, extract the alpha values
        // from the surface so we can render it as a mask.
        if (textSurface->GetFormat() != SurfaceFormat::A8 &&
            !CheckForColorGlyphs(textSurface)) {
          textSurface = ExtractAlpha(textSurface, !useBitmaps);
          if (!textSurface) {
            // Failed extracting alpha for the text surface...
            return false;
          }
        }
        // Attempt to upload the rendered text surface into a texture
        // handle and draw it.
        SurfacePattern pattern(textSurface, ExtendMode::CLAMP,
                               Matrix::Translation(intBounds.TopLeft()));
        if (DrawRectAccel(Rect(intBounds), pattern, aOptions,
                          useBitmaps ? Nothing() : Some(color), &handle, false,
                          true) &&
            handle) {
          // If drawing succeeded, then the text surface was uploaded to
          // a texture handle. Assign it to the glyph cache entry.
          entry->Link(handle);
        } else {
          // If drawing failed, remove the entry from the cache.
          entry->Unlink();
        }
        return true;
      }
    }
  }
  return false;
}

void DrawTargetWebgl::FillGlyphs(ScaledFont* aFont, const GlyphBuffer& aBuffer,
                                 const Pattern& aPattern,
                                 const DrawOptions& aOptions) {
  if (!aFont || !aBuffer.mNumGlyphs) {
    return;
  }

  bool useSubpixelAA = ShouldUseSubpixelAA(aFont, aOptions);

  if (mWebglValid && SupportsDrawOptions(aOptions) &&
      aPattern.GetType() == PatternType::COLOR && PrepareContext() &&
      mSharedContext->DrawGlyphsAccel(aFont, aBuffer, aPattern, aOptions,
                                      nullptr, useSubpixelAA)) {
    return;
  }

  // If not able to cache the text run to a texture, then just fall back to
  // drawing with the Skia target.
  if (useSubpixelAA) {
    // Subpixel AA does not support layering because the subpixel masks can't
    // blend with the over op.
    MarkSkiaChanged();
  } else {
    MarkSkiaChanged(aOptions);
  }
  mSkia->FillGlyphs(aFont, aBuffer, aPattern, aOptions);
}

void DrawTargetWebgl::SharedContext::WaitForShmem(DrawTargetWebgl* aTarget) {
  if (mWaitForShmem) {
    // GetError is a sync IPDL call that forces all dispatched commands to be
    // flushed. Once it returns, we are certain that any commands processing
    // the Shmem have finished.
    (void)mWebgl->GetError();
    mWaitForShmem = false;
    // The sync IPDL call can cause expensive round-trips to add up over time,
    // so account for that here.
    if (aTarget) {
      aTarget->mProfile.OnReadback();
    }
  }
}

void DrawTargetWebgl::MarkSkiaChanged(const DrawOptions& aOptions) {
  if (SupportsLayering(aOptions)) {
    WaitForShmem();
    if (!mSkiaValid) {
      // If the Skia context needs initialization, clear it and enable layering.
      mSkiaValid = true;
      if (mWebglValid) {
        mProfile.OnLayer();
        mSkiaLayer = true;
        mSkia->DetachAllSnapshots();
        mSkiaNoClip->ClearRect(Rect(mSkiaNoClip->GetRect()));
      }
    }
    // The WebGL context is no longer up-to-date.
    mWebglValid = false;
  } else {
    // For other composition ops, just overwrite the Skia data.
    MarkSkiaChanged();
  }
}

// Attempts to read the contents of the WebGL context into the Skia target.
void DrawTargetWebgl::ReadIntoSkia() {
  if (mSkiaValid) {
    return;
  }
  if (mWebglValid) {
    uint8_t* data = nullptr;
    IntSize size;
    int32_t stride;
    SurfaceFormat format;
    // If there's no existing snapshot and we can successfully map the Skia
    // target for reading, then try to read into that.
    if (!mSnapshot && mSkia->LockBits(&data, &size, &stride, &format)) {
      (void)ReadInto(data, stride);
      mSkia->ReleaseBits(data);
    } else if (RefPtr<SourceSurface> snapshot = Snapshot()) {
      // Otherwise, fall back to getting a snapshot from WebGL if available
      // and then copying that to Skia.
      mSkia->CopySurface(snapshot, GetRect(), IntPoint(0, 0));
    }
    // Signal that we've hit a complete software fallback.
    mProfile.OnFallback();
  }
  mSkiaValid = true;
  // The Skia data is flat after reading, so disable any layering.
  mSkiaLayer = false;
}

// Reads data from the WebGL context and blends it with the current Skia layer.
void DrawTargetWebgl::FlattenSkia() {
  if (!mSkiaValid || !mSkiaLayer) {
    return;
  }
  if (RefPtr<DataSourceSurface> base = ReadSnapshot()) {
    mSkia->DetachAllSnapshots();
    mSkiaNoClip->DrawSurface(base, Rect(GetRect()), Rect(GetRect()),
                             DrawSurfaceOptions(SamplingFilter::POINT),
                             DrawOptions(1.f, CompositionOp::OP_DEST_OVER));
  }
  mSkiaLayer = false;
}

// Attempts to draw the contents of the Skia target into the WebGL context.
bool DrawTargetWebgl::FlushFromSkia() {
  // If the WebGL context has been lost, then mark it as invalid and fail.
  if (mSharedContext->IsContextLost()) {
    mWebglValid = false;
    return false;
  }
  // The WebGL target is already valid, so there is nothing to do.
  if (mWebglValid) {
    return true;
  }
  // Ensure that DrawRect doesn't recursively call into FlushFromSkia. If
  // the Skia target isn't valid, then it doesn't matter what is in the the
  // WebGL target either, so only try to blend if there is a valid Skia target.
  mWebglValid = true;
  if (mSkiaValid) {
    RefPtr<SourceSurface> skiaSnapshot = mSkia->Snapshot();
    if (!skiaSnapshot) {
      // There's a valid Skia target to draw to, but for some reason there is
      // no available snapshot, so just keep using the Skia target.
      mWebglValid = false;
      return false;
    }
    AutoRestoreContext restore(this);
    SurfacePattern pattern(skiaSnapshot, ExtendMode::CLAMP);
    // If there is a layer, blend the snapshot with the WebGL context,
    // otherwise copy it.
    if (!DrawRect(Rect(GetRect()), pattern,
                  DrawOptions(1.0f, mSkiaLayer ? CompositionOp::OP_OVER
                                               : CompositionOp::OP_SOURCE),
                  Nothing(), mSkiaLayer ? &mSnapshotTexture : nullptr, false,
                  false, true, true)) {
      // If accelerated drawing failed for some reason, then leave the Skia
      // target unchanged.
      mWebglValid = false;
      return false;
    }
  }
  return true;
}

void DrawTargetWebgl::UsageProfile::BeginFrame() {
  // Reset the usage profile counters for the new frame.
  mFallbacks = 0;
  mLayers = 0;
  mCacheMisses = 0;
  mCacheHits = 0;
  mUncachedDraws = 0;
  mReadbacks = 0;
}

void DrawTargetWebgl::UsageProfile::EndFrame() {
  bool failed = false;
  // If we hit a complete fallback to software rendering, or if cache misses
  // were more than cutoff ratio of all requests, then we consider the frame as
  // having failed performance profiling.
  float cacheRatio =
      StaticPrefs::gfx_canvas_accelerated_profile_cache_miss_ratio();
  if (mFallbacks > 0 ||
      float(mCacheMisses + mReadbacks + mLayers) >
          cacheRatio * float(mCacheMisses + mCacheHits + mUncachedDraws +
                             mReadbacks + mLayers)) {
    failed = true;
  }
  if (failed) {
    ++mFailedFrames;
  }
  ++mFrameCount;
}

bool DrawTargetWebgl::UsageProfile::RequiresRefresh() const {
  // If we've rendered at least the required number of frames for a profile and
  // more than the cutoff ratio of frames did not meet performance criteria,
  // then we should stop using an accelerated canvas.
  uint32_t profileFrames = StaticPrefs::gfx_canvas_accelerated_profile_frames();
  if (!profileFrames || mFrameCount < profileFrames) {
    return false;
  }
  float failRatio =
      StaticPrefs::gfx_canvas_accelerated_profile_fallback_ratio();
  return mFailedFrames > failRatio * mFrameCount;
}

void DrawTargetWebgl::SharedContext::CachePrefs() {
  uint32_t capacity = StaticPrefs::gfx_canvas_accelerated_gpu_path_size() << 20;
  if (capacity != mPathVertexCapacity) {
    mPathVertexCapacity = capacity;
    if (mPathCache) {
      mPathCache->ClearVertexRanges();
    }
    if (mPathVertexBuffer) {
      ResetPathVertexBuffer();
    }
  }

  mPathMaxComplexity =
      StaticPrefs::gfx_canvas_accelerated_gpu_path_complexity();

  mPathAAStroke = StaticPrefs::gfx_canvas_accelerated_aa_stroke_enabled();
  mPathWGRStroke = StaticPrefs::gfx_canvas_accelerated_stroke_to_fill_path();
}

// For use within CanvasRenderingContext2D, called on BorrowDrawTarget.
void DrawTargetWebgl::BeginFrame(const IntRect& aPersistedRect) {
  if (mNeedsPresent) {
    mNeedsPresent = false;
    // If still rendering into the Skia target, switch back to the WebGL
    // context.
    if (!mWebglValid) {
      if (aPersistedRect.IsEmpty()) {
        // If nothing needs to persist, just mark the WebGL context valid.
        mWebglValid = true;
      } else {
        FlushFromSkia();
      }
    }
  }
  // Check if we need to clear out any cached because of memory pressure.
  mSharedContext->ClearCachesIfNecessary();
  // Cache any prefs for the frame.
  mSharedContext->CachePrefs();
  mProfile.BeginFrame();
}

// For use within CanvasRenderingContext2D, called on ReturnDrawTarget.
void DrawTargetWebgl::EndFrame() {
  if (StaticPrefs::gfx_canvas_accelerated_debug()) {
    // Draw a green rectangle in the upper right corner to indicate
    // acceleration.
    IntRect corner = IntRect(mSize.width - 16, 0, 16, 16).Intersect(GetRect());
    DrawRect(Rect(corner), ColorPattern(DeviceColor(0.0f, 1.0f, 0.0f, 1.0f)),
             DrawOptions(), Nothing(), nullptr, false, false);
  }
  mProfile.EndFrame();
  // Ensure we're not somehow using more than the allowed texture memory.
  mSharedContext->PruneTextureMemory();
  // Signal that we're done rendering the frame in case no present occurs.
  mSharedContext->mWebgl->EndOfFrame();
  // Check if we need to clear out any cached because of memory pressure.
  mSharedContext->ClearCachesIfNecessary();
  // The framebuffer is dirty, so it needs to be copied to the swapchain.
  mNeedsPresent = true;
}

Maybe<layers::SurfaceDescriptor> DrawTargetWebgl::GetFrontBuffer() {
  // Only try to present and retrieve the front buffer if there is a valid
  // WebGL framebuffer that can be sent to the compositor. Otherwise, return
  // nothing to try to reuse the Skia snapshot.
  if (mNeedsPresent) {
    mNeedsPresent = false;
    if (mWebglValid || FlushFromSkia()) {
      // Copy and swizzle the WebGL framebuffer to the swap chain front buffer.
      webgl::SwapChainOptions options;
      options.bgra = true;
      // Allow async present to be toggled on for accelerated Canvas2D
      // independent of WebGL via pref.
      options.forceAsyncPresent =
          StaticPrefs::gfx_canvas_accelerated_async_present();
      mSharedContext->mWebgl->CopyToSwapChain(mFramebuffer, options);
    }
  }
  if (mWebglValid) {
    return mSharedContext->mWebgl->GetFrontBuffer(mFramebuffer);
  }
  return Nothing();
}

already_AddRefed<DrawTarget> DrawTargetWebgl::CreateSimilarDrawTarget(
    const IntSize& aSize, SurfaceFormat aFormat) const {
  return mSkia->CreateSimilarDrawTarget(aSize, aFormat);
}

bool DrawTargetWebgl::CanCreateSimilarDrawTarget(const IntSize& aSize,
                                                 SurfaceFormat aFormat) const {
  return mSkia->CanCreateSimilarDrawTarget(aSize, aFormat);
}

RefPtr<DrawTarget> DrawTargetWebgl::CreateClippedDrawTarget(
    const Rect& aBounds, SurfaceFormat aFormat) {
  return mSkia->CreateClippedDrawTarget(aBounds, aFormat);
}

already_AddRefed<SourceSurface> DrawTargetWebgl::CreateSourceSurfaceFromData(
    unsigned char* aData, const IntSize& aSize, int32_t aStride,
    SurfaceFormat aFormat) const {
  return mSkia->CreateSourceSurfaceFromData(aData, aSize, aStride, aFormat);
}

already_AddRefed<SourceSurface>
DrawTargetWebgl::CreateSourceSurfaceFromNativeSurface(
    const NativeSurface& aSurface) const {
  return mSkia->CreateSourceSurfaceFromNativeSurface(aSurface);
}

already_AddRefed<SourceSurface> DrawTargetWebgl::OptimizeSourceSurface(
    SourceSurface* aSurface) const {
  if (aSurface->GetType() == SurfaceType::WEBGL) {
    return do_AddRef(aSurface);
  }
  return mSkia->OptimizeSourceSurface(aSurface);
}

already_AddRefed<SourceSurface>
DrawTargetWebgl::OptimizeSourceSurfaceForUnknownAlpha(
    SourceSurface* aSurface) const {
  return mSkia->OptimizeSourceSurfaceForUnknownAlpha(aSurface);
}

already_AddRefed<GradientStops> DrawTargetWebgl::CreateGradientStops(
    GradientStop* aStops, uint32_t aNumStops, ExtendMode aExtendMode) const {
  return mSkia->CreateGradientStops(aStops, aNumStops, aExtendMode);
}

already_AddRefed<FilterNode> DrawTargetWebgl::CreateFilter(FilterType aType) {
  return mSkia->CreateFilter(aType);
}

void DrawTargetWebgl::DrawFilter(FilterNode* aNode, const Rect& aSourceRect,
                                 const Point& aDestPoint,
                                 const DrawOptions& aOptions) {
  MarkSkiaChanged(aOptions);
  mSkia->DrawFilter(aNode, aSourceRect, aDestPoint, aOptions);
}

bool DrawTargetWebgl::Draw3DTransformedSurface(SourceSurface* aSurface,
                                               const Matrix4x4& aMatrix) {
  MarkSkiaChanged();
  return mSkia->Draw3DTransformedSurface(aSurface, aMatrix);
}

void DrawTargetWebgl::PushLayer(bool aOpaque, Float aOpacity,
                                SourceSurface* aMask,
                                const Matrix& aMaskTransform,
                                const IntRect& aBounds, bool aCopyBackground) {
  PushLayerWithBlend(aOpaque, aOpacity, aMask, aMaskTransform, aBounds,
                     aCopyBackground, CompositionOp::OP_OVER);
}

void DrawTargetWebgl::PushLayerWithBlend(bool aOpaque, Float aOpacity,
                                         SourceSurface* aMask,
                                         const Matrix& aMaskTransform,
                                         const IntRect& aBounds,
                                         bool aCopyBackground,
                                         CompositionOp aCompositionOp) {
  MarkSkiaChanged(DrawOptions(aOpacity, aCompositionOp));
  mSkia->PushLayerWithBlend(aOpaque, aOpacity, aMask, aMaskTransform, aBounds,
                            aCopyBackground, aCompositionOp);
  ++mLayerDepth;
}

void DrawTargetWebgl::PopLayer() {
  MOZ_ASSERT(mSkiaValid);
  MOZ_ASSERT(mLayerDepth > 0);
  --mLayerDepth;
  mSkia->PopLayer();
}

}  // namespace mozilla::gfx

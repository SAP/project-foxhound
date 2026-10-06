/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/layers/NativeLayer.h"

#include "GLBlitHelper.h"
#include "GLContext.h"
#include "MozFramebuffer.h"
#include "mozilla/gfx/Swizzle.h"
#include "ScopedGLHelpers.h"

namespace mozilla::layers {

RenderSourceNLRS::RenderSourceNLRS(UniquePtr<gl::MozFramebuffer>&& aFramebuffer)
    : RenderSource(aFramebuffer->mSize),
      mFramebuffer(std::move(aFramebuffer)) {}

DownscaleTargetNLRS::DownscaleTargetNLRS(
    gl::GLContext* aGL, UniquePtr<gl::MozFramebuffer>&& aFramebuffer)
    : profiler_screenshots::DownscaleTarget(aFramebuffer->mSize),
      mGL(aGL),
      mRenderSource(MakeRefPtr<RenderSourceNLRS>(std::move(aFramebuffer))) {}

bool DownscaleTargetNLRS::DownscaleFrom(
    profiler_screenshots::RenderSource* aSource,
    const gfx::IntRect& aSourceRect, const gfx::IntRect& aDestRect) {
  mGL->BlitHelper()->BlitFramebufferToFramebuffer(
      static_cast<RenderSourceNLRS*>(aSource)->FB().mFB,
      mRenderSource->FB().mFB, aSourceRect, aDestRect, LOCAL_GL_LINEAR);

  return true;
}

AsyncReadbackBufferNLRS::AsyncReadbackBufferNLRS(gl::GLContext* aGL,
                                                 const gfx::IntSize& aSize,
                                                 GLuint aBufferHandle,
                                                 bool aYFlip)
    : profiler_screenshots::AsyncReadbackBuffer(aSize),
      mGL(aGL),
      mBufferHandle(aBufferHandle),
      mYFlip(aYFlip) {}

AsyncReadbackBufferNLRS::~AsyncReadbackBufferNLRS() {
  if (mGL && mGL->MakeCurrent()) {
    mGL->fDeleteBuffers(1, &mBufferHandle);
  }
}

void AsyncReadbackBufferNLRS::CopyFrom(
    profiler_screenshots::RenderSource* aSource) {
  gfx::IntSize size = aSource->Size();
  MOZ_RELEASE_ASSERT(Size() == size);

  gl::ScopedPackState scopedPackState(mGL);
  mGL->fBindBuffer(LOCAL_GL_PIXEL_PACK_BUFFER, mBufferHandle);
  mGL->fPixelStorei(LOCAL_GL_PACK_ALIGNMENT, 1);
  const gl::ScopedBindFramebuffer bindFB(
      mGL, static_cast<RenderSourceNLRS*>(aSource)->FB().mFB);
  mGL->fReadPixels(0, 0, size.width, size.height, LOCAL_GL_RGBA,
                   LOCAL_GL_UNSIGNED_BYTE, nullptr);
}

bool AsyncReadbackBufferNLRS::MapAndCopyInto(gfx::DataSourceSurface* aSurface,
                                             const gfx::IntSize& aReadSize) {
  MOZ_RELEASE_ASSERT(aReadSize <= aSurface->GetSize());

  if (!mGL || !mGL->MakeCurrent()) {
    return false;
  }

  gl::ScopedPackState scopedPackState(mGL);
  mGL->fBindBuffer(LOCAL_GL_PIXEL_PACK_BUFFER, mBufferHandle);
  mGL->fPixelStorei(LOCAL_GL_PACK_ALIGNMENT, 1);

  const uint8_t* srcData = nullptr;
  if (mGL->IsSupported(gl::GLFeature::map_buffer_range)) {
    srcData = static_cast<uint8_t*>(mGL->fMapBufferRange(
        LOCAL_GL_PIXEL_PACK_BUFFER, 0, aReadSize.height * aReadSize.width * 4,
        LOCAL_GL_MAP_READ_BIT));
  } else {
    srcData = static_cast<uint8_t*>(
        mGL->fMapBuffer(LOCAL_GL_PIXEL_PACK_BUFFER, LOCAL_GL_READ_ONLY));
  }

  if (!srcData) {
    return false;
  }

  int32_t srcStride = mSize.width * 4;  // Bind() sets an alignment of 1
  gfx::DataSourceSurface::ScopedMap map(aSurface,
                                        gfx::DataSourceSurface::WRITE);
  uint8_t* destData = map.GetData();
  int32_t destStride = map.GetStride();
  gfx::SurfaceFormat destFormat = aSurface->GetFormat();
  if (mYFlip) {
    SwizzleYFlipData(srcData, srcStride, gfx::SurfaceFormat::R8G8B8A8, destData,
                     destStride, destFormat, aReadSize);
  } else {
    SwizzleData(srcData, srcStride, gfx::SurfaceFormat::R8G8B8A8, destData,
                destStride, destFormat, aReadSize);
  }

  mGL->fUnmapBuffer(LOCAL_GL_PIXEL_PACK_BUFFER);

  return true;
}

}  // namespace mozilla::layers

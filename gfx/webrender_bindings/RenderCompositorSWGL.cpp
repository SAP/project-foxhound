/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RenderCompositorSWGL.h"

#include "mozilla/widget/CompositorWidget.h"

namespace mozilla {
namespace wr {

/* static */
UniquePtr<RenderCompositor> RenderCompositorSWGL::Create(
    RefPtr<widget::CompositorWidget>&& aWidget, nsACString& aError) {
  void* ctx = wr_swgl_create_context();
  if (!ctx) {
    gfxCriticalNote << "Failed SWGL context creation for WebRender";
    return nullptr;
  }
  return MakeUnique<RenderCompositorSWGL>(std::move(aWidget), ctx);
}

RenderCompositorSWGL::RenderCompositorSWGL(
    RefPtr<widget::CompositorWidget>&& aWidget, void* aContext)
    : RenderCompositor(std::move(aWidget)), mContext(aContext) {
  MOZ_ASSERT(mContext);
}

RenderCompositorSWGL::~RenderCompositorSWGL() {
  wr_swgl_destroy_context(mContext);
}

void RenderCompositorSWGL::ClearMappedBuffer() {
  mMappedData = nullptr;
  mMappedStride = 0;
  mDT = nullptr;
}

bool RenderCompositorSWGL::MakeCurrent() {
  wr_swgl_make_current(mContext);
  return true;
}

bool RenderCompositorSWGL::BeginFrame() {
  // Request a new draw target to use from the widget...
  ClearMappedBuffer();
  LayoutDeviceIntRect bounds(LayoutDeviceIntPoint(), GetBufferSize());
  mRegion = LayoutDeviceIntRegion(bounds);
  layers::BufferMode bufferMode = layers::BufferMode::BUFFERED;
  mDT = mWidget->StartRemoteDrawingInRegion(mRegion, &bufferMode);
  if (!mDT) {
    return false;
  }
  // Attempt to lock the underlying buffer directly from the draw target.
  // Verify that the size at least matches what the widget claims and that
  // the format is BGRA8 as SWGL requires.
  uint8_t* data = nullptr;
  IntSize size;
  int32_t stride = 0;
  SurfaceFormat format = SurfaceFormat::UNKNOWN;
  if (!mSurface && mDT->LockBits(&data, &size, &stride, &format) &&
      (size != bounds.Size().ToUnknownSize() ||
       (format != SurfaceFormat::B8G8R8A8 &&
        format != SurfaceFormat::B8G8R8X8))) {
    // We tried to lock the DT and it succeeded, but the size or format
    // of the data is not compatible, so just release it and fall back below...
    mDT->ReleaseBits(data);
    data = nullptr;
  }
  // If locking succeeded above, just use that.
  if (data) {
    mMappedData = data;
    mMappedStride = stride;
  } else {
    // If we couldn't lock the DT above, then allocate a data surface and map
    // that for usage with SWGL.
    size = bounds.Size().ToUnknownSize();
    if (!mSurface || mSurface->GetSize() != size) {
      mSurface =
          Factory::CreateDataSourceSurface(size, SurfaceFormat::B8G8R8A8);
    }
    gfx::DataSourceSurface::MappedSurface map = {nullptr, 0};
    if (!mSurface || !mSurface->Map(DataSourceSurface::READ_WRITE, &map)) {
      // We failed mapping the data surface, so need to cancel the frame.
      mWidget->EndRemoteDrawingInRegion(mDT, mRegion);
      ClearMappedBuffer();
      return false;
    }
    mMappedData = map.mData;
    mMappedStride = map.mStride;
  }
  MOZ_ASSERT(mMappedData != nullptr && mMappedStride > 0);
  wr_swgl_make_current(mContext);
  wr_swgl_init_default_framebuffer(mContext, bounds.width, bounds.height,
                                   mMappedStride, mMappedData);
  return true;
}

void RenderCompositorSWGL::CommitMappedBuffer() {
  if (!mDT) {
    return;
  }
  // If we have a draw target at this point, mapping must have succeeded.
  MOZ_ASSERT(mMappedData != nullptr);
  if (mSurface) {
    // If we're using a data surface, unmap it and draw it to the DT if there
    // are any supplied dirty rects.
    mSurface->Unmap();
    for (auto iter = mRegion.RectIter(); !iter.Done(); iter.Next()) {
      const LayoutDeviceIntRect& dirtyRect = iter.Get();
      gfx::Rect bounds(dirtyRect.x, dirtyRect.y, dirtyRect.width,
                       dirtyRect.height);
      mDT->DrawSurface(mSurface, bounds, bounds,
                       gfx::DrawSurfaceOptions(gfx::SamplingFilter::POINT),
                       gfx::DrawOptions(1.0f, gfx::CompositionOp::OP_SOURCE));
    }
  } else {
    // Otherwise, we had locked the DT directly. Just release the data.
    mDT->ReleaseBits(mMappedData);
  }
  // Done with the DT. Hand it back to the widget and clear out any trace of it.
  mWidget->EndRemoteDrawingInRegion(mDT, mRegion);
  ClearMappedBuffer();
}

void RenderCompositorSWGL::CancelFrame() { CommitMappedBuffer(); }

RenderedFrameId RenderCompositorSWGL::EndFrame(
    const nsTArray<DeviceIntRect>& aDirtyRects) {
  if (!aDirtyRects.IsEmpty()) {
    mRegion.SetEmpty();
    for (auto& rect : aDirtyRects) {
      mRegion.OrWith(LayoutDeviceIntRect(rect.origin.x, rect.origin.y,
                                         rect.size.width, rect.size.height));
    }
  }

  RenderedFrameId frameId = GetNextRenderFrameId();
  CommitMappedBuffer();
  return frameId;
}

void RenderCompositorSWGL::Pause() {}

bool RenderCompositorSWGL::Resume() { return true; }

LayoutDeviceIntSize RenderCompositorSWGL::GetBufferSize() {
  return mWidget->GetClientSize();
}

CompositorCapabilities RenderCompositorSWGL::GetCompositorCapabilities() {
  CompositorCapabilities caps;

  // don't use virtual surfaces
  caps.virtual_surface_size = 0;

  return caps;
}

}  // namespace wr
}  // namespace mozilla

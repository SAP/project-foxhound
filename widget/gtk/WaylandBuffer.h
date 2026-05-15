/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_WIDGET_GTK_WAYLAND_BUFFER_H
#define MOZILLA_WIDGET_GTK_WAYLAND_BUFFER_H

#include "DMABufSurface.h"
#include "GLContext.h"
#include "MozFramebuffer.h"
#include "mozilla/ipc/SharedMemoryHandle.h"
#include "mozilla/ipc/SharedMemoryMapping.h"
#include "mozilla/gfx/2D.h"
#include "mozilla/gfx/Types.h"
#include "mozilla/Mutex.h"
#include "mozilla/RefPtr.h"
#include "nsTArray.h"
#include "nsWaylandDisplay.h"
#include "WaylandSurface.h"

namespace mozilla::widget {

class WaylandBufferDMABUF;

// Allocates and owns shared memory for Wayland drawing surface
class WaylandShmPool {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WaylandShmPool);

  static RefPtr<WaylandShmPool> Create(nsWaylandDisplay* aWaylandDisplay,
                                       int aSize);

  wl_shm_pool* GetShmPool() { return mShmPool; };
  void* GetImageData();

 private:
  WaylandShmPool() = default;
  ~WaylandShmPool();

  wl_shm_pool* mShmPool = nullptr;
  ipc::MutableSharedMemoryHandle mShmHandle;
  ipc::SharedMemoryMapping mShm;
};

class BufferTransaction;

class WaylandBuffer {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WaylandBuffer);

  virtual already_AddRefed<gfx::DrawTarget> Lock() { return nullptr; };
  virtual void* GetImageData() { return nullptr; }
  virtual GLuint GetTexture() { return 0; }
  virtual void DestroyGLResources() {};
  virtual gfx::SurfaceFormat GetSurfaceFormat() = 0;
  virtual WaylandBufferDMABUF* AsWaylandBufferDMABUF() { return nullptr; };

  LayoutDeviceIntSize GetSize() const { return mSize; };
  bool IsMatchingSize(const LayoutDeviceIntSize& aSize) const {
    return aSize == mSize;
  }

  bool IsAttached(const WaylandSurfaceLock& aSurfaceLock) const;
  BufferTransaction* GetTransaction(const WaylandSurfaceLock& aSurfaceLock);
  void RemoveTransaction(const WaylandSurfaceLock& aSurfaceLock,
                         RefPtr<BufferTransaction> aTransaction);

#ifdef MOZ_LOGGING
  virtual void DumpToFile(const char* aHint) = 0;
#endif

  // Create and return wl_buffer for underlying memory buffer if it's missing.
  virtual wl_buffer* CreateWlBuffer() = 0;

  // Set wl_buffer from external source (WaylandBufferDMABUFHolder).
  void SetExternalWLBuffer(wl_buffer* aWLBuffer);

 protected:
  explicit WaylandBuffer(const LayoutDeviceIntSize& aSize);
  virtual ~WaylandBuffer() = default;

  // if set the wl_buffer is managed by someone else
  // (for instance WaylandBufferDMABUFHolder)
  // and WaylandBuffer can't destroy it.
  wl_buffer* mExternalWlBuffer = nullptr;

  AutoTArray<RefPtr<BufferTransaction>, 3> mBufferTransactions;

  LayoutDeviceIntSize mSize;

  static gfx::SurfaceFormat sFormat;

#ifdef MOZ_LOGGING
  static int mDumpSerial;
  static char* mDumpDir;
#endif
};

// Holds actual graphics data for wl_surface
class WaylandBufferSHM final : public WaylandBuffer {
 public:
  static RefPtr<WaylandBufferSHM> Create(const LayoutDeviceIntSize& aSize);

  void ReleaseWlBuffer();
  already_AddRefed<gfx::DrawTarget> Lock() override;
  void* GetImageData() override { return mShmPool->GetImageData(); }

  gfx::SurfaceFormat GetSurfaceFormat() override {
    return gfx::SurfaceFormat::B8G8R8A8;
  }

  void Clear();
  size_t GetBufferAge() const { return mBufferAge; };
  RefPtr<WaylandShmPool> GetShmPool() const { return mShmPool; }

  void IncrementBufferAge() { mBufferAge++; };
  void ResetBufferAge() { mBufferAge = 0; };

#ifdef MOZ_LOGGING
  void DumpToFile(const char* aHint) override;
#endif

  wl_buffer* CreateWlBuffer() override;

 private:
  explicit WaylandBufferSHM(const LayoutDeviceIntSize& aSize);
  ~WaylandBufferSHM() override;

  // WaylandShmPoolMB provides actual shared memory we draw into
  RefPtr<WaylandShmPool> mShmPool;

  size_t mBufferAge = 0;
};

class WaylandBufferDMABUF final : public WaylandBuffer {
 public:
  static already_AddRefed<WaylandBufferDMABUF> CreateRGBA(
      const LayoutDeviceIntSize& aSize, gl::GLContext* aGL,
      RefPtr<DRMFormat> aFormat);
  static already_AddRefed<WaylandBufferDMABUF> CreateExternal(
      RefPtr<DMABufSurface> aSurface);

  WaylandBufferDMABUF* AsWaylandBufferDMABUF() override { return this; };

  GLuint GetTexture() override { return mDMABufSurface->GetTexture(); };
  void DestroyGLResources() override { mDMABufSurface->ReleaseTextures(); };
  gfx::SurfaceFormat GetSurfaceFormat() override {
    return mDMABufSurface->GetFormat();
  }
  DMABufSurface* GetSurface() { return mDMABufSurface; }

#ifdef MOZ_LOGGING
  void DumpToFile(const char* aHint) override;
#endif

  wl_buffer* CreateWlBuffer() override;

 private:
  explicit WaylandBufferDMABUF(const LayoutDeviceIntSize& aSize);
  ~WaylandBufferDMABUF();

  RefPtr<DMABufSurface> mDMABufSurface;
};

class WaylandBufferDMABUFHolder final {
 public:
  bool Matches(DMABufSurface* aSurface) const;

  wl_buffer* GetWLBuffer() { return mWLBuffer; }

  WaylandBufferDMABUFHolder(DMABufSurface* aSurface, wl_buffer* aWLBuffer);
  ~WaylandBufferDMABUFHolder();

 private:
  wl_buffer* mWLBuffer = nullptr;
  uint32_t mUID = 0;
  uint32_t mPID = 0;
};

// BufferTransaction class holds wl_buffer callbacks after
// wl_surface_commit and manages wl_buffer. One WaylandBuffer and WaylandSurface
// can have active transactions over the same underlying memory buffer which
// allows to map/unmap wl_surfaces for instance during layered page scrolling.
// This helps slower Wayland compositors (like KDE) which doesn't release
// wl_buffers quickly and holds them for longer time.
class BufferTransaction {
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(BufferTransaction);

  BufferTransaction(WaylandBuffer* aBuffer, wl_buffer* aWLBuffer,
                    bool aIsExternalBuffer);

  wl_buffer* BufferBorrowLocked(const WaylandSurfaceLock& aSurfaceLock);

  void BufferDetachCallback();
  void BufferDeleteCallback();

  bool IsAttached() {
    return mBufferState == BufferState::WaitingForDetach ||
           mBufferState == BufferState::WaitingForDelete;
  }
  bool IsDetached() { return mBufferState == BufferState::Detached; }
  bool IsDeleted() { return mBufferState == BufferState::Deleted; }

  void DeleteTransactionLocked(const WaylandSurfaceLock& aSurfaceLock);

  bool MatchesBuffer(uintptr_t aBuffer) {
    return aBuffer == reinterpret_cast<uintptr_t>(mBuffer.get());
  }

  bool CanRecycle(WaylandSurface* aSurface) {
    return IsDetached() && (!mSurface || mSurface == aSurface);
  }

 private:
  ~BufferTransaction();

  void WlBufferDeleteLocked(const WaylandSurfaceLock& aSurfaceLock);
  void DeleteLocked(const WaylandSurfaceLock& aSurfaceLock);

  RefPtr<WaylandSurface> mSurface;
  RefPtr<WaylandBuffer> mBuffer;

  enum class BufferState {
    Detached,
    Deleted,
    WaitingForDetach,
    WaitingForDelete
  };

  BufferState mBufferState{BufferState::Detached};
  wl_buffer* mWLBuffer = nullptr;
  bool mIsExternalBuffer = false;
};

}  // namespace mozilla::widget

#endif  // MOZILLA_WIDGET_GTK_WAYLAND_BUFFER_H

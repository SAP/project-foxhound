/* -*- Mode: C; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WaylandSurface.h"
#include "WaylandBuffer.h"
#include <wayland-egl.h>
#include "nsGtkUtils.h"
#include "mozilla/StaticPrefs_widget.h"
#include "mozilla/ToString.h"
#include <dlfcn.h>
#include <fcntl.h>
#include "ScreenHelperGTK.h"
#include "DMABufFormats.h"
#include "nsWindow.h"
#include "mozilla/gfx/gfxVars.h"
#include "mozilla/gfx/Logging.h"
#ifdef MOZ_LOGGING
#  include "EncoderConfig.h"
#endif

#undef LOG
#ifdef MOZ_LOGGING
#  include "mozilla/Logging.h"
#  include "nsTArray.h"
#  include "Units.h"
#  undef LOGWAYLAND
#  undef LOGVERBOSE
#  undef LOG_ENABLED_VERBOSE
extern mozilla::LazyLogModule gWidgetWaylandLog;
#  define LOGWAYLAND(str, ...)                           \
    MOZ_LOG(gWidgetWaylandLog, mozilla::LogLevel::Debug, \
            ("%s: " str, GetDebugTag().get(), ##__VA_ARGS__))
#  define LOGVERBOSE(str, ...)                             \
    MOZ_LOG(gWidgetWaylandLog, mozilla::LogLevel::Verbose, \
            ("%s: " str, GetDebugTag().get(), ##__VA_ARGS__))
#  define LOGS(...) \
    MOZ_LOG(gWidgetWaylandLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#  define LOGS_VERBOSE(...) \
    MOZ_LOG(gWidgetWaylandLog, mozilla::LogLevel::Verbose, (__VA_ARGS__))
#  define LOG_ENABLED_VERBOSE() \
    MOZ_LOG_TEST(gWidgetWaylandLog, mozilla::LogLevel::Verbose)
#else
#  define LOGWAYLAND(...)
#  undef LOGVERBOSE
#  undef LOG_ENABLED_VERBOSE
#  define LOGVERBOSE(...)
#  define LOGS(...)
#  define LOGS_VERBOSE(...)
#  define LOG_ENABLED_VERBOSE(...)
#endif /* MOZ_LOGGING */

using namespace mozilla;
using namespace mozilla::widget;

namespace mozilla::widget {

#ifdef MOZ_LOGGING
nsAutoCString WaylandSurface::GetDebugTag() const {
  nsAutoCString tag;
  tag.AppendPrintf("[%p]", mLoggingWidget);
  return tag;
}
#endif

void (*WaylandSurface::sGdkWaylandWindowAddCallbackSurface)(
    GdkWindow*, struct wl_surface*) = nullptr;
void (*WaylandSurface::sGdkWaylandWindowRemoveCallbackSurface)(
    GdkWindow*, struct wl_surface*) = nullptr;

bool WaylandSurface::IsOpaqueRegionEnabled() {
  static bool sIsOpaqueRegionEnabled = []() {
    if (!StaticPrefs::widget_wayland_opaque_region_enabled_AtStartup()) {
      return false;
    }
    sGdkWaylandWindowAddCallbackSurface =
        reinterpret_cast<void (*)(GdkWindow*, struct wl_surface*)>(dlsym(
            RTLD_DEFAULT, "gdk_wayland_window_add_frame_callback_surface"));
    sGdkWaylandWindowRemoveCallbackSurface =
        reinterpret_cast<void (*)(GdkWindow*, struct wl_surface*)>(dlsym(
            RTLD_DEFAULT, "gdk_wayland_window_remove_frame_callback_surface"));
    return sGdkWaylandWindowAddCallbackSurface &&
           sGdkWaylandWindowRemoveCallbackSurface;
  }();
  return sIsOpaqueRegionEnabled;
}

WaylandSurface::WaylandSurface(RefPtr<WaylandSurface> aParent)
    : mParent(aParent) {
  LOGWAYLAND("WaylandSurface::WaylandSurface(), parent [%p]",
             mParent ? mParent->GetLoggingWidget() : nullptr);
  struct wl_compositor* compositor = WaylandDisplayGet()->GetCompositor();
  mSurface = wl_compositor_create_surface(compositor);
  LOGWAYLAND("    created surface %p ID %d", (void*)mSurface,
             wl_proxy_get_id((struct wl_proxy*)mSurface));
  MOZ_RELEASE_ASSERT(mSurface, "Can't create wl_surface!");
}

WaylandSurface::~WaylandSurface() {
  LOGWAYLAND("WaylandSurface::~WaylandSurface()");

  wl_egl_window* tmp = nullptr;
  mEGLWindow.exchange(tmp);
  MozClearPointer(tmp, wl_egl_window_destroy);
  MozClearPointer(mSurface, wl_surface_destroy);

  MOZ_RELEASE_ASSERT(!mIsMapped, "We can't release mapped WaylandSurface!");
  MOZ_RELEASE_ASSERT(!mSurfaceLock, "We can't release locked WaylandSurface!");
  MOZ_RELEASE_ASSERT(mBufferTransactions.Length() == 0,
                     "We can't release surface with buffers tracked!");
  MOZ_RELEASE_ASSERT(!mEmulatedFrameCallbackTimerID,
                     "We can't release WaylandSurface with active timer");
  MOZ_RELEASE_ASSERT(!mIsPendingGdkCleanup,
                     "We can't release WaylandSurface with Gdk resources!");
  MOZ_RELEASE_ASSERT(
      !mDMABufFormatRefreshCallback,
      "We can't release WaylandSurface with DMABufFormatRefreshCallback!");
  MOZ_RELEASE_ASSERT(!mGdkCommitCallback,
                     "We can't release WaylandSurface with GdkCommitCallback!");
  MOZ_RELEASE_ASSERT(!mUnmapCallback,
                     "We can't release WaylandSurface with numap callback!");
}

bool WaylandSurface::HasEmulatedFrameCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) const {
  return mFrameCallbackHandler.IsSet() && mFrameCallbackHandler.mEmulated;
}

void WaylandSurface::FrameCallbackHandler(struct wl_callback* aCallback,
                                          uint32_t aTime,
                                          bool aRoutedFromChildSurface) {
  // We're supposed to run on main thread only.
  AssertIsOnMainThread();

  bool emulatedCallback = !aCallback && !aTime;

  FrameCallback cb;
  {
    WaylandSurfaceLock lock(this);

    // Don't run emulated callbacks on unmapped surfaces
    if ((emulatedCallback || aRoutedFromChildSurface) && !mIsMapped) {
      LOGVERBOSE(
          "WaylandSurface::FrameCallbackHandler() quit, emulatedCallback %d "
          "aRoutedFromChildSurface %d mIsMapped %d",
          emulatedCallback, aRoutedFromChildSurface, !!mIsMapped);
      return;
    }

    LOGVERBOSE(
        "WaylandSurface::FrameCallbackHandler() "
        "set %d emulated %d routed %d",
        mFrameCallbackHandler.IsSet(), emulatedCallback,
        aRoutedFromChildSurface);

    // It's possible to get regular frame callback right after unmap
    // if frame callbacks was already in event queue so ignore it.
    if (!emulatedCallback && !aRoutedFromChildSurface && !mFrameCallback) {
      MOZ_DIAGNOSTIC_ASSERT(!mIsMapped);
      return;
    }

    MOZ_DIAGNOSTIC_ASSERT(aCallback == nullptr || mFrameCallback == aCallback);

    if (aCallback) {
      ClearFrameCallbackLocked(lock);
    }

    // We're getting regular frame callback from this surface so we must
    // have buffer attached.
    if (!emulatedCallback && !aRoutedFromChildSurface) {
      LOGVERBOSE(
          "WaylandSurface::FrameCallbackHandler() marked as visible & has "
          "buffer");
      mIsVisible = true;
      mBufferAttached = true;
    }

    cb = mFrameCallbackHandler;

    // Fire frame callback again if there's any pending frame callback
    RequestFrameCallbackLocked(lock);
  }

  // We can't run the callbacks under WaylandSurfaceLock
  LOGVERBOSE("  frame callback fire");
  if (emulatedCallback && !cb.mEmulated) {
    return;
  }
  if (cb.IsSet()) {
    cb.mCb(aCallback, aTime);
  }
}

void WaylandSurface::RequestFrameCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE(
      "WaylandSurface::RequestFrameCallbackLocked(), enabled %d mapped %d "
      " mFrameCallback %d",
      mFrameCallbackEnabled, !!mIsMapped, !!mFrameCallback);

  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  // Frame callback will be added by Map.
  if (!mIsMapped) {
    LOGVERBOSE(
        "WaylandSurface::RequestFrameCallbackLocked(): is not mapped, quit.");
    return;
  }

  if (mPendingOpaqueRegion && !mOpaqueRegionFrameCallback) {
    LOGVERBOSE(
        "WaylandSurface::RequestFrameCallbackLocked(): add opaque frame "
        "callback handler");
    static const struct wl_callback_listener listener{
        [](void* aData, struct wl_callback* callback, uint32_t time) {
          RefPtr waylandSurface = static_cast<WaylandSurface*>(aData);
          waylandSurface->OpaqueCallbackHandler();
        }};
    mOpaqueRegionFrameCallback = wl_surface_frame(mSurface);
    wl_callback_add_listener(mOpaqueRegionFrameCallback, &listener, this);
    // Apply opaque changes only if we have buffer attached to avoid painting
    // of empty window.
    if (mBufferAttached) {
      mSurfaceNeedsCommit = true;
    }
  }

  if (!mFrameCallbackEnabled || !mFrameCallbackHandler.IsSet()) {
    LOGVERBOSE(
        "WaylandSurface::RequestFrameCallbackLocked(): quit, frame callback is "
        "not set/enabled.");
    return;
  }

  if (!mFrameCallback) {
    LOGVERBOSE(
        "WaylandSurface::RequestFrameCallbackLocked(): adding frame callback");
    static const struct wl_callback_listener listener{
        [](void* aData, struct wl_callback* callback, uint32_t time) {
          RefPtr waylandSurface = static_cast<WaylandSurface*>(aData);
          waylandSurface->FrameCallbackHandler(
              callback, time,
              /* aRoutedFromChildSurface */ false);
        }};
    mFrameCallback = wl_surface_frame(mSurface);
    wl_callback_add_listener(mFrameCallback, &listener, this);
    mSurfaceNeedsCommit = true;
  }

  // Request frame callback emulation if:
  // - we have registered any emulated frame callbacks
  // - we don't have buffer attached so we can't get regular frame callback
  // - emulated frame callback is not already pending
  if (HasEmulatedFrameCallbackLocked(aProofOfLock) && !mBufferAttached &&
      !mEmulatedFrameCallbackTimerID) {
    LOGVERBOSE(
        "WaylandSurface::RequestFrameCallbackLocked() emulated, schedule "
        "next check");
    // Frame callback needs to be run from main thread
    NS_DispatchToMainThread(NS_NewRunnableFunction(
        "WaylandSurface::RequestFrameCallbackLocked",
        [this, self = RefPtr{this}]() {
          MOZ_DIAGNOSTIC_ASSERT(NS_IsMainThread());
          WaylandSurfaceLock lock(this);
          if (mIsMapped && !mEmulatedFrameCallbackTimerID) {
            mIsPendingGdkCleanup = true;
            mEmulatedFrameCallbackTimerID = g_timeout_add(
                sEmulatedFrameCallbackTimeoutMs,
                [](void* data) -> gint {
                  RefPtr surface = static_cast<WaylandSurface*>(data);
                  LOGS_VERBOSE("[%p]: WaylandSurface emulated frame callbacks",
                               surface->GetLoggingWidget());
                  // Clear timer ID as we're going to remove this timer
                  surface->mEmulatedFrameCallbackTimerID = 0;

                  if (!surface->mGdkAfterPaintId &&
                      !surface->mIsOpaqueSurfaceHandlerSet) {
                    surface->mIsPendingGdkCleanup = false;
                  }

                  surface->FrameCallbackHandler(
                      nullptr, 0, /* aRoutedFromChildSurface */ false);
                  return G_SOURCE_REMOVE;
                },
                this);
          }
        }));
  }
}

void WaylandSurface::ClearFrameCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE("WaylandSurface::ClearFrameCallbackLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MozClearPointer(mFrameCallback, wl_callback_destroy);
}

void WaylandSurface::ClearFrameCallbackHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE("WaylandSurface::ClearFrameCallbackHandlerLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  mFrameCallbackHandler = FrameCallback{};
}

void WaylandSurface::SetFrameCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(wl_callback*, uint32_t)>& aFrameCallbackHandler,
    bool aEmulateFrameCallback) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  LOGWAYLAND("WaylandSurface::SetFrameCallbackLocked()");

  mFrameCallbackHandler =
      FrameCallback{aFrameCallbackHandler, aEmulateFrameCallback};
  RequestFrameCallbackLocked(aProofOfLock);
}

void WaylandSurface::SetFrameCallbackStateLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aEnabled) {
  LOGWAYLAND("WaylandSurface::SetFrameCallbackState() state %d", aEnabled);
  if (mFrameCallbackEnabled == aEnabled) {
    return;
  }
  mFrameCallbackEnabled = aEnabled;

  // If there's any frame callback waiting, register the handler.
  if (mFrameCallbackEnabled) {
    RequestFrameCallbackLocked(aProofOfLock);
  } else {
    ClearFrameCallbackLocked(aProofOfLock);
  }
  if (mFrameCallbackStateHandler) {
    mFrameCallbackStateHandler(aEnabled);
  }
}

void WaylandSurface::SetFrameCallbackStateHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(bool)>& aFrameCallbackStateHandler) {
  LOGVERBOSE("WaylandSurface::SetFrameCallbackStateHandlerLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  mFrameCallbackStateHandler = aFrameCallbackStateHandler;
}

bool WaylandSurface::CreateViewportLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aFollowsSizeChanges) {
  LOGWAYLAND("WaylandSurface::CreateViewportLocked() follow size %d",
             aFollowsSizeChanges);
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MOZ_DIAGNOSTIC_ASSERT(mIsMapped);
  MOZ_DIAGNOSTIC_ASSERT(!mViewport);

  auto* viewPorter = WaylandDisplayGet()->GetViewporter();
  if (viewPorter) {
    mViewport = wp_viewporter_get_viewport(viewPorter, mSurface);
  }
  if (!mViewport) {
    LOGWAYLAND(
        "WaylandSurface::CreateViewportLocked(): Failed to get "
        "WaylandViewport!");
    return false;
  }
  mSurfaceNeedsCommit = true;
  mViewportFollowsSizeChanges = aFollowsSizeChanges;
  return !!mViewport;
}

void WaylandSurface::EnableDMABufFormatsLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(DMABufFormats*)>& aFormatRefreshCB) {
  // Ignore DMABuf feedback requests if we export dmabuf surfaces
  // directly from EGLImage.
  if (gfx::gfxVars::UseDMABufSurfaceExport()) {
    return;
  }

  mUseDMABufFormats = true;
  mDMABufFormatRefreshCallback = aFormatRefreshCB;

  // We'll set up on Map
  if (!mIsMapped) {
    return;
  }

  mFormats = CreateDMABufFeedbackFormats(mSurface, aFormatRefreshCB);
  if (!mFormats) {
    LOGWAYLAND(
        "WaylandSurface::SetDMABufFormatsLocked(): Failed to get DMABuf "
        "formats!");
  }
}

void WaylandSurface::DisableDMABufFormatsLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  mUseDMABufFormats = false;
  mDMABufFormatRefreshCallback = nullptr;
  mFormats = nullptr;
}

void WaylandSurface::VisibleCallbackHandler() {
  WaylandSurfaceLock lock(this);
  LOGVERBOSE("WaylandSurface::VisibleCallbackHandler()");
  MozClearPointer(mVisibleFrameCallback, wl_callback_destroy);
  // We can get frame callback after unmap due to queue sync.
  // In this case just ignore it.
  if (mIsMapped) {
    mIsVisible = true;
    mBufferAttached = true;
  }
}

bool WaylandSurface::MapLocked(const WaylandSurfaceLock& aProofOfLock,
                               wl_surface* aParentWLSurface,
                               WaylandSurfaceLock* aParentWaylandSurfaceLock,
                               DesktopIntPoint aSubsurfacePosition,
                               bool aSubsurfaceDesync) {
  LOGWAYLAND("WaylandSurface::MapLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MOZ_DIAGNOSTIC_ASSERT(!mIsMapped, "Already mapped?");
  MOZ_DIAGNOSTIC_ASSERT(!(aParentWLSurface && aParentWaylandSurfaceLock),
                        "Only one parent can be used.");
  MOZ_DIAGNOSTIC_ASSERT(!mSubsurface, "Already mapped?");

  if (aParentWLSurface) {
    LOGWAYLAND(" parent wl_surface [%p]", aParentWLSurface);
    mParentSurface = aParentWLSurface;
  } else {
    MOZ_DIAGNOSTIC_ASSERT(!mParentSurface, "Already mapped?");
    mParent = aParentWaylandSurfaceLock->GetWaylandSurface();
    LOGWAYLAND(" parent WaylandSurface [%p]", mParent.get());
    MOZ_DIAGNOSTIC_ASSERT(mParent->IsMapped(), "Parent surface is not mapped?");
    mParentSurface = mParent->mSurface;
  }

  mSubsurfacePosition = aSubsurfacePosition;

  // Created wl_surface is without buffer attached
  mBufferAttached = false;
  mLatestAttachedBuffer = 0;

  mSubsurface = wl_subcompositor_get_subsurface(
      WaylandDisplayGet()->GetSubcompositor(), mSurface, mParentSurface);
  if (!mSubsurface) {
    LOGWAYLAND("    Failed - can't create sub-surface!");
    return false;
  }
  mSubsurfaceDesync = aSubsurfaceDesync;
  if (aSubsurfaceDesync) {
    wl_subsurface_set_desync(mSubsurface);
  }
  wl_subsurface_set_position(mSubsurface, mSubsurfacePosition.x,
                             mSubsurfacePosition.y);
  LOGWAYLAND(" subsurface position [%d,%d]", (int)mSubsurfacePosition.x,
             (int)mSubsurfacePosition.y);

  MOZ_DIAGNOSTIC_ASSERT(!mVisibleFrameCallback);
  static const struct wl_callback_listener listener{
      [](void* aData, struct wl_callback* callback, uint32_t time) {
        RefPtr waylandSurface = static_cast<WaylandSurface*>(aData);
        waylandSurface->VisibleCallbackHandler();
      }};
  mVisibleFrameCallback = wl_surface_frame(mSurface);
  wl_callback_add_listener(mVisibleFrameCallback, &listener, this);

  mIsMapped = true;

  LOGWAYLAND("  register frame callback");
  RequestFrameCallbackLocked(aProofOfLock);

  CommitLocked(aProofOfLock, /* aForceCommit */ true,
               /* aForceDisplayFlush */ true);

  if (mUseDMABufFormats) {
    EnableDMABufFormatsLocked(aProofOfLock, mDMABufFormatRefreshCallback);
  }

  return true;
}

bool WaylandSurface::MapLocked(const WaylandSurfaceLock& aProofOfLock,
                               wl_surface* aParentWLSurface,
                               DesktopIntPoint aSubsurfacePosition) {
  return MapLocked(aProofOfLock, aParentWLSurface, nullptr, aSubsurfacePosition,
                   /* aSubsurfaceDesync */ true);
}

bool WaylandSurface::MapLocked(const WaylandSurfaceLock& aProofOfLock,
                               WaylandSurfaceLock* aParentWaylandSurfaceLock,
                               DesktopIntPoint aSubsurfacePosition) {
  return MapLocked(aProofOfLock, nullptr, aParentWaylandSurfaceLock,
                   aSubsurfacePosition,
                   /* aSubsurfaceDesync */ false);
}

void WaylandSurface::SetUnmapCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(void)>& aUnmapCB) {
  mUnmapCallback = aUnmapCB;
}

void WaylandSurface::ClearUnmapCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  mUnmapCallback = nullptr;
}

void WaylandSurface::RunUnmapCallback() {
  AssertIsOnMainThread();
  MOZ_DIAGNOSTIC_ASSERT(
      mIsMapped, "RunUnmapCallback is supposed to run before surface unmap!");
  if (mUnmapCallback) {
    mUnmapCallback();
  }
}

void WaylandSurface::GdkCleanUpLocked(const WaylandSurfaceLock& aProofOfLock) {
  LOGWAYLAND("WaylandSurface::GdkCleanUp()");
  AssertIsOnMainThread();
  if (mGdkWindow) {
    RemoveOpaqueSurfaceHandlerLocked(aProofOfLock);
    mGdkWindow = nullptr;
  }
  MozClearHandleID(mEmulatedFrameCallbackTimerID, g_source_remove);

  mIsPendingGdkCleanup = false;
}

void WaylandSurface::ReleaseAllWaylandTransactionsLocked(
    WaylandSurfaceLock& aSurfaceLock) {
  LOGWAYLAND("WaylandSurface::ReleaseAllWaylandTransactionsLocked(), num %d",
             (int)mBufferTransactions.Length());
  MOZ_DIAGNOSTIC_ASSERT(!mIsMapped);
  auto transactions = std::move(mBufferTransactions);
  MOZ_ASSERT(mBufferTransactions.IsEmpty());
  for (auto& transaction : transactions) {
    transaction->DeleteTransactionLocked(aSurfaceLock);
  }
}

void WaylandSurface::UnmapLocked(WaylandSurfaceLock& aSurfaceLock) {
  if (!mIsMapped) {
    return;
  }
  mIsMapped = false;
  mIsVisible = false;

  LOGWAYLAND("WaylandSurface::UnmapLocked()");

  RemoveAttachedBufferLocked(aSurfaceLock);
  ClearFrameCallbackLocked(aSurfaceLock);
  ClearScaleLocked(aSurfaceLock);

  MozClearPointer(mViewport, wp_viewport_destroy);
  mViewportDestinationSize = DesktopIntSize(-1, -1);
  mViewportSourceRect = DesktopIntRect(-1, -1, -1, -1);

  MozClearPointer(mFractionalScaleListener, wp_fractional_scale_v1_destroy);
  MozClearPointer(mSubsurface, wl_subsurface_destroy);
  MozClearPointer(mColorSurface, wp_color_management_surface_v1_destroy);
  MozClearPointer(mColorRepresentationSurface,
                  wp_color_representation_surface_v1_destroy);
  MozClearPointer(mImageDescription, wp_image_description_v1_destroy);
  mParentSurface = nullptr;
  mFormats = nullptr;

  MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
  MozClearPointer(mOpaqueRegionFrameCallback, wl_callback_destroy);

  MozClearPointer(mVisibleFrameCallback, wl_callback_destroy);

  // Remove references to WaylandBuffers attached to mSurface,
  // we don't want to get any buffer release callback when we're unmapped.
  ReleaseAllWaylandTransactionsLocked(aSurfaceLock);

  // Add ref until all events are processed
  AddRef();
  static const struct wl_callback_listener listener{
      [](void* aData, struct wl_callback* callback, uint32_t time) {
        RefPtr surface = dont_AddRef(static_cast<WaylandSurface*>(aData));
        LOGS_VERBOSE("WaylandSurface::UnmapLocked() finished callback [%p] ",
                     surface->mLoggingWidget);
      }};
  wl_callback_add_listener(wl_display_sync(WaylandDisplayGetWLDisplay()),
                           &listener, this);
}

void WaylandSurface::Commit(WaylandSurfaceLock* aProofOfLock, bool aForceCommit,
                            bool aForceDisplayFlush) {
  MOZ_DIAGNOSTIC_ASSERT(aProofOfLock == mSurfaceLock);

  if (aForceCommit || mSurfaceNeedsCommit) {
    LOGVERBOSE(
        "WaylandSurface::Commit() allowed [%d] needs commit %d, force commit "
        "%d flush %d",
        mCommitAllowed, !!mSurfaceNeedsCommit, aForceCommit,
        aForceDisplayFlush);
    if (!mCommitAllowed) {
      return;
    }
    if (!mSubsurfaceDesync && mParent) {
      LOGVERBOSE("  request force commit to parent [%p]", mParent.get());
      mParent->ForceCommit();
    }
    mSurfaceNeedsCommit = false;
    wl_surface_commit(mSurface);
    if (aForceDisplayFlush) {
      wl_display_flush(WaylandDisplayGet()->GetDisplay());
    }
  }
}

void WaylandSurface::CommitLocked(const WaylandSurfaceLock& aProofOfLock,
                                  bool aForceCommit, bool aForceDisplayFlush) {
  Commit((WaylandSurfaceLock*)&aProofOfLock, aForceCommit, aForceDisplayFlush);
}

void WaylandSurface::MoveLocked(const WaylandSurfaceLock& aProofOfLock,
                                DesktopIntPoint aPosition) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MOZ_DIAGNOSTIC_ASSERT(mIsMapped);

  if (mSubsurfacePosition == aPosition) {
    return;
  }

  MOZ_DIAGNOSTIC_ASSERT(mSubsurface);
  LOGWAYLAND("WaylandSurface::MoveLocked() unscaled [%d,%d]", (int)aPosition.x,
             (int)aPosition.y);
  mSubsurfacePosition = aPosition;
  wl_subsurface_set_position(mSubsurface, aPosition.x, aPosition.y);
  mSurfaceNeedsCommit = true;
}

// Route input to parent wl_surface owned by Gtk+ so we get input
// events from Gtk+.
bool WaylandSurface::DisableUserInputLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  wl_region* region =
      wl_compositor_create_region(WaylandDisplayGet()->GetCompositor());
  wl_surface_set_input_region(mSurface, region);
  wl_region_destroy(region);
  mSurfaceNeedsCommit = true;
  return true;
}

void WaylandSurface::OpaqueCallbackHandler() {
  WaylandSurfaceLock lock(this);
  if (mPendingOpaqueRegion) {
    LOGVERBOSE("WaylandSurface::SetOpaqueRegionCallbackHandler()");
    wl_surface_set_opaque_region(mSurface, mPendingOpaqueRegion);
    MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
    mSurfaceNeedsCommit = true;
  }
  MozClearPointer(mOpaqueRegionFrameCallback, wl_callback_destroy);
}

void WaylandSurface::SetOpaqueLocked(const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!IsOpaqueRegionEnabled()) {
    return;
  }
  LOGVERBOSE("WaylandSurface::SetOpaqueLocked()");
  MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
  mPendingOpaqueRegion =
      wl_compositor_create_region(WaylandDisplayGet()->GetCompositor());
  wl_region_add(mPendingOpaqueRegion, 0, 0, INT32_MAX, INT32_MAX);
  RequestFrameCallbackLocked(aProofOfLock);
}

void WaylandSurface::SetOpaqueRegionLocked(
    const WaylandSurfaceLock& aProofOfLock, const gfx::IntRegion& aRegion) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!IsOpaqueRegionEnabled()) {
    return;
  }

  // Region should be in surface-logical coordinates, so we need to divide by
  // the buffer scale. We use round-in in order to be safe with subpixels.
  UnknownScaleFactor scale(GetScale());

  MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
  mPendingOpaqueRegion =
      wl_compositor_create_region(WaylandDisplayGet()->GetCompositor());
  for (auto iter = aRegion.RectIter(); !iter.Done(); iter.Next()) {
    const auto& rect = gfx::RoundedIn(iter.Get().ToUnknownRect() / scale);
    wl_region_add(mPendingOpaqueRegion, rect.x, rect.y, rect.Width(),
                  rect.Height());
    LOGVERBOSE(
        "WaylandSurface::SetOpaqueRegionLocked() region [%d, %d] -> [%d x %d]",
        rect.x, rect.y, rect.Width(), rect.Height());
  }
  RequestFrameCallbackLocked(aProofOfLock);
}

void WaylandSurface::SetOpaqueRegion(const gfx::IntRegion& aRegion) {
  WaylandSurfaceLock lock(this);
  SetOpaqueRegionLocked(lock, aRegion);
}

void WaylandSurface::ClearOpaqueRegionLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  LOGVERBOSE("WaylandSurface::ClearOpaqueLocked()");
  MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
  mPendingOpaqueRegion =
      wl_compositor_create_region(WaylandDisplayGet()->GetCompositor());
  RequestFrameCallbackLocked(aProofOfLock);
}

void WaylandSurface::FractionalScaleHandler(void* data,
                                            struct wp_fractional_scale_v1* info,
                                            uint32_t wire_scale) {
  AssertIsOnMainThread();

  WaylandSurface* waylandSurface = static_cast<WaylandSurface*>(data);
  waylandSurface->mScreenScale = wire_scale / 120.0;

  LOGS("[%p]: WaylandSurface::FractionalScaleHandler() scale: %f\n",
       waylandSurface->mLoggingWidget, (double)waylandSurface->mScreenScale);

  waylandSurface->mFractionalScaleCallback();
}

static const struct wp_fractional_scale_v1_listener fractional_scale_listener =
    {
        .preferred_scale = WaylandSurface::FractionalScaleHandler,
};

bool WaylandSurface::EnableFractionalScaleLocked(
    const WaylandSurfaceLock& aProofOfLock,
    std::function<void(void)> aFractionalScaleCallback, bool aManageViewport) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  LOGWAYLAND("WaylandSurface::SetupFractionalScale()");

  MOZ_DIAGNOSTIC_ASSERT(!mFractionalScaleListener);
  auto* manager = WaylandDisplayGet()->GetFractionalScaleManager();
  if (!manager) {
    LOGWAYLAND(
        "WaylandSurface::SetupFractionalScale(): Failed to get "
        "FractionalScaleManager");
    return false;
  }
  mFractionalScaleListener =
      wp_fractional_scale_manager_v1_get_fractional_scale(manager, mSurface);
  wp_fractional_scale_v1_add_listener(mFractionalScaleListener,
                                      &fractional_scale_listener, this);

  // Create Viewport with aFollowsSizeChanges enabled,
  // regular rendering uses Viewport for fraction scale only.
  if (aManageViewport &&
      !CreateViewportLocked(aProofOfLock, /* aFollowsSizeChanges */ true)) {
    LOGWAYLAND("WaylandSurface::SetupFractionalScale() failed");
    return false;
  }
  mFractionalScaleCallback = std::move(aFractionalScaleCallback);

  if (mViewportFollowsSizeChanges) {
    SetViewPortDestLocked(aProofOfLock, mSize);
  }

  // Init scale to default values and load ceiled screen scale from GdkWindow.
  // We use it as fallback before we get mScreenScale from system.
  mScaleType = ScaleType::Fractional;
  return true;
}

bool WaylandSurface::EnableCeiledScaleLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  LOGWAYLAND("WaylandSurface::EnableCeiledScaleLocked()");

  if (!CreateViewportLocked(aProofOfLock, /* aFollowsSizeChanges */ true)) {
    LOGWAYLAND("WaylandSurface::EnableCeiledScaleLocked() failed");
    return false;
  }

  if (mViewportFollowsSizeChanges) {
    SetViewPortDestLocked(aProofOfLock, mSize);
  }

  mScaleType = ScaleType::Ceiled;
  return true;
}

void WaylandSurface::ClearScaleLocked(const WaylandSurfaceLock& aProofOfLock) {
  LOGWAYLAND("WaylandSurface::ClearScaleLocked()");
  mFractionalScaleCallback = []() {};
  mScreenScale = sNoScale;
}

void WaylandSurface::SetCeiledScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, int aScreenCeiledScale) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (IsCeiledScaleLocked(aProofOfLock)) {
    mScreenScale = aScreenCeiledScale;
    LOGWAYLAND("WaylandSurface::SetCeiledScaleLocked() scale %f",
               (double)mScreenScale);
  }
}

void WaylandSurface::SetViewPortDestLocked(
    const WaylandSurfaceLock& aProofOfLock, const DesktopIntSize& aDestSize) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!mViewport) {
    return;
  }
  if (mViewportDestinationSize == aDestSize) {
    return;
  }
  mViewportDestinationSize = aDestSize;
  LOGWAYLAND("WaylandSurface::SetViewPortDestLocked(): Size [%d x %d]",
             mViewportDestinationSize.width, mViewportDestinationSize.height);
  if (mViewportDestinationSize.width < 1 ||
      mViewportDestinationSize.height < 1) {
    NS_WARNING(
        nsPrintfCString(
            "WaylandSurface::SetViewPortDestLocked(%s): Wrong coordinates!",
            ToString(mViewportDestinationSize).c_str())
            .get());
    mViewportDestinationSize.width = mViewportDestinationSize.height = -1;
  }
  wp_viewport_set_destination(mViewport, mViewportDestinationSize.width,
                              mViewportDestinationSize.height);
  mSurfaceNeedsCommit = true;
}

void WaylandSurface::SetViewPortSourceRectLocked(
    const WaylandSurfaceLock& aProofOfLock, const DesktopIntRect& aRect) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  if (!mViewport || mViewportSourceRect == aRect) {
    return;
  }
  mViewportSourceRect = aRect;

  LOGWAYLAND(
      "WaylandSurface::SetViewPortSourceRectLocked(): [%d, %d] -> [%d x %d]",
      mViewportSourceRect.x, mViewportSourceRect.y, mViewportSourceRect.width,
      mViewportSourceRect.height);

  // Don't throw protocol error with bad coords
  if (mViewportSourceRect.x < 0 || mViewportSourceRect.y < 0 ||
      mViewportSourceRect.width < 1 || mViewportSourceRect.height < 1) {
    NS_WARNING(nsPrintfCString("WaylandSurface::SetViewPortSourceRectLocked(%s)"
                               ": Wrong coordinates!",
                               ToString(aRect).c_str())
                   .get());
    mViewportSourceRect = DesktopIntRect(-1, -1, -1, -1);
  }

  wp_viewport_set_source(mViewport, wl_fixed_from_int(mViewportSourceRect.x),
                         wl_fixed_from_int(mViewportSourceRect.y),
                         wl_fixed_from_int(mViewportSourceRect.width),
                         wl_fixed_from_int(mViewportSourceRect.height));
  mSurfaceNeedsCommit = true;
}

wl_surface* WaylandSurface::Lock(WaylandSurfaceLock* aWaylandSurfaceLock)
    // Disable thread safety analysis, it reports:
    // mutex 'mMutex' is still held at the end of function
    // which we want.
    MOZ_NO_THREAD_SAFETY_ANALYSIS {
  mMutex.Lock();
  MOZ_DIAGNOSTIC_ASSERT(!mSurfaceLock);
  mSurfaceLock = aWaylandSurfaceLock;
  return mSurface;
}

void WaylandSurface::Unlock(struct wl_surface** aSurface,
                            WaylandSurfaceLock* aWaylandSurfaceLock) {
  MOZ_DIAGNOSTIC_ASSERT(*aSurface);
  MOZ_DIAGNOSTIC_ASSERT(*aSurface == mSurface);
  MOZ_DIAGNOSTIC_ASSERT(mSurfaceLock == aWaylandSurfaceLock);
  mMutex.AssertCurrentThreadOwns();
  *aSurface = nullptr;
  mSurfaceLock = nullptr;
  mMutex.Unlock();
}

void WaylandSurface::SetGdkCommitCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(void)>& aGdkCommitCB) {
  mGdkCommitCallback = aGdkCommitCB;
}

void WaylandSurface::ClearGdkCommitCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  mGdkCommitCallback = nullptr;
}

void WaylandSurface::AfterPaintHandler(GdkFrameClock* aClock, void* aData) {
  auto* waylandSurface = static_cast<WaylandSurface*>(aData);
  if (waylandSurface->IsMapped()) {
    if (waylandSurface->mGdkCommitCallback) {
      waylandSurface->mGdkCommitCallback();
    }
    LOGS("[%p]: WaylandSurface::AfterPaintHandler()",
         waylandSurface->mLoggingWidget);
    WaylandSurfaceLock lock(waylandSurface);
    waylandSurface->CommitLocked(lock, /* aForceCommit */ true);
  }
}

bool WaylandSurface::AddOpaqueSurfaceHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock, GdkWindow* aGdkWindow,
    bool aRegisterCommitHandler) {
  if (!IsOpaqueRegionEnabled() || mIsOpaqueSurfaceHandlerSet) {
    return false;
  }

  LOGWAYLAND(
      "WaylandSurface::AddOpaqueSurfaceHandlerLocked() "
      "aRegisterCommitHandler %d",
      aRegisterCommitHandler);
  AssertIsOnMainThread();

  mGdkWindow = aGdkWindow;
  sGdkWaylandWindowAddCallbackSurface(mGdkWindow, mSurface);
  mIsOpaqueSurfaceHandlerSet = true;

  if (aRegisterCommitHandler) {
    MOZ_DIAGNOSTIC_ASSERT(!mGdkAfterPaintId);
    mGdkAfterPaintId = g_signal_connect_after(
        gdk_window_get_frame_clock(mGdkWindow), "after-paint",
        G_CALLBACK(WaylandSurface::AfterPaintHandler), this);
  }

  mIsPendingGdkCleanup = true;
  return true;
}

bool WaylandSurface::RemoveOpaqueSurfaceHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  if (!IsOpaqueRegionEnabled() || !mIsOpaqueSurfaceHandlerSet) {
    return false;
  }
  AssertIsOnMainThread();
  LOGWAYLAND("WaylandSurface::RemoveOpaqueSurfaceHandlerLocked()");
  sGdkWaylandWindowRemoveCallbackSurface(mGdkWindow, mSurface);
  mIsOpaqueSurfaceHandlerSet = false;
  if (mGdkAfterPaintId) {
    GdkFrameClock* frameClock = gdk_window_get_frame_clock(mGdkWindow);
    // If we're already unmapped frameClock is nullptr
    if (frameClock) {
      g_signal_handler_disconnect(frameClock, mGdkAfterPaintId);
    }
    mGdkAfterPaintId = 0;
  }
  return true;
}

LayoutDeviceIntSize WaylandSurface::GetScaledSize(
    const DesktopIntSize& aSize) const {
  DesktopIntRect rect(
      gUseStableRounding ? mSubsurfacePosition : DesktopIntPoint(), aSize);

  auto scaledRect =
      LayoutDeviceIntRect::Round(rect * DesktopToLayoutDeviceScale(GetScale()));

  LOGVERBOSE(
      "WaylandSurface::GetScaledSize() pos [%d, %d] size [%d x %d] scale %f "
      "scaled [%d x %d]",
      (int)mSubsurfacePosition.x, (int)mSubsurfacePosition.y, aSize.width,
      aSize.height, GetScale(), scaledRect.width, scaledRect.height);
  return scaledRect.Size();
}

wl_egl_window* WaylandSurface::GetEGLWindow(DesktopIntSize aSize) {
  LOGWAYLAND("WaylandSurface::GetEGLWindow() eglwindow %p", (void*)mEGLWindow);

  WaylandSurfaceLock lock(this);
  MOZ_DIAGNOSTIC_ASSERT(mSurface, "Missing wl_surface!");

  mSize = aSize;
  auto scaledSize = GetScaledSize(aSize);

  if (!mEGLWindow) {
    mEGLWindow =
        wl_egl_window_create(mSurface, scaledSize.width, scaledSize.height);
    LOGWAYLAND(
        "WaylandSurface::GetEGLWindow() created eglwindow [%p] size %d x %d",
        (void*)mEGLWindow, scaledSize.width, scaledSize.height);
    if (!mEGLWindow) {
      gfxCriticalError()
          << "Failed to create EGLWindow - we can't paint anything!";
    }
  } else {
    LOGWAYLAND("WaylandSurface::GetEGLWindow() resized to %d x %d",
               scaledSize.width, scaledSize.height);
    wl_egl_window_resize(mEGLWindow, scaledSize.width, scaledSize.height, 0, 0);
  }

  return mEGLWindow;
}

void WaylandSurface::SetSize(DesktopIntSize aSize) {
  WaylandSurfaceLock lock(this);

  mSize = aSize;
  auto scaledSize = GetScaledSize(aSize);

  LOGVERBOSE(
      "WaylandSurface::SetSize() size [%d x %d] "
      "scale %f scaled [%d x %d]",
      aSize.width, aSize.height, GetScale(), scaledSize.width,
      scaledSize.height);
}

void WaylandSurface::ApplyEGLWindowSize(LayoutDeviceIntSize aEGLWindowSize) {
  // Apply the surface changes by OpenGL swap buffer operation.
  WaylandSurfaceLock lock(this, /* aSkipCommit */ true);

  auto scale = GetScale();
  auto surfaceSize = GetScaledSize(mSize);
  bool sizeMatches = aEGLWindowSize == surfaceSize;

  LOGWAYLAND(
      "WaylandSurface::ApplyEGLWindowSize()"
      " EGL window size [%d x %d] surface (scaled) size [%d x %d] "
      "fractional scale %f matches %d",
      aEGLWindowSize.width, aEGLWindowSize.height, surfaceSize.width,
      surfaceSize.height, scale, sizeMatches);

  if (mViewportFollowsSizeChanges) {
    DesktopIntSize viewportSize;
    if (!sizeMatches) {
      viewportSize = DesktopIntSize::Round(aEGLWindowSize /
                                           DesktopToLayoutDeviceScale(scale));
    } else {
      viewportSize = mSize;
    }
    SetViewPortDestLocked(lock, viewportSize);
  }
  if (mEGLWindow) {
    wl_egl_window_resize(mEGLWindow, aEGLWindowSize.width,
                         aEGLWindowSize.height, 0, 0);
  }
}

void WaylandSurface::InvalidateRegionLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const gfx::IntRegion& aInvalidRegion) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MOZ_DIAGNOSTIC_ASSERT(mSurface);

  for (auto iter = aInvalidRegion.RectIter(); !iter.Done(); iter.Next()) {
    gfx::IntRect r = iter.Get();
    wl_surface_damage_buffer(mSurface, r.x, r.y, r.width, r.height);
  }
  mSurfaceNeedsCommit = true;
}

void WaylandSurface::InvalidateLocked(const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  wl_surface_damage_buffer(mSurface, 0, 0, INT32_MAX, INT32_MAX);
  mSurfaceNeedsCommit = true;
}

void WaylandSurface::RemoveTransactionLocked(
    const WaylandSurfaceLock& aProofOfLock,
    RefPtr<BufferTransaction> aTransaction) {
  // If we're called from
  // ReleaseAllWaylandTransactionsLocked -> DeleteTransactionLocked
  // then mBufferTransactions is empty.
  if (mBufferTransactions.IsEmpty()) {
    return;
  }
  LOGVERBOSE("WaylandSurface::RemoveTransactionLocked() [%p] num %d",
             (void*)aTransaction, (int)mBufferTransactions.Length());
  MOZ_DIAGNOSTIC_ASSERT(aTransaction->IsDeleted());
  [[maybe_unused]] bool removed =
      mBufferTransactions.RemoveElement(aTransaction);
  MOZ_DIAGNOSTIC_ASSERT(!mBufferTransactions.Contains(aTransaction));
}

BufferTransaction* WaylandSurface::GetNextTransactionLocked(
    const WaylandSurfaceLock& aSurfaceLock, WaylandBuffer* aBuffer) {
  auto* nextTransaction = aBuffer->GetTransaction(aSurfaceLock);
  if (!nextTransaction) {
    return nullptr;
  }

  // Iterate through transactions attached to this WaylandSurface
  // and delete detached transactions which belongs to old (previously attached)
  // WaylandBuffer.
  auto transactions = std::move(mBufferTransactions);
  bool addedNext = false;
  // DeleteTransactionLocked() may delete BufferTransaction so
  // iterate with ref taken.
  for (auto t : transactions) {
    LOGVERBOSE(
        "WaylandSurface::GetNextTransactionLocked() transaction [%p] det %d "
        "del %d",
        t.get(), t->IsDetached(), t->IsDeleted());
    if (t == nextTransaction) {
      mBufferTransactions.AppendElement(nextTransaction);
      addedNext = true;
      continue;
    }
    MOZ_DIAGNOSTIC_ASSERT(!t->IsDeleted());
    // Remove detached transactions from unused buffers.
    if (t->IsDetached() && !t->MatchesBuffer(mLatestAttachedBuffer)) {
      t->DeleteTransactionLocked(aSurfaceLock);
    } else {
      mBufferTransactions.AppendElement(t);
    }
  }
  if (!addedNext) {
    mBufferTransactions.AppendElement(nextTransaction);
  }
  return nextTransaction;
}

bool WaylandSurface::IsBufferAttached(WaylandBuffer* aBuffer) {
  return mLatestAttachedBuffer == reinterpret_cast<uintptr_t>(aBuffer) &&
         mBufferAttached;
}

bool WaylandSurface::AttachLocked(const WaylandSurfaceLock& aSurfaceLock,
                                  RefPtr<WaylandBuffer> aBuffer) {
  MOZ_DIAGNOSTIC_ASSERT(&aSurfaceLock == mSurfaceLock);

  auto scale = GetScale();
  LayoutDeviceIntSize bufferSize = aBuffer->GetSize();
  auto surfaceSize = GetScaledSize(mSize);
  bool sizeMatches = bufferSize.width == surfaceSize.width &&
                     bufferSize.height == surfaceSize.height;
  LOGWAYLAND(
      "WaylandSurface::AttachLocked() transactions [%d] WaylandBuffer [%p] "
      "attached [%d] buffer size [%d x %d] surface (scaled) size [%d x %d] "
      "fractional scale %f matches %d",
      (int)mBufferTransactions.Length(), aBuffer.get(),
      aBuffer->IsAttached(aSurfaceLock), bufferSize.width, bufferSize.height,
      surfaceSize.width, surfaceSize.height, scale, sizeMatches);

  if (mViewportFollowsSizeChanges) {
    DesktopIntSize viewportSize;
    if (!sizeMatches) {
      viewportSize =
          DesktopIntSize::Round(bufferSize / DesktopToLayoutDeviceScale(scale));
    } else {
      viewportSize = mSize;
    }
    SetViewPortDestLocked(aSurfaceLock, viewportSize);
  }

  auto* transaction = GetNextTransactionLocked(aSurfaceLock, aBuffer);
  if (!transaction) {
    return false;
  }

  wl_surface_attach(mSurface, transaction->BufferBorrowLocked(aSurfaceLock), 0,
                    0);
  mLatestAttachedBuffer = reinterpret_cast<uintptr_t>(aBuffer.get());
  mSurfaceNeedsCommit = true;
  mBufferAttached = true;
  return true;
}

void WaylandSurface::RemoveAttachedBufferLocked(
    const WaylandSurfaceLock& aSurfaceLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aSurfaceLock == mSurfaceLock);

  LOGWAYLAND("WaylandSurface::RemoveAttachedBufferLocked()");

  wl_surface_attach(mSurface, nullptr, 0, 0);
  mLatestAttachedBuffer = 0;
  mSurfaceNeedsCommit = true;
  mBufferAttached = false;
}

// Place this WaylandSurface above aLowerSurface
void WaylandSurface::PlaceAboveLocked(const WaylandSurfaceLock& aProofOfLock,
                                      WaylandSurfaceLock& aLowerSurfaceLock) {
  LOGVERBOSE("WaylandSurface::PlaceAboveLocked() aLowerSurface [%p]",
             aLowerSurfaceLock.GetWaylandSurface());
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MOZ_DIAGNOSTIC_ASSERT(mSubsurface);

  // WaylandSurface is reffed by WaylandSurfaceLock
  WaylandSurface* lowerSurface = aLowerSurfaceLock.GetWaylandSurface();

  // lowerSurface has to be sibling or child of this
  MOZ_DIAGNOSTIC_ASSERT(lowerSurface->mParent == mParent ||
                        lowerSurface->mParent == this);

  // It's possible that lowerSurface becomed unmapped. In such rare case
  // just skip the operation, we may be deleted anyway.
  wl_subsurface_place_above(mSubsurface, lowerSurface->mSurface);
  mSurfaceNeedsCommit = true;
}

void WaylandSurface::SetTransformFlippedLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aFlippedX, bool aFlippedY) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (aFlippedX == mBufferTransformFlippedX &&
      aFlippedY == mBufferTransformFlippedY) {
    return;
  }

  mBufferTransformFlippedX = aFlippedX;
  mBufferTransformFlippedY = aFlippedY;

  if (mBufferTransformFlippedY) {
    if (mBufferTransformFlippedX) {
      wl_surface_set_buffer_transform(mSurface, WL_OUTPUT_TRANSFORM_180);
    } else {
      wl_surface_set_buffer_transform(mSurface,
                                      WL_OUTPUT_TRANSFORM_FLIPPED_180);
    }
  } else {
    if (mBufferTransformFlippedX) {
      wl_surface_set_buffer_transform(mSurface, WL_OUTPUT_TRANSFORM_FLIPPED);
    } else {
      wl_surface_set_buffer_transform(mSurface, WL_OUTPUT_TRANSFORM_NORMAL);
    }
  }
}

GdkWindow* WaylandSurface::GetGdkWindow() const {
  // Gdk/Gtk code is used on main thread only
  AssertIsOnMainThread();
  return mGdkWindow;
}

double WaylandSurface::GetScale() const {
#ifdef MOZ_LOGGING
  static float lastLoggedScale = 0.0;
#endif

  if (mScreenScale != sNoScale) {
#ifdef MOZ_LOGGING
    if (LOG_ENABLED_VERBOSE() && lastLoggedScale != mScreenScale) {
      lastLoggedScale = mScreenScale;
      LOGVERBOSE("WaylandSurface::GetScale() fractional scale %f",
                 (double)mScreenScale);
    }
#endif
    return mScreenScale;
  }

  // We don't have scale yet - query parent surface if there's any.
  if (mParent) {
    auto scale = mParent->GetScale();
#ifdef MOZ_LOGGING
    if (LOG_ENABLED_VERBOSE() && lastLoggedScale != scale) {
      lastLoggedScale = scale;
      LOGVERBOSE("WaylandSurface::GetScale() parent scale %f", scale);
    }
#endif
    return scale;
  }

  return ScreenHelperGTK::GetGTKMonitorFractionalScaleFactor();
}

void WaylandSurface::SetParentLocked(const WaylandSurfaceLock& aProofOfLock,
                                     RefPtr<WaylandSurface> aParent) {
  mParent = aParent;
}

void WaylandSurface::ImageDescriptionFailed(
    void* aData, struct wp_image_description_v1* aImageDescription,
    uint32_t aCause, const char* aMsg) {
  RefPtr waylandSurface = dont_AddRef(static_cast<WaylandSurface*>(aData));
  WaylandSurfaceLock lock(waylandSurface);
  waylandSurface->mHDRSet = false;
  LOGS("[%p] WaylandSurface::ImageDescriptionFailed()",
       waylandSurface->mLoggingWidget);
}

void WaylandSurface::ImageDescriptionReady(
    void* aData, struct wp_image_description_v1* aImageDescription,
    uint32_t aIdentity) {
  RefPtr waylandSurface = dont_AddRef(static_cast<WaylandSurface*>(aData));
  WaylandSurfaceLock lock(waylandSurface);
  wp_color_management_surface_v1_set_image_description(
      waylandSurface->mColorSurface, waylandSurface->mImageDescription, 0);
  waylandSurface->mHDRSet = true;
  LOGS("[%p] WaylandSurface::ImageDescriptionReady()",
       waylandSurface->mLoggingWidget);
}

static const struct wp_image_description_v1_listener
    image_description_listener = {
        WaylandSurface::ImageDescriptionFailed,
        WaylandSurface::ImageDescriptionReady,
};

bool WaylandSurface::EnableColorManagementLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(mIsMapped);
  MOZ_DIAGNOSTIC_ASSERT(!mColorSurface);

  auto* colorManager = WaylandDisplayGet()->GetColorManager();
  if (!colorManager || !WaylandDisplayGet()->IsHDREnabled()) {
    return false;
  }

  LOGWAYLAND("WaylandSurface::EnableColorManagementLocked()");

  mColorSurface = wp_color_manager_v1_get_surface(colorManager, mSurface);

  auto* params = wp_color_manager_v1_create_parametric_creator(colorManager);
  wp_image_description_creator_params_v1_set_primaries_named(
      params, WP_COLOR_MANAGER_V1_PRIMARIES_BT2020);
  wp_image_description_creator_params_v1_set_tf_named(
      params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_ST2084_PQ);
  mImageDescription = wp_image_description_creator_params_v1_create(params);
  // wp_image_description_creator_params_v1_create() consumes params
  params = nullptr;

  // AddRef this to keep it live until callback
  AddRef();
  wp_image_description_v1_add_listener(mImageDescription,
                                       &image_description_listener, this);

  return true;
}

static int YUVColorSpaceToWLColorCoeficients(
    mozilla::gfx::YUVColorSpace aColorSpace) {
  switch (aColorSpace) {
    case gfx::YUVColorSpace::BT601:
      return WP_COLOR_REPRESENTATION_SURFACE_V1_COEFFICIENTS_BT601;
    case gfx::YUVColorSpace::BT709:
      return WP_COLOR_REPRESENTATION_SURFACE_V1_COEFFICIENTS_BT709;
    case gfx::YUVColorSpace::BT2020:
      return WP_COLOR_REPRESENTATION_SURFACE_V1_COEFFICIENTS_BT2020;
    default:
      MOZ_DIAGNOSTIC_CRASH("Unsupported YUV color space!");
      return 0;
  }
}

void WaylandSurface::SetColorRepresentationLocked(
    const WaylandSurfaceLock& aProofOfLock,
    mozilla::gfx::YUVColorSpace aColorSpace, bool aFullRange,
    uint32_t aWPChromaLocation) {
  auto* colorRepresentation =
      WaylandDisplayGet()->GetColorRepresentationManager();
  if (!colorRepresentation) {
    return;
  }

  LOGWAYLAND(
      "WaylandSurface::SetColorRepresentationLocked() colorspace %s full range "
      "%d",
      YUVColorSpaceToString(aColorSpace), aFullRange);

  MOZ_DIAGNOSTIC_ASSERT(!mColorRepresentationSurface);
  mColorRepresentationSurface = wp_color_representation_manager_v1_get_surface(
      colorRepresentation, mSurface);
  if (aWPChromaLocation) {
    wp_color_representation_surface_v1_set_chroma_location(
        mColorRepresentationSurface, aWPChromaLocation);
  }
  if (auto coefficients = YUVColorSpaceToWLColorCoeficients(aColorSpace)) {
    if (auto range =
            WaylandDisplayGet()->GetColorRange(coefficients, aFullRange)) {
      wp_color_representation_surface_v1_set_coefficients_and_range(
          mColorRepresentationSurface, coefficients, range);
    }
  }
}

void WaylandSurface::AssertCurrentThreadOwnsMutex() {
  mMutex.AssertCurrentThreadOwns();
}

}  // namespace mozilla::widget

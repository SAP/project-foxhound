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
#include "nsWindow.h"
#include "DMABufFormats.h"
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

WaylandSurface::WaylandSurface() = default;

void WaylandSurface::Init(RefPtr<WaylandSurface> aRootLayer) {
  LOGWAYLAND("WaylandSurface::Init() root layer [%p]",
             aRootLayer ? aRootLayer->GetLoggingWidget() : nullptr);

  mSurface = wl_compositor_create_surface(WaylandDisplayGet()->GetCompositor());
  LOGWAYLAND("    created surface %p ID %d", (void*)mSurface,
             wl_proxy_get_id((struct wl_proxy*)mSurface));
  MOZ_RELEASE_ASSERT(mSurface, "Can't create wl_surface!");
  if (WaylandDisplayGet()->GetViewporter()) {
    mViewport = wp_viewporter_get_viewport(WaylandDisplayGet()->GetViewporter(),
                                           mSurface);
  }

  // Layered child surfaces uses the same scale setup as parent ones
  // and don't use scale callbacks/handlers to get scale directly
  // from system.
  if (aRootLayer) {
    WaylandSurfaceLock lock(this, /* aSkipCommit */ true);
    SetScaleTypeLocked(lock, aRootLayer->mScaleType,
                       /* aSetProtocolHandler */ false);
  }
}

WaylandSurface::~WaylandSurface() {
  LOGWAYLAND("WaylandSurface::~WaylandSurface()");

  MozClearPointer(mFractionalScaleListener, wp_fractional_scale_v1_destroy);
  MozClearPointer(mCoordinatesScaleManager, xx_fractional_scale_v2_destroy);
  MozClearPointer(mViewport, wp_viewport_destroy);
  wl_egl_window* tmp = nullptr;
  mEGLWindow.exchange(tmp);
  MozClearPointer(tmp, wl_egl_window_destroy);
  MozClearPointer(mSurface, wl_surface_destroy);

  MOZ_RELEASE_ASSERT(!mIsMapped, "We can't release mapped WaylandSurface!");
  MOZ_RELEASE_ASSERT(!mSurfaceLock, "We can't release locked WaylandSurface!");
  MOZ_RELEASE_ASSERT(mBufferTransactions.Length() == 0,
                     "We can't release surface with buffers tracked!");
  MOZ_RELEASE_ASSERT(!mEmulatedVSyncCallbackTimerID,
                     "We can't release WaylandSurface with active timer");
  MOZ_RELEASE_ASSERT(!mIsPendingGdkCleanup,
                     "We can't release WaylandSurface with Gdk resources!");
  MOZ_RELEASE_ASSERT(
      !mDMABufFormatRefreshCallback,
      "We can't release WaylandSurface with DMABufFormatRefreshCallback!");
  MOZ_RELEASE_ASSERT(!mGdkCommitCallback,
                     "We can't release WaylandSurface with GdkCommitCallback!");
  MOZ_RELEASE_ASSERT(!mMapCallback,
                     "We can't release WaylandSurface with map callback!");
  MOZ_RELEASE_ASSERT(!mUnmapCallback,
                     "We can't release WaylandSurface with unmap callback!");
}

bool WaylandSurface::HasEmulatedVSyncCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) const {
  return mVSyncCallbackHandler.IsSet() && mVSyncCallbackHandler.mEmulated;
}

void WaylandSurface::VSyncCallbackHandler(struct wl_callback* aCallback,
                                          uint32_t aTime, bool aEmulated,
                                          bool aRoutedFromChildSurface) {
  // We're supposed to run on main thread only.
  AssertIsOnMainThread();

  VSyncCallback cb;
  {
    WaylandSurfaceLock lock(this);

    LOGVERBOSE(
        "WaylandSurface::VSyncCallbackHandler() "
        "set %d emulated %d routed %d",
        mVSyncCallbackHandler.IsSet(), aEmulated, aRoutedFromChildSurface);

    // It's possible to get regular VSync frame callback right after unmap
    // if frame callbacks was already in event queue so ignore it.
    if (!aEmulated && !aRoutedFromChildSurface && !mVSyncFrameCallback) {
      MOZ_DIAGNOSTIC_ASSERT(!mIsMapped);
      return;
    }

    MOZ_DIAGNOSTIC_ASSERT(aCallback == nullptr ||
                          mVSyncFrameCallback == aCallback);

    // Clear already fired frame callback so we can register a new one.
    if (aCallback) {
      MOZ_DIAGNOSTIC_ASSERT(mVSyncFrameCallback);
      MozClearPointer(mVSyncFrameCallback, wl_callback_destroy);
    }

    // We're getting regular VSync frame callback from this surface so we must
    // have buffer attached.
    if (!aEmulated && !aRoutedFromChildSurface) {
      LOGVERBOSE(
          "WaylandSurface::VSyncCallbackHandler() marked as visible & has "
          "buffer");
      mIsVisible = true;
      mBufferAttached = true;
    }

    cb = mVSyncCallbackHandler;

    // Fire VSync frame callback again if there's any pending frame callback
    SetVSyncCallbackLocked(lock);
  }

  // We can't run the callbacks under WaylandSurfaceLock
  if (aEmulated && !cb.mEmulated) {
    LOGVERBOSE("  skip emulated VSync");
    return;
  }
  if (cb.IsSet()) {
    LOGVERBOSE("  fire VSync callback aEmulated [%d] cb.mEmulated [%d]",
               aEmulated, cb.mEmulated);
    cb.mCb(aCallback, aTime, aEmulated);
  }
}

bool WaylandSurface::IsEmulatedVSyncEnabledLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  return HasEmulatedVSyncCallbackLocked(aProofOfLock) &&
         !mEmulatedVSyncCallbackTimerID && mVSyncEmulateCheck &&
         mVSyncEmulateCheck();
}

void WaylandSurface::RequestEmulatedVSyncLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE("WaylandSurface::RequestEmulatedVSyncLocked()");

  MOZ_DIAGNOSTIC_ASSERT(!mEmulatedVSyncCallbackTimerID, "Already created?");

  mEmulatedVSyncCallbackTimerID = g_timeout_add(
      sEmulatedVSyncCallbackTimeoutMs,
      [](void* data) -> gint {
        RefPtr surface = static_cast<WaylandSurface*>(data);
        LOGS_VERBOSE("[%p]: WaylandSurface emulated frame callbacks",
                     surface->GetLoggingWidget());
        // Clear timer ID as we're going to remove this timer
        surface->mEmulatedVSyncCallbackTimerID = 0;

        // Get some timestamp for emulated callback.
        // We don't compare between emulated / none-emulated ones
        // so we're safe here.
        uint32_t timestampTime =
            static_cast<uint32_t>(g_get_monotonic_time() / 1000);
        surface->VSyncCallbackHandler(
            /* wl_callback */ nullptr, timestampTime,
            /* aEmulated */ true,
            /* aRoutedFromChildSurface */ false);
        return G_SOURCE_REMOVE;
      },
      this);
}

void WaylandSurface::SetVSyncCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!mVSyncCallbackEnabled || !mVSyncCallbackHandler.IsSet()) {
    LOGVERBOSE(
        "WaylandSurface::SetVSyncCallbackLocked(): quit, frame callback is "
        "not set/enabled.");
    return;
  }

  LOGVERBOSE(
      "WaylandSurface::SetVSyncCallbackLocked(), enabled %d mapped %d "
      " mVSyncFrameCallback %d",
      mVSyncCallbackEnabled, !!mIsMapped, !!mVSyncFrameCallback);

  if (!mVSyncFrameCallback) {
    LOGVERBOSE(
        "WaylandSurface::SetVSyncCallbackLocked(): adding frame callback");
    static const struct wl_callback_listener listener{
        [](void* aData, struct wl_callback* callback, uint32_t time) {
          RefPtr waylandSurface = static_cast<WaylandSurface*>(aData);
          waylandSurface->VSyncCallbackHandler(
              callback, time,
              /* aEmulated */ false,
              /* aRoutedFromChildSurface */ false);
        }};
    mVSyncFrameCallback = wl_surface_frame(mSurface);
    wl_callback_add_listener(mVSyncFrameCallback, &listener, this);
    mSurfaceNeedsCommit = true;
  }

  if (!IsEmulatedVSyncEnabledLocked(aProofOfLock)) {
    return;
  }

  // Queue emulated VSync directly on main thread
  if (NS_IsMainThread()) {
    RequestEmulatedVSyncLocked(aProofOfLock);
    return;
  }

  LOGVERBOSE(
      "WaylandSurface::SetVSyncCallbackLocked() schedule emulated VSync to "
      "main thread");

  // VSync needs to be run from main thread
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "WaylandSurface::SetVSyncCallbackLocked", [this, self = RefPtr{this}]() {
        MOZ_DIAGNOSTIC_ASSERT(NS_IsMainThread());
        WaylandSurfaceLock lock(this);
        if (!IsEmulatedVSyncEnabledLocked(lock)) {
          return;
        }
        RequestEmulatedVSyncLocked(lock);
      }));
}

void WaylandSurface::ClearVSyncCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE("WaylandSurface::ClearVSyncCallbackLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MozClearPointer(mVSyncFrameCallback, wl_callback_destroy);
}

void WaylandSurface::ClearVSyncCallbackHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  LOGVERBOSE("WaylandSurface::ClearVSyncCallbackHandlerLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  mVSyncCallbackHandler = VSyncCallback{};
}

void WaylandSurface::SetVSyncCallbackHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(wl_callback*, uint32_t, bool)>&
        aVSyncCallbackHandler,
    bool aEmulateVSyncCallback) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  LOGWAYLAND("WaylandSurface::SetVSyncCallbackLocked()");

  mVSyncCallbackHandler =
      VSyncCallback{aVSyncCallbackHandler, aEmulateVSyncCallback};
  SetVSyncCallbackLocked(aProofOfLock);
}

void WaylandSurface::SetVSyncCallbackStateLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aEnabled) {
  LOGWAYLAND("WaylandSurface::SetVSyncCallbackState() state %d", aEnabled);
  if (mVSyncCallbackEnabled == aEnabled) {
    return;
  }
  mVSyncCallbackEnabled = aEnabled;

  // If there's any frame callback waiting, register the handler.
  if (mVSyncCallbackEnabled) {
    SetVSyncCallbackLocked(aProofOfLock);
  } else {
    ClearVSyncCallbackLocked(aProofOfLock);
  }
  if (mVSyncCallbackStateHandler) {
    mVSyncCallbackStateHandler(aEnabled);
  }
}

void WaylandSurface::SetVSyncCallbackStateHandlerLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(bool)>& aVSyncCallbackStateHandler) {
  LOGVERBOSE("WaylandSurface::SetVSyncCallbackStateHandlerLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  mVSyncCallbackStateHandler = aVSyncCallbackStateHandler;
}

void WaylandSurface::SetVSyncEmulateCheckLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<bool(void)>& aVSyncEmulateCheck, bool aForce) {
  LOGVERBOSE("WaylandSurface::SetVSyncEmulateCheckLocked()");
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!mVSyncEmulateCheck || aForce) {
    mVSyncEmulateCheck = aVSyncEmulateCheck;
  }
  if (!mVSyncEmulateCheck) {
    MozClearHandleID(mEmulatedVSyncCallbackTimerID, g_source_remove);
  }
}

void WaylandSurface::SetViewportFollowsSizeChangesLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  mViewportFollowsSizeChanges = true;
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

  SetVSyncCallbackLocked(aProofOfLock);

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

void WaylandSurface::SetMapCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock,
    const std::function<void(WaylandSurfaceLock& aProofOfLock)>& aMapCB) {
  mMapCallback = aMapCB;
}

void WaylandSurface::ClearMapCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  mMapCallback = nullptr;
}

void WaylandSurface::RunMapCallbackLocked(WaylandSurfaceLock& aProofOfLock) {
  AssertIsOnMainThread();
  if (mMapCallback) {
    mMapCallback(aProofOfLock);
  }
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
  ClearVSyncCallbackLocked(aSurfaceLock);
  ClearOpaqueCallbackLocked(aSurfaceLock);

  ClearScaleCallbacksLocked(aSurfaceLock);
  SetScaleTypeLocked(aSurfaceLock, ScaleType::Disabled,
                     /* aSetProtocolHandler */ false);

  MozClearPointer(mSubsurface, wl_subsurface_destroy);
  MozClearPointer(mColorSurface, wp_color_management_surface_v1_destroy);
  MozClearPointer(mColorRepresentationSurface,
                  wp_color_representation_surface_v1_destroy);
  MozClearPointer(mImageDescription, wp_image_description_v1_destroy);
  mParentSurface = nullptr;
  mFormats = nullptr;

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
      LOGVERBOSE("  request force commit to parent layer [%p]", mParent.get());
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

void WaylandSurface::SetOpaqueCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  LOGVERBOSE(
      "WaylandSurface::SetOpaqueCallbackLocked(): mPendingOpaqueRegion [%p] "
      "mOpaqueRegionFrameCallback [%p]",
      mPendingOpaqueRegion, mOpaqueRegionFrameCallback);

  if (mPendingOpaqueRegion && !mOpaqueRegionFrameCallback) {
    LOGVERBOSE(
        "WaylandSurface::SetOpaqueCallbackLocked(): add opaque frame callback "
        "handler");
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
}

void WaylandSurface::ClearOpaqueCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  MozClearPointer(mPendingOpaqueRegion, wl_region_destroy);
  MozClearPointer(mOpaqueRegionFrameCallback, wl_callback_destroy);
}

void WaylandSurface::OpaqueCallbackHandler() {
  WaylandSurfaceLock lock(this);
  if (mPendingOpaqueRegion) {
    LOGVERBOSE("WaylandSurface::SetOpaqueRegionCallbackHandler()");
    wl_surface_set_opaque_region(mSurface, mPendingOpaqueRegion);
    mSurfaceNeedsCommit = true;
  }
  ClearOpaqueCallbackLocked(lock);
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
  SetOpaqueCallbackLocked(aProofOfLock);
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
  SetOpaqueCallbackLocked(aProofOfLock);
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
  SetOpaqueCallbackLocked(aProofOfLock);
}

bool WaylandSurface::ConfigureCoordinateScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aSetProtocolHandler) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (!mCoordinatesScaleManager) {
    auto* manager = WaylandDisplayGet()->GetFractionalScaleManagerV2();
    if (manager) {
      mCoordinatesScaleManager =
          xx_fractional_scale_manager_v2_get_fractional_scale(manager,
                                                              mSurface);
    }
    if (!mCoordinatesScaleManager) {
      return false;
    }
    // Coordinates scale needs mCoordinatesScaleManager to set scale to
    // particular surface. Create it even without handlers then.
    if (!aSetProtocolHandler) {
      return true;
    }
    static const struct xx_fractional_scale_v2_listener listener = {
        .scale_factor =
            [](void* data,
               struct xx_fractional_scale_v2* xx_fractional_scale_v2,
               uint32_t scale_8_24) {
              AssertIsOnMainThread();
              WaylandSurface* waylandSurface =
                  static_cast<WaylandSurface*>(data);
              if (!waylandSurface) {
                return;
              }
              // Don't run callbacks under lock
              std::function<void(void)> cbs[ScaleCallbackType::CallbackNum] = {
                  nullptr, nullptr};
              {
                WaylandSurfaceLock lock(waylandSurface);
                // Run changes only on an actual scale only
                if (waylandSurface->SetCoordinatesScaleLocked(lock,
                                                              scale_8_24)) {
                  LOGS_VERBOSE(
                      "xx_fractional_scale_v2_listener() surface [%p] scale %f",
                      waylandSurface,
                      waylandSurface->GetCoordinatesScaleRounded());
                  for (int i = 0; i < ScaleCallbackType::CallbackNum; i++) {
                    cbs[i] = waylandSurface->mScaleCallbacks[i];
                  }
                }
              }
              for (auto const& cb : cbs) {
                if (cb) {
                  cb();
                }
              }
            }};
    xx_fractional_scale_v2_add_listener(mCoordinatesScaleManager, &listener,
                                        this);
    return true;
  }

  // We can set listener by xx_fractional_scale_v2_add_listener() only once
  // so set/uset handler processing by setting WaylandSurface param
  // if mCoordinatesScaleManager is already present.
  if (aSetProtocolHandler) {
    wl_proxy_set_user_data((struct wl_proxy*)mCoordinatesScaleManager, this);
  }
  return true;
}

bool WaylandSurface::ConfigureFractionalScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, bool aSetProtocolHandler) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  // Fractional scale uses mFractionalScaleListener with callbacks
  // only so we can ignore it here.
  if (!aSetProtocolHandler) {
    return true;
  }
  if (!mFractionalScaleListener &&
      WaylandDisplayGet()->GetFractionalScaleManager()) {
    mFractionalScaleListener =
        wp_fractional_scale_manager_v1_get_fractional_scale(
            WaylandDisplayGet()->GetFractionalScaleManager(), mSurface);
    if (!mFractionalScaleListener) {
      return false;
    }
    static const struct wp_fractional_scale_v1_listener listener = {
        .preferred_scale = [](void* data, struct wp_fractional_scale_v1* info,
                              uint32_t wire_scale) {
          AssertIsOnMainThread();
          WaylandSurface* waylandSurface = static_cast<WaylandSurface*>(data);
          if (!waylandSurface) {
            return;
          }

          LOGS_VERBOSE(
              "wp_fractional_scale_v1_listener() surface [%p] scale %f",
              waylandSurface, wire_scale / 120.0);
          // Don't run callbacks under lock
          std::function<void(void)> cbs[ScaleCallbackType::CallbackNum] = {
              nullptr, nullptr};
          {
            WaylandSurfaceLock lock(waylandSurface);
            waylandSurface->mScreenScale = wire_scale / 120.0;
            for (int i = 0; i < ScaleCallbackType::CallbackNum; i++) {
              cbs[i] = waylandSurface->mScaleCallbacks[i];
            }
          }
          for (auto const& cb : cbs) {
            if (cb) {
              cb();
            }
          }
        }};
    wp_fractional_scale_v1_add_listener(mFractionalScaleListener, &listener,
                                        this);
    return true;
  }

  // We can set listener by xx_fractional_scale_v2_add_listener() only once
  // so set/uset handler processing by setting WaylandSurface param
  // if mCoordinatesScaleManager is already present.
  if (mFractionalScaleListener) {
    wl_proxy_set_user_data((struct wl_proxy*)mFractionalScaleListener, this);
  }
  return true;
}

bool WaylandSurface::ConfigureScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, ScaleType aScaleType,
    bool aSetProtocolHandler) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  LOGWAYLAND(
      "WaylandSurface::ConfigureScaleLocked() new scale type %d old "
      "scale type %d set handler %d",
      int(aScaleType), int(mScaleType), aSetProtocolHandler);

  // Remove old handlers
  switch (mScaleType) {
    case ScaleType::Coordinates:
      if (mCoordinatesScaleManager) {
        wl_proxy_set_user_data((struct wl_proxy*)mCoordinatesScaleManager,
                               nullptr);
      }
      break;
    case ScaleType::Fractional:
      if (mFractionalScaleListener) {
        wl_proxy_set_user_data((struct wl_proxy*)mFractionalScaleListener,
                               nullptr);
      }
      break;
    default:
      break;
  }

  mScaleType = aScaleType;
  if (!aSetProtocolHandler) {
    MOZ_DIAGNOSTIC_ASSERT(
        !HasScaleCallbacksLocked(aProofOfLock),
        "Active callbacks with disabled compositor handlers!");
  }

  // Configure/set new handlers for callbacks
  if (aScaleType == ScaleType::Coordinates) {
    return ConfigureCoordinateScaleLocked(aProofOfLock, aSetProtocolHandler);
  } else if (aScaleType == ScaleType::Fractional) {
    return ConfigureFractionalScaleLocked(aProofOfLock, aSetProtocolHandler);
  }
  return true;
}

void WaylandSurface::SetScaleTypeLocked(const WaylandSurfaceLock& aProofOfLock,
                                        ScaleType aScaleType,
                                        bool aSetProtocolHandler) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (mScaleType == aScaleType) {
    return;
  }
  switch (aScaleType) {
    case ScaleType::Coordinates: {
      if (ConfigureScaleLocked(aProofOfLock, aScaleType, aSetProtocolHandler)) {
        LOGWAYLAND(
            "WaylandSurface::SetScaleTypeLocked() use coordinates scale");
        return;
      }
      LOGWAYLAND(
          "WaylandSurface::SetScaleTypeLocked() fractional-scale-v2 is "
          "missing, "
          "fallback to fractional scale.");
      [[fallthrough]];
    }
    case ScaleType::Fractional: {
      if (ConfigureScaleLocked(aProofOfLock, ScaleType::Fractional,
                               aSetProtocolHandler)) {
        LOGWAYLAND("WaylandSurface::SetScaleTypeLocked() use fractional scale");
        return;
      }
      LOGWAYLAND(
          "WaylandSurface::SetScaleTypeLocked() fractional-scale-v1 is "
          "missing, "
          "fallback to ceiled scale.");
      [[fallthrough]];
    }
    // Disabled/Ceiled
    default:
      ConfigureScaleLocked(aProofOfLock, aScaleType,
                           /* aSetProtocolHandler */ false);
      break;
  }
}

void WaylandSurface::SetScaleCallbackLocked(
    const WaylandSurfaceLock& aProofOfLock, ScaleCallbackType aCallbackType,
    std::function<void(void)> aScaleCallback) {
  MOZ_DIAGNOSTIC_ASSERT(aCallbackType < ScaleCallbackType::CallbackNum);
  mScaleCallbacks[aCallbackType] = std::move(aScaleCallback);
}

void WaylandSurface::ClearScaleCallbacksLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  for (auto& cb : mScaleCallbacks) {
    cb = nullptr;
  }
}

bool WaylandSurface::HasScaleCallbacksLocked(
    const WaylandSurfaceLock& aProofOfLock) {
  for (auto& cb : mScaleCallbacks) {
    if (cb) {
      return true;
    }
  }
  return false;
}

void WaylandSurface::SetCeiledScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, int aScreenCeiledScale) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (mScaleType == ScaleType::Ceiled) {
    mScreenScale = aScreenCeiledScale;
    LOGWAYLAND("WaylandSurface::SetCeiledScaleLocked() scale %f",
               (double)mScreenScale);
  }
}

bool WaylandSurface::SetCoordinatesScaleLocked(
    const WaylandSurfaceLock& aProofOfLock, uint32_t scale_8_24) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);
  if (mScaleType != ScaleType::Coordinates || mCoordinatesScale == scale_8_24) {
    return false;
  }
  MOZ_DIAGNOSTIC_ASSERT(mCoordinatesScaleManager);
  mCoordinatesScale = scale_8_24;
  mScreenScale = GetCoordinatesScaleRounded();
  xx_fractional_scale_v2_set_scale_factor(mCoordinatesScaleManager,
                                          mCoordinatesScale);
  LOGWAYLAND("WaylandSurface::SetCoordinatesScaleLocked() scale %f",
             GetCoordinatesScaleRounded());
  return true;
}

void WaylandSurface::SetViewPortDestLocked(
    const WaylandSurfaceLock& aProofOfLock, const DesktopIntSize& aDestSize) {
  MOZ_DIAGNOSTIC_ASSERT(&aProofOfLock == mSurfaceLock);

  // Silently ignore missing viewport to allow broken compositors to show
  // something at least.
  if (!mViewport || mViewportDestinationSize == aDestSize) {
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

  // Silently ignore missing viewport to allow broken compositors to show
  // something at least.
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
  // and delete detached transactions which belongs to old (previously
  // attached) WaylandBuffer.
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

  LOGVERBOSE("WaylandSurface::GetScale() fall back to monitor scale!");
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
    const WaylandSurfaceLock& aProofOfLock, gfx::YUVColorSpace aColorSpace,
    gfx::TransferFunction aTransferFunction) {
  MOZ_DIAGNOSTIC_ASSERT(mIsMapped);
  MOZ_DIAGNOSTIC_ASSERT(!mColorSurface);

  auto* colorManager = WaylandDisplayGet()->GetColorManager();
  if (!colorManager || !WaylandDisplayGet()->IsHDREnabled()) {
    return false;
  }

  LOGWAYLAND("WaylandSurface::EnableColorManagementLocked()");

  mColorSurface = wp_color_manager_v1_get_surface(colorManager, mSurface);

  auto* params = wp_color_manager_v1_create_parametric_creator(colorManager);
  switch (aColorSpace) {
    case gfx::YUVColorSpace::BT2020:
      wp_image_description_creator_params_v1_set_primaries_named(
          params, WP_COLOR_MANAGER_V1_PRIMARIES_BT2020);
      break;
    case gfx::YUVColorSpace::BT709:
      wp_image_description_creator_params_v1_set_primaries_named(
          params, WP_COLOR_MANAGER_V1_PRIMARIES_SRGB);
      break;
    case gfx::YUVColorSpace::BT601:
      // Hopefully if this os actually BT601_625 then it was turned into BT709
      // already by this point...
      wp_image_description_creator_params_v1_set_primaries_named(
          params, WP_COLOR_MANAGER_V1_PRIMARIES_NTSC);
      break;
    case gfx::YUVColorSpace::Identity:
      wp_image_description_creator_params_v1_set_primaries_named(
          params, WP_COLOR_MANAGER_V1_PRIMARIES_SRGB);
      break;
  }
  switch (aTransferFunction) {
    case gfx::TransferFunction::PQ:
      wp_image_description_creator_params_v1_set_tf_named(
          params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_ST2084_PQ);
      break;
    case gfx::TransferFunction::HLG:
      wp_image_description_creator_params_v1_set_tf_named(
          params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_HLG);
      break;
    case gfx::TransferFunction::BT709:
      wp_image_description_creator_params_v1_set_tf_named(
          params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_BT1886);
      break;
    case gfx::TransferFunction::SRGB:
      wp_image_description_creator_params_v1_set_tf_named(
          params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_SRGB);
      break;
    case gfx::TransferFunction::LINEAR:
      wp_image_description_creator_params_v1_set_tf_named(
          params, WP_COLOR_MANAGER_V1_TRANSFER_FUNCTION_EXT_LINEAR);
      break;
  }
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
      "WaylandSurface::SetColorRepresentationLocked() colorspace %s full "
      "range "
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

/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GtkCompositorWidget.h"

#include "mozilla/gfx/gfxVars.h"
#include "mozilla/layers/CompositorThread.h"
#include "mozilla/WidgetUtilsGtk.h"
#include "mozilla/widget/InProcessCompositorWidget.h"
#include "mozilla/widget/PlatformWidgetTypes.h"
#include "nsWindow.h"

#ifdef MOZ_X11
#  include "mozilla/X11Util.h"
#endif

#ifdef MOZ_WAYLAND
#  include "mozilla/layers/NativeLayerWayland.h"
#endif

#ifdef MOZ_LOGGING
#  undef LOG
#  define LOG(str, ...)                               \
    MOZ_LOG(IsPopup() ? gWidgetPopupLog : gWidgetLog, \
            mozilla::LogLevel::Debug,                 \
            ("[%p]: " str, mWidget.get(), ##__VA_ARGS__))
#endif /* MOZ_LOGGING */

namespace mozilla {
namespace widget {

GtkCompositorWidget::GtkCompositorWidget(
    const GtkCompositorWidgetInitData& aInitData,
    const layers::CompositorOptions& aOptions, RefPtr<nsWindow> aWindow)
    : CompositorWidget(aOptions),
      mWidget(std::move(aWindow)),
      mClientSize(LayoutDeviceIntSize(aInitData.InitialClientSize()),
                  "GtkCompositorWidget::mClientSize") {
#if defined(MOZ_X11)
  if (GdkIsX11Display()) {
    ConfigureX11Backend((Window)aInitData.XWindow(), aInitData.Shaped());
    LOG("GtkCompositorWidget::GtkCompositorWidget() [%p] mXWindow %p\n",
        (void*)mWidget.get(), (void*)aInitData.XWindow());
  }
#endif
#if defined(MOZ_WAYLAND)
  if (GdkIsWaylandDisplay()) {
    ConfigureWaylandBackend();
    LOG("GtkCompositorWidget::GtkCompositorWidget() [%p] mWidget %p\n",
        (void*)mWidget.get(), (void*)mWidget);
  }
#endif
}

GtkCompositorWidget::~GtkCompositorWidget() {
  LOG("GtkCompositorWidget::~GtkCompositorWidget [%p]\n", (void*)mWidget.get());
  CleanupResources();
  RefPtr<nsIWidget> widget = mWidget.forget();
  NS_ReleaseOnMainThread("GtkCompositorWidget::mWidget", widget.forget());
}

already_AddRefed<gfx::DrawTarget> GtkCompositorWidget::StartRemoteDrawing() {
  return nullptr;
}
void GtkCompositorWidget::EndRemoteDrawing() {}

already_AddRefed<gfx::DrawTarget>
GtkCompositorWidget::StartRemoteDrawingInRegion(
    const LayoutDeviceIntRegion& aInvalidRegion,
    layers::BufferMode* aBufferMode) {
  return mProvider.StartRemoteDrawingInRegion(aInvalidRegion, aBufferMode);
}

void GtkCompositorWidget::EndRemoteDrawingInRegion(
    gfx::DrawTarget* aDrawTarget, const LayoutDeviceIntRegion& aInvalidRegion) {
  mProvider.EndRemoteDrawingInRegion(aDrawTarget, aInvalidRegion);
}

nsIWidget* GtkCompositorWidget::RealWidget() { return mWidget; }

void GtkCompositorWidget::NotifyClientSizeChanged(
    const LayoutDeviceIntSize& aClientSize) {
  LOG("GtkCompositorWidget::NotifyClientSizeChanged() to %d x %d",
      aClientSize.width, aClientSize.height);

  auto size = mClientSize.Lock();
  *size = aClientSize;
}

LayoutDeviceIntSize GtkCompositorWidget::GetClientSize() {
  auto size = mClientSize.Lock();
  return *size;
}

void GtkCompositorWidget::RemoteLayoutSizeUpdated(
    const LayoutDeviceRect& aSize) {
  if (!mWidget || !mWidget->IsWaitingForCompositorResume()) {
    return;
  }

  LOG("GtkCompositorWidget::RemoteLayoutSizeUpdated() %d x %d",
      (int)aSize.width, (int)aSize.height);

  // We're waiting for layout to match widget size.
  auto clientSize = mClientSize.Lock();
  if (clientSize->width != (int)aSize.width ||
      clientSize->height != (int)aSize.height) {
    LOG("quit, client size doesn't match (%d x %d)", clientSize->width,
        clientSize->height);
    return;
  }

  mWidget->ResumeCompositorFromCompositorThread();
}

EGLNativeWindowType GtkCompositorWidget::GetEGLNativeWindow() {
  EGLNativeWindowType window = nullptr;
  if (mWidget) {
    window = (EGLNativeWindowType)mWidget->GetNativeData(NS_NATIVE_EGL_WINDOW);
  }
#if defined(MOZ_X11)
  else {
    window = (EGLNativeWindowType)mProvider.GetXWindow();
  }
#endif
  LOG("GtkCompositorWidget::GetEGLNativeWindow [%p] window %p\n", mWidget.get(),
      window);
  return window;
}

bool GtkCompositorWidget::SetEGLNativeWindowSize(
    const LayoutDeviceIntSize& aEGLWindowSize) {
#if defined(MOZ_WAYLAND)
  if (mWidget) {
    return mWidget->SetEGLNativeWindowSize(aEGLWindowSize);
  }
#endif
  return true;
}

LayoutDeviceIntRegion GtkCompositorWidget::GetTransparentRegion() {
  LayoutDeviceIntRegion fullRegion(
      LayoutDeviceIntRect(LayoutDeviceIntPoint(), GetClientSize()));
  if (mWidget) {
    fullRegion.SubOut(mWidget->GetOpaqueRegion());
  }
  return fullRegion;
}

#ifdef MOZ_WAYLAND
RefPtr<mozilla::layers::NativeLayerRoot>
GtkCompositorWidget::GetNativeLayerRoot() {
  if (gfx::gfxVars::UseWebRenderCompositor()) {
    if (!mNativeLayerRoot) {
      MOZ_ASSERT(mWidget && mWidget->GetMozContainer());
      mNativeLayerRoot = NativeLayerRootWayland::CreateForMozContainer(
          mWidget->GetMozContainer());
    }
    return mNativeLayerRoot;
  }
  return nullptr;
}
#endif

void GtkCompositorWidget::CleanupResources() {
  LOG("GtkCompositorWidget::CleanupResources [%p]\n", (void*)mWidget.get());
  mProvider.CleanupResources();
}

#if defined(MOZ_WAYLAND)
void GtkCompositorWidget::ConfigureWaylandBackend() {
  mProvider.Initialize(this);
}
#endif

#if defined(MOZ_X11)
void GtkCompositorWidget::ConfigureX11Backend(Window aXWindow, bool aShaped) {
  // We don't have X window yet.
  if (!aXWindow) {
    mProvider.CleanupResources();
    return;
  }
  // Initialize the window surface provider
  mProvider.Initialize(aXWindow, aShaped);
}
#endif

void GtkCompositorWidget::SetRenderingSurface(const uintptr_t aXWindow,
                                              const bool aShaped) {
  LOG("GtkCompositorWidget::SetRenderingSurface() [%p]\n", mWidget.get());

#if defined(MOZ_WAYLAND)
  if (GdkIsWaylandDisplay()) {
    LOG("  configure widget %p\n", mWidget.get());
    ConfigureWaylandBackend();
  }
#endif
#if defined(MOZ_X11)
  if (GdkIsX11Display()) {
    LOG("  configure XWindow %p shaped %d\n", (void*)aXWindow, aShaped);
    ConfigureX11Backend((Window)aXWindow, aShaped);
  }
#endif
}

#ifdef MOZ_LOGGING
bool GtkCompositorWidget::IsPopup() {
  return mWidget ? mWidget->IsPopup() : false;
}
#endif

}  // namespace widget
}  // namespace mozilla

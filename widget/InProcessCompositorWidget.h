/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_widget_InProcessCompositorWidget_h_
#define mozilla_widget_InProcessCompositorWidget_h_

#include "CompositorWidget.h"

namespace mozilla {
namespace widget {

// This version of CompositorWidget implements a wrapper around
// nsIWidget.
class InProcessCompositorWidget : public CompositorWidget {
 public:
  InProcessCompositorWidget(const layers::CompositorOptions& aOptions,
                            nsIWidget* aWidget);

  bool PreRender(WidgetRenderingContext* aManager) override;
  void PostRender(WidgetRenderingContext* aManager) override;
  layers::NativeLayerRoot* GetNativeLayerRoot() override;
  already_AddRefed<gfx::DrawTarget> StartRemoteDrawing() override;
  already_AddRefed<gfx::DrawTarget> StartRemoteDrawingInRegion(
      const LayoutDeviceIntRegion& aInvalidRegion) override;
  void EndRemoteDrawing() override;
  void EndRemoteDrawingInRegion(
      gfx::DrawTarget* aDrawTarget,
      const LayoutDeviceIntRegion& aInvalidRegion) override;
  void CleanupRemoteDrawing() override;
  void CleanupWindowEffects() override;
  bool InitCompositor(layers::Compositor* aCompositor) override;
  LayoutDeviceIntSize GetClientSize() override;
  uint32_t GetGLFrameBufferFormat() override;
  void ObserveVsync(VsyncObserver* aObserver) override;
  uintptr_t GetWidgetKey() override;

  // If you can override this method, inherit from CompositorWidget instead.
  nsIWidget* RealWidget() override;

 protected:
  nsIWidget* mWidget;
  // Bug 1679368: Maintain an additional widget pointer, constant, and
  // function for sanity checking while we chase a crash.
  static const char* CANARY_VALUE;
  const char* mCanary;
  nsIWidget* mWidgetSanity;
  void CheckWidgetSanity();
};

}  // namespace widget
}  // namespace mozilla

#endif

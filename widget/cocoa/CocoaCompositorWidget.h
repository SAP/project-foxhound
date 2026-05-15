/* -*- Mode: c++; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_widget_CocoaCompositorWidget_h
#define mozilla_widget_CocoaCompositorWidget_h

#include "CompositorWidget.h"
#include "mozilla/ipc/Endpoint.h"
#include "mozilla/layers/NativeLayer.h"

namespace mozilla {
namespace layers {
class PNativeLayerRemoteChild;
}
namespace widget {

class PlatformCompositorWidgetDelegate : public CompositorWidgetDelegate {
 public:
  virtual void NotifyClientSizeChanged(
      const LayoutDeviceIntSize& aClientSize) = 0;

  // CompositorWidgetDelegate Overrides
  PlatformCompositorWidgetDelegate* AsPlatformSpecificDelegate() override {
    return this;
  }
};

class CocoaCompositorWidgetInitData;

class CocoaCompositorWidget : public CompositorWidget {
 public:
  CocoaCompositorWidget(const layers::CompositorOptions& aOptions);
  ~CocoaCompositorWidget();

  virtual void Init(CompositorWidgetInitData&& aInitData);

  // CompositorWidget overrides
  layers::NativeLayerRoot* GetNativeLayerRoot() override;

  LayoutDeviceIntSize GetClientSize() override;

  void NotifyClientSizeChanged(const LayoutDeviceIntSize& aClientSize);

  CocoaCompositorWidget* AsCocoa() override { return this; }

 protected:
  LayoutDeviceIntSize mClientSize;
  ipc::Endpoint<mozilla::layers::PNativeLayerRemoteChild> mChildEndpoint;

 private:
  void CreateNativeLayerRoot();

  RefPtr<layers::NativeLayerRoot> mNativeLayerRoot;
};

}  // namespace widget
}  // namespace mozilla

#endif  // mozilla_widget_CocoaCompositorWidget_h

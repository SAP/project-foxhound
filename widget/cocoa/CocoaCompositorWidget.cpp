/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=2 et tw=80 : */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CocoaCompositorWidget.h"

#include "mozilla/gfx/Logging.h"
#include "mozilla/layers/NativeLayer.h"
#include "mozilla/layers/NativeLayerRootRemoteMacChild.h"
#include "mozilla/widget/PlatformWidgetTypes.h"
#include "nsIWidget.h"

namespace mozilla {
namespace widget {

CocoaCompositorWidget::CocoaCompositorWidget(
    const layers::CompositorOptions& aOptions)
    : CompositorWidget(aOptions) {}

CocoaCompositorWidget::~CocoaCompositorWidget() {}

void CocoaCompositorWidget::Init(CompositorWidgetInitData&& aInitData) {
  MOZ_ASSERT(XRE_IsGPUProcess());
  // This method is only intended to be called from the GPU process,
  // which is why it uses move semantics for aInitData. Main process
  // compositor widgets (subclasses like InProcessCocoaCompositorWidget)
  // should instead do necessary initialization in their constructors.
  CocoaCompositorWidgetInitData cocoaInitData(
      std::move((aInitData).get_CocoaCompositorWidgetInitData()));
  mClientSize = cocoaInitData.clientSize();
  mChildEndpoint = std::move(cocoaInitData.childEndpoint());
}

mozilla::layers::NativeLayerRoot* CocoaCompositorWidget::GetNativeLayerRoot() {
  if (!mNativeLayerRoot) {
    CreateNativeLayerRoot();
    MOZ_ASSERT(mNativeLayerRoot);
  }
  return mNativeLayerRoot;
}

LayoutDeviceIntSize CocoaCompositorWidget::GetClientSize() {
  return mClientSize;
}

void CocoaCompositorWidget::NotifyClientSizeChanged(
    const LayoutDeviceIntSize& aClientSize) {
  mClientSize =
      LayoutDeviceIntSize(std::min(aClientSize.width, MOZ_WIDGET_MAX_SIZE),
                          std::min(aClientSize.height, MOZ_WIDGET_MAX_SIZE));
}

void CocoaCompositorWidget::CreateNativeLayerRoot() {
  MOZ_ASSERT(!NS_IsMainThread());
  MOZ_ASSERT(XRE_IsGPUProcess());
  // Create a NativeLayerRootRemoteMacChild and bind it to the endpoint
  // that was passed to us in Init().
  auto root = MakeRefPtr<layers::NativeLayerRootRemoteMacChild>();
  auto remoteChild = root->GetRemoteChild();
  MOZ_ALWAYS_TRUE(mChildEndpoint.Bind(remoteChild));
  mNativeLayerRoot = std::move(root);
}

}  // namespace widget
}  // namespace mozilla

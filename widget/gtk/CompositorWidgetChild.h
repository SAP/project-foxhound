/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef widget_gtk_CompositorWidgetChild_h
#define widget_gtk_CompositorWidgetChild_h

#include "GtkCompositorWidget.h"
#include "mozilla/widget/PCompositorWidgetChild.h"
#include "mozilla/widget/CompositorWidgetVsyncObserver.h"

namespace mozilla {
namespace widget {

class CompositorWidgetChild final : public PCompositorWidgetChild,
                                    public PlatformCompositorWidgetDelegate {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(CompositorWidgetChild, override)

  CompositorWidgetChild(RefPtr<CompositorVsyncDispatcher> aVsyncDispatcher,
                        RefPtr<CompositorWidgetVsyncObserver> aVsyncObserver,
                        const CompositorWidgetInitData&);

  bool Initialize(const layers::CompositorOptions& aOptions);

  mozilla::ipc::IPCResult RecvObserveVsync() override;
  mozilla::ipc::IPCResult RecvUnobserveVsync() override;

  void NotifyClientSizeChanged(const LayoutDeviceIntSize& aClientSize) override;
  void NotifyFullscreenChanged(bool aIsFullscreen) override {};
  void CleanupResources() override;

 private:
  ~CompositorWidgetChild() override;
  RefPtr<CompositorVsyncDispatcher> mVsyncDispatcher;
  RefPtr<CompositorWidgetVsyncObserver> mVsyncObserver;
};

}  // namespace widget
}  // namespace mozilla

#endif  // widget_gtk_CompositorWidgetChild_h

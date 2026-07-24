/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef widget_cocoa_CompositorWidgetParent_h
#define widget_cocoa_CompositorWidgetParent_h

#include "CocoaCompositorWidget.h"
#include "mozilla/VsyncDispatcher.h"
#include "mozilla/widget/PCompositorWidgetParent.h"

namespace mozilla {
namespace widget {

class CompositorWidgetParent final : public PCompositorWidgetParent,
                                     public CocoaCompositorWidget {
 public:
  NS_INLINE_DECL_REFCOUNTING_INHERITED(CompositorWidgetParent, CompositorWidget)

  explicit CompositorWidgetParent(const CompositorWidgetInitData& aInitData,
                                  const layers::CompositorOptions& aOptions);
  // CompositorWidget overrides

  nsIWidget* RealWidget() override;
  void ObserveVsync(VsyncObserver* aObserver) override;
  RefPtr<VsyncObserver> GetVsyncObserver() const override;

  mozilla::ipc::IPCResult RecvNotifyClientSizeChanged(
      const LayoutDeviceIntSize& aClientSize) override;

 private:
  ~CompositorWidgetParent() override;

  RefPtr<VsyncObserver> mVsyncObserver;
};

}  // namespace widget
}  // namespace mozilla

#endif  // widget_cocoa_CompositorWidgetParent_h

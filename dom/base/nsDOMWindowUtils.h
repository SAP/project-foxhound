/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsDOMWindowUtils_h_
#define nsDOMWindowUtils_h_

#include "mozilla/BasicEvents.h"
#include "mozilla/Result.h"
#include "nsIDOMWindowUtils.h"
#include "nsWeakReference.h"

class nsGlobalWindowOuter;
class nsIDocShell;
class nsIWidget;
class nsPresContext;
struct nsPoint;

namespace mozilla {
class PresShell;
namespace dom {
class Document;
class Element;
}  // namespace dom
namespace layers {
class LayerTransactionChild;
class WebRenderBridgeChild;
}  // namespace layers
}  // namespace mozilla

class nsDOMWindowUtils final : public nsIDOMWindowUtils,
                               public nsSupportsWeakReference {
  using TextEventDispatcher = mozilla::widget::TextEventDispatcher;

 public:
  explicit nsDOMWindowUtils(nsGlobalWindowOuter* aWindow);
  NS_DECL_ISUPPORTS
  NS_DECL_NSIDOMWINDOWUTILS

 protected:
  ~nsDOMWindowUtils();

  nsWeakPtr mWindow;

  // If aOffset is non-null, it gets filled in with the offset of the root
  // frame of our window to the nearest widget in the app units of our window.
  // Add this offset to any event offset we're given to make it relative to the
  // widget returned by GetWidget.
  nsIWidget* GetWidget(nsPoint* aOffset = nullptr);
  nsIWidget* GetWidgetForElement(mozilla::dom::Element* aElement,
                                 nsPoint* aOffset = nullptr);

  nsIDocShell* GetDocShell();
  mozilla::PresShell* GetPresShell();
  nsPresContext* GetPresContext();
  mozilla::dom::Document* GetDocument();
  mozilla::layers::WebRenderBridgeChild* GetWebRenderBridge();
  mozilla::layers::CompositorBridgeChild* GetCompositorBridge();

  void ReportErrorMessageForWindow(const nsAString& aErrorMessage,
                                   const char* aClassification,
                                   bool aFromChrome);

 private:
  enum class CoordsType {
    Screen,
    TopLevelWidget,
  };
  mozilla::Result<mozilla::LayoutDeviceRect, nsresult> ConvertTo(
      float aX, float aY, float aWidth, float aHeight, CoordsType);
};

#endif

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_VisualViewport_h
#define mozilla_dom_VisualViewport_h

#include "Units.h"
#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/dom/VisualViewportBinding.h"

class nsPresContext;

namespace mozilla {

class PresShell;

namespace dom {

/* Visual Viewport API spec:
 * https://wicg.github.io/visual-viewport/#the-visualviewport-interface */
class VisualViewport final : public mozilla::DOMEventTargetHelper {
 public:
  explicit VisualViewport(nsPIDOMWindowInner* aWindow);

  double OffsetLeft() const;
  double OffsetTop() const;
  double PageLeft() const;
  double PageTop() const;
  MOZ_CAN_RUN_SCRIPT double Width() const;
  MOZ_CAN_RUN_SCRIPT double Height() const;
  double Scale() const;
  IMPL_EVENT_HANDLER(resize)
  IMPL_EVENT_HANDLER(scroll)
  IMPL_EVENT_HANDLER(scrollend)

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;
  void GetEventTargetParent(EventChainPreVisitor& aVisitor) override;

  void PostResizeEvent();
  MOZ_CAN_RUN_SCRIPT void FireResizeEvent();

  void PostScrollEvent(const nsPoint& aPrevVisualOffset,
                       const nsPoint& aPrevLayoutOffset);
  void PostScrollEndEvent();

  class VisualViewportScrollEvent;
  class VisualViewportScrollEndEvent;

 private:
  virtual ~VisualViewport();

  MOZ_CAN_RUN_SCRIPT CSSSize VisualViewportSize() const;
  CSSPoint VisualViewportOffset() const;
  CSSPoint LayoutViewportOffset() const;
  Document* GetDocument() const;
  PresShell* GetPresShell() const;
  nsPresContext* GetPresContext() const;

  MOZ_CAN_RUN_SCRIPT void FireScrollEvent();
  MOZ_CAN_RUN_SCRIPT void FireScrollEndEvent();

  RefPtr<VisualViewportScrollEvent> mScrollEvent;
  RefPtr<VisualViewportScrollEndEvent> mScrollEndEvent;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_VisualViewport_h

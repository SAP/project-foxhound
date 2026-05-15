/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//
// nsScrollbarFrame
//

#ifndef nsScrollbarFrame_h_
#define nsScrollbarFrame_h_

#include "mozilla/Attributes.h"
#include "mozilla/ScrollTypes.h"
#include "nsContainerFrame.h"
#include "nsIAnonymousContentCreator.h"

class nsIScrollbarMediator;

namespace mozilla {
class PresShell;
namespace dom {
class Element;
}
}  // namespace mozilla

nsIFrame* NS_NewScrollbarFrame(mozilla::PresShell* aPresShell,
                               mozilla::ComputedStyle* aStyle);

class nsScrollbarFrame final : public nsContainerFrame,
                               public nsIAnonymousContentCreator {
  using Element = mozilla::dom::Element;
  using CSSIntCoord = mozilla::CSSIntCoord;

 public:
  explicit nsScrollbarFrame(ComputedStyle* aStyle, nsPresContext* aPresContext)
      : nsContainerFrame(aStyle, aPresContext, kClassID) {}

  NS_DECL_QUERYFRAME
  NS_DECL_FRAMEARENA_HELPERS(nsScrollbarFrame)

#ifdef DEBUG_FRAME_DUMP
  nsresult GetFrameName(nsAString& aResult) const override {
    return MakeFrameName(u"ScrollbarFrame"_ns, aResult);
  }
#endif

  // nsIFrame overrides
  NS_IMETHOD HandlePress(nsPresContext* aPresContext,
                         mozilla::WidgetGUIEvent* aEvent,
                         nsEventStatus* aEventStatus) override;

  NS_IMETHOD HandleMultiplePress(nsPresContext* aPresContext,
                                 mozilla::WidgetGUIEvent* aEvent,
                                 nsEventStatus* aEventStatus,
                                 bool aControlHeld) override;

  MOZ_CAN_RUN_SCRIPT
  NS_IMETHOD HandleDrag(nsPresContext* aPresContext,
                        mozilla::WidgetGUIEvent* aEvent,
                        nsEventStatus* aEventStatus) override;

  NS_IMETHOD HandleRelease(nsPresContext* aPresContext,
                           mozilla::WidgetGUIEvent* aEvent,
                           nsEventStatus* aEventStatus) override;

  mozilla::StyleScrollbarWidth ScrollbarWidth() const;
  nscoord ScrollbarTrackSize() const;
  nsSize ScrollbarMinSize() const;
  bool IsHorizontal() const;

  void Destroy(DestroyContext&) override;

  void Init(nsIContent* aContent, nsContainerFrame* aParent,
            nsIFrame* aPrevInFlow) override;

  void Reflow(nsPresContext* aPresContext, ReflowOutput& aDesiredSize,
              const ReflowInput& aReflowInput,
              nsReflowStatus& aStatus) override;

  void SetOverrideScrollbarMediator(nsIScrollbarMediator*);
  nsIScrollbarMediator* GetScrollbarMediator();
  void WillBecomeActive();

  void MoveToNewPosition();
  int32_t GetButtonScrollDirection() const { return mButtonScrollDirection; }
  void SetButtonScrollDirectionAndUnit(int32_t aDirection,
                                       mozilla::ScrollUnit aUnit) {
    mButtonScrollDirection = aDirection;
    mButtonScrollUnit = aUnit;
  }

  // nsIAnonymousContentCreator
  nsresult CreateAnonymousContent(nsTArray<ContentInfo>& aElements) override;
  void AppendAnonymousContentTo(nsTArray<nsIContent*>& aElements,
                                uint32_t aFilter) override;

  void ElementStateChanged(mozilla::dom::ElementState) override;
  bool HasBeenHovered() const { return mHasBeenHovered; }

  // If we're an horizontal scrollbar, get the vertical one, or viceversa.
  nsScrollbarFrame* GetOppositeScrollbar() const;
  void ActivityChanged(bool aIsNowActive);

  // Sets the current scrollbar position. Returns true if the value changed.
  bool SetCurPos(CSSIntCoord);
  CSSIntCoord GetCurPos() const { return mCurPos; }
  bool SetMaxPos(CSSIntCoord);
  CSSIntCoord GetMaxPos() const { return mMaxPos; }
  bool SetPageIncrement(CSSIntCoord);
  CSSIntCoord GetPageIncrement() const { return mPageIncrement; }

  bool SetEnabled(bool);
  bool IsEnabled() const;
  bool IsDisabled() const { return !IsEnabled(); }

 protected:
  void InvalidateForHoverChange(bool aIsNowHovered);
  void RequestSliderReflow();

  // TODO(emilio): These probably shouldn't be CSSIntCoords (could just be
  // nscoords).
  CSSIntCoord mCurPos = 0;
  CSSIntCoord mMaxPos = 0;
  CSSIntCoord mPageIncrement = 0;

  // Direction and unit that our button scrolled us to.
  // TODO(emilio): Find a better place to store this?
  int32_t mButtonScrollDirection = 0;
  mozilla::ScrollUnit mButtonScrollUnit = mozilla::ScrollUnit::DEVICE_PIXELS;
  // On macOS, overlay scrollbar hover state should be sticky (remain hovered
  // while we've been hovered at least once).
  bool mHasBeenHovered = false;

 private:
  WeakFrame mOverriddenScrollbarMediator;

  nsCOMPtr<Element> mUpTopButton;
  nsCOMPtr<Element> mDownTopButton;
  nsCOMPtr<Element> mSlider;
  nsCOMPtr<Element> mThumb;
  nsCOMPtr<Element> mUpBottomButton;
  nsCOMPtr<Element> mDownBottomButton;
};  // class nsScrollbarFrame

#endif

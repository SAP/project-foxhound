/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsRangeFrame_h___
#define nsRangeFrame_h___

#include "mozilla/Decimal.h"
#include "mozilla/EventForwards.h"
#include "nsContainerFrame.h"
#include "nsIAnonymousContentCreator.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"

class nsDisplayRangeFocusRing;

namespace mozilla {
class ListMutationObserver;
class PresShell;
namespace dom {
class Event;
class HTMLInputElement;
}  // namespace dom
}  // namespace mozilla

class nsRangeFrame final : public nsContainerFrame,
                           public nsIAnonymousContentCreator {
  friend nsIFrame* NS_NewRangeFrame(mozilla::PresShell* aPresShell,
                                    ComputedStyle* aStyle);

  void Init(nsIContent* aContent, nsContainerFrame* aParent,
            nsIFrame* aPrevInFlow) override;

  friend class nsDisplayRangeFocusRing;

  explicit nsRangeFrame(ComputedStyle* aStyle, nsPresContext* aPresContext);
  virtual ~nsRangeFrame();

  using Element = mozilla::dom::Element;

 public:
  NS_DECL_QUERYFRAME
  NS_DECL_FRAMEARENA_HELPERS(nsRangeFrame)

  // nsIFrame overrides
  void Destroy(DestroyContext&) override;

  void BuildDisplayList(nsDisplayListBuilder* aBuilder,
                        const nsDisplayListSet& aLists) override;

  void Reflow(nsPresContext* aPresContext, ReflowOutput& aDesiredSize,
              const ReflowInput& aReflowInput,
              nsReflowStatus& aStatus) override;

#ifdef DEBUG_FRAME_DUMP
  nsresult GetFrameName(nsAString& aResult) const override {
    return MakeFrameName(u"Range"_ns, aResult);
  }
#endif

#ifdef ACCESSIBILITY
  mozilla::a11y::AccType AccessibleType() override;
#endif

  // nsIAnonymousContentCreator
  nsresult CreateAnonymousContent(nsTArray<ContentInfo>& aElements) override;
  void AppendAnonymousContentTo(nsTArray<nsIContent*>& aElements,
                                uint32_t aFilter) override;

  nsresult AttributeChanged(int32_t aNameSpaceID, nsAtom* aAttribute,
                            int32_t aModType) override;

  nscoord GetMinISize(gfxContext* aRenderingContext) override;
  nscoord GetPrefISize(gfxContext* aRenderingContext) override;

  /**
   * Returns true if the slider's thumb moves horizontally, or else false if it
   * moves vertically.
   */
  bool IsHorizontal() const;

  /**
   * Returns true if the slider is oriented along the inline axis.
   */
  bool IsInlineOriented() const {
    return IsHorizontal() != GetWritingMode().IsVertical();
  }

  /**
   * Returns true if the slider's thumb moves right-to-left for increasing
   * values; only relevant when IsHorizontal() is true.
   */
  bool IsRightToLeft() const {
    MOZ_ASSERT(IsHorizontal());
    return GetWritingMode().IsPhysicalRTL();
  }

  /**
   * Returns true if the range progresses upwards (for vertical ranges in
   * horizontal writing mode, or for bidi-RTL in vertical mode). Only
   * relevant when IsHorizontal() is false.
   */
  bool IsUpwards() const {
    MOZ_ASSERT(!IsHorizontal());
    mozilla::WritingMode wm = GetWritingMode();
    return wm.GetBlockDir() == mozilla::WritingMode::BlockDir::TB ||
           wm.GetInlineDir() == mozilla::WritingMode::InlineDir::BTT;
  }

  double GetMin() const;
  double GetMax() const;
  double GetValue() const;

  /**
   * Returns the input element's value as a fraction of the difference between
   * the input's minimum and its maximum (i.e. returns 0.0 when the value is
   * the same as the minimum, and returns 1.0 when the value is the same as the
   * maximum).
   */
  double GetValueAsFractionOfRange();

  /**
   * Returns the given value as a fraction of the difference between the input's
   * minimum and its maximum (i.e. returns 0.0 when the value is the same as the
   * input's minimum, and returns 1.0 when the value is the same as the input's
   * maximum).
   */
  double GetDoubleAsFractionOfRange(const mozilla::Decimal& value);

  /**
   * Returns whether the frame and its child should use the native style.
   */
  bool ShouldUseNativeStyle() const;

  mozilla::Decimal GetValueAtEventPoint(mozilla::WidgetGUIEvent* aEvent);

  /**
   * Helper that's used when the value of the range changes to reposition the
   * thumb, resize the range-progress element, and schedule a repaint. (This
   * does not reflow, since the position and size of the thumb and
   * range-progress element do not affect the position or size of any other
   * frames.)
   */
  void UpdateForValueChange();

  nsTArray<mozilla::Decimal> TickMarks();

  /**
   * Returns the given value's offset from the range's nearest list tick mark
   * or NaN if there are no tick marks.
   */
  mozilla::Decimal NearestTickMark(const mozilla::Decimal& aValue);

 protected:
  mozilla::dom::HTMLInputElement& InputElement() const;

 private:
  // Return our preferred size in the cross-axis (the axis perpendicular
  // to the direction of movement of the thumb).
  nscoord AutoCrossSize();

  // Helper function which reflows the anonymous div frames.
  void ReflowAnonymousContent(nsPresContext* aPresContext,
                              ReflowOutput& aDesiredSize,
                              const mozilla::LogicalSize& aContentBoxSize,
                              const ReflowInput& aReflowInput);

  void DoUpdateThumbPosition(nsIFrame* aThumbFrame,
                             const nsSize& aRangeContentBoxSize);

  void DoUpdateRangeProgressFrame(nsIFrame* aProgressFrame,
                                  const nsSize& aRangeContentBoxSize);

  /**
   * The div used to show the ::-moz-range-track pseudo-element.
   * @see nsRangeFrame::CreateAnonymousContent
   */
  nsCOMPtr<Element> mTrackDiv;

  /**
   * The div used to show the ::-moz-range-progress pseudo-element, which is
   * used to (optionally) style the specific chunk of track leading up to the
   * thumb's current position.
   * @see nsRangeFrame::CreateAnonymousContent
   */
  nsCOMPtr<Element> mProgressDiv;

  /**
   * The div used to show the ::-moz-range-thumb pseudo-element.
   * @see nsRangeFrame::CreateAnonymousContent
   */
  nsCOMPtr<Element> mThumbDiv;

  /**
   * This mutation observer is used to invalidate paint when the @list changes,
   * when a @list exists.
   */
  RefPtr<mozilla::ListMutationObserver> mListMutationObserver;
};

#endif

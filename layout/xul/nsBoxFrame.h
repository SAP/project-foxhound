/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**

  Eric D Vaughan
  nsBoxFrame is a frame that can lay its children out either vertically or
horizontally. It lays them out according to a min max or preferred size.

**/

#ifndef nsBoxFrame_h___
#define nsBoxFrame_h___

#include "mozilla/Attributes.h"
#include "nsCOMPtr.h"
#include "nsContainerFrame.h"
#include "nsBoxLayout.h"

class nsBoxLayoutState;

namespace mozilla {
class PresShell;
namespace gfx {
class DrawTarget;
}  // namespace gfx
}  // namespace mozilla

nsContainerFrame* NS_NewBoxFrame(mozilla::PresShell* aPresShell,
                                 mozilla::ComputedStyle* aStyle);

class nsBoxFrame : public nsContainerFrame {
 protected:
  typedef mozilla::gfx::DrawTarget DrawTarget;

 public:
  NS_DECL_FRAMEARENA_HELPERS(nsBoxFrame)
#ifdef DEBUG
  NS_DECL_QUERYFRAME
#endif

  friend nsContainerFrame* NS_NewBoxFrame(mozilla::PresShell* aPresShell,
                                          ComputedStyle* aStyle);

  // gets the rect inside our border and debug border. If you wish to paint
  // inside a box call this method to get the rect so you don't draw on the
  // debug border or outer border.

  virtual void SetXULLayoutManager(nsBoxLayout* aLayout) override {
    mLayoutManager = aLayout;
  }
  virtual nsBoxLayout* GetXULLayoutManager() override { return mLayoutManager; }

  virtual nsSize GetXULPrefSize(nsBoxLayoutState& aBoxLayoutState) override;
  virtual nsSize GetXULMinSize(nsBoxLayoutState& aBoxLayoutState) override;
  virtual nsSize GetXULMaxSize(nsBoxLayoutState& aBoxLayoutState) override;
  virtual nscoord GetXULBoxAscent(nsBoxLayoutState& aBoxLayoutState) override;
  virtual Valignment GetXULVAlign() const override { return mValign; }
  virtual Halignment GetXULHAlign() const override { return mHalign; }
  NS_IMETHOD DoXULLayout(nsBoxLayoutState& aBoxLayoutState) override;

  virtual bool XULComputesOwnOverflowArea() override { return false; }

  // ----- child and sibling operations ---

  // ----- public methods -------

  virtual void Init(nsIContent* aContent, nsContainerFrame* aParent,
                    nsIFrame* aPrevInFlow) override;

  virtual nsresult AttributeChanged(int32_t aNameSpaceID, nsAtom* aAttribute,
                                    int32_t aModType) override;

  virtual void MarkIntrinsicISizesDirty() override;
  virtual nscoord GetMinISize(gfxContext* aRenderingContext) override;
  virtual nscoord GetPrefISize(gfxContext* aRenderingContext) override;

  virtual void Reflow(nsPresContext* aPresContext, ReflowOutput& aDesiredSize,
                      const ReflowInput& aReflowInput,
                      nsReflowStatus& aStatus) override;

  void SetInitialChildList(ChildListID aListID,
                           nsFrameList&& aChildList) override;
  void AppendFrames(ChildListID aListID, nsFrameList&& aFrameList) override;
  void InsertFrames(ChildListID aListID, nsIFrame* aPrevFrame,
                    const nsLineList::iterator* aPrevFrameLine,
                    nsFrameList&& aFrameList) override;
  virtual void RemoveFrame(ChildListID aListID, nsIFrame* aOldFrame) override;

  virtual void DidSetComputedStyle(ComputedStyle* aOldComputedStyle) override;

  virtual bool IsFrameOfType(uint32_t aFlags) const override {
    // record that children that are ignorable whitespace should be excluded
    // (When content was loaded via the XUL content sink, it's already
    // been excluded, but we need this for when the XUL namespace is used
    // in other MIME types or when the XUL CSS display types are used with
    // non-XUL elements.)

    // This is bogus, but it's what we've always done.
    // (Given that we're replaced, we need to say we're a replaced element
    // that contains a block so ReflowInput doesn't tell us to be
    // NS_UNCONSTRAINEDSIZE wide.)
    return nsContainerFrame::IsFrameOfType(
        aFlags &
        ~(nsIFrame::eReplaced | nsIFrame::eReplacedContainsBlock | eXULBox));
  }

#ifdef DEBUG_FRAME_DUMP
  virtual nsresult GetFrameName(nsAString& aResult) const override;
#endif

  virtual void DidReflow(nsPresContext* aPresContext,
                         const ReflowInput* aReflowInput) override;

  // virtual so nsButtonBoxFrame, nsSliderFrame and nsMenuFrame
  // can override it
  virtual void BuildDisplayListForChildren(nsDisplayListBuilder* aBuilder,
                                           const nsDisplayListSet& aLists);

  virtual void BuildDisplayList(nsDisplayListBuilder* aBuilder,
                                const nsDisplayListSet& aLists) override;

  static nsresult LayoutChildAt(nsBoxLayoutState& aState, nsIFrame* aBox,
                                const nsRect& aRect);

  // Gets a next / prev sibling accounting for ordinal group. Slow, please avoid
  // usage if possible.
  static nsIFrame* SlowOrdinalGroupAwareSibling(nsIFrame*, bool aNext);

 private:
  explicit nsBoxFrame(ComputedStyle* aStyle, nsPresContext* aPresContext)
      : nsBoxFrame(aStyle, aPresContext, kClassID) {}

 protected:
  nsBoxFrame(ComputedStyle* aStyle, nsPresContext* aPresContext, ClassID aID);
  virtual ~nsBoxFrame();

  virtual void GetInitialOrientation(bool& aIsHorizontal);
  virtual void GetInitialDirection(bool& aIsNormal);
  virtual bool GetInitialHAlignment(Halignment& aHalign);
  virtual bool GetInitialVAlignment(Valignment& aValign);
  virtual bool GetInitialAutoStretch(bool& aStretch);

  virtual void DestroyFrom(nsIFrame* aDestructRoot,
                           PostDestroyData& aPostDestroyData) override;

  nsSize mPrefSize;
  nsSize mMinSize;
  nsSize mMaxSize;
  nscoord mAscent;

  nsCOMPtr<nsBoxLayout> mLayoutManager;

  // Get the point associated with this event. Returns true if a single valid
  // point was found. Otherwise false.
  bool GetEventPoint(mozilla::WidgetGUIEvent* aEvent, nsPoint& aPoint);
  // Gets the event coordinates relative to the widget offset associated with
  // this frame. Return true if a single valid point was found.
  bool GetEventPoint(mozilla::WidgetGUIEvent* aEvent,
                     mozilla::LayoutDeviceIntPoint& aPoint);

 private:
  void CacheAttributes();

  // instance variables.
  Halignment mHalign;
  Valignment mValign;

};  // class nsBoxFrame

#endif

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMathMLmrootFrame_h___
#define nsMathMLmrootFrame_h___

#include "mozilla/Attributes.h"
#include "nsMathMLContainerFrame.h"
#include "nsMathMLChar.h"

namespace mozilla {
class PresShell;
}  // namespace mozilla

//
// <msqrt> and <mroot> -- form a radical
//

class nsMathMLmrootFrame : public nsMathMLContainerFrame {
 public:
  NS_DECL_FRAMEARENA_HELPERS(nsMathMLmrootFrame)

  friend nsIFrame* NS_NewMathMLmrootFrame(mozilla::PresShell* aPresShell,
                                          ComputedStyle* aStyle);

  void DidSetComputedStyle(ComputedStyle* aOldStyle) override;

  void Init(nsIContent* aContent, nsContainerFrame* aParent,
            nsIFrame* aPrevInFlow) override;

  NS_IMETHOD
  InheritAutomaticData(nsIFrame* aParent) final;

  NS_IMETHOD
  TransmitAutomaticData() override;

  void GetRadicalXOffsets(nscoord aIndexWidth, nscoord aSqrWidth,
                          nsFontMetrics* aFontMetrics, nscoord* aIndexOffset,
                          nscoord* aSqrOffset);

  void BuildDisplayList(nsDisplayListBuilder* aBuilder,
                        const nsDisplayListSet& aLists) override;

  uint8_t ScriptIncrement(nsIFrame* aFrame) override {
    return (aFrame && aFrame == mFrames.LastChild()) ? 2 : 0;
  }

 protected:
  explicit nsMathMLmrootFrame(ComputedStyle* aStyle,
                              nsPresContext* aPresContext);
  virtual ~nsMathMLmrootFrame();

  nsMathMLChar mSqrChar;
  nsRect mBarRect;

 private:
  bool ShouldUseRowFallback();
  bool IsMrowLike() final;
  nsresult Place(DrawTarget* aDrawTarget, const PlaceFlags& aFlags,
                 ReflowOutput& aDesiredSize) final;
};

#endif /* nsMathMLmrootFrame_h___ */

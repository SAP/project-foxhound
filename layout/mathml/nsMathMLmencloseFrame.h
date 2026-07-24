/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMathMLmencloseFrame_h_
#define nsMathMLmencloseFrame_h_

#include "mozilla/EnumSet.h"
#include "nsMathMLChar.h"
#include "nsMathMLContainerFrame.h"

namespace mozilla {
class PresShell;
}  // namespace mozilla

//
// <menclose> -- enclose content with a stretching symbol such
// as a long division sign.
//

/*
  The MathML REC describes:

  The menclose element renders its content inside the enclosing notation
  specified by its notation attribute. menclose accepts any number of arguments;
  if this number is not 1, its contents are treated as a single "inferred mrow"
  containing its arguments, as described in Section 3.1.3 Required Arguments.
*/

enum class MencloseNotation : uint16_t {
  LongDiv,
  RoundedBox,
  Circle,
  Left,
  Right,
  Top,
  Bottom,
  UpDiagonalStrike,
  DownDiagonalStrike,
  VerticalStrike,
  HorizontalStrike,
  UpDiagonalArrow,
  PhasorAngle,
};

class nsMathMLmencloseFrame : public nsMathMLContainerFrame {
 public:
  NS_DECL_FRAMEARENA_HELPERS(nsMathMLmencloseFrame)

  friend nsIFrame* NS_NewMathMLmencloseFrame(mozilla::PresShell* aPresShell,
                                             ComputedStyle* aStyle);

  void Place(DrawTarget* aDrawTarget, const PlaceFlags& aFlags,
             ReflowOutput& aDesiredSize) override;

  nsresult AttributeChanged(int32_t aNameSpaceID, nsAtom* aAttribute,
                            AttrModType aModType) override;

  void DidSetComputedStyle(ComputedStyle* aOldStyle) override;

  void BuildDisplayList(nsDisplayListBuilder* aBuilder,
                        const nsDisplayListSet& aLists) override;

  NS_IMETHOD
  InheritAutomaticData(nsIFrame* aParent) override;

  nscoord FixInterFrameSpacing(ReflowOutput& aDesiredSize) override;

  bool IsMrowLike() override {
    return mFrames.FirstChild() != mFrames.LastChild() || !mFrames.FirstChild();
  }

 protected:
  explicit nsMathMLmencloseFrame(ComputedStyle* aStyle,
                                 nsPresContext* aPresContext);
  virtual ~nsMathMLmencloseFrame();

  // functions to parse the "notation" attribute.
  nsresult AddNotation(const nsAString& aNotation);
  void InitNotations();

  // Description of the notations to draw
  mozilla::EnumSet<MencloseNotation> mNotationsToDraw;
  bool IsToDraw(MencloseNotation notation) {
    return mNotationsToDraw.contains(notation);
  }

  nscoord mRuleThickness;
  nsTArray<nsMathMLChar> mMathMLChar;
  int8_t mLongDivCharIndex;
  nscoord mContentWidth;
  nsresult AllocateMathMLChar(MencloseNotation mask);

  // Display a frame of the specified type.
  // @param aType Type of frame to display
  void DisplayNotation(nsDisplayListBuilder* aBuilder, nsIFrame* aFrame,
                       const nsRect& aRect, const nsDisplayListSet& aLists,
                       nscoord aThickness, MencloseNotation aType);
};

#endif /* nsMathMLmencloseFrame_h_ */

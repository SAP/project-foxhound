/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Baseline.h"

#include "nsIFrame.h"

namespace mozilla {

static inline nscoord ComputeBStartOffset(WritingMode aWM,
                                          BaselineSharingGroup aGroup,
                                          nscoord aBSize,
                                          const LogicalMargin& aMargin) {
  return aGroup == BaselineSharingGroup::First ? -aMargin.BStart(aWM)
                                               : aBSize + aMargin.BStart(aWM);
}

static inline nscoord ComputeBEndOffset(WritingMode aWM,
                                        BaselineSharingGroup aGroup,
                                        nscoord aBSize,
                                        const LogicalMargin& aMargin) {
  return aGroup == BaselineSharingGroup::First ? aBSize + aMargin.BEnd(aWM)
                                               : -aMargin.BEnd(aWM);
}

enum class BoxType { Margin, Border, Padding, Content };

template <BoxType aType>
static nscoord SynthesizeBOffsetFromInnerBox(const nsIFrame* aFrame,
                                             WritingMode aWM,
                                             BaselineSharingGroup aGroup) {
  WritingMode wm = aFrame->GetWritingMode();
  MOZ_ASSERT_IF(aType != BoxType::Border, !aWM.IsOrthogonalTo(wm));

  const LogicalMargin bp = ([&] {
    switch (aType) {
      case BoxType::Margin:
        // Bug 2034085 - This is not currently applying the logical skip sides
        // to the margin box, unlike the other boxes below. This may be
        // resulting in incorrect offset calculations if the box is fragmented.
        return aFrame->GetLogicalUsedMargin(aWM);
      case BoxType::Border:
        return LogicalMargin(aWM);
      case BoxType::Padding:
        return LogicalMargin(aWM) -
               aFrame->GetLogicalUsedBorder(aWM)
                   .ApplySkipSides(aFrame->GetLogicalSkipSides())
                   .ConvertTo(aWM, wm);
      case BoxType::Content:
        return LogicalMargin(aWM) -
               aFrame->GetLogicalUsedBorderAndPadding(wm)
                   .ApplySkipSides(aFrame->GetLogicalSkipSides())
                   .ConvertTo(aWM, wm);
    }
    MOZ_CRASH();
  })();

  BaselineSharingGroup group = aGroup;
  if (aWM.IsLineInverted()) {
    group = GetOppositeBaselineSharingGroup(aGroup);
  }

  // Atomic inlines (inline boxes that are either replaced or which establish
  // new non-inline formatting contexts) can synthesize a baseline according to
  // its `alignment-baseline` property. Otherwise, synthesize the baseline
  // using the default dominant baseline defined by the writing mode.
  StyleAlignmentBaseline baseline = aFrame->AlignmentBaseline();
  if (!aFrame->IsAtomicInline() ||
      baseline == StyleAlignmentBaseline::Baseline) {
    baseline = aWM.IsCentralBaseline() ? StyleAlignmentBaseline::Central
                                       : StyleAlignmentBaseline::Alphabetic;
  }

  // See: https://drafts.csswg.org/css-inline-3/#baseline-synthesis-box
  switch (baseline) {
    case StyleAlignmentBaseline::Baseline:
      MOZ_ASSERT_UNREACHABLE("Baseline is already handled");
      [[fallthrough]];

    default:
    case StyleAlignmentBaseline::Alphabetic:
    case StyleAlignmentBaseline::Ideographic:
    case StyleAlignmentBaseline::TextBottom:
      return ComputeBEndOffset(aWM, group, aFrame->BSize(aWM), bp);

    case StyleAlignmentBaseline::Central:
    case StyleAlignmentBaseline::Mathematical:
    case StyleAlignmentBaseline::Middle: {
      nscoord boxBSize = aFrame->BSize(aWM) + bp.BStartEnd(aWM);
      nscoord halfBoxBSize = (boxBSize / 2) + (boxBSize % 2);
      return aWM.IsLineInverted() ? -bp.BEnd(aWM) + halfBoxBSize
                                  : -bp.BStart(aWM) + halfBoxBSize;
    }

    case StyleAlignmentBaseline::Hanging:
    case StyleAlignmentBaseline::TextTop:
      return ComputeBStartOffset(aWM, group, aFrame->BSize(aWM), bp);
  }
}

nscoord Baseline::SynthesizeBOffsetFromContentBox(const nsIFrame* aFrame,
                                                  WritingMode aWM,
                                                  BaselineSharingGroup aGroup) {
  return SynthesizeBOffsetFromInnerBox<BoxType::Content>(aFrame, aWM, aGroup);
}

nscoord Baseline::SynthesizeBOffsetFromPaddingBox(const nsIFrame* aFrame,
                                                  WritingMode aWM,
                                                  BaselineSharingGroup aGroup) {
  return SynthesizeBOffsetFromInnerBox<BoxType::Padding>(aFrame, aWM, aGroup);
}

nscoord Baseline::SynthesizeBOffsetFromBorderBox(const nsIFrame* aFrame,
                                                 WritingMode aWM,
                                                 BaselineSharingGroup aGroup) {
  return SynthesizeBOffsetFromInnerBox<BoxType::Border>(aFrame, aWM, aGroup);
}

nscoord Baseline::SynthesizeBOffsetFromMarginBox(const nsIFrame* aFrame,
                                                 WritingMode aWM,
                                                 BaselineSharingGroup aGroup) {
  return SynthesizeBOffsetFromInnerBox<BoxType::Margin>(aFrame, aWM, aGroup);
}

}  // namespace mozilla

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DisplayPortUtils.h"

#include <ostream>

#include "AnchorPositioningUtils.h"
#include "FrameMetrics.h"
#include "RetainedDisplayListBuilder.h"
#include "StickyScrollContainer.h"
#include "WindowRenderer.h"
#include "mozilla/PresShell.h"
#include "mozilla/ScrollContainerFrame.h"
#include "mozilla/StaticPrefs_layers.h"
#include "mozilla/StaticPrefs_layout.h"
#include "mozilla/dom/BrowserChild.h"
#include "mozilla/dom/Document.h"
#include "mozilla/gfx/Point.h"
#include "mozilla/layers/APZPublicUtils.h"
#include "mozilla/layers/CompositorBridgeChild.h"
#include "mozilla/layers/LayersMessageUtils.h"
#include "mozilla/layers/PAPZ.h"
#include "nsIFrameInlines.h"
#include "nsLayoutUtils.h"
#include "nsPlaceholderFrame.h"
#include "nsRefreshDriver.h"
#include "nsSubDocumentFrame.h"

namespace mozilla {

using gfx::IntSize;

using layers::FrameMetrics;
using layers::ScrollableLayerGuid;

typedef ScrollableLayerGuid::ViewID ViewID;

static LazyLogModule sDisplayportLog("apz.displayport");

/* static */
DisplayPortMargins DisplayPortMargins::FromAPZ(const ScreenMargin& aMargins,
                                               const CSSPoint& aVisualOffset,
                                               const CSSPoint& aLayoutOffset) {
  return DisplayPortMargins{aMargins, aVisualOffset, aLayoutOffset};
}

/* static */
DisplayPortMargins DisplayPortMargins::ForScrollContainerFrame(
    ScrollContainerFrame* aScrollContainerFrame, const ScreenMargin& aMargins) {
  CSSPoint visualOffset;
  CSSPoint layoutOffset;
  if (aScrollContainerFrame) {
    PresShell* presShell = aScrollContainerFrame->PresShell();
    layoutOffset =
        CSSPoint::FromAppUnits(aScrollContainerFrame->GetScrollPosition());
    if (aScrollContainerFrame->IsRootScrollFrameOfDocument()) {
      visualOffset =
          CSSPoint::FromAppUnits(presShell->GetVisualViewportOffset());

    } else {
      visualOffset = layoutOffset;
    }
  }
  return DisplayPortMargins{aMargins, visualOffset, layoutOffset};
}

/* static */
DisplayPortMargins DisplayPortMargins::ForContent(
    nsIContent* aContent, const ScreenMargin& aMargins) {
  return ForScrollContainerFrame(
      aContent ? nsLayoutUtils::FindScrollContainerFrameFor(aContent) : nullptr,
      aMargins);
}

ScreenMargin DisplayPortMargins::GetRelativeToLayoutViewport(
    ContentGeometryType aGeometryType,
    ScrollContainerFrame* aScrollContainerFrame,
    const CSSToScreenScale2D& aDisplayportScale) const {
  // APZ wants |mMargins| applied relative to the visual viewport.
  // The main-thread painting code applies margins relative to
  // the layout viewport. To get the main thread to paint the
  // area APZ wants, apply a translation between the two. The
  // magnitude of the translation depends on whether we are
  // applying the displayport to scrolled or fixed content.
  CSSPoint scrollDeltaCss =
      ComputeAsyncTranslation(aGeometryType, aScrollContainerFrame);
  ScreenPoint scrollDelta = scrollDeltaCss * aDisplayportScale;
  ScreenMargin margins = mMargins;
  margins.left -= scrollDelta.x;
  margins.right += scrollDelta.x;
  margins.top -= scrollDelta.y;
  margins.bottom += scrollDelta.y;
  return margins;
}

std::ostream& operator<<(std::ostream& aOs,
                         const DisplayPortMargins& aMargins) {
  if (aMargins.mVisualOffset == CSSPoint() &&
      aMargins.mLayoutOffset == CSSPoint()) {
    aOs << aMargins.mMargins;
  } else {
    aOs << "{" << aMargins.mMargins << "," << aMargins.mVisualOffset << ","
        << aMargins.mLayoutOffset << "}";
  }
  return aOs;
}

CSSPoint DisplayPortMargins::ComputeAsyncTranslation(
    ContentGeometryType aGeometryType,
    ScrollContainerFrame* aScrollContainerFrame) const {
  // If we are applying the displayport to scrolled content, the
  // translation is the entire difference between the visual and
  // layout offsets.
  if (aGeometryType == ContentGeometryType::Scrolled) {
    return mVisualOffset - mLayoutOffset;
  }

  // If we are applying the displayport to fixed content, only
  // part of the difference between the visual and layout offsets
  // should be applied. This is because fixed content remains fixed
  // to the layout viewport, and some of the async delta between
  // the visual and layout offsets can drag the layout viewport
  // with it. We want only the remaining delta, i.e. the offset of
  // the visual viewport relative to the (async-scrolled) layout
  // viewport.
  if (!aScrollContainerFrame) {
    // Displayport on a non-scrolling frame for some reason.
    // There will be no divergence between the two viewports.
    return CSSPoint();
  }
  // Fixed content is always fixed to an RSF.
  MOZ_ASSERT(aScrollContainerFrame->IsRootScrollFrameOfDocument());
  if (!aScrollContainerFrame->PresShell()->IsVisualViewportSizeSet()) {
    // Zooming is disabled, so the layout viewport tracks the
    // visual viewport completely.
    return CSSPoint();
  }
  // Use KeepLayoutViewportEnclosingViewportVisual() to compute
  // an async layout viewport the way APZ would.
  const CSSRect visualViewport{
      mVisualOffset,
      // TODO: There are probably some edge cases here around async zooming
      // that are not currently being handled properly. For proper handling,
      // we'd likely need to save APZ's async zoom when populating
      // mVisualOffset, and using it to adjust the visual viewport size here.
      // Note that any incorrectness caused by this will only occur transiently
      // during async zooming.
      CSSSize::FromAppUnits(
          aScrollContainerFrame->PresShell()->GetVisualViewportSize())};
  const CSSRect scrollableRect = CSSRect::FromAppUnits(
      nsLayoutUtils::CalculateExpandedScrollableRect(aScrollContainerFrame));
  CSSRect asyncLayoutViewport{
      mLayoutOffset,
      CSSSize::FromAppUnits(aScrollContainerFrame->GetScrollPortRect().Size())};
  FrameMetrics::KeepLayoutViewportEnclosingVisualViewport(
      visualViewport, scrollableRect, /* out */ asyncLayoutViewport);
  return mVisualOffset - asyncLayoutViewport.TopLeft();
}

static nsRect GetDisplayPortFromRectData(nsIContent* aContent,
                                         DisplayPortPropertyData* aRectData) {
  // In the case where the displayport is set as a rect, we assume it is
  // already aligned and clamped as necessary. The burden to do that is
  // on the setter of the displayport. In practice very few places set the
  // displayport directly as a rect (mostly tests).
  return aRectData->mRect;
}

static nsRect GetDisplayPortFromMarginsData(
    nsIContent* aContent, DisplayPortMarginsPropertyData* aMarginsData,
    const DisplayPortOptions& aOptions) {
  // In the case where the displayport is set via margins, we apply the margins
  // to a base rect. Then we align the expanded rect based on the alignment
  // requested, and finally, clamp it to the size of the scrollable rect.

  nsRect base;
  if (nsRect* baseData = static_cast<nsRect*>(
          aContent->GetProperty(nsGkAtoms::DisplayPortBase))) {
    base = *baseData;
  } else {
    // In theory we shouldn't get here, but we do sometimes (see bug 1212136).
    // Fall through for graceful handling.
  }

  nsIFrame* frame = nsLayoutUtils::GetScrollContainerFrameFromContent(aContent);
  if (!frame) {
    // Turns out we can't really compute it. Oops. We still should return
    // something sane.
    NS_WARNING(
        "Attempting to get a displayport from a content with no primary "
        "frame!");
    return base;
  }

  bool isRoot = false;
  if (aContent->OwnerDoc()->GetRootElement() == aContent) {
    isRoot = true;
  }

  ScrollContainerFrame* scrollContainerFrame = frame->GetScrollTargetFrame();
  nsPoint scrollPos;
  if (scrollContainerFrame) {
    scrollPos = scrollContainerFrame->GetScrollPosition();
  }

  nsPresContext* presContext = frame->PresContext();
  int32_t auPerDevPixel = presContext->AppUnitsPerDevPixel();

  LayoutDeviceToScreenScale2D res =
      LayoutDeviceToParentLayerScale(
          presContext->PresShell()->GetCumulativeResolution()) *
      nsLayoutUtils::GetTransformToAncestorScaleCrossProcessForFrameMetrics(
          frame);

  // Calculate the expanded scrollable rect, which we'll be clamping the
  // displayport to.
  nsRect expandedScrollableRect =
      nsLayoutUtils::CalculateExpandedScrollableRect(frame);

  // GetTransformToAncestorScale() can return 0. In this case, just return the
  // base rect (clamped to the expanded scrollable rect), as other calculations
  // would run into divisions by zero.
  if (res == LayoutDeviceToScreenScale2D(0, 0)) {
    // Make sure the displayport remains within the scrollable rect.
    return base.MoveInsideAndClamp(expandedScrollableRect - scrollPos);
  }

  // First convert the base rect to screen pixels
  LayoutDeviceToScreenScale2D parentRes = res;
  if (isRoot) {
    // the base rect for root scroll frames is specified in the parent document
    // coordinate space, so it doesn't include the local resolution.
    float localRes = presContext->PresShell()->GetResolution();
    parentRes.xScale /= localRes;
    parentRes.yScale /= localRes;
  }
  ScreenRect screenRect =
      LayoutDeviceRect::FromAppUnits(base, auPerDevPixel) * parentRes;

  // Note on the correctness of applying the alignment in Screen space:
  //   The correct space to apply the alignment in would be Layer space, but
  //   we don't necessarily know the scale to convert to Layer space at this
  //   point because Layout may not yet have chosen the resolution at which to
  //   render (it chooses that in FrameLayerBuilder, but this can be called
  //   during display list building). Therefore, we perform the alignment in
  //   Screen space, which basically assumes that Layout chose to render at
  //   screen resolution; since this is what Layout does most of the time,
  //   this is a good approximation. A proper solution would involve moving
  //   the choosing of the resolution to display-list building time.
  ScreenSize alignment;

  PresShell* presShell = presContext->PresShell();
  MOZ_ASSERT(presShell);

  ScreenMargin margins = aMarginsData->mMargins.GetRelativeToLayoutViewport(
      aOptions.mGeometryType, scrollContainerFrame,
      presContext->CSSToDevPixelScale() * res);

  if (presShell->IsDisplayportSuppressed() ||
      aContent->GetProperty(nsGkAtoms::MinimalDisplayPort)) {
    alignment = ScreenSize(1, 1);
  } else {
    // Moving the displayport is relatively expensive with WR so we use a larger
    // alignment that causes the displayport to move less frequently. The
    // alignment scales up with the size of the base rect so larger scrollframes
    // use a larger alignment, but we clamp the alignment to a power of two
    // between 128 and 1024 (inclusive).
    // This naturally also increases the size of the displayport compared to
    // always using a 128 alignment, so the displayport multipliers are also
    // correspondingly smaller when WR is enabled to prevent the displayport
    // from becoming too big.
    gfx::Size multiplier =
        layers::apz::GetDisplayportAlignmentMultiplier(screenRect.Size());
    alignment = ScreenSize(128 * multiplier.width, 128 * multiplier.height);
  }

  // Avoid division by zero.
  if (alignment.width == 0) {
    alignment.width = 128;
  }
  if (alignment.height == 0) {
    alignment.height = 128;
  }

  // Expand the rect by the margins
  screenRect.Inflate(margins);

  ScreenPoint scrollPosScreen =
      LayoutDevicePoint::FromAppUnits(scrollPos, auPerDevPixel) * res;

  // Align the display port.
  screenRect += scrollPosScreen;
  float x = alignment.width * floor(screenRect.x / alignment.width);
  float y = alignment.height * floor(screenRect.y / alignment.height);
  float w = alignment.width * ceil(screenRect.width / alignment.width + 1);
  float h = alignment.height * ceil(screenRect.height / alignment.height + 1);
  screenRect = ScreenRect(x, y, w, h);
  screenRect -= scrollPosScreen;

  // Convert the aligned rect back into app units.
  nsRect result = LayoutDeviceRect::ToAppUnits(screenRect / res, auPerDevPixel);

  // Make sure the displayport remains within the scrollable rect.
  result = result.MoveInsideAndClamp(expandedScrollableRect - scrollPos);

  return result;
}

static bool GetDisplayPortData(
    nsIContent* aContent, DisplayPortPropertyData** aOutRectData,
    DisplayPortMarginsPropertyData** aOutMarginsData) {
  MOZ_ASSERT(aOutRectData && aOutMarginsData);

  *aOutRectData = static_cast<DisplayPortPropertyData*>(
      aContent->GetProperty(nsGkAtoms::DisplayPort));
  *aOutMarginsData = static_cast<DisplayPortMarginsPropertyData*>(
      aContent->GetProperty(nsGkAtoms::DisplayPortMargins));

  if (!*aOutRectData && !*aOutMarginsData) {
    // This content element has no displayport data at all
    return false;
  }

  if (*aOutRectData && *aOutMarginsData) {
    // choose margins if equal priority
    if ((*aOutRectData)->mPriority > (*aOutMarginsData)->mPriority) {
      *aOutMarginsData = nullptr;
    } else {
      *aOutRectData = nullptr;
    }
  }

  NS_ASSERTION((*aOutRectData == nullptr) != (*aOutMarginsData == nullptr),
               "Only one of aOutRectData or aOutMarginsData should be set!");

  return true;
}

static bool GetWasDisplayPortPainted(nsIContent* aContent) {
  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;

  if (!GetDisplayPortData(aContent, &rectData, &marginsData)) {
    return false;
  }

  return rectData ? rectData->mPainted : marginsData->mPainted;
}

bool DisplayPortUtils::IsMissingDisplayPortBaseRect(nsIContent* aContent) {
  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;

  if (GetDisplayPortData(aContent, &rectData, &marginsData) && marginsData) {
    return !aContent->GetProperty(nsGkAtoms::DisplayPortBase);
  }

  return false;
}

static void TranslateFromScrollPortToScrollContainerFrame(nsIContent* aContent,
                                                          nsRect* aRect) {
  MOZ_ASSERT(aRect);
  if (ScrollContainerFrame* scrollContainerFrame =
          nsLayoutUtils::FindScrollContainerFrameFor(aContent)) {
    *aRect += scrollContainerFrame->GetScrollPortRect().TopLeft();
  }
}

static bool GetDisplayPortImpl(nsIContent* aContent, nsRect* aResult,
                               const DisplayPortOptions& aOptions) {
  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;

  if (!GetDisplayPortData(aContent, &rectData, &marginsData)) {
    return false;
  }

  nsIFrame* frame = aContent->GetPrimaryFrame();
  if (frame && !frame->PresShell()->AsyncPanZoomEnabled()) {
    return false;
  }

  if (!aResult) {
    // We have displayport data, but the caller doesn't want the actual
    // rect, so we don't need to actually compute it.
    return true;
  }

  bool isDisplayportSuppressed = false;

  if (frame) {
    nsPresContext* presContext = frame->PresContext();
    MOZ_ASSERT(presContext);
    PresShell* presShell = presContext->PresShell();
    MOZ_ASSERT(presShell);
    isDisplayportSuppressed = presShell->IsDisplayportSuppressed();
  }

  nsRect result;
  if (rectData) {
    result = GetDisplayPortFromRectData(aContent, rectData);
  } else if (isDisplayportSuppressed ||
             nsLayoutUtils::ShouldDisableApzForElement(aContent) ||
             aContent->GetProperty(nsGkAtoms::MinimalDisplayPort)) {
    // Note: the above conditions should be in sync with the conditions in
    // WillUseEmptyDisplayPortMargins.

    // Make a copy of the margins data but set the margins to empty.
    // Do not create a new DisplayPortMargins object with
    // DisplayPortMargins::Empty(), because that will record the visual
    // and layout scroll offsets in place right now on the DisplayPortMargins,
    // and those are only meant to be recorded when the margins are stored.
    DisplayPortMarginsPropertyData noMargins = *marginsData;
    noMargins.mMargins.mMargins = ScreenMargin();
    result = GetDisplayPortFromMarginsData(aContent, &noMargins, aOptions);
  } else {
    result = GetDisplayPortFromMarginsData(aContent, marginsData, aOptions);
  }

  if (aOptions.mRelativeTo == DisplayportRelativeTo::ScrollFrame) {
    TranslateFromScrollPortToScrollContainerFrame(aContent, &result);
  }

  *aResult = result;
  return true;
}

bool DisplayPortUtils::GetDisplayPort(nsIContent* aContent, nsRect* aResult,
                                      const DisplayPortOptions& aOptions) {
  return GetDisplayPortImpl(aContent, aResult, aOptions);
}

bool DisplayPortUtils::HasDisplayPort(nsIContent* aContent) {
  return GetDisplayPort(aContent, nullptr);
}

bool DisplayPortUtils::HasPaintedDisplayPort(nsIContent* aContent) {
  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;
  GetDisplayPortData(aContent, &rectData, &marginsData);
  if (rectData) {
    return rectData->mPainted;
  }
  if (marginsData) {
    return marginsData->mPainted;
  }
  return false;
}

void DisplayPortUtils::MarkDisplayPortAsPainted(nsIContent* aContent) {
  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;
  GetDisplayPortData(aContent, &rectData, &marginsData);
  MOZ_ASSERT(rectData || marginsData,
             "MarkDisplayPortAsPainted should only be called for an element "
             "with a displayport");
  if (rectData) {
    rectData->mPainted = true;
  }
  if (marginsData) {
    marginsData->mPainted = true;
  }
}

bool DisplayPortUtils::HasNonMinimalDisplayPort(nsIContent* aContent) {
  return !aContent->GetProperty(nsGkAtoms::MinimalDisplayPort) &&
         HasDisplayPort(aContent);
}

bool DisplayPortUtils::HasNonMinimalNonZeroDisplayPort(nsIContent* aContent) {
  if (aContent->GetProperty(nsGkAtoms::MinimalDisplayPort)) {
    return false;
  }

  DisplayPortPropertyData* rectData = nullptr;
  DisplayPortMarginsPropertyData* marginsData = nullptr;
  if (!GetDisplayPortData(aContent, &rectData, &marginsData)) {
    return false;
  }

  if (!marginsData) {
    // We have a display port, so if we don't have margin data we must have rect
    // data. We consider such as non zero and non minimal, it's probably not too
    // important as display port rects are only used in tests.
    return true;
  }

  if (marginsData->mMargins.mMargins != ScreenMargin()) {
    return true;
  }

  return false;
}

/* static */
bool DisplayPortUtils::GetDisplayPortForVisibilityTesting(nsIContent* aContent,
                                                          nsRect* aResult) {
  MOZ_ASSERT(aResult);
  return GetDisplayPortImpl(
      aContent, aResult,
      DisplayPortOptions().With(DisplayportRelativeTo::ScrollFrame));
}

void DisplayPortUtils::InvalidateForDisplayPortChange(
    nsIContent* aContent, bool aHadDisplayPort, const nsRect& aOldDisplayPort,
    const nsRect& aNewDisplayPort, RepaintMode aRepaintMode) {
  if (aRepaintMode != RepaintMode::Repaint) {
    return;
  }

  bool changed =
      !aHadDisplayPort || !aOldDisplayPort.IsEqualEdges(aNewDisplayPort);

  nsIFrame* frame = nsLayoutUtils::FindScrollContainerFrameFor(aContent);
  if (changed && frame) {
    // It is important to call SchedulePaint on the same frame that we set the
    // dirty rect properties on so we can find the frame later to remove the
    // properties.
    frame->SchedulePaint();

    if (!nsLayoutUtils::AreRetainedDisplayListsEnabled()) {
      return;
    }

    if (StaticPrefs::layout_display_list_retain_sc()) {
      // DisplayListBuildingDisplayPortRect property is not used when retain sc
      // mode is enabled.
      return;
    }

    auto* builder = nsLayoutUtils::GetRetainedDisplayListBuilder(frame);
    if (!builder) {
      return;
    }

    bool found;
    nsRect* rect = frame->GetProperty(
        nsDisplayListBuilder::DisplayListBuildingDisplayPortRect(), &found);

    if (!found) {
      rect = new nsRect();
      frame->AddProperty(
          nsDisplayListBuilder::DisplayListBuildingDisplayPortRect(), rect);
      frame->SetHasOverrideDirtyRegion(true);

      DL_LOGV("Adding display port building rect for frame %p\n", frame);
      RetainedDisplayListData* data = builder->Data();
      data->Flags(frame) += RetainedDisplayListData::FrameFlag::HasProps;
    } else {
      MOZ_ASSERT(rect, "this property should only store non-null values");
    }

    if (aHadDisplayPort) {
      // We only need to build a display list for any new areas added
      nsRegion newRegion(aNewDisplayPort);
      newRegion.SubOut(aOldDisplayPort);
      rect->UnionRect(*rect, newRegion.GetBounds());
    } else {
      rect->UnionRect(*rect, aNewDisplayPort);
    }
  }
}

bool DisplayPortUtils::SetDisplayPortMargins(
    nsIContent* aContent, PresShell* aPresShell,
    const DisplayPortMargins& aMargins,
    ClearMinimalDisplayPortProperty aClearMinimalDisplayPortProperty,
    uint32_t aPriority, RepaintMode aRepaintMode) {
  MOZ_ASSERT(aContent);
  MOZ_ASSERT(aContent->GetComposedDoc() == aPresShell->GetDocument());

  DisplayPortMarginsPropertyData* currentData =
      static_cast<DisplayPortMarginsPropertyData*>(
          aContent->GetProperty(nsGkAtoms::DisplayPortMargins));
  if (currentData && currentData->mPriority > aPriority) {
    return false;
  }

  if (currentData && currentData->mMargins.mVisualOffset != CSSPoint() &&
      aMargins.mVisualOffset == CSSPoint()) {
    // If we hit this, then it's possible that we're setting a displayport
    // that is wrong because the old one had a layout/visual adjustment and
    // the new one does not.
    MOZ_LOG(sDisplayportLog, LogLevel::Warning,
            ("Dropping visual offset %s",
             ToString(currentData->mMargins.mVisualOffset).c_str()));
  }

  nsIFrame* scrollFrame =
      nsLayoutUtils::GetScrollContainerFrameFromContent(aContent);

  nsRect oldDisplayPort;
  bool hadDisplayPort = false;
  bool wasPainted = GetWasDisplayPortPainted(aContent);
  if (scrollFrame) {
    // We only use the two return values from this function to call
    // InvalidateForDisplayPortChange. InvalidateForDisplayPortChange does
    // nothing if aContent does not have a frame. So getting the displayport is
    // useless if the content has no frame, so we avoid calling this to avoid
    // triggering a warning about not having a frame.
    hadDisplayPort = GetDisplayPort(aContent, &oldDisplayPort);
  }

  aContent->SetProperty(
      nsGkAtoms::DisplayPortMargins,
      new DisplayPortMarginsPropertyData(aMargins, aPriority, wasPainted),
      nsINode::DeleteProperty<DisplayPortMarginsPropertyData>);

  if (aClearMinimalDisplayPortProperty ==
      ClearMinimalDisplayPortProperty::Yes) {
    if (MOZ_LOG_TEST(sDisplayportLog, LogLevel::Debug) &&
        aContent->GetProperty(nsGkAtoms::MinimalDisplayPort)) {
      mozilla::layers::ScrollableLayerGuid::ViewID viewID =
          mozilla::layers::ScrollableLayerGuid::NULL_SCROLL_ID;
      nsLayoutUtils::FindIDFor(aContent, &viewID);
      MOZ_LOG(sDisplayportLog, LogLevel::Debug,
              ("SetDisplayPortMargins removing MinimalDisplayPort prop on "
               "scrollId=%" PRIu64 "\n",
               viewID));
    }
    aContent->RemoveProperty(nsGkAtoms::MinimalDisplayPort);
  }

  ScrollContainerFrame* scrollContainerFrame =
      scrollFrame ? scrollFrame->GetScrollTargetFrame() : nullptr;
  if (!scrollContainerFrame) {
    return true;
  }

  nsRect newDisplayPort;
  DebugOnly<bool> hasDisplayPort = GetDisplayPort(aContent, &newDisplayPort);
  MOZ_ASSERT(hasDisplayPort);

  if (MOZ_LOG_TEST(sDisplayportLog, LogLevel::Debug)) {
    mozilla::layers::ScrollableLayerGuid::ViewID viewID =
        mozilla::layers::ScrollableLayerGuid::NULL_SCROLL_ID;
    nsLayoutUtils::FindIDFor(aContent, &viewID);
    if (!hadDisplayPort) {
      MOZ_LOG(sDisplayportLog, LogLevel::Debug,
              ("SetDisplayPortMargins %s on scrollId=%" PRIu64 ", newDp=%s\n",
               ToString(aMargins).c_str(), viewID,
               ToString(newDisplayPort).c_str()));
    } else {
      // Use verbose level logging for when an existing displayport got its
      // margins updated.
      MOZ_LOG(sDisplayportLog, LogLevel::Verbose,
              ("SetDisplayPortMargins %s on scrollId=%" PRIu64 ", newDp=%s\n",
               ToString(aMargins).c_str(), viewID,
               ToString(newDisplayPort).c_str()));
    }
  }

  InvalidateForDisplayPortChange(aContent, hadDisplayPort, oldDisplayPort,
                                 newDisplayPort, aRepaintMode);

  scrollContainerFrame->TriggerDisplayPortExpiration();

  // Display port margins changing means that the set of visible frames may
  // have drastically changed. Check if we should schedule an update.
  hadDisplayPort = scrollContainerFrame
                       ->GetDisplayPortAtLastApproximateFrameVisibilityUpdate(
                           &oldDisplayPort);

  bool needVisibilityUpdate = !hadDisplayPort;
  // Check if the total size has changed by a large factor.
  if (!needVisibilityUpdate) {
    if ((newDisplayPort.width > 2 * oldDisplayPort.width) ||
        (oldDisplayPort.width > 2 * newDisplayPort.width) ||
        (newDisplayPort.height > 2 * oldDisplayPort.height) ||
        (oldDisplayPort.height > 2 * newDisplayPort.height)) {
      needVisibilityUpdate = true;
    }
  }
  // Check if it's moved by a significant amount.
  if (!needVisibilityUpdate) {
    if (nsRect* baseData = static_cast<nsRect*>(
            aContent->GetProperty(nsGkAtoms::DisplayPortBase))) {
      nsRect base = *baseData;
      if ((std::abs(newDisplayPort.X() - oldDisplayPort.X()) > base.width) ||
          (std::abs(newDisplayPort.XMost() - oldDisplayPort.XMost()) >
           base.width) ||
          (std::abs(newDisplayPort.Y() - oldDisplayPort.Y()) > base.height) ||
          (std::abs(newDisplayPort.YMost() - oldDisplayPort.YMost()) >
           base.height)) {
        needVisibilityUpdate = true;
      }
    }
  }
  if (needVisibilityUpdate) {
    aPresShell->ScheduleApproximateFrameVisibilityUpdateNow();
  }

  return true;
}

void DisplayPortUtils::SetDisplayPortBase(nsIContent* aContent,
                                          const nsRect& aBase) {
  if (MOZ_LOG_TEST(sDisplayportLog, LogLevel::Verbose)) {
    ViewID viewId = nsLayoutUtils::FindOrCreateIDFor(aContent);
    MOZ_LOG(sDisplayportLog, LogLevel::Verbose,
            ("Setting base rect %s for scrollId=%" PRIu64 "\n",
             ToString(aBase).c_str(), viewId));
  }
  if (nsRect* baseData = static_cast<nsRect*>(
          aContent->GetProperty(nsGkAtoms::DisplayPortBase))) {
    *baseData = aBase;
    return;
  }

  aContent->SetProperty(nsGkAtoms::DisplayPortBase, new nsRect(aBase),
                        nsINode::DeleteProperty<nsRect>);
}

void DisplayPortUtils::SetDisplayPortBaseIfNotSet(nsIContent* aContent,
                                                  const nsRect& aBase) {
  if (aContent->GetProperty(nsGkAtoms::DisplayPortBase)) {
    return;
  }
  if (MOZ_LOG_TEST(sDisplayportLog, LogLevel::Verbose)) {
    ViewID viewId = nsLayoutUtils::FindOrCreateIDFor(aContent);
    MOZ_LOG(sDisplayportLog, LogLevel::Verbose,
            ("Setting base rect %s for scrollId=%" PRIu64 "\n",
             ToString(aBase).c_str(), viewId));
  }

  aContent->SetProperty(nsGkAtoms::DisplayPortBase, new nsRect(aBase),
                        nsINode::DeleteProperty<nsRect>);
}

void DisplayPortUtils::RemoveDisplayPort(nsIContent* aContent) {
  aContent->RemoveProperty(nsGkAtoms::DisplayPort);
  aContent->RemoveProperty(nsGkAtoms::DisplayPortMargins);
}

void DisplayPortUtils::SetMinimalDisplayPortDuringPainting(
    nsIContent* aContent, PresShell* aPresShell) {
  // SetDisplayPortMargins calls TriggerDisplayPortExpiration which starts a
  // display port expiry timer for display ports that do expire. However
  // minimal display ports do not expire, so the display port has to be
  // marked before the SetDisplayPortMargins call so the expiry timer
  // doesn't get started.
  aContent->SetProperty(nsGkAtoms::MinimalDisplayPort,
                        reinterpret_cast<void*>(true));

  DisplayPortUtils::SetDisplayPortMargins(
      aContent, aPresShell, DisplayPortMargins::Empty(aContent),
      DisplayPortUtils::ClearMinimalDisplayPortProperty::No, 0,
      DisplayPortUtils::RepaintMode::DoNotRepaint);
}

bool DisplayPortUtils::ViewportHasDisplayPort(nsPresContext* aPresContext) {
  nsIFrame* rootScrollContainerFrame =
      aPresContext->PresShell()->GetRootScrollContainerFrame();
  return rootScrollContainerFrame &&
         HasDisplayPort(rootScrollContainerFrame->GetContent());
}

bool DisplayPortUtils::IsFixedPosFrameInDisplayPort(const nsIFrame* aFrame) {
  // Fixed-pos frames are parented by the viewport frame or the page content
  // frame. We'll assume that printing/print preview don't have displayports for
  // their pages!
  nsIFrame* parent = aFrame->GetParent();
  if (!parent || parent->GetParent() ||
      aFrame->StyleDisplay()->mPosition != StylePositionProperty::Fixed) {
    return false;
  }
  return ViewportHasDisplayPort(aFrame->PresContext());
}

// We want to this return true for the scroll frame, but not the
// scrolled frame (which has the same content).
bool DisplayPortUtils::FrameHasDisplayPort(nsIFrame* aFrame,
                                           const nsIFrame* aScrolledFrame) {
  if (!aFrame->GetContent() || !HasDisplayPort(aFrame->GetContent())) {
    return false;
  }
  ScrollContainerFrame* sf = do_QueryFrame(aFrame);
  if (sf) {
    if (aScrolledFrame && aScrolledFrame != sf->GetScrolledFrame()) {
      return false;
    }
    return true;
  }
  return false;
}

bool DisplayPortUtils::CalculateAndSetDisplayPortMargins(
    ScrollContainerFrame* aScrollContainerFrame, RepaintMode aRepaintMode) {
  nsIContent* content = aScrollContainerFrame->GetContent();
  MOZ_ASSERT(content);

  FrameMetrics metrics =
      nsLayoutUtils::CalculateBasicFrameMetrics(aScrollContainerFrame);
  ScreenMargin displayportMargins = layers::apz::CalculatePendingDisplayPort(
      metrics, ParentLayerPoint(0.0f, 0.0f));
  PresShell* presShell = aScrollContainerFrame->PresShell();

  DisplayPortMargins margins = DisplayPortMargins::ForScrollContainerFrame(
      aScrollContainerFrame, displayportMargins);

  return SetDisplayPortMargins(content, presShell, margins,
                               ClearMinimalDisplayPortProperty::Yes, 0,
                               aRepaintMode);
}

bool DisplayPortUtils::MaybeCreateDisplayPort(
    nsDisplayListBuilder* aBuilder, ScrollContainerFrame* aScrollContainerFrame,
    RepaintMode aRepaintMode) {
  MOZ_ASSERT(aBuilder->IsPaintingToWindow());

  nsIContent* content = aScrollContainerFrame->GetContent();
  if (!content) {
    return false;
  }

  // We perform an optimization where we ensure that at least one
  // async-scrollable frame (i.e. one that WantsAsyncScroll()) has a
  // displayport. If that's not the case yet, and we are async-scrollable, we
  // will get a displayport.
  MOZ_ASSERT(nsLayoutUtils::AsyncPanZoomEnabled(aScrollContainerFrame));
  if (!aBuilder->HaveScrollableDisplayPort() &&
      aScrollContainerFrame->WantAsyncScroll()) {
    bool haveDisplayPort = HasNonMinimalNonZeroDisplayPort(content);
    // If we don't already have a displayport, calculate and set one.
    if (!haveDisplayPort) {
      // We only use the viewId for logging purposes, but create it
      // unconditionally to minimize impact of enabling logging. If we don't
      // assign a viewId here it will get assigned later anyway so functionally
      // there should be no difference.
      ViewID viewId = nsLayoutUtils::FindOrCreateIDFor(content);
      MOZ_LOG(
          sDisplayportLog, LogLevel::Debug,
          ("Setting DP on first-encountered scrollId=%" PRIu64 "\n", viewId));

      CalculateAndSetDisplayPortMargins(aScrollContainerFrame, aRepaintMode);
#ifdef DEBUG
      haveDisplayPort = HasNonMinimalDisplayPort(content);
      MOZ_ASSERT(haveDisplayPort,
                 "should have a displayport after having just set it");
#endif
    }

    // Record that the we now have a scrollable display port.
    aBuilder->SetHaveScrollableDisplayPort();
    return true;
  }
  return false;
}

void DisplayPortUtils::SetZeroMarginDisplayPortOnAsyncScrollableAncestors(
    nsIFrame* aFrame) {
  nsIFrame* frame = aFrame;
  while (frame) {
    frame = OneStepInAsyncScrollableAncestorChain(frame);
    if (!frame) {
      break;
    }
    ScrollContainerFrame* scrollAncestor =
        nsLayoutUtils::GetAsyncScrollableAncestorFrame(frame);
    if (!scrollAncestor) {
      break;
    }
    frame = scrollAncestor;
    MOZ_ASSERT(scrollAncestor->WantAsyncScroll() ||
               frame->PresShell()->GetRootScrollContainerFrame() == frame);
    if (nsLayoutUtils::AsyncPanZoomEnabled(frame) &&
        !HasDisplayPort(frame->GetContent())) {
      SetDisplayPortMargins(frame->GetContent(), frame->PresShell(),
                            DisplayPortMargins::Empty(frame->GetContent()),
                            ClearMinimalDisplayPortProperty::No, 0,
                            RepaintMode::Repaint);
    }
  }
}

bool DisplayPortUtils::MaybeCreateDisplayPortInFirstScrollFrameEncountered(
    nsIFrame* aFrame, nsDisplayListBuilder* aBuilder) {
  // Don't descend into the tab bar in chrome, it can be very large and does not
  // contain any async scrollable elements.
  if (XRE_IsParentProcess() && aFrame->GetContent() &&
      aFrame->GetContent()->GetID() == nsGkAtoms::tabbrowser_arrowscrollbox) {
    return false;
  }
  if (aFrame->IsScrollContainerOrSubclass()) {
    auto* sf = static_cast<ScrollContainerFrame*>(aFrame);
    if (MaybeCreateDisplayPort(aBuilder, sf, RepaintMode::Repaint)) {
      // If this was the first displayport found in the first scroll container
      // frame encountered, mark the scroll container frame with the current
      // paint sequence number. This is used later to ensure the displayport
      // created is never expired. When there is a scrollable frame with a first
      // scrollable sequence number found that does not match the current paint
      // sequence number (may occur if the dom was mutated in some way), the
      // value will be reset.
      sf->SetIsFirstScrollableFrameSequenceNumber(
          Some(nsDisplayListBuilder::GetPaintSequenceNumber()));
      return true;
    }
  } else if (aFrame->IsPlaceholderFrame()) {
    nsPlaceholderFrame* placeholder = static_cast<nsPlaceholderFrame*>(aFrame);
    nsIFrame* oof = placeholder->GetOutOfFlowFrame();
    if (oof && !nsLayoutUtils::IsPopup(oof) &&
        MaybeCreateDisplayPortInFirstScrollFrameEncountered(oof, aBuilder)) {
      return true;
    }
  } else if (aFrame->IsSubDocumentFrame()) {
    PresShell* presShell = static_cast<nsSubDocumentFrame*>(aFrame)
                               ->GetSubdocumentPresShellForPainting(0);
    if (nsIFrame* root = presShell ? presShell->GetRootFrame() : nullptr) {
      if (MaybeCreateDisplayPortInFirstScrollFrameEncountered(root, aBuilder)) {
        return true;
      }
    }
  }
  // Checking mMozSubtreeHiddenOnlyVisually is relatively slow because it
  // involves loading more memory. It's only allowed in chrome sheets so let's
  // only support it in the parent process so we can mostly optimize this out in
  // content processes.
  if (XRE_IsParentProcess() &&
      aFrame->StyleUIReset()->mMozSubtreeHiddenOnlyVisually) {
    // Only descend the visible card of deck / tabpanels
    return false;
  }
  for (nsIFrame* child : aFrame->PrincipalChildList()) {
    if (MaybeCreateDisplayPortInFirstScrollFrameEncountered(child, aBuilder)) {
      return true;
    }
  }
  return false;
}

void DisplayPortUtils::ExpireDisplayPortOnAsyncScrollableAncestor(
    nsIFrame* aFrame) {
  nsIFrame* frame = aFrame;
  while (frame) {
    frame = OneStepInAsyncScrollableAncestorChain(frame);
    if (!frame) {
      break;
    }
    ScrollContainerFrame* scrollAncestor =
        nsLayoutUtils::GetAsyncScrollableAncestorFrame(frame);
    if (!scrollAncestor) {
      break;
    }
    frame = scrollAncestor;
    MOZ_ASSERT(frame);
    if (!frame) {
      break;
    }
    MOZ_ASSERT(scrollAncestor->WantAsyncScroll() ||
               frame->PresShell()->GetRootScrollContainerFrame() == frame);
    if (HasDisplayPort(frame->GetContent())) {
      scrollAncestor->TriggerDisplayPortExpiration();
      // Stop after the first trigger. If it failed, there's no point in
      // continuing because all the rest of the frames we encounter are going
      // to be ancestors of |scrollAncestor| which will keep its displayport.
      // If the trigger succeeded, we stop because when the trigger executes
      // it will call this function again to trigger the next ancestor up the
      // chain.
      break;
    }
  }
}

Maybe<nsRect> DisplayPortUtils::GetRootDisplayportBase(PresShell* aPresShell) {
  DebugOnly<nsPresContext*> pc = aPresShell->GetPresContext();
  MOZ_ASSERT(pc, "this function should be called after PresShell::Init");
  MOZ_ASSERT(pc->IsRootContentDocumentCrossProcess() ||
             !pc->GetParentPresContext());

  dom::BrowserChild* browserChild = dom::BrowserChild::GetFrom(aPresShell);
  if (browserChild && !browserChild->IsTopLevel()) {
    // If this is an in-process root in on OOP iframe, use the visible rect if
    // it's been set.
    return browserChild->GetVisibleRect();
  }

  nsIFrame* frame = aPresShell->GetRootScrollContainerFrame();
  if (!frame) {
    frame = aPresShell->GetRootFrame();
  }

  nsRect baseRect;
  if (frame) {
    baseRect = GetDisplayportBase(frame);
  } else {
    baseRect = nsRect(nsPoint(0, 0),
                      aPresShell->GetPresContext()->GetVisibleArea().Size());
  }

  return Some(baseRect);
}

nsRect DisplayPortUtils::GetDisplayportBase(nsIFrame* aFrame) {
  MOZ_ASSERT(aFrame);

  return nsRect(nsPoint(),
                nsLayoutUtils::CalculateCompositionSizeForFrame(aFrame));
}

bool DisplayPortUtils::WillUseEmptyDisplayPortMargins(nsIContent* aContent) {
  MOZ_ASSERT(HasDisplayPort(aContent));
  nsIFrame* frame = aContent->GetPrimaryFrame();
  if (!frame) {
    return false;
  }

  // Note these conditions should be in sync with the conditions where we use
  // empty margins to calculate display port in GetDisplayPortImpl
  return aContent->GetProperty(nsGkAtoms::MinimalDisplayPort) ||
         frame->PresShell()->IsDisplayportSuppressed() ||
         nsLayoutUtils::ShouldDisableApzForElement(aContent);
}

nsIFrame* DisplayPortUtils::OneStepInAsyncScrollableAncestorChain(
    nsIFrame* aFrame) {
  // This mirrors one iteration of GetNearestScrollableOrOverflowClipFrame in
  // nsLayoutUtils.cpp as called by
  // nsLayoutUtils::GetAsyncScrollableAncestorFrame. They should be kept in
  // sync. See that function for comments about the structure of this code.
  if (aFrame->IsMenuPopupFrame()) {
    return nullptr;
  }
  nsIFrame* anchor = nullptr;
  while ((anchor = AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
              aFrame, /* aBuilder */ nullptr))) {
    aFrame = anchor;
  }
  if (aFrame->StyleDisplay()->mPosition == StylePositionProperty::Fixed &&
      nsLayoutUtils::IsReallyFixedPos(aFrame)) {
    if (nsIFrame* root = aFrame->PresShell()->GetRootScrollContainerFrame()) {
      return root;
    }
  }
  return nsLayoutUtils::GetCrossDocParentFrameInProcess(aFrame);
}

FrameAndASRKind DisplayPortUtils::GetASRAncestorFrame(
    FrameAndASRKind aFrameAndASRKind, nsDisplayListBuilder* aBuilder) {
  MOZ_ASSERT(aBuilder->IsPaintingToWindow());
  // This has different behaviour from
  // nsLayoutUtils::GetAsyncScrollableAncestorFrame because the ASR tree is
  // different from the "async scrollable ancestor chain" which is mainly used
  // for activating display ports. We don't want the
  // SCROLLABLE_ALWAYS_MATCH_ROOT behaviour because we only want to match the
  // root if it generates an ASR. We don't want the
  // SCROLLABLE_FIXEDPOS_FINDS_ROOT behaviour because the ASR tree does not jump
  // from fixed pos to root (that behaviour exists so that fixed pos in the root
  // document in the process can find some apzc, ASRs have no such need and that
  // would be incorrect). This should be kept in sync with
  // OneStepInAsyncScrollableAncestorChain, OneStepInASRChain,
  // ShouldAsyncScrollWithAnchorNotCached,
  // nsLayoutUtils::GetAsyncScrollableAncestorFrame.

  for (nsIFrame* f = aFrameAndASRKind.mFrame; f;
       f = nsLayoutUtils::GetCrossDocParentFrameInProcess(f)) {
    if (f->IsMenuPopupFrame()) {
      break;
    }

    // Note that the order of checking for a scroll container frame with
    // IsMaybeAsynchronouslyScrolled, anchors, and sticky pos is significant.
    // The potential ASR of the scroll container frame is the "inner" one, the
    // potenial ASR of the sticky is the "outer" one.
    if (f != aFrameAndASRKind.mFrame ||
        aFrameAndASRKind.mASRKind == ActiveScrolledRoot::ASRKind::Scroll) {
      if (ScrollContainerFrame* scrollContainerFrame = do_QueryFrame(f)) {
        if (scrollContainerFrame->IsMaybeAsynchronouslyScrolled()) {
          return {f, ActiveScrolledRoot::ASRKind::Scroll};
        }
      }
    }

    nsIFrame* anchor = nullptr;
    // This needs to be a while loop because anchors can chain, and we don't
    // want to consider each frame in this loop separately (as a potential
    // scrollable ancestor) because they are all equivalent in the scrollable
    // ancestor chain: they all scroll together. We are not walking up the async
    // scrollable ancestor chain, but rather we are moving sideways. And when
    // we exit this loop the last frame might be a sticky asr, after that we
    // move up (the next iteration of the outer for loop).
    while ((anchor = AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
                f, aBuilder))) {
      f = anchor;
    }

    // The ordering of this sticky check and the above anchor loop is
    // significant, even though a frame can't be both sticky pos and anchored
    // (because anchoring requires abs pos): if we follow an anchor, the anchor
    // could be an active sticky pos, so that would generate an ASR and we want
    // to return that rather than do another iteration of the outer for loop
    // which moves on to the (crossdoc) parent frame.
    if (f->StyleDisplay()->mPosition == StylePositionProperty::Sticky) {
      auto* ssc = StickyScrollContainer::GetOrCreateForFrame(f);
      if (ssc && ssc->ScrollContainer()->IsMaybeAsynchronouslyScrolled()) {
        return {f->FirstContinuation(), ActiveScrolledRoot::ASRKind::Sticky};
      }
    }
  }
  return FrameAndASRKind::default_value();
}

FrameAndASRKind DisplayPortUtils::OneStepInASRChain(
    FrameAndASRKind aFrameAndASRKind, nsDisplayListBuilder* aBuilder,
    nsIFrame* aLimitAncestor /* = nullptr */) {
  MOZ_ASSERT(aBuilder->IsPaintingToWindow());
  // This has the same basic structure as GetASRAncestorFrame since they are
  // meant to be used together. As well as ShouldAsyncScrollWithAnchor, so this
  // should be kept in sync with GetASRAncestorFrame and
  // ShouldAsyncScrollWithAnchor. See that function for more comments about the
  // structure of this code.
  if (aFrameAndASRKind.mFrame->IsMenuPopupFrame()) {
    return FrameAndASRKind::default_value();
  }
  if (aFrameAndASRKind.mASRKind == ActiveScrolledRoot::ASRKind::Scroll) {
    nsIFrame* frame = aFrameAndASRKind.mFrame;
    nsIFrame* anchor = nullptr;
    while ((anchor = AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
                frame, aBuilder))) {
      MOZ_ASSERT_IF(
          aLimitAncestor,
          nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
              aLimitAncestor, anchor));
      frame = anchor;
    }
    return {frame, ActiveScrolledRoot::ASRKind::Sticky};
  }
  nsIFrame* parent =
      nsLayoutUtils::GetCrossDocParentFrameInProcess(aFrameAndASRKind.mFrame);
  if (aLimitAncestor && parent &&
      (parent == aLimitAncestor ||
       parent->FirstContinuation() == aLimitAncestor->FirstContinuation())) {
    return FrameAndASRKind::default_value();
  }
  return {parent, ActiveScrolledRoot::ASRKind::Scroll};
}

// This first checks if aFrame is a scroll frame, if so it then tries to
// activate it. Then this function returns true if aFrame generates a scroll ASR
// (ie its an active scroll frame).
static bool ActivatePotentialScrollASR(nsIFrame* aFrame,
                                       nsDisplayListBuilder* aBuilder) {
  ScrollContainerFrame* scrollContainerFrame = do_QueryFrame(aFrame);
  if (!scrollContainerFrame) {
    return false;
  }
  return scrollContainerFrame->DecideScrollableLayerEnsureDisplayport(aBuilder);
}

// This first checks if aFrame is sticky pos, if so it then tries to activate
// the associate scroll frame. Then this function returns true if aFrame
// generates a sticky ASR (ie its sticky pos and its associated scroll frame is
// active).
static bool ActivatePotentialStickyASR(nsIFrame* aFrame,
                                       nsDisplayListBuilder* aBuilder) {
  if (aFrame->StyleDisplay()->mPosition != StylePositionProperty::Sticky) {
    return false;
  }
  auto* ssc = StickyScrollContainer::GetOrCreateForFrame(aFrame);
  if (!ssc) {
    return false;
  }
  return ssc->ScrollContainer()->DecideScrollableLayerEnsureDisplayport(
      aBuilder);
}

const ActiveScrolledRoot* DisplayPortUtils::ActivateDisplayportOnASRAncestors(
    nsIFrame* aAnchor, nsIFrame* aLimitAncestor,
    const ActiveScrolledRoot* aASRofLimitAncestor,
    nsDisplayListBuilder* aBuilder) {
  MOZ_ASSERT(ScrollContainerFrame::ShouldActivateAllScrollFrames(
      aBuilder, aLimitAncestor));

  MOZ_ASSERT(
      (aASRofLimitAncestor ? FrameAndASRKind{aASRofLimitAncestor->mFrame,
                                             aASRofLimitAncestor->mKind}
                           : FrameAndASRKind::default_value()) ==
      GetASRAncestorFrame({aLimitAncestor, ActiveScrolledRoot::ASRKind::Scroll},
                          aBuilder));

  MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
      aLimitAncestor, aAnchor));

  AutoTArray<FrameAndASRKind, 4> ASRframes;

  // The passed in frame is the anchor, if it is a scroll frame we do not scroll
  // with that scroll frame (we are "outside" of it) but if it is sticky pos
  // then we do move with the sticky ASR, so we init our iterator at
  // ASRKind::Scroll indicating we have completed ASRKind::Scroll for aAnchor.
  // We call OneStepInASRChain once before the loop, this moves us to the end of
  // the anchor chain if aAnchor is also anchored, and flips the ASRKind to
  // sticky to give us our first FrameAndASRKind to consider. (Note that if the
  // original anchored frame was passed in to this function then calling
  // OneStepInASRChain on the (first) anchor would be equivalent to calling
  // OneStepInASRChain on the anchored frame, but this saves
  // GetAnchorThatFrameScrollsWith call that we've already done.)
  FrameAndASRKind frameAndASRKind{aAnchor, ActiveScrolledRoot::ASRKind::Scroll};
  frameAndASRKind =
      OneStepInASRChain(frameAndASRKind, aBuilder, aLimitAncestor);
  while (frameAndASRKind.mFrame && frameAndASRKind.mFrame != aLimitAncestor &&
         (!aLimitAncestor || frameAndASRKind.mFrame->FirstContinuation() !=
                                 aLimitAncestor->FirstContinuation())) {
    // We check if each frame encountered generates an ASR. It can either
    // generate a scroll asr or a sticky asr, or both! If it generates both then
    // the sticky asr is the outer (parent) asr. So we check for scroll ASRs
    // first.

    // We intentionally call this on all scroll frames encountered, not just the
    // ones that WantAsyncScroll. This is because scroll frames with
    // WantAsyncScroll == false can have a display port (say if they had
    // non-zero scroll range and had a display port but then their scroll range
    // shrank to zero then the displayport would still stick around), hence
    // mWillBuildScrollableLayer would be true on them and we need to make sure
    // mWillBuildScrollableLayer is up to date (if the scroll frame was
    // temporarily inside a view transition mWillBuildScrollableLayer would
    // temporarily get set to false).

    // In this loop we are looking for any scroll frame that will generate an
    // ASR. This corresponds to scroll frames with mWillBuildScrollableLayer ==
    // true. This is different from scroll frames that return true from
    // WantAsyncScroll (both because of what was explained above and because not
    // every scroll frame that WantAsyncScroll will have a displayport), and
    // hence it's also different from what GetAsyncScrollableAncestorFrame will
    // return.

    switch (frameAndASRKind.mASRKind) {
      case ActiveScrolledRoot::ASRKind::Scroll:
        if (ActivatePotentialScrollASR(frameAndASRKind.mFrame, aBuilder)) {
          ASRframes.EmplaceBack(frameAndASRKind);
        }
        break;

      case ActiveScrolledRoot::ASRKind::Sticky:
        if (ActivatePotentialStickyASR(frameAndASRKind.mFrame, aBuilder)) {
          ASRframes.EmplaceBack(frameAndASRKind);
        }
        break;
    }

    frameAndASRKind =
        OneStepInASRChain(frameAndASRKind, aBuilder, aLimitAncestor);
  }

  const ActiveScrolledRoot* asr = aASRofLimitAncestor;

  // Iterate array in reverse order (top down in the frame/asr tree) creating
  // the asr structs.
  for (auto asrFrame : Reversed(ASRframes)) {
    MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
        aLimitAncestor, asrFrame.mFrame));

    MOZ_ASSERT(
        (asr ? FrameAndASRKind{asr->mFrame, asr->mKind}
             : FrameAndASRKind::default_value()) ==
        GetASRAncestorFrame(OneStepInASRChain(asrFrame, aBuilder), aBuilder));

    asr = (asrFrame.mASRKind == ActiveScrolledRoot::ASRKind::Scroll)
              ? aBuilder->GetOrCreateActiveScrolledRoot(
                    asr, static_cast<ScrollContainerFrame*>(
                             do_QueryFrame(asrFrame.mFrame)))
              : aBuilder->GetOrCreateActiveScrolledRootForSticky(
                    asr, asrFrame.mFrame);
  }
  return asr;
}

static bool CheckAxes(ScrollContainerFrame* aScrollFrame, PhysicalAxes aAxes) {
  if (aAxes == kPhysicalAxesBoth) {
    return true;
  }
  nsRect range = aScrollFrame->GetScrollRangeForUserInputEvents();
  if (aAxes.contains(PhysicalAxis::Vertical)) {
    MOZ_ASSERT(!aAxes.contains(PhysicalAxis::Horizontal));
    if (range.width > 0) {
      // compensating in vertical axis only, but scroll frame can scroll horz
      return false;
    }
  }
  if (aAxes.contains(PhysicalAxis::Horizontal)) {
    MOZ_ASSERT(!aAxes.contains(PhysicalAxis::Vertical));
    if (range.height > 0) {
      // compensating in horizontal axis only, but scroll frame can scroll vert
      return false;
    }
  }
  return true;
}

static bool CheckForScrollFrameAndAxes(nsIFrame* aFrame, PhysicalAxes aAxes,
                                       bool* aOutSawPotentialASR) {
  ScrollContainerFrame* scrollContainerFrame = do_QueryFrame(aFrame);
  if (!scrollContainerFrame) {
    return true;
  }
  *aOutSawPotentialASR = true;
  return CheckAxes(scrollContainerFrame, aAxes);
}

// true is good
static bool CheckForStickyAndAxes(nsIFrame* aFrame, PhysicalAxes aAxes,
                                  bool* aOutSawPotentialASR) {
  if (aFrame->StyleDisplay()->mPosition != StylePositionProperty::Sticky) {
    return true;
  }
  auto* ssc = StickyScrollContainer::GetOrCreateForFrame(aFrame);
  if (!ssc) {
    return true;
  }
  *aOutSawPotentialASR = true;
  return CheckAxes(ssc->ScrollContainer(), aAxes);
}

static bool ShouldAsyncScrollWithAnchorNotCached(nsIFrame* aFrame,
                                                 nsIFrame* aAnchor,
                                                 nsDisplayListBuilder* aBuilder,
                                                 PhysicalAxes aAxes,
                                                 bool* aReportToDoc) {
  // This has the same basic structure as GetASRAncestorFrame and
  // OneStepInASRChain. They should all be kept in sync.
  if (aFrame->IsMenuPopupFrame()) {
    *aReportToDoc = false;
    return false;
  }
  *aReportToDoc = true;
  nsIFrame* limitAncestor = aFrame->GetParent();
  MOZ_ASSERT(limitAncestor);
  // Start from aAnchor (not aFrame) so we don't infinite loop.
  nsIFrame* frame = aAnchor;
  bool firstIteration = true;
  // We want to detect if we would assign an ASR to the anchored frame that is
  // subject to a transform that the anchored frame is not actually under
  // because doing so would give it the same spatial node and webrender would
  // incorrectly render it with that transform. So we track when we first see a
  // potential ASR and then start checking for transforms.
  bool sawPotentialASR = false;
  while (frame && !frame->IsMenuPopupFrame() && frame != limitAncestor &&
         (frame->FirstContinuation() != limitAncestor->FirstContinuation())) {
    // Note that we purposely check all scroll frames in this loop because we
    // might not have activated scroll frames yet.

    // On the first iteration we don't check the scroll frame because we don't
    // scroll with the contents of aAnchor.
    if (!firstIteration &&
        !CheckForScrollFrameAndAxes(frame, aAxes, &sawPotentialASR)) {
      return false;
    }

    // On the first iteration it's okay if the anchor is transformed, we won't
    // get rendered as transformed if we take it's ASR (even if it's sticky
    // pos).
    if (sawPotentialASR && !firstIteration && frame->IsTransformed()) {
      return false;
    }

    nsIFrame* anchor = nullptr;
    while ((anchor = AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
                frame, aBuilder))) {
      MOZ_ASSERT(nsLayoutUtils::IsProperAncestorFrameConsideringContinuations(
          limitAncestor, anchor));
      frame = anchor;
      // Any of these anchor chain frames are okay if they are transformed, they
      // won't affect our ASR/spatial node (even the last one, even if it's
      // sticky).
    }

    if (!CheckForStickyAndAxes(frame, aAxes, &sawPotentialASR)) {
      return false;
    }
    // If sawPotentialASR flipped from false to true in the
    // CheckForStickyAndAxes call we don't want to check if frame is transformed
    // because its transform will not be applied to items with an ASR equal to
    // {frame, sticky} because the transform is inside the sticky.

    frame = nsLayoutUtils::GetCrossDocParentFrameInProcess(frame);
    firstIteration = false;
  }
  return true;
}

bool DisplayPortUtils::ShouldAsyncScrollWithAnchor(
    nsIFrame* aFrame, nsIFrame* aAnchor, nsDisplayListBuilder* aBuilder,
    PhysicalAxes aAxes) {
  // Note that this does not recurse because we are passing aBuilder = nullptr,
  // but we have to skip the asserts related to aBuilder.
  MOZ_ASSERT(aAnchor ==
             AnchorPositioningUtils::GetAnchorThatFrameScrollsWith(
                 aFrame, /* aBuilder */ nullptr, /* aSkipAsserts */ true));
  MOZ_ASSERT(aFrame->IsAbsolutelyPositioned());
  MOZ_ASSERT(aBuilder->IsPaintingToWindow());
  MOZ_ASSERT(!aAxes.isEmpty());

  // ShouldAsyncScrollWithAnchorNotCached can call recursively and modify
  // AsyncScrollsWithAnchorHashmap, so we have to be careful to not hold an
  // entry in the hashtable during a call to
  // ShouldAsyncScrollWithAnchorNotCached. Unfortunately this means that we have
  // to do two hashtable lookups if the frame is not present in the hashtable.
  if (auto entry = aBuilder->AsyncScrollsWithAnchorHashmap().Lookup(aFrame)) {
    return *entry;
  }
  bool reportToDoc = false;
  bool shouldAsyncScrollWithAnchor = ShouldAsyncScrollWithAnchorNotCached(
      aFrame, aAnchor, aBuilder, aAxes, &reportToDoc);
  {
    bool& entry =
        aBuilder->AsyncScrollsWithAnchorHashmap().LookupOrInsert(aFrame);
    entry = shouldAsyncScrollWithAnchor;
  }
  if (reportToDoc) {
    auto* pc = aFrame->PresContext();
    pc->Document()->ReportHasScrollLinkedEffect(
        pc->RefreshDriver()->MostRecentRefresh(),
        dom::Document::ReportToConsole::No);
  }

  return shouldAsyncScrollWithAnchor;
}

}  // namespace mozilla

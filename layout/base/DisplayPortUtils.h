/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_DisplayPortUtils_h_
#define mozilla_DisplayPortUtils_h_

#include <cstdint>
#include <iosfwd>

#include "Units.h"
#include "nsDisplayList.h"
#include "nsRect.h"

class nsIContent;
class nsIFrame;
class nsPresContext;

namespace mozilla {

class nsDisplayListBuilder;
class PresShell;
class ScrollContainerFrame;

// For GetDisplayPort
enum class DisplayportRelativeTo { ScrollPort, ScrollFrame };

// Is the displayport being applied to scrolled content or fixed content?
enum class ContentGeometryType { Scrolled, Fixed };

struct DisplayPortOptions {
  // The default options.
  DisplayportRelativeTo mRelativeTo = DisplayportRelativeTo::ScrollPort;
  ContentGeometryType mGeometryType = ContentGeometryType::Scrolled;

  // Fluent interface for changing the defaults.
  DisplayPortOptions With(DisplayportRelativeTo aRelativeTo) const {
    DisplayPortOptions result = *this;
    result.mRelativeTo = aRelativeTo;
    return result;
  }
  DisplayPortOptions With(ContentGeometryType aGeometryType) const {
    DisplayPortOptions result = *this;
    result.mGeometryType = aGeometryType;
    return result;
  }
};

struct DisplayPortPropertyData {
  DisplayPortPropertyData(const nsRect& aRect, uint32_t aPriority,
                          bool aPainted)
      : mRect(aRect), mPriority(aPriority), mPainted(aPainted) {}
  nsRect mRect;
  uint32_t mPriority;
  bool mPainted;
};

struct DisplayPortMargins {
  // The margins relative to the visual scroll offset.
  ScreenMargin mMargins;

  // Some information captured at the time the margins are stored.
  // This ensures that we can express the margins as being relative to
  // the correct scroll offset when applying them.

  // APZ's visual scroll offset at the time it requested the margins.
  CSSPoint mVisualOffset;

  // The scroll frame's layout scroll offset at the time the margins
  // were saved.
  CSSPoint mLayoutOffset;

  // Create displayport margins requested by APZ, relative to an async visual
  // offset provided by APZ.
  static DisplayPortMargins FromAPZ(const ScreenMargin& aMargins,
                                    const CSSPoint& aVisualOffset,
                                    const CSSPoint& aLayoutOffset);

  // Create displayport port margins for the given scroll container frame.
  // This is for use in cases where we don't have async scroll information from
  // APZ to use to adjust the margins. The visual and layout offset are set
  // based on the main thread's view of them.
  static DisplayPortMargins ForScrollContainerFrame(
      ScrollContainerFrame* aScrollContainerFrame,
      const ScreenMargin& aMargins);

  // Convenience version of the above that takes a content element.
  static DisplayPortMargins ForContent(nsIContent* aContent,
                                       const ScreenMargin& aMargins);

  // Another convenience version that sets empty margins.
  static DisplayPortMargins Empty(nsIContent* aContent) {
    return ForContent(aContent, ScreenMargin());
  }

  // Get the margins relative to the layout viewport.
  // |aGeometryType| tells us whether the margins are being queried for the
  // purpose of being applied to scrolled content or fixed content.
  // |aScrollableFrame| is the scroll frame whose content the margins will be
  // applied to (or, in the case of fixed content), the scroll frame wrt. which
  // the content is fixed.
  ScreenMargin GetRelativeToLayoutViewport(
      ContentGeometryType aGeometryType,
      ScrollContainerFrame* aScrollContainerFrame,
      const CSSToScreenScale2D& aDisplayportScale) const;

  friend std::ostream& operator<<(std::ostream& aOs,
                                  const DisplayPortMargins& aMargins);

 private:
  CSSPoint ComputeAsyncTranslation(
      ContentGeometryType aGeometryType,
      ScrollContainerFrame* aScrollContainerFrame) const;
};

struct DisplayPortMarginsPropertyData {
  DisplayPortMarginsPropertyData(const DisplayPortMargins& aMargins,
                                 uint32_t aPriority, bool aPainted)
      : mMargins(aMargins), mPriority(aPriority), mPainted(aPainted) {}
  DisplayPortMargins mMargins;
  uint32_t mPriority;
  bool mPainted;
};

struct FrameAndASRKind {
  nsIFrame* mFrame;
  ActiveScrolledRoot::ASRKind mASRKind;
  bool operator==(const FrameAndASRKind&) const = default;
  static FrameAndASRKind default_value() {
    return {nullptr, ActiveScrolledRoot::ASRKind::Scroll};
  }
};

class DisplayPortUtils {
 public:
  /**
   * Get display port for the given element, relative to the specified entity,
   * defaulting to the scrollport.
   */
  static bool GetDisplayPort(
      nsIContent* aContent, nsRect* aResult,
      const DisplayPortOptions& aOptions = DisplayPortOptions());

  /**
   * Check whether the given element has a displayport.
   */
  static bool HasDisplayPort(nsIContent* aContent);

  /**
   * Check whether the given element has a displayport that has already
   * been sent to the compositor via a layers or WR transaction.
   */
  static bool HasPaintedDisplayPort(nsIContent* aContent);

  /**
   * Mark the displayport of a given element as having been sent to
   * the compositor via a layers or WR transaction.
   */
  static void MarkDisplayPortAsPainted(nsIContent* aContent);

  /**
   * Check whether the given frame has a displayport. It returns false
   * for scrolled frames and true for the corresponding scroll frame.
   * Optionally pass the child, and it only returns true if the child is the
   * scrolled frame for the displayport.
   */
  static bool FrameHasDisplayPort(nsIFrame* aFrame,
                                  const nsIFrame* aScrolledFrame = nullptr);

  /**
   * Check whether the given element has a non-minimal displayport.
   */
  static bool HasNonMinimalDisplayPort(nsIContent* aContent);

  /**
   * Check whether the given element has a non-minimal displayport that also has
   * non-zero margins. A display port rect is considered non-minimal non-zero.
   */
  static bool HasNonMinimalNonZeroDisplayPort(nsIContent* aContent);

  /**
   * Check if the given element has a margins based displayport but is missing a
   * displayport base rect that it needs to properly compute a displayport rect.
   */
  static bool IsMissingDisplayPortBaseRect(nsIContent* aContent);

  /**
   * @return the display port for the given element which should be used for
   * visibility testing purposes, relative to the scroll frame.
   *
   * This is the display port computed with a multipler of 1 which is the normal
   * display port unless low-precision buffers are enabled. If low-precision
   * buffers are enabled then GetDisplayPort() uses a multiplier to expand the
   * displayport, so this will differ from GetDisplayPort.
   */
  static bool GetDisplayPortForVisibilityTesting(nsIContent* aContent,
                                                 nsRect* aResult);

  enum class RepaintMode : uint8_t { Repaint, DoNotRepaint };

  /**
   * Invalidate for displayport change.
   */
  static void InvalidateForDisplayPortChange(
      nsIContent* aContent, bool aHadDisplayPort, const nsRect& aOldDisplayPort,
      const nsRect& aNewDisplayPort,
      RepaintMode aRepaintMode = RepaintMode::Repaint);

  /**
   * Set the display port margins for a content element to be used with a
   * display port base (see SetDisplayPortBase()).
   * See also nsIDOMWindowUtils.setDisplayPortMargins.
   * @param aContent the content element for which to set the margins
   * @param aPresShell the pres shell for the document containing the element
   * @param aMargins the margins to set
   * @param aAlignmentX, alignmentY the amount of pixels to which to align the
   *                                displayport built by combining the base
   *                                rect with the margins, in either direction
   * @param aPriority a priority value to determine which margins take effect
   *                  when multiple callers specify margins
   * @param aRepaintMode whether to schedule a paint after setting the margins
   * @return true if the new margins were applied.
   */
  enum class ClearMinimalDisplayPortProperty { No, Yes };

  static bool SetDisplayPortMargins(
      nsIContent* aContent, PresShell* aPresShell,
      const DisplayPortMargins& aMargins,
      ClearMinimalDisplayPortProperty aClearMinimalDisplayPortProperty,
      uint32_t aPriority = 0, RepaintMode aRepaintMode = RepaintMode::Repaint);

  /**
   * Set the display port base rect for given element to be used with display
   * port margins.
   * SetDisplayPortBaseIfNotSet is like SetDisplayPortBase except it only sets
   * the display port base to aBase if no display port base is currently set.
   */
  static void SetDisplayPortBase(nsIContent* aContent, const nsRect& aBase);
  static void SetDisplayPortBaseIfNotSet(nsIContent* aContent,
                                         const nsRect& aBase);

  /**
   * Remove the displayport for the given element.
   */
  static void RemoveDisplayPort(nsIContent* aContent);

  /**
   * Set minimal display port margins during painting.
   */
  static void SetMinimalDisplayPortDuringPainting(nsIContent* aContent,
                                                  PresShell* aPresShell);

  /**
   * Return true if aPresContext's viewport has a displayport.
   */
  static bool ViewportHasDisplayPort(nsPresContext* aPresContext);

  /**
   * Return true if aFrame is a fixed-pos frame and is a child of a viewport
   * which has a displayport. These frames get special treatment from the
   * compositor. aDisplayPort, if non-null, is set to the display port rectangle
   * (relative to the viewport).
   */
  static bool IsFixedPosFrameInDisplayPort(const nsIFrame* aFrame);

  static bool MaybeCreateDisplayPortInFirstScrollFrameEncountered(
      nsIFrame* aFrame, nsDisplayListBuilder* aBuilder);

  /**
   * Calculate a default set of displayport margins for the given scrollframe
   * and set them on the scrollframe's content element. The margins are set with
   * the default priority, which may clobber previously set margins. The repaint
   * mode provided is passed through to the call to SetDisplayPortMargins.
   * The |aScrollFrame| parameter must be non-null and queryable to an nsIFrame.
   * @return true iff the call to SetDisplayPortMargins returned true.
   */
  static bool CalculateAndSetDisplayPortMargins(
      ScrollContainerFrame* aScrollContainerFrame, RepaintMode aRepaintMode);

  /**
   * If |aScrollContainerFrame| WantsAsyncScroll() and we don't have a
   * scrollable displayport yet (as tracked by |aBuilder|), calculate and set a
   * displayport.
   *
   * If this is called during display list building pass DoNotRepaint in
   * aRepaintMode.
   *
   * Returns true if there is a displayport on an async scrollable scrollframe
   * after this call, either because one was just added or it already existed.
   */
  static bool MaybeCreateDisplayPort(
      nsDisplayListBuilder* aBuilder,
      ScrollContainerFrame* aScrollContainerFrame, RepaintMode aRepaintMode);

  /**
   * Sets a zero margin display port on all proper ancestors of aFrame that
   * are async scrollable.
   */
  static void SetZeroMarginDisplayPortOnAsyncScrollableAncestors(
      nsIFrame* aFrame);

  /**
   * Finds the closest ancestor async scrollable frame from aFrame that has a
   * displayport and attempts to trigger the displayport expiry on that
   * ancestor.
   */
  static void ExpireDisplayPortOnAsyncScrollableAncestor(nsIFrame* aFrame);

  /**
   * Returns root displayport base rect for |aPresShell|. In the case where
   * |aPresShell| is in an out-of-process iframe, this function may return
   * Nothing() if we haven't received the iframe's visible rect from the parent
   * content.
   * |aPresShell| should be top level content or in-process root or root in the
   * browser process.
   */
  static Maybe<nsRect> GetRootDisplayportBase(PresShell* aPresShell);

  static nsRect GetDisplayportBase(nsIFrame* aFrame);

  /**
   * Whether to tell the given element will use empty displayport marings.
   * NOTE: This function should be called only for the element having any type
   * of displayports.
   */
  static bool WillUseEmptyDisplayPortMargins(nsIContent* aContent);

  /**
   * Step up one frame in the async scrollable ancestor chain, to be used in
   * conjunction with GetAsyncScrollableAncestorFrame to walk the async
   * scrollable ancestor chain. Note this doesn't go from one async scrollable
   * frame to the next. Rather this walks all frame types, taking only one
   * ancestor step per call.
   */
  static nsIFrame* OneStepInAsyncScrollableAncestorChain(nsIFrame* aFrame);

  /**
   * The next two functions (GetASRAncestorFrame and OneStepInASRChain) use
   * FrameAndASRKind (a pair of a nsIFrame pointer an an ASRKind enum) as a
   * cursor iterating up the frame tree. Each frame can potential generate two
   * ASRs: an inner one corresponding to scrolling with the contents of the
   * frame if it is a scroll frame, and an outer one correspnding to scrolling
   * with the frame itself if it is a sticky position frame. Its meaning is
   * different for each of the two functions but is natural when considering
   * what each function does. When passed into GetASRAncestorFrame it specifies
   * the first frame and type for the function to check. When returned from
   * GetASRAncestorFrame it specifies the frame and type of the ASR (because
   * GetASRAncestorFrame only returns ASRs). When passed into OneStepInASRChain
   * it specifies the last spot that was checked, and OneStepInASRChain's job is
   * to move one iteration from that, so it returns the next frame and ASR kind
   * to be checked (which may not generate an ASR, just that it needs to be
   * checked because it could generate an ASR).
   */

  /**
   * Follows the ASR (ActiveScrolledRoot) chain of frames, so that if
   * f is the frame of an ASR A, then calling this function on
   * OneStepInASRChain(f) will return the frame of parent ASR of A. Frames that
   * generate an ASR are scroll frames for which IsMaybeAsynchronouslyScrolled()
   * returns true (aka mWillBuildScrollableLayer == true) or they are sticky
   * position frames for which their corresponding scroll frame will generate an
   * ASR. This function is different from
   * nsLayoutUtils::GetAsyncScrollableAncestorFrame because
   * GetAsyncScrollableAncestorFrame looks only for scroll frames that
   * WantAsyncScroll that that function walks from fixed pos to the root scroll
   * frame. Because that status (ie mWillBuildScrollableLayer) can change this
   * should only be called during a paint to the window after BuildDisplayList
   * has been called on aTarget so that mWillBuildScrollableLayer will have been
   * updated for this paint already for any frame we need to consult. Or for
   * some other reason you know that mWillBuildScrollableLayer is up to date for
   * this paint for any frame that might need to be consulted, ie you just
   * updated them yourself. Note that a frame returned from this function could
   * generate two ASRs: an inner one corresponding to an activated scroll frame,
   * and an outer one corresponding to sticky pos.
   */
  static FrameAndASRKind GetASRAncestorFrame(FrameAndASRKind aFrameAndASRKind,
                                             nsDisplayListBuilder* aBuilder);

  /**
   * Step up one frame in the ASR chain, to be used in conjunction with
   * GetASRAncestorFrame to walk the ASR chain. Note this doesn't go from one
   * ASR frame to the next. Rather this walks all frame types, taking only one
   * ancestor step per call. Note that a frame returned from this function could
   * generate two ASRs: an inner one corresponding to an activated scroll frame,
   * and an outer one corresponding to sticky pos. Returns null if we hit
   * aLimitAncestor.
   */
  static FrameAndASRKind OneStepInASRChain(FrameAndASRKind aFrameAndASRKind,
                                           nsDisplayListBuilder* aBuilder,
                                           nsIFrame* aLimitAncestor = nullptr);

  /**
   * Calls DecideScrollableLayerEnsureDisplayport on all proper ancestors of
   * aAnchor that are async scrollable up to but not including aLimitAncestor
   * (this creates a minimal display port on all async scrollable ancestors if
   * they don't have a display port) and makes sure that there is an ASR struct
   * created for all such async scrollable ancestors.
   * Returns the ASR of aAnchor.
   * This is a very specific function for anchor positioning and likely not
   * what you want. In that context, aAnchor is the anchor of an abspos frame f
   * (not passed to this function because it is not needed) and aLimitAncestor
   * is the parent/containing block of f.
   */
  static const ActiveScrolledRoot* ActivateDisplayportOnASRAncestors(
      nsIFrame* aAnchor, nsIFrame* aLimitAncestor,
      const ActiveScrolledRoot* aASRofLimitAncestor,
      nsDisplayListBuilder* aBuilder);

  /**
   * aFrame is an absolutely positioned frame that is anchor positioned and
   * compensates for scroll in at least one axis.
   */
  static bool ShouldAsyncScrollWithAnchor(nsIFrame* aFrame, nsIFrame* aAnchor,
                                          nsDisplayListBuilder* aBuilder,
                                          PhysicalAxes aAxes);
};

}  // namespace mozilla

#endif  // mozilla_DisplayPortUtils_h_

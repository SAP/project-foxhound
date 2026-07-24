/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef nsIMathMLFrame_h_
#define nsIMathMLFrame_h_

#include "nsMathMLOperators.h"
#include "nsQueryFrame.h"

struct nsPresentationData;
struct nsEmbellishData;
class gfxContext;
class nsIFrame;
namespace mozilla {
class ReflowOutput;
}  // namespace mozilla

// For MathML, this 'type' will be used to determine the spacing between frames
// Subclasses can return a 'type' that will give them a particular spacing
enum class MathMLFrameType : uint8_t {
  Ordinary,
  OperatorOrdinary,
  OperatorInvisible,
  OperatorUserDefined,
  Inner,
  ItalicIdentifier,
  UprightIdentifier,
  Unknown,
};
constexpr auto MathMLFrameTypeCount = size_t(MathMLFrameType::Unknown);

// Bits used for the presentation flags -- these bits are set
// in their relevant situation as they become available
enum class MathMLPresentationFlag : uint8_t {
  // This bit is used to emulate TeX rendering.
  // Internal use only, cannot be set by the user with an attribute.
  Compressed,

  // This bit is set if the frame will fire a vertical stretch
  // command on all its (non-empty) children.
  // Tags like <mrow> (or an inferred mrow), mpadded, etc, will fire a
  // vertical stretch command on all their non-empty children
  StretchAllChildrenVertically,

  // This bit is set if the frame will fire a horizontal stretch
  // command on all its (non-empty) children.
  // Tags like munder, mover, munderover, will fire a
  // horizontal stretch command on all their non-empty children
  StretchAllChildrenHorizontally,

  // This bit is set if the frame is "space-like", as defined by the spec.
  SpaceLike,

  // This bit is set if a token frame should be rendered with the dtls font
  // feature setting.
  Dtls,

  // a bit used for debug
  StretchDone,
};
using MathMLPresentationFlags = mozilla::EnumSet<MathMLPresentationFlag>;

// Bits used for the embellish flags -- these bits are set
// in their relevant situation as they become available
enum class MathMLEmbellishFlag : uint8_t {
  // This bit is set if the frame is an embellished operator.
  EmbellishedOperator,

  // This bit is set if the frame is an <mo> frame or an embellihsed
  // operator for which the core <mo> has movablelimits="true"
  MovableLimits,

  // This bit is set if the frame is an <mo> frame or an embellihsed
  // operator for which the core <mo> has accent="true"
  Accent,

  // This bit is set if the frame is an <mo> frame or an embellihsed
  // operator for which the core <mo> has largeop="true"
  LargeOp,

  // This bit is set if the frame is an <mover> or <munderover> with
  // an accent frame
  AccentOver,

  // This bit is set if the frame is an <munder> or <munderover> with
  // an accentunder frame
  AccentUnder,

  // This bit is set on the core if it is a fence operator.
  Fence,

  // This bit is set on the core if it is a separator operator.
  Separator,
};
using MathMLEmbellishFlags = mozilla::EnumSet<MathMLEmbellishFlag>;

// Abstract base class that provides additional methods for MathML frames
class nsIMathMLFrame {
 public:
  NS_DECL_QUERYFRAME_TARGET(nsIMathMLFrame)

  // helper to check whether the frame is "space-like", as defined by the spec.
  virtual bool IsSpaceLike() = 0;

  /* SUPPORT FOR PRECISE POSITIONING */
  /*====================================================================*/

  /* Metrics that _exactly_ enclose the text of the frame.
   * The frame *must* have *already* being reflowed, before you can call
   * the GetBoundingMetrics() method.
   * Note that for a frame with nested children, the bounding metrics
   * will exactly enclose its children. For example, the bounding metrics
   * of msub is the smallest rectangle that exactly encloses both the
   * base and the subscript.
   */
  NS_IMETHOD
  GetBoundingMetrics(nsBoundingMetrics& aBoundingMetrics) = 0;

  NS_IMETHOD
  SetBoundingMetrics(const nsBoundingMetrics& aBoundingMetrics) = 0;

  NS_IMETHOD
  SetReference(const nsPoint& aReference) = 0;

  virtual MathMLFrameType GetMathMLFrameType() = 0;

  /* SUPPORT FOR STRETCHY ELEMENTS */
  /*====================================================================*/

  /* Stretch :
   * Called to ask a stretchy MathML frame to stretch itself depending
   * on its context.
   *
   * An embellished frame is treated in a special way. When it receives a
   * Stretch() command, it passes the command to its embellished child and
   * the stretched size is bubbled up from the inner-most <mo> frame. In other
   * words, the stretch command descend through the embellished hierarchy.
   *
   * @param aStretchDirection [in] the direction where to attempt to
   *        stretch.
   * @param aContainerSize [in] struct that suggests the maximumn size for
   *        the stretched frame. Only member data of the struct that are
   *        relevant to the direction are used (the rest is ignored).
   * @param aDesiredStretchSize [in/out] On input the current size
   *        of the frame, on output the size after stretching.
   */
  NS_IMETHOD
  Stretch(mozilla::gfx::DrawTarget* aDrawTarget,
          StretchDirection aStretchDirection, nsBoundingMetrics& aContainerSize,
          mozilla::ReflowOutput& aDesiredStretchSize) = 0;

  /* Get the mEmbellishData member variable. */

  NS_IMETHOD
  GetEmbellishData(nsEmbellishData& aEmbellishData) = 0;

  /* SUPPORT FOR SCRIPTING ELEMENTS */
  /*====================================================================*/

  /* Get the mPresentationData member variable. */

  NS_IMETHOD
  GetPresentationData(nsPresentationData& aPresentationData) = 0;

  /* InheritAutomaticData() / TransmitAutomaticData() :
   * There are precise rules governing each MathML frame and its children.
   * Properties such as the scriptlevel or the embellished nature of a frame
   * depend on those rules. Also, certain properties that we use to emulate
   * TeX rendering rules are frame-dependent too. These two methods are meant
   * to be implemented by frame classes that need to assert specific properties
   * within their subtrees.
   *
   * InheritAutomaticData() is called in a top-down manner [like
   * nsIFrame::Init], as we descend the frame tree, whereas
   * TransmitAutomaticData() is called in a bottom-up manner, as we ascend the
   * tree [like nsIFrame::SetInitialChildList]. However, unlike Init() and
   * SetInitialChildList() which are called only once during the life-time of a
   * frame (when initially constructing the frame tree), these two methods are
   * called to build automatic data after the <math>...</math> subtree has been
   * constructed fully, and are called again as we walk a child's subtree to
   * handle dynamic changes that happen in the content model.
   *
   * As a rule of thumb:
   *
   * 1. Use InheritAutomaticData() to set properties related to your ancestors:
   *    - set properties that are intrinsic to yourself
   *    - set properties that depend on the state that you expect your ancestors
   *      to have already reached in their own InheritAutomaticData().
   *    - set properties that your descendants assume that you would have set in
   *      your InheritAutomaticData() -- this way, they can safely query them
   *      and the process will feed upon itself.
   *
   * 2. Use TransmitAutomaticData() to set properties related to your
   *    descendants:
   *    - set properties that depend on the state that you expect your
   *      descendants to have reached upon processing their own
   *      TransmitAutomaticData().
   *    - transmit properties that your descendants expect that you will
   *      transmit to them in your TransmitAutomaticData() -- this way, they
   *      remain up-to-date.
   *    - set properties that your ancestors expect that you would set in your
   *      TransmitAutomaticData() -- this way, they can safely query them and
   *      the process will feed upon itself.
   */

  NS_IMETHOD
  InheritAutomaticData(nsIFrame* aParent) = 0;

  NS_IMETHOD
  TransmitAutomaticData() = 0;

  /* UpdatePresentationData:
   * Updates the frame's compression flag.
   * A frame becomes "compressed" (or "cramped") according to TeX rendering
   * rules (TeXBook, Ch.17, p.140-141).
   *
   * @param aFlagsValues [in]
   *        The new values (e.g., compress) that are going to be
   *        updated.
   *
   * @param aWhichFlags [in]
   *        The flags that are relevant to this call. Since not all calls
   *        are meant to update all flags at once, aWhichFlags is used
   *        to distinguish flags that need to retain their existing values
   *        from flags that need to be turned on (or turned off). If a bit
   *        is set in aWhichFlags, then the corresponding value (which
   *        can be 0 or 1) is taken from aFlagsValues and applied to the
   *        frame. Therefore, by setting their bits in aWhichFlags, and
   *        setting their desired values in aFlagsValues, it is possible to
   *        update some flags in the frame, leaving the other flags unchanged.
   */
  NS_IMETHOD
  UpdatePresentationData(MathMLPresentationFlags aFlagsValues,
                         MathMLPresentationFlags aWhichFlags) = 0;

  /* UpdatePresentationDataFromChildAt :
   * Sets compression flag on the whole tree. For child frames
   * at aFirstIndex up to aLastIndex, this method sets their
   * compression flags. The update is propagated down the subtrees of each of
   * these child frames.
   *
   * @param aFirstIndex [in]
   *        Index of the first child from where the update is propagated.
   *
   * @param aLastIndex [in]
   *        Index of the last child where to stop the update.
   *        A value of -1 means up to last existing child.
   *
   * @param aFlagsValues [in]
   *        The new values (e.g., compress) that are going to be
   *        assigned in the whole sub-trees.
   *
   * @param aWhichFlags [in]
   *        The flags that are relevant to this call. See
   * UpdatePresentationData() for more details about this parameter.
   */
  NS_IMETHOD
  UpdatePresentationDataFromChildAt(int32_t aFirstIndex, int32_t aLastIndex,
                                    MathMLPresentationFlags aFlagsValues,
                                    MathMLPresentationFlags aWhichFlags) = 0;

  // If aFrame is a child frame, returns the script increment which this frame
  // imposes on the specified frame, ignoring any artificial adjustments to
  // scriptlevel.
  // Returns 0 if the specified frame isn't a child frame.
  virtual uint8_t ScriptIncrement(nsIFrame* aFrame) = 0;

  // Returns true if the frame is considered to be an mrow for layout purposes.
  // This includes inferred mrows, but excludes <mrow> elements with a single
  // child.  In the latter case, the child is to be treated as if it wasn't
  // within an mrow, so we pretend the mrow isn't mrow-like.
  virtual bool IsMrowLike() = 0;

  // Return the italic correction of this frame.
  // https://w3c.github.io/mathml-core/#dfn-italic-correction
  virtual nscoord ItalicCorrection() = 0;
};

// struct used by a container frame to keep track of its embellishments.
// By convention, the data that we keep here is bubbled from the embellished
// hierarchy, and it remains unchanged unless we have to recover from a change
// that occurs in the embellished hierarchy. The struct remains in its nil
// state in those frames that are not part of the embellished hierarchy.
struct nsEmbellishData {
  // bits used to mark certain properties of our embellishments
  MathMLEmbellishFlags flags;

  // pointer on the <mo> frame at the core of the embellished hierarchy
  nsIFrame* coreFrame = nullptr;

  // stretchy direction that the nsMathMLChar owned by the core <mo> supports
  StretchDirection direction = StretchDirection::Unsupported;

  // spacing that may come from <mo> depending on its 'form'. Since
  // the 'form' may also depend on the position of the outermost
  // embellished ancestor, the set up of these values may require
  // looking up the position of our ancestors.
  nscoord leadingSpace = 0;
  nscoord trailingSpace = 0;
};

// struct used by a container frame to modulate its presentation.
// By convention, the data that we keep in this struct can change depending
// on any of our ancestors and/or descendants. If a data can be resolved
// solely from the embellished hierarchy, and it remains immutable once
// resolved, we put it in |nsEmbellishData|. If it can be affected by other
// things, it comes here. This struct is updated as we receive information
// transmitted by our ancestors and is kept in sync with changes in our
// descendants that affects us.
struct nsPresentationData {
  // bits for: compressed, etc
  MathMLPresentationFlags flags;

  // handy pointer on our base child (the 'nucleus' in TeX), but it may be
  // null here (e.g., tags like <mrow>, <mfrac>, <mtable>, etc, won't
  // pick a particular child in their child list to be the base)
  nsIFrame* baseFrame = nullptr;
};

#endif /* nsIMathMLFrame_h___ */

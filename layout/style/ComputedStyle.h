/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* the interface (to internal code) for retrieving computed style data */

#ifndef ComputedStyle_h_
#define ComputedStyle_h_

#include "mozilla/Assertions.h"
#include "mozilla/CachedInheritingStyles.h"
#include "mozilla/Maybe.h"
#include "mozilla/PseudoStyleRequest.h"
#include "mozilla/ServoComputedData.h"
#include "mozilla/ServoStyleConsts.h"
#include "nsColor.h"
#include "nsStyleStructFwd.h"

enum nsChangeHint : uint32_t;
class nsWindowSizes;

#define FORWARD_STRUCT(name_) struct nsStyle##name_;
FOR_EACH_STYLE_STRUCT(FORWARD_STRUCT, FORWARD_STRUCT)
#undef FORWARD_STRUCT

extern "C" {
void Gecko_ComputedStyle_Destroy(mozilla::ComputedStyle*);
}

namespace mozilla {

struct CSSPropertyId;
enum class StylePointerEvents : uint8_t;
enum class StyleUserSelect : uint8_t;

namespace dom {
class Document;
}

/**
 * A ComputedStyle represents the computed style data for an element.
 *
 * The computed style data are stored in a set of reference counted structs
 * (see nsStyleStruct.h) that are stored directly on the ComputedStyle.
 *
 * Style structs are immutable once they have been produced, so when any change
 * is made that needs a restyle, we create a new ComputedStyle.
 *
 * ComputedStyles are reference counted. References are generally held by:
 *
 *  1. nsIFrame::mComputedStyle, for every frame
 *  2. Element::mServoData, for every element not inside a display:none subtree
 *  3. nsComputedDOMStyle, when created for elements in display:none subtrees
 *  4. media_queries::Device, which holds the initial value of every property
 */

class ComputedStyle {
  using Flag = StyleComputedValueFlags;

  const StyleComputedValueFlags& Flags() const { return mSource.flags; }

 public:
  explicit ComputedStyle(ServoComputedDataForgotten aComputedValues);

  // Returns the computed (not resolved) value of the given property.
  void GetComputedPropertyValue(NonCustomCSSPropertyId aId,
                                nsACString& aOut) const {
    Servo_GetComputedValue(this, aId, &aOut);
  }

  // Returns the computed typed value list of the given property.
  bool GetPropertyTypedValueList(const CSSPropertyId& aId,
                                 StylePropertyTypedValueList& aOut) const {
    return Servo_ComputedValues_GetPropertyTypedValueList(this, &aId, &aOut);
  }

  // Return the ComputedStyle whose style data should be used for the R,
  // G, and B components of color, background-color, and border-*-color
  // if RelevantLinkIsVisited().
  //
  // GetPseudo() and GetPseudoType() on this ComputedStyle return the
  // same as on |this|, and its depth in the tree (number of GetParent()
  // calls until null is returned) is the same as |this|, since its
  // parent is either |this|'s parent or |this|'s parent's
  // style-if-visited.
  //
  // Structs on this context should never be examined without also
  // examining the corresponding struct on |this|.  Doing so will likely
  // both (1) lead to a privacy leak and (2) lead to dynamic change bugs
  // related to the Peek code in ComputedStyle::CalcStyleDifference.
  const ComputedStyle* GetStyleIfVisited() const {
    return mSource.visited_style;
  }

  bool IsLazilyCascadedPseudoElement() const {
    return IsPseudoElement() &&
           !PseudoStyle::IsEagerlyCascadedInServo(GetPseudoType());
  }

  PseudoStyleType GetPseudoType() const { return mSource.pseudo_type; }

  bool IsPseudoElement() const {
    return PseudoStyle::IsPseudoElement(GetPseudoType());
  }

  bool IsInheritingAnonBox() const {
    return PseudoStyle::IsInheritingAnonBox(GetPseudoType());
  }

  bool IsNonInheritingAnonBox() const {
    return PseudoStyle::IsNonInheritingAnonBox(GetPseudoType());
  }

  bool IsWrapperAnonBox() const {
    return PseudoStyle::IsWrapperAnonBox(GetPseudoType());
  }

  bool IsAnonBox() const { return PseudoStyle::IsAnonBox(GetPseudoType()); }

  bool IsPseudoOrAnonBox() const {
    return GetPseudoType() != PseudoStyleType::NotPseudo;
  }

  // Whether there are author-specified rules for border or background
  // properties.
  // Only returns something meaningful if the appearance property is not `none`.
  bool HasAuthorSpecifiedBorderOrBackground() const {
    return bool(Flags() & Flag::HAS_AUTHOR_SPECIFIED_BORDER_BACKGROUND);
  }

  // Whether there are author-specific rules for text `color`.
  bool HasAuthorSpecifiedTextColor() const {
    return bool(Flags() & Flag::HAS_AUTHOR_SPECIFIED_TEXT_COLOR);
  }

  // Whether there are author-specific rules for text-shadow.
  bool HasAuthorSpecifiedTextShadow() const {
    return bool(Flags() & Flag::HAS_AUTHOR_SPECIFIED_TEXT_SHADOW);
  }

  // Does this ComputedStyle or any of its ancestors have text
  // decoration lines?
  // Differs from nsStyleTextReset::HasTextDecorationLines, which tests
  // only the data for a single context.
  bool HasTextDecorationLines() const {
    return bool(Flags() & Flag::HAS_TEXT_DECORATION_LINES);
  }

  // Whether any line break inside should be suppressed? If this returns
  // true, the line should not be broken inside, which means inlines act
  // as if nowrap is set, <br> is suppressed, and blocks are inlinized.
  // This bit is propogated to all children of line partitipants. It is
  // currently used by ruby to make its content frames unbreakable.
  // NOTE: for nsTextFrame, use nsTextFrame::ShouldSuppressLineBreak()
  // instead of this method.
  bool ShouldSuppressLineBreak() const {
    return bool(Flags() & Flag::SHOULD_SUPPRESS_LINEBREAK);
  }

  // Is this horizontal-in-vertical (tate-chu-yoko) text? This flag is
  // only set on ComputedStyles whose pseudo is nsCSSAnonBoxes::mozText().
  bool IsTextCombined() const { return bool(Flags() & Flag::IS_TEXT_COMBINED); }

  // Whether there's any font metric dependency coming directly from our style.
  bool DependsOnSelfFontMetrics() const {
    return bool(Flags() & Flag::DEPENDS_ON_SELF_FONT_METRICS);
  }

  // Whether there's any font metric dependency coming directly from our parent
  // style.
  bool DependsOnInheritedFontMetrics() const {
    return bool(Flags() & Flag::DEPENDS_ON_INHERITED_FONT_METRICS);
  }

  // Whether this style is inside a ::first-line.
  bool IsInFirstLineSubtree() const {
    return bool(Flags() & Flag::IS_IN_FIRST_LINE_SUBTREE);
  }

  bool SelfOrAncestorHasContainStyle() const {
    return bool(Flags() & Flag::SELF_OR_ANCESTOR_HAS_CONTAIN_STYLE);
  }

  // Whether the style uses container query units (cqw, cqh, etc.).
  bool UsesContainerUnits() const {
    return bool(Flags() & Flag::USES_CONTAINER_UNITS);
  }

  // Whether the style uses viewport units (vw, vh, etc.).
  bool UsesViewportUnits() const {
    return bool(Flags() & Flag::USES_VIEWPORT_UNITS);
  }

  // Appends all cached lazy pseudo-element styles to the given array.
  void GetCachedLazyPseudoStyles(nsTArray<const ComputedStyle*>& aArray) const {
    mCachedInheritingStyles.AppendTo(aArray);
  }

  template <typename Func>
  void ForEachCachedLazyPseudoEntry(Func&& aFunc) const;

  // Is the only link whose visitedness is allowed to influence the
  // style of the node this ComputedStyle is for (which is that element
  // or its nearest ancestor that is a link) visited?
  bool RelevantLinkVisited() const {
    return bool(Flags() & Flag::IS_RELEVANT_LINK_VISITED);
  }

  // Whether this style is for the root element of the document.
  bool IsRootElementStyle() const {
    return bool(Flags() & Flag::IS_ROOT_ELEMENT_STYLE);
  }

  bool IsInOpacityZeroSubtree() const {
    return bool(Flags() & Flag::IS_IN_OPACITY_ZERO_SUBTREE);
  }

  bool HasAuthorSpecifiedGridAutoFlow() const {
    return bool(Flags() & Flag::HAS_AUTHOR_SPECIFIED_GRID_AUTO_FLOW);
  }

  bool HasAnchorPosReference() const;

  bool HasAttrReferences() const {
    return !!mSource.attribute_references.mUsedAttributes;
  }

  bool MaybeAnchorPosReferencesDiffer(const ComputedStyle* aOther) const;

  ComputedStyle* GetCachedInheritingAnonBoxStyle(
      PseudoStyleType aPseudoType) const {
    MOZ_ASSERT(PseudoStyle::IsInheritingAnonBox(aPseudoType));
    return mCachedInheritingStyles.Lookup(PseudoStyleRequest(aPseudoType));
  }

  void SetCachedInheritedAnonBoxStyle(ComputedStyle* aStyle) {
    mCachedInheritingStyles.Insert(aStyle, aStyle->GetPseudoType());
  }

  ComputedStyle* GetCachedLazyPseudoStyle(const PseudoStyleRequest&) const;

  // aStyle may be null to record a probe that returned no matching rules.
  void SetCachedLazyPseudoStyle(ComputedStyle* aStyle, PseudoStyleType aType,
                                nsAtom* aFunctionalPseudoParameter) {
    MOZ_ASSERT_IF(aStyle, aStyle->IsPseudoElement());
    MOZ_ASSERT_IF(aStyle, aStyle->GetPseudoType() == aType);
    // If a null entry was already cached for this pseudo (from a prior probe),
    // avoid re-inserting. Lookup() returns nullptr for both "not cached" and
    // "cached as null", so we need HasEntry() to distinguish them.
    if (!aStyle &&
        mCachedInheritingStyles.HasEntry({aType, aFunctionalPseudoParameter})) {
      return;
    }
    MOZ_ASSERT(!GetCachedLazyPseudoStyle({aType, aFunctionalPseudoParameter}));

    // Since we're caching lazy pseudo styles on the ComputedValues of the
    // originating element, we can assume that we either have the same
    // originating element, or that they were at least similar enough to share
    // the same ComputedValues, which means that they would match the same
    // pseudo rules. This allows us to avoid matching selectors and checking
    // the rule node before deciding to share.
    //
    // The one place this optimization breaks is with pseudo-elements that
    // support state (like :hover). So we just avoid sharing in those cases.
    if (PseudoStyle::SupportsUserActionState(aType)) {
      return;
    }

    mCachedInheritingStyles.Insert(aStyle, aType, aFunctionalPseudoParameter);
  }

#define GENERATE_ACCESSOR(name_)                                         \
  inline const nsStyle##name_* Style##name_() const MOZ_NONNULL_RETURN { \
    return mSource.Style##name_();                                       \
  }
  FOR_EACH_STYLE_STRUCT(GENERATE_ACCESSOR, GENERATE_ACCESSOR)
#undef GENERATE_ACCESSOR

  inline mozilla::StylePointerEvents PointerEvents() const;
  inline mozilla::StyleUserSelect UserSelect() const;

  /**
   * Returns whether the element is a containing block for its absolutely
   * positioned descendants.
   * aContextFrame is the frame for which this is the style (or an old style).
   */
  inline bool IsAbsPosContainingBlock(const nsIFrame*) const;

  /**
   * Returns true when the element is a containing block for its fixed-pos
   * descendants.
   * aContextFrame is the frame for which this is the style (or an old style).
   */
  inline bool IsFixedPosContainingBlock(const nsIFrame*) const;

  /**
   * Tests for only the sub-parts of IsFixedPosContainingBlock that apply to:
   *  - nearly all frames, except those that are in SVG text subtrees.
   *  - frames that support CSS contain:layout and contain:paint and are not
   *    in SVG text subtrees.
   *  - frames that support CSS transforms and are not in SVG text subtrees.
   *
   * This should be used only when the caller has the style but not the
   * frame (i.e., when calculating style changes).
   */
  inline bool IsFixedPosContainingBlockForNonSVGTextFrames() const;

  /**
   * Compute the style changes needed during restyling when this style
   * context is being replaced by aNewContext.  (This is nonsymmetric since
   * we optimize by skipping comparison for styles that have never been
   * requested.)
   *
   * This method returns a change hint (see nsChangeHint.h).  All change
   * hints apply to the frame and its later continuations or ib-split
   * siblings.  Most (all of those except the "NotHandledForDescendants"
   * hints) also apply to all descendants.
   *
   * aEqualStructs must not be null.  Into it will be stored a bitfield
   * representing which structs were compared to be non-equal.
   *
   * CSS Variables are not compared here. Instead, the caller is responsible for
   * that when needed (basically only for elements).
   */
  nsChangeHint CalcStyleDifference(const ComputedStyle& aNewContext,
                                   uint32_t* aEqualStructs) const;

#ifdef DEBUG
  bool EqualForCachedAnonymousContentStyle(const ComputedStyle&) const;
#endif

#ifdef DEBUG
  void DumpMatchedRules() const;
#endif

  /**
   * Get a color that depends on link-visitedness using this and
   * this->GetStyleIfVisited().
   *
   * @param aField A pointer to a member variable in a style struct.
   *               The member variable and its style struct must have
   *               been listed in nsCSSVisitedDependentPropList.h.
   */
  template <typename T, typename S>
  nscolor GetVisitedDependentColor(T S::* aField) const;

  /**
   * aColors should be a two element array of nscolor in which the first
   * color is the unvisited color and the second is the visited color.
   *
   * Combine the R, G, and B components of whichever of aColors should
   * be used based on aLinkIsVisited with the A component of aColors[0].
   */
  static nscolor CombineVisitedColors(nscolor* aColors, bool aLinkIsVisited);

  /**
   * Start image loads for this style.
   *
   * The Document is used to get a hand on the image loader. The old style is a
   * hack for bug 1439285.
   */
  inline void StartImageLoads(dom::Document&,
                              const ComputedStyle* aOldStyle = nullptr);

#ifdef DEBUG
  void List(FILE* out, int32_t aIndent);
  static const char* StructName(StyleStructID aSID);
  static Maybe<StyleStructID> LookupStruct(const nsACString& aName);
#endif

  // The |aCVsSize| outparam on this function is where the actual CVs size
  // value is added. It's done that way because the callers know which value
  // the size should be added to.
  void AddSizeOfIncludingThis(nsWindowSizes& aSizes, size_t* aCVsSize) const;

  StyleWritingMode WritingMode() const { return {mSource.WritingMode().mBits}; }

  const StyleZoom& EffectiveZoom() const { return mSource.effective_zoom; }

 protected:
  // Needs to be friend so that it can call the destructor without making it
  // public.
  friend void ::Gecko_ComputedStyle_Destroy(ComputedStyle*);

  ~ComputedStyle() = default;

  ServoComputedData mSource;

  // A cache of anonymous box and lazy pseudo styles inheriting from this style.
  // For functional pseudo-elements like ::highlight(name), the functional
  // parameter is stored alongside the style in the cache.
  CachedInheritingStyles mCachedInheritingStyles;
};

}  // namespace mozilla

#endif

/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Implementation of the DOM Range object.
 */

#ifndef nsRange_h___
#define nsRange_h___

#include "nsCOMPtr.h"
#include "mozilla/dom/AbstractRange.h"
#include "mozilla/dom/StaticRange.h"
#include "mozilla/dom/CrossShadowBoundaryRange.h"
#include "prmon.h"
#include "nsStubMutationObserver.h"
#include "nsWrapperCache.h"
#include "mozilla/Attributes.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/RangeBoundary.h"
#include "mozilla/RefPtr.h"

namespace mozilla {
class RectCallback;
namespace dom {
struct ClientRectsAndTexts;
class DocGroup;
class DocumentFragment;
class DOMRect;
class DOMRectList;
class InspectorFontFace;
class Selection;

enum class RangeBehaviour : uint8_t {
  // Keep both ranges
  KeepDefaultRangeAndCrossShadowBoundaryRanges,
  // Merge both ranges; This is the case where the range boundaries was in
  // different roots initially, and becoming in the same roots now. Since
  // they start to be in the same root, using normal range is good enough
  // to represent it
  MergeDefaultRangeAndCrossShadowBoundaryRanges,
  // Collapse the default range
  CollapseDefaultRange,
  // Collapse both the default range and the cross-shadow-boundary range
  CollapseDefaultRangeAndCrossShadowBoundaryRanges

};
}  // namespace dom
}  // namespace mozilla

class nsRange final : public mozilla::dom::AbstractRange,
                      public nsStubMutationObserver {
  using ErrorResult = mozilla::ErrorResult;
  using AbstractRange = mozilla::dom::AbstractRange;
  using DocGroup = mozilla::dom::DocGroup;
  using DOMRect = mozilla::dom::DOMRect;
  using DOMRectList = mozilla::dom::DOMRectList;
  using RangeBoundary = mozilla::RangeBoundary;
  using RawRangeBoundary = mozilla::RawRangeBoundary;
  using AllowRangeCrossShadowBoundary =
      mozilla::dom::AllowRangeCrossShadowBoundary;

  virtual ~nsRange();
  explicit nsRange(nsINode* aNode);

 public:
  /**
   * The following Create() returns `nsRange` instance which is initialized
   * only with aNode.  The result is never positioned.
   */
  static already_AddRefed<nsRange> Create(nsINode* aNode);

  /**
   * The following Create() may return `nsRange` instance which is initialized
   * with given range or points.  If it fails initializing new range with the
   * arguments, returns `nullptr`.  `ErrorResult` is set to an error only
   * when this returns `nullptr`.  The error code indicates the reason why
   * it couldn't initialize the instance.
   */
  static already_AddRefed<nsRange> Create(const AbstractRange* aAbstractRange,
                                          ErrorResult& aRv) {
    return nsRange::Create(aAbstractRange->StartRef(), aAbstractRange->EndRef(),
                           aRv);
  }
  static already_AddRefed<nsRange> Create(nsINode* aStartContainer,
                                          uint32_t aStartOffset,
                                          nsINode* aEndContainer,
                                          uint32_t aEndOffset,
                                          ErrorResult& aRv) {
    return nsRange::Create(RawRangeBoundary(aStartContainer, aStartOffset),
                           RawRangeBoundary(aEndContainer, aEndOffset), aRv);
  }
  template <typename SPT, typename SRT, typename EPT, typename ERT>
  static already_AddRefed<nsRange> Create(
      const mozilla::RangeBoundaryBase<SPT, SRT>& aStartBoundary,
      const mozilla::RangeBoundaryBase<EPT, ERT>& aEndBoundary,
      ErrorResult& aRv);

  NS_DECL_ISUPPORTS_INHERITED
  NS_IMETHODIMP_(void) DeleteCycleCollectable(void) override;
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(nsRange, AbstractRange)

  nsrefcnt GetRefCount() const { return mRefCnt; }

  nsINode* GetRoot() const { return mRoot; }

  /**
   * Return true if this range was generated.
   * @see SetIsGenerated
   */
  bool IsGenerated() const { return mIsGenerated; }

  /**
   * Mark this range as being generated or not.
   * Currently it is used for marking ranges that are created when splitting up
   * a range to exclude a -moz-user-select:none region.
   * @see Selection::AddRangesForSelectableNodes
   * @see ExcludeNonSelectableNodes
   */
  void SetIsGenerated(bool aIsGenerated) { mIsGenerated = aIsGenerated; }

  void Reset();

  /**
   * SetStart() and SetEnd() sets start point or end point separately.
   * However, this is expensive especially when it's a range of Selection.
   * When you set both start and end of a range, you should use
   * SetStartAndEnd() instead.
   */
  nsresult SetStart(nsINode* aContainer, uint32_t aOffset,
                    AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                        AllowRangeCrossShadowBoundary::No) {
    ErrorResult error;
    SetStart(RawRangeBoundary(aContainer, aOffset), error,
             aAllowCrossShadowBoundary);
    return error.StealNSResult();
  }
  nsresult SetEnd(nsINode* aContainer, uint32_t aOffset,
                  AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                      AllowRangeCrossShadowBoundary::No) {
    ErrorResult error;
    SetEnd(RawRangeBoundary(aContainer, aOffset), error,
           aAllowCrossShadowBoundary);
    return error.StealNSResult();
  }

  already_AddRefed<nsRange> CloneRange() const;

  /**
   * SetStartAndEnd() works similar to call both SetStart() and SetEnd().
   * Different from calls them separately, this does nothing if either
   * the start point or the end point is invalid point.
   * If the specified start point is after the end point, the range will be
   * collapsed at the end point.  Similarly, if they are in different root,
   * the range will be collapsed at the end point.
   */
  nsresult SetStartAndEnd(nsINode* aStartContainer, uint32_t aStartOffset,
                          nsINode* aEndContainer, uint32_t aEndOffset) {
    return SetStartAndEnd(RawRangeBoundary(aStartContainer, aStartOffset),
                          RawRangeBoundary(aEndContainer, aEndOffset));
  }
  template <typename SPT, typename SRT, typename EPT, typename ERT>
  nsresult SetStartAndEnd(
      const mozilla::RangeBoundaryBase<SPT, SRT>& aStartBoundary,
      const mozilla::RangeBoundaryBase<EPT, ERT>& aEndBoundary) {
    return AbstractRange::SetStartAndEndInternal(aStartBoundary, aEndBoundary,
                                                 this);
  }

  /**
   * Adds all nodes between |aStartContent| and |aEndContent| to the range.
   * The start offset will be set before |aStartContent|,
   * while the end offset will be set immediately after |aEndContent|.
   *
   * Caller must guarantee both nodes are non null and
   * children of |aContainer| and that |aEndContent| is after |aStartContent|.
   */
  void SelectNodesInContainer(nsINode* aContainer, nsIContent* aStartContent,
                              nsIContent* aEndContent);

  /**
   * CollapseTo() works similar to call both SetStart() and SetEnd() with
   * same node and offset.  This just calls SetStartAndParent() to set
   * collapsed range at aContainer and aOffset.
   */
  nsresult CollapseTo(nsINode* aContainer, uint32_t aOffset) {
    return CollapseTo(RawRangeBoundary(aContainer, aOffset));
  }
  nsresult CollapseTo(const RawRangeBoundary& aPoint) {
    return SetStartAndEnd(aPoint, aPoint);
  }

  // aMaxRanges is the maximum number of text ranges to record for each face
  // (pass 0 to just get the list of faces, without recording exact ranges
  // where each face was used).
  nsresult GetUsedFontFaces(
      nsTArray<mozilla::UniquePtr<mozilla::dom::InspectorFontFace>>& aResult,
      uint32_t aMaxRanges, bool aSkipCollapsedWhitespace);

  // nsIMutationObserver methods
  NS_DECL_NSIMUTATIONOBSERVER_CHARACTERDATACHANGED
  NS_DECL_NSIMUTATIONOBSERVER_CONTENTINSERTED
  NS_DECL_NSIMUTATIONOBSERVER_CONTENTREMOVED
  NS_DECL_NSIMUTATIONOBSERVER_PARENTCHAINCHANGED
  NS_DECL_NSIMUTATIONOBSERVER_CONTENTAPPENDED

  // WebIDL
  static already_AddRefed<nsRange> Constructor(
      const mozilla::dom::GlobalObject& global, mozilla::ErrorResult& aRv);

  already_AddRefed<mozilla::dom::DocumentFragment> CreateContextualFragment(
      const nsAString& aString, ErrorResult& aError) const;
  already_AddRefed<mozilla::dom::DocumentFragment> CloneContents(
      ErrorResult& aErr);
  int16_t CompareBoundaryPoints(uint16_t aHow, const nsRange& aOtherRange,
                                ErrorResult& aRv);
  int16_t ComparePoint(const nsINode& aContainer, uint32_t aOffset,
                       ErrorResult& aRv,
                       bool aAllowCrossShadowBoundary = false) const;
  void DeleteContents(ErrorResult& aRv);
  already_AddRefed<mozilla::dom::DocumentFragment> ExtractContents(
      ErrorResult& aErr);
  nsINode* GetCommonAncestorContainer(ErrorResult& aRv) const {
    if (!mIsPositioned) {
      aRv.Throw(NS_ERROR_NOT_INITIALIZED);
      return nullptr;
    }
    return GetClosestCommonInclusiveAncestor();
  }
  void InsertNode(nsINode& aNode, ErrorResult& aErr);
  bool IntersectsNode(nsINode& aNode, ErrorResult& aRv);
  bool IsPointInRange(const nsINode& aContainer, uint32_t aOffset,
                      ErrorResult& aRv,
                      bool aAllowCrossShadowBoundary = false) const;
  void ToString(nsAString& aReturn, ErrorResult& aErr);
  void Detach();

  // *JS() methods are mapped to Range.*() of DOM.
  // They may move focus only when the range represents normal selection.
  // These methods shouldn't be used from internal.
  void CollapseJS(bool aToStart);
  void SelectNodeJS(nsINode& aNode, ErrorResult& aErr);
  void SelectNodeContentsJS(nsINode& aNode, ErrorResult& aErr);
  void SetEndJS(nsINode& aNode, uint32_t aOffset, ErrorResult& aErr);
  void SetEndAfterJS(nsINode& aNode, ErrorResult& aErr);
  void SetEndBeforeJS(nsINode& aNode, ErrorResult& aErr);
  void SetStartJS(nsINode& aNode, uint32_t aOffset, ErrorResult& aErr);
  void SetStartAfterJS(nsINode& aNode, ErrorResult& aErr);
  void SetStartBeforeJS(nsINode& aNode, ErrorResult& aErr);

  void SetStartAllowCrossShadowBoundary(nsINode& aNode, uint32_t aOffset,
                                        ErrorResult& aErr);
  void SetEndAllowCrossShadowBoundary(nsINode& aNode, uint32_t aOffset,
                                      ErrorResult& aErr);

  void SurroundContents(nsINode& aNode, ErrorResult& aErr);
  already_AddRefed<DOMRect> GetBoundingClientRect(bool aClampToEdge = true,
                                                  bool aFlushLayout = true);
  already_AddRefed<DOMRectList> GetClientRects(bool aClampToEdge = true,
                                               bool aFlushLayout = true);
  void GetClientRectsAndTexts(mozilla::dom::ClientRectsAndTexts& aResult,
                              ErrorResult& aErr);

  // Following methods should be used for internal use instead of *JS().
  void SelectNode(nsINode& aNode, ErrorResult& aErr);
  void SelectNodeContents(nsINode& aNode, ErrorResult& aErr);
  void SetEnd(nsINode& aNode, uint32_t aOffset, ErrorResult& aErr,
              AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                  AllowRangeCrossShadowBoundary::No);
  void SetEnd(const RawRangeBoundary& aPoint, ErrorResult& aErr,
              AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                  AllowRangeCrossShadowBoundary::No);
  void SetEndAfter(nsINode& aNode, ErrorResult& aErr);
  void SetEndBefore(nsINode& aNode, ErrorResult& aErr,
                    AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                        AllowRangeCrossShadowBoundary::No);
  void SetStart(nsINode& aNode, uint32_t aOffset, ErrorResult& aErr,
                AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                    AllowRangeCrossShadowBoundary::No);
  void SetStart(const RawRangeBoundary& aPoint, ErrorResult& aErr,
                AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                    AllowRangeCrossShadowBoundary::No);
  void SetStartAfter(nsINode& aNode, ErrorResult& aErr);
  void SetStartBefore(nsINode& aNode, ErrorResult& aErr,
                      AllowRangeCrossShadowBoundary aAllowCrossShadowBoundary =
                          AllowRangeCrossShadowBoundary::No);
  void Collapse(bool aToStart);

  static void GetInnerTextNoFlush(mozilla::dom::DOMString& aValue,
                                  mozilla::ErrorResult& aError,
                                  nsIContent* aContainer);

  virtual JSObject* WrapObject(JSContext* cx,
                               JS::Handle<JSObject*> aGivenProto) final;
  DocGroup* GetDocGroup() const;

 private:
  // no copy's or assigns
  nsRange(const nsRange&);
  nsRange& operator=(const nsRange&);

  template <typename SPT, typename SRT, typename EPT, typename ERT>
  static void AssertIfMismatchRootAndRangeBoundaries(
      const mozilla::RangeBoundaryBase<SPT, SRT>& aStartBoundary,
      const mozilla::RangeBoundaryBase<EPT, ERT>& aEndBoundary,
      const nsINode* aRootNode, bool aNotInsertedYet = false);

  /**
   * Cut or delete the range's contents.
   *
   * @param aFragment DocumentFragment containing the nodes.
   *                  May be null to indicate the caller doesn't want a
   *                  fragment.
   * @param aRv The error if any.
   */
  void CutContents(mozilla::dom::DocumentFragment** aFragment,
                   ErrorResult& aRv);

  static nsresult CloneParentsBetween(nsINode* aAncestor, nsINode* aNode,
                                      nsINode** aClosestAncestor,
                                      nsINode** aFarthestAncestor);

  /**
   * Returns whether a node is safe to be accessed by the current caller.
   */
  bool CanAccess(const nsINode&) const;

  void AdjustNextRefsOnCharacterDataSplit(const nsIContent& aContent,
                                          const CharacterDataChangeInfo& aInfo);

  struct RangeBoundariesAndRoot {
    RawRangeBoundary mStart;
    RawRangeBoundary mEnd;
    nsINode* mRoot = nullptr;
  };

  /**
   * @param aContent Must be non-nullptr.
   */
  RangeBoundariesAndRoot DetermineNewRangeBoundariesAndRootOnCharacterDataMerge(
      nsIContent* aContent, const CharacterDataChangeInfo& aInfo) const;

  // @return true iff the range is positioned, aContainer belongs to the same
  //         document as the range, aContainer is a DOCUMENT_TYPE_NODE and
  //         aOffset doesn't exceed aContainer's length.
  bool IsPointComparableToRange(const nsINode& aContainer, uint32_t aOffset,
                                bool aAllowCrossShadowBoundary,
                                ErrorResult& aErrorResult) const;

  // @return true iff aContainer is a shadow including inclusive descendant of
  // the common ancestor of the mCrossBoundaryRange.
  bool IsShadowIncludingInclusiveDescendantOfCrossBoundaryRangeAncestor(
      const nsINode& aContainer) const;

  /**
   * @brief Returns true if the range is part of exactly one |Selection|.
   */
  bool IsPartOfOneSelectionOnly() const { return mSelections.Length() == 1; };

 public:
  /**
   * This helper function gets rects and correlated text for the given range.
   * @param aTextList optional where nullptr = don't retrieve text
   */
  static void CollectClientRectsAndText(
      mozilla::RectCallback* aCollector,
      mozilla::dom::Sequence<nsString>* aTextList, nsRange* aRange,
      nsINode* aStartContainer, uint32_t aStartOffset, nsINode* aEndContainer,
      uint32_t aEndOffset, bool aClampToEdge, bool aFlushLayout);

  /**
   * Scan this range for -moz-user-select:none nodes and split it up into
   * multiple ranges to exclude those nodes.  The resulting ranges are put
   * in aOutRanges.  If no -moz-user-select:none node is found in the range
   * then |this| is unmodified and is the only range in aOutRanges.
   * Otherwise, |this| will be modified so that it ends before the first
   * -moz-user-select:none node and additional ranges may also be created.
   * If all nodes in the range are -moz-user-select:none then aOutRanges
   * will be empty.
   * @param aOutRanges the resulting set of ranges
   */
  void ExcludeNonSelectableNodes(nsTArray<RefPtr<nsRange>>* aOutRanges);

  /**
   * Notify the selection listeners after a range has been modified.
   */
  MOZ_CAN_RUN_SCRIPT void NotifySelectionListenersAfterRangeSet();

  /**
   * For a range for which IsInSelection() is true, return the closest common
   * inclusive ancestor
   * (https://dom.spec.whatwg.org/#concept-tree-inclusive-ancestor)
   * for the range, which we had to compute when the common ancestor changed or
   * IsInSelection became true, so we could register with it. That is, it's a
   * faster version of GetClosestCommonInclusiveAncestor that only works for
   * ranges in a Selection. The method will assert and the behavior is undefined
   * if called on a range where IsInSelection() is false.
   */
  nsINode* GetRegisteredClosestCommonInclusiveAncestor();

  template <typename SPT, typename SRT, typename EPT, typename ERT>
  void CreateOrUpdateCrossShadowBoundaryRangeIfNeeded(
      const mozilla::RangeBoundaryBase<SPT, SRT>& aStartBoundary,
      const mozilla::RangeBoundaryBase<EPT, ERT>& aEndBoundary);

  void ResetCrossShadowBoundaryRange() { mCrossShadowBoundaryRange = nullptr; }

#ifdef DEBUG
  bool CrossShadowBoundaryRangeCollapsed() const {
    MOZ_ASSERT(mCrossShadowBoundaryRange);

    return !mCrossShadowBoundaryRange->IsPositioned() ||
           (mCrossShadowBoundaryRange->GetStartContainer() ==
                mCrossShadowBoundaryRange->GetEndContainer() &&
            mCrossShadowBoundaryRange->StartOffset() ==
                mCrossShadowBoundaryRange->EndOffset());
  }
#endif

  /*
   * The methods marked with MayCrossShadowBoundary[..] additionally check for
   * the existence of mCrossShadowBoundaryRange, which indicates a range that
   * crosses a shadow DOM boundary (i.e. mStart and mEnd are in different
   * trees). If the caller can guarantee that this does not happen, there are
   * additional variants of these methods named without MayCrossShadowBoundary,
   * which provide a slightly faster implementation.
   * */

  nsIContent* GetMayCrossShadowBoundaryChildAtStartOffset() const {
    return mCrossShadowBoundaryRange
               ? mCrossShadowBoundaryRange->GetChildAtStartOffset()
               : mStart.GetChildAtOffset();
  }

  nsIContent* GetMayCrossShadowBoundaryChildAtEndOffset() const {
    return mCrossShadowBoundaryRange
               ? mCrossShadowBoundaryRange->GetChildAtEndOffset()
               : mEnd.GetChildAtOffset();
  }

  mozilla::dom::CrossShadowBoundaryRange* GetCrossShadowBoundaryRange() const {
    return mCrossShadowBoundaryRange;
  }

  nsINode* GetMayCrossShadowBoundaryStartContainer() const {
    return mCrossShadowBoundaryRange
               ? mCrossShadowBoundaryRange->GetStartContainer()
               : mStart.Container();
  }

  nsINode* GetMayCrossShadowBoundaryEndContainer() const {
    return mCrossShadowBoundaryRange
               ? mCrossShadowBoundaryRange->GetEndContainer()
               : mEnd.Container();
  }

  uint32_t MayCrossShadowBoundaryStartOffset() const {
    return mCrossShadowBoundaryRange ? mCrossShadowBoundaryRange->StartOffset()
                                     : StartOffset();
  }

  uint32_t MayCrossShadowBoundaryEndOffset() const {
    return mCrossShadowBoundaryRange ? mCrossShadowBoundaryRange->EndOffset()
                                     : EndOffset();
  }

  const RangeBoundary& MayCrossShadowBoundaryStartRef() const {
    return mCrossShadowBoundaryRange ? mCrossShadowBoundaryRange->StartRef()
                                     : StartRef();
  }

  const RangeBoundary& MayCrossShadowBoundaryEndRef() const {
    return mCrossShadowBoundaryRange ? mCrossShadowBoundaryRange->EndRef()
                                     : EndRef();
  }

 protected:
  /**
   * DoSetRange() is called when `AbstractRange::SetStartAndEndInternal()` sets
   * mStart and mEnd, or some other internal methods modify `mStart` and/or
   * `mEnd`.  Therefore, this shouldn't be a virtual method.
   *
   * @param aStartBoundary      Computed start point.  This must equals or be
   *                            before aEndBoundary in the DOM tree order.
   * @param aEndBoundary        Computed end point.
   * @param aRootNode           The root node.
   * @param aNotInsertedYet     true if this is called by CharacterDataChanged()
   *                            to disable assertion and suppress re-registering
   *                            a range common ancestor node since the new text
   *                            node of a splitText hasn't been inserted yet.
   *                            CharacterDataChanged() does the re-registering
   *                            when needed.  Otherwise, false.
   */
  template <typename SPT, typename SRT, typename EPT, typename ERT>
  MOZ_CAN_RUN_SCRIPT_BOUNDARY void DoSetRange(
      const mozilla::RangeBoundaryBase<SPT, SRT>& aStartBoundary,
      const mozilla::RangeBoundaryBase<EPT, ERT>& aEndBoundary,
      nsINode* aRootNode, bool aNotInsertedYet = false,
      mozilla::dom::RangeBehaviour aRangeBehaviour = mozilla::dom::
          RangeBehaviour::CollapseDefaultRangeAndCrossShadowBoundaryRanges);

  // Assume that this is guaranteed that this is held by the caller when
  // this is used.  (Note that we cannot use AutoRestore for mCalledByJS
  // due to a bit field.)
  class MOZ_RAII AutoCalledByJSRestore final {
   private:
    nsRange& mRange;
    bool mOldValue;

   public:
    explicit AutoCalledByJSRestore(nsRange& aRange)
        : mRange(aRange), mOldValue(aRange.mCalledByJS) {}
    ~AutoCalledByJSRestore() { mRange.mCalledByJS = mOldValue; }
    bool SavedValue() const { return mOldValue; }
  };

  struct MOZ_STACK_CLASS AutoInvalidateSelection {
    explicit AutoInvalidateSelection(nsRange* aRange) : mRange(aRange) {
      if (!mRange->IsInAnySelection() || sIsNested) {
        return;
      }
      sIsNested = true;
      mCommonAncestor = mRange->GetRegisteredClosestCommonInclusiveAncestor();
    }
    ~AutoInvalidateSelection();
    nsRange* mRange;
    RefPtr<nsINode> mCommonAncestor;
    static bool sIsNested;
  };

  bool MaybeInterruptLastRelease();

#ifdef DEBUG
  bool IsCleared() const {
    return !mRoot && !mRegisteredClosestCommonInclusiveAncestor &&
           mSelections.IsEmpty() && !mNextStartRef && !mNextEndRef;
  }
#endif  // #ifdef DEBUG

  nsCOMPtr<nsINode> mRoot;

  // These raw pointers are used to remember a child that is about
  // to be inserted between a CharacterData call and a subsequent
  // ContentInserted or ContentAppended call. It is safe to store
  // these refs because the caller is guaranteed to trigger both
  // notifications while holding a strong reference to the new child.
  nsIContent* MOZ_NON_OWNING_REF mNextStartRef;
  nsIContent* MOZ_NON_OWNING_REF mNextEndRef;

  static nsTArray<RefPtr<nsRange>>* sCachedRanges;

  // Used to keep track of the real start and end for a
  // selection where the start and the end are in different trees.
  // It's NULL when the nodes are in the same tree.
  //
  // mCrossShadowBoundaryRange doesn't deal with DOM mutations, because
  // it's still an open question about how it should be handled.
  // Spec: https://github.com/w3c/selection-api/issues/168.
  // As a result, it'll be set to NULL if that happens.
  //
  // Theoretically, mCrossShadowBoundaryRange isn't really needed because
  // we should be able to always store the real start and end, and
  // just return one point when a collapse is needed.
  // Bug https://bugzilla.mozilla.org/show_bug.cgi?id=1886028 is going
  // to be used to improve mCrossShadowBoundaryRange.
  RefPtr<mozilla::dom::CrossShadowBoundaryRange> mCrossShadowBoundaryRange;

  friend class mozilla::dom::AbstractRange;
};
namespace mozilla::dom {
inline nsRange* AbstractRange::AsDynamicRange() {
  MOZ_ASSERT(IsDynamicRange());
  return static_cast<nsRange*>(this);
}
inline const nsRange* AbstractRange::AsDynamicRange() const {
  MOZ_ASSERT(IsDynamicRange());
  return static_cast<const nsRange*>(this);
}
}  // namespace mozilla::dom
#endif /* nsRange_h___ */

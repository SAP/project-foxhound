/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "HTMLEditor.h"
#include "HTMLEditorNestedClasses.h"

#include <algorithm>
#include <utility>

#include "AutoRangeArray.h"
#include "CSSEditUtils.h"
#include "EditAction.h"
#include "EditorDOMPoint.h"
#include "EditorUtils.h"
#include "HTMLEditHelpers.h"
#include "HTMLEditorInlines.h"
#include "HTMLEditUtils.h"
#include "WSRunObject.h"

#include "ErrorList.h"
#include "js/ErrorReport.h"
#include "mozilla/Assertions.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/ComputedStyle.h"  // for ComputedStyle
#include "mozilla/ContentIterator.h"
#include "mozilla/EditorDOMPoint.h"
#include "mozilla/EditorForwards.h"
#include "mozilla/InternalMutationEvent.h"
#include "mozilla/Logging.h"
#include "mozilla/Maybe.h"
#include "mozilla/OwningNonNull.h"
#include "mozilla/SelectionState.h"
#include "mozilla/StaticPrefs_editor.h"  // for StaticPrefs::editor_*
#include "mozilla/Unused.h"
#include "mozilla/dom/AncestorIterator.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/HTMLBRElement.h"
#include "mozilla/dom/Selection.h"
#include "mozilla/mozalloc.h"
#include "nsAString.h"
#include "nsAtom.h"
#include "nsComputedDOMStyle.h"  // for nsComputedDOMStyle
#include "nsContentUtils.h"
#include "nsDebug.h"
#include "nsError.h"
#include "nsFrameSelection.h"
#include "nsGkAtoms.h"
#include "nsIContent.h"
#include "nsINode.h"
#include "nsRange.h"
#include "nsString.h"
#include "nsStringFwd.h"
#include "nsStyleConsts.h"  // for StyleWhiteSpace
#include "nsTArray.h"

// NOTE: This file was split from:
//   https://searchfox.org/mozilla-central/rev/c409dd9235c133ab41eba635f906aa16e050c197/editor/libeditor/HTMLEditSubActionHandler.cpp

namespace mozilla {

using namespace dom;
using EmptyCheckOption = HTMLEditUtils::EmptyCheckOption;
using InvisibleWhiteSpaces = HTMLEditUtils::InvisibleWhiteSpaces;
using LeafNodeType = HTMLEditUtils::LeafNodeType;
using ScanLineBreak = HTMLEditUtils::ScanLineBreak;
using TableBoundary = HTMLEditUtils::TableBoundary;
using WalkTreeOption = HTMLEditUtils::WalkTreeOption;

static LazyLogModule gOneLineMoverLog("AutoMoveOneLineHandler");

template Result<CaretPoint, nsresult>
HTMLEditor::DeleteTextAndTextNodesWithTransaction(
    const EditorDOMPoint& aStartPoint, const EditorDOMPoint& aEndPoint,
    TreatEmptyTextNodes aTreatEmptyTextNodes);
template Result<CaretPoint, nsresult>
HTMLEditor::DeleteTextAndTextNodesWithTransaction(
    const EditorDOMPointInText& aStartPoint,
    const EditorDOMPointInText& aEndPoint,
    TreatEmptyTextNodes aTreatEmptyTextNodes);

/*****************************************************************************
 * AutoSetTemporaryAncestorLimiter
 ****************************************************************************/

class MOZ_RAII AutoSetTemporaryAncestorLimiter final {
 public:
  AutoSetTemporaryAncestorLimiter(const HTMLEditor& aHTMLEditor,
                                  Selection& aSelection,
                                  nsINode& aStartPointNode,
                                  AutoRangeArray* aRanges = nullptr) {
    MOZ_ASSERT(aSelection.GetType() == SelectionType::eNormal);

    if (aSelection.GetAncestorLimiter()) {
      return;
    }

    Element* selectionRootElement =
        aHTMLEditor.FindSelectionRoot(aStartPointNode);
    if (!selectionRootElement) {
      return;
    }
    aHTMLEditor.InitializeSelectionAncestorLimit(*selectionRootElement);
    mSelection = &aSelection;
    // Setting ancestor limiter may change ranges which were outer of
    // the new limiter.  Therefore, we need to reinitialize aRanges.
    if (aRanges) {
      aRanges->Initialize(aSelection);
    }
  }

  ~AutoSetTemporaryAncestorLimiter() {
    if (mSelection) {
      mSelection->SetAncestorLimiter(nullptr);
    }
  }

 private:
  RefPtr<Selection> mSelection;
};

/*****************************************************************************
 * AutoDeleteRangesHandler
 ****************************************************************************/

class MOZ_STACK_CLASS HTMLEditor::AutoDeleteRangesHandler final {
 public:
  explicit AutoDeleteRangesHandler(
      const AutoDeleteRangesHandler* aParent = nullptr)
      : mParent(aParent),
        mOriginalDirectionAndAmount(nsIEditor::eNone),
        mOriginalStripWrappers(nsIEditor::eNoStrip) {}

  /**
   * ComputeRangesToDelete() computes actual deletion ranges.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult ComputeRangesToDelete(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete, const Element& aEditingHost);

  /**
   * Deletes content in or around aRangesToDelete.
   * NOTE: This method creates SelectionBatcher.  Therefore, each caller
   *       needs to check if the editor is still available even if this returns
   *       NS_OK.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, AutoRangeArray& aRangesToDelete,
      const Element& aEditingHost);

 private:
  [[nodiscard]] bool IsHandlingRecursively() const {
    return mParent != nullptr;
  }

  [[nodiscard]] bool CanFallbackToDeleteRangeWithTransaction(
      const nsRange& aRangeToDelete) const {
    return !IsHandlingRecursively() &&
           (!aRangeToDelete.Collapsed() ||
            EditorBase::HowToHandleCollapsedRangeFor(
                mOriginalDirectionAndAmount) !=
                EditorBase::HowToHandleCollapsedRange::Ignore);
  }

  [[nodiscard]] bool CanFallbackToDeleteRangesWithTransaction(
      const AutoRangeArray& aRangesToDelete) const {
    return !IsHandlingRecursively() && !aRangesToDelete.Ranges().IsEmpty() &&
           (!aRangesToDelete.IsCollapsed() ||
            EditorBase::HowToHandleCollapsedRangeFor(
                mOriginalDirectionAndAmount) !=
                EditorBase::HowToHandleCollapsedRange::Ignore);
  }

  /**
   * HandleDeleteAroundCollapsedRanges() handles deletion with collapsed
   * ranges.  Callers must guarantee that this is called only when
   * aRangesToDelete.IsCollapsed() returns true.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aStripWrappers      Must be eStrip or eNoStrip.
   * @param aRangesToDelete     Ranges to delete.  This `IsCollapsed()` must
   *                            return true.
   * @param aWSRunScannerAtCaret        Scanner instance which scanned from
   *                                    caret point.
   * @param aScanFromCaretPointResult   Scan result of aWSRunScannerAtCaret
   *                                    toward aDirectionAndAmount.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAroundCollapsedRanges(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, AutoRangeArray& aRangesToDelete,
      const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult,
      const Element& aEditingHost);
  nsresult ComputeRangesToDeleteAroundCollapsedRanges(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete, const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult,
      const Element& aEditingHost) const;

  /**
   * HandleDeleteNonCollapsedRanges() handles deletion with non-collapsed
   * ranges.  Callers must guarantee that this is called only when
   * aRangesToDelete.IsCollapsed() returns false.
   *
   * @param aDirectionAndAmount         Direction of the deletion.
   * @param aStripWrappers              Must be eStrip or eNoStrip.
   * @param aRangesToDelete             The ranges to delete.
   * @param aSelectionWasCollapsed      If the caller extended `Selection`
   *                                    from collapsed, set this to `Yes`.
   *                                    Otherwise, i.e., `Selection` is not
   *                                    collapsed from the beginning, set
   *                                    this to `No`.
   * @param aEditingHost                The editing host.
   */
  enum class SelectionWasCollapsed { Yes, No };
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteNonCollapsedRanges(HTMLEditor& aHTMLEditor,
                                 nsIEditor::EDirection aDirectionAndAmount,
                                 nsIEditor::EStripWrappers aStripWrappers,
                                 AutoRangeArray& aRangesToDelete,
                                 SelectionWasCollapsed aSelectionWasCollapsed,
                                 const Element& aEditingHost);
  nsresult ComputeRangesToDeleteNonCollapsedRanges(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete,
      SelectionWasCollapsed aSelectionWasCollapsed,
      const Element& aEditingHost) const;

  /**
   * Handle deletion of collapsed ranges in a text node.
   *
   * @param aDirectionAndAmount Must be eNext or ePrevious.
   * @param aCaretPosition      The position where caret is.  This container
   *                            must be a text node.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteTextAroundCollapsedRanges(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete, const Element& aEditingHost);
  nsresult ComputeRangesToDeleteTextAroundCollapsedRanges(
      nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete, const Element& aEditingHost) const;

  /**
   * Handles deletion of collapsed selection at white-spaces in a text node.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aPointToDelete      The point to delete.  I.e., typically, caret
   *                            position.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteCollapsedSelectionAtWhiteSpaces(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const EditorDOMPoint& aPointToDelete, const Element& aEditingHost);

  /**
   * Handle deletion of collapsed selection in a text node.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aRangesToDelete     Computed selection ranges to delete.
   * @param aPointAtDeletingChar   The visible char position which you want to
   *                               delete.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteCollapsedSelectionAtVisibleChar(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete,
      const EditorDOMPoint& aPointAtDeletingChar, const Element& aEditingHost);

  /**
   * Handle deletion of atomic elements like <br>, <hr>, <img>, <input>, etc and
   * data nodes except text node (e.g., comment node). Note that don't call this
   * directly with `<hr>` element.
   *
   * @param aAtomicContent      The atomic content to be deleted.
   * @param aCaretPoint         The caret point (i.e., selection start or
   *                            end).
   * @param aWSRunScannerAtCaret WSRunScanner instance which was initialized
   *                             with the caret point.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  HandleDeleteAtomicContent(HTMLEditor& aHTMLEditor, nsIContent& aAtomicContent,
                            const EditorDOMPoint& aCaretPoint,
                            const WSRunScanner& aWSRunScannerAtCaret,
                            const Element& aEditingHost);
  nsresult ComputeRangesToDeleteAtomicContent(
      Element* aEditingHost, const nsIContent& aAtomicContent,
      AutoRangeArray& aRangesToDelete) const;

  /**
   * GetAtomicContnetToDelete() returns better content that is deletion of
   * atomic element.  If aScanFromCaretPointResult is special, since this
   * point may not be editable, we look for better point to remove atomic
   * content.
   *
   * @param aDirectionAndAmount       Direction of the deletion.
   * @param aWSRunScannerAtCaret      WSRunScanner instance which was
   *                                  initialized with the caret point.
   * @param aScanFromCaretPointResult Scan result of aWSRunScannerAtCaret
   *                                  toward aDirectionAndAmount.
   */
  static nsIContent* GetAtomicContentToDelete(
      nsIEditor::EDirection aDirectionAndAmount,
      const WSRunScanner& aWSRunScannerAtCaret,
      const WSScanResult& aScanFromCaretPointResult) MOZ_NONNULL_RETURN;

  /**
   * HandleDeleteAtOtherBlockBoundary() handles deletion at other block boundary
   * (i.e., immediately before or after a block). If this does not join blocks,
   * `Run()` may be called recursively with creating another instance.
   *
   * @param aDirectionAndAmount Direction of the deletion.
   * @param aStripWrappers      Must be eStrip or eNoStrip.
   * @param aOtherBlockElement  The block element which follows the caret or
   *                            is followed by caret.
   * @param aCaretPoint         The caret point (i.e., selection start or
   *                            end).
   * @param aWSRunScannerAtCaret WSRunScanner instance which was initialized
   *                             with the caret point.
   * @param aRangesToDelete     Ranges to delete of the caller.  This should
   *                            be collapsed and the point should match with
   *                            aCaretPoint.
   * @param aEditingHost        The editing host.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
  HandleDeleteAtOtherBlockBoundary(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsIEditor::EStripWrappers aStripWrappers, Element& aOtherBlockElement,
      const EditorDOMPoint& aCaretPoint, WSRunScanner& aWSRunScannerAtCaret,
      AutoRangeArray& aRangesToDelete, const Element& aEditingHost);

  /**
   * ExtendOrShrinkRangeToDelete() extends aRangeToDelete if there are
   * an invisible <br> element and/or some parent empty elements.
   *
   * @param aFrameSelection     If the caller wants range in selection limiter,
   *                            set this to non-nullptr which knows the limiter.
   * @param aRangeToDelete       The range to be extended for deletion.  This
   *                            must not be collapsed, must be positioned.
   */
  template <typename EditorDOMRangeType>
  Result<EditorRawDOMRange, nsresult> ExtendOrShrinkRangeToDelete(
      const HTMLEditor& aHTMLEditor, const nsFrameSelection* aFrameSelection,
      const EditorDOMRangeType& aRangeToDelete) const;

  /**
   * Extend the start boundary of aRangeToDelete to contain ancestor inline
   * elements which will be empty once the content in aRangeToDelete is removed
   * from the tree.
   *
   * NOTE: This is designed for deleting inline elements which become empty if
   * aRangeToDelete which crosses a block boundary of right block child.
   * Therefore, you may need to improve this method if you want to use this in
   * the other cases.
   *
   * @param aRangeToDelete      [in/out] The range to delete.  This start
   *                            boundary may be modified.
   * @param aEditingHost        The editing host.
   * @return                    true if aRangeToDelete is modified.
   *                            false if aRangeToDelete is not modified.
   *                            error if aRangeToDelete gets unexpected
   *                            situation.
   */
  static Result<bool, nsresult>
  ExtendRangeToContainAncestorInlineElementsAtStart(
      nsRange& aRangeToDelete, const Element& aEditingHost);

  /**
   * A helper method for ExtendOrShrinkRangeToDelete().  This returns shrunken
   * range if aRangeToDelete selects all over list elements which have some list
   * item elements to avoid to delete all list items from the list element.
   */
  MOZ_NEVER_INLINE_DEBUG static EditorRawDOMRange
  GetRangeToAvoidDeletingAllListItemsIfSelectingAllOverListElements(
      const EditorRawDOMRange& aRangeToDelete);

  /**
   * DeleteUnnecessaryNodes() removes unnecessary nodes around aRange.
   * Note that aRange is tracked with AutoTrackDOMRange.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteUnnecessaryNodes(HTMLEditor& aHTMLEditor, EditorDOMRange& aRange);

  /**
   * DeleteUnnecessaryNodesAndCollapseSelection() calls DeleteUnnecessaryNodes()
   * and then, collapse selection at tracked aSelectionStartPoint or
   * aSelectionEndPoint (depending on aDirectionAndAmount).
   *
   * @param aDirectionAndAmount         Direction of the deletion.
   *                                    If nsIEditor::ePrevious, selection
   *                                    will be collapsed to aSelectionEndPoint.
   *                                    Otherwise, selection will be collapsed
   *                                    to aSelectionStartPoint.
   * @param aSelectionStartPoint        First selection range start after
   *                                    computing the deleting range.
   * @param aSelectionEndPoint          First selection range end after
   *                                    computing the deleting range.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteUnnecessaryNodesAndCollapseSelection(
      HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      const EditorDOMPoint& aSelectionStartPoint,
      const EditorDOMPoint& aSelectionEndPoint);

  /**
   * If aContent is a text node that contains only collapsed white-space or
   * empty and editable.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteNodeIfInvisibleAndEditableTextNode(HTMLEditor& aHTMLEditor,
                                           nsIContent& aContent);

  /**
   * DeleteParentBlocksIfEmpty() removes parent block elements if they
   * don't have visible contents.  Note that due performance issue of
   * WhiteSpaceVisibilityKeeper, this call may be expensive.  And also note that
   * this removes a empty block with a transaction.  So, please make sure that
   * you've already created `AutoPlaceholderBatch`.
   *
   * @param aPoint      The point whether this method climbing up the DOM
   *                    tree to remove empty parent blocks.
   * @return            NS_OK if one or more empty block parents are deleted.
   *                    NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND if the point is
   *                    not in empty block.
   *                    Or NS_ERROR_* if something unexpected occurs.
   */
  [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
  DeleteParentBlocksWithTransactionIfEmpty(HTMLEditor& aHTMLEditor,
                                           const EditorDOMPoint& aPoint);

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  FallbackToDeleteRangeWithTransaction(HTMLEditor& aHTMLEditor,
                                       nsRange& aRangeToDelete) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangeWithTransaction(aRangeToDelete));
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.DeleteRangeWithTransaction(mOriginalDirectionAndAmount,
                                               mOriginalStripWrappers,
                                               aRangeToDelete);
    NS_WARNING_ASSERTION(caretPointOrError.isOk(),
                         "EditorBase::DeleteRangeWithTransaction() failed");
    return caretPointOrError;
  }

  [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<CaretPoint, nsresult>
  FallbackToDeleteRangesWithTransaction(HTMLEditor& aHTMLEditor,
                                        AutoRangeArray& aRangesToDelete) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangesWithTransaction(aRangesToDelete));
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.DeleteRangesWithTransaction(mOriginalDirectionAndAmount,
                                                mOriginalStripWrappers,
                                                aRangesToDelete);
    NS_WARNING_ASSERTION(caretPointOrError.isOk(),
                         "EditorBase::DeleteRangesWithTransaction() failed");
    return caretPointOrError;
  }

  /**
   * Compute target range(s) which will be called by
   * `EditorBase::DeleteRangeWithTransaction()` or
   * `EditorBase::DeleteRangesWithTransaction()`.
   * TODO: We should not use it for consistency with each deletion handler
   *       in this and nested classes.
   */
  nsresult ComputeRangeToDeleteRangeWithTransaction(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      nsRange& aRange, const Element& aEditingHost) const;
  nsresult ComputeRangesToDeleteRangesWithTransaction(
      const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
      AutoRangeArray& aRangesToDelete, const Element& aEditingHost) const {
    MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
    const EditorBase::HowToHandleCollapsedRange howToHandleCollapsedRange =
        EditorBase::HowToHandleCollapsedRangeFor(aDirectionAndAmount);
    if (NS_WARN_IF(aRangesToDelete.IsCollapsed() &&
                   howToHandleCollapsedRange ==
                       EditorBase::HowToHandleCollapsedRange::Ignore)) {
      return NS_ERROR_FAILURE;
    }

    for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
      if (range->Collapsed()) {
        continue;
      }
      nsresult rv = ComputeRangeToDeleteRangeWithTransaction(
          aHTMLEditor, aDirectionAndAmount, range, aEditingHost);
      if (NS_FAILED(rv)) {
        NS_WARNING(
            "AutoDeleteRangesHandler::ComputeRangeToDeleteRangeWithTransaction("
            ") failed");
        return rv;
      }
    }
    return NS_OK;
  }

  nsresult FallbackToComputeRangeToDeleteRangeWithTransaction(
      const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
      const Element& aEditingHost) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangeWithTransaction(aRangeToDelete));
    nsresult rv = ComputeRangeToDeleteRangeWithTransaction(
        aHTMLEditor, mOriginalDirectionAndAmount, aRangeToDelete, aEditingHost);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoDeleteRangesHandler::"
                         "ComputeRangeToDeleteRangeWithTransaction() failed");
    return rv;
  }
  nsresult FallbackToComputeRangesToDeleteRangesWithTransaction(
      const HTMLEditor& aHTMLEditor, AutoRangeArray& aRangesToDelete,
      const Element& aEditingHost) const {
    MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
    MOZ_ASSERT(CanFallbackToDeleteRangesWithTransaction(aRangesToDelete));
    nsresult rv = ComputeRangesToDeleteRangesWithTransaction(
        aHTMLEditor, mOriginalDirectionAndAmount, aRangesToDelete,
        aEditingHost);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoDeleteRangesHandler::"
                         "ComputeRangesToDeleteRangesWithTransaction() failed");
    return rv;
  }

  class MOZ_STACK_CLASS AutoBlockElementsJoiner final {
   public:
    AutoBlockElementsJoiner() = delete;
    explicit AutoBlockElementsJoiner(
        AutoDeleteRangesHandler& aDeleteRangesHandler)
        : mDeleteRangesHandler(&aDeleteRangesHandler),
          mDeleteRangesHandlerConst(aDeleteRangesHandler) {}
    explicit AutoBlockElementsJoiner(
        const AutoDeleteRangesHandler& aDeleteRangesHandler)
        : mDeleteRangesHandler(nullptr),
          mDeleteRangesHandlerConst(aDeleteRangesHandler) {}

    /**
     * PrepareToDeleteAtCurrentBlockBoundary() considers left content and right
     * content which are joined for handling deletion at current block boundary
     * (i.e., at start or end of the current block).
     *
     * @param aHTMLEditor               The HTML editor.
     * @param aDirectionAndAmount       Direction of the deletion.
     * @param aCurrentBlockElement      The current block element.
     * @param aCaretPoint               The caret point (i.e., selection start
     *                                  or end).
     * @param aEditingHost              The editing host.
     * @return                          true if can continue to handle the
     *                                  deletion.
     */
    bool PrepareToDeleteAtCurrentBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount,
        Element& aCurrentBlockElement, const EditorDOMPoint& aCaretPoint,
        const Element& aEditingHost);

    /**
     * PrepareToDeleteAtOtherBlockBoundary() considers left content and right
     * content which are joined for handling deletion at other block boundary
     * (i.e., immediately before or after a block).
     *
     * @param aHTMLEditor               The HTML editor.
     * @param aDirectionAndAmount       Direction of the deletion.
     * @param aOtherBlockElement        The block element which follows the
     *                                  caret or is followed by caret.
     * @param aCaretPoint               The caret point (i.e., selection start
     *                                  or end).
     * @param aWSRunScannerAtCaret      WSRunScanner instance which was
     *                                  initialized with the caret point.
     * @return                          true if can continue to handle the
     *                                  deletion.
     */
    bool PrepareToDeleteAtOtherBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, Element& aOtherBlockElement,
        const EditorDOMPoint& aCaretPoint,
        const WSRunScanner& aWSRunScannerAtCaret);

    /**
     * PrepareToDeleteNonCollapsedRange() considers left block element and
     * right block element which are inclusive ancestor block element of
     * start and end container of aRangeToDelete
     *
     * @param aHTMLEditor               The HTML editor.
     * @param aRangeToDelete            The range to delete.  Must not be
     *                                  collapsed.
     * @param aEditingHost              The editing host.
     * @return                          true if can continue to handle the
     *                                  deletion.
     */
    bool PrepareToDeleteNonCollapsedRange(const HTMLEditor& aHTMLEditor,
                                          const nsRange& aRangeToDelete,
                                          const Element& aEditingHost);

    /**
     * Run() executes the joining.
     *
     * @param aHTMLEditor               The HTML editor.
     * @param aDirectionAndAmount       Direction of the deletion.
     * @param aStripWrappers            Must be eStrip or eNoStrip.
     * @param aCaretPoint               The caret point (i.e., selection start
     *                                  or end).
     * @param aRangeToDelete            The range to delete.  This should be
     *                                  collapsed and match with aCaretPoint.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers,
        const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
        const Element& aEditingHost) {
      switch (mMode) {
        case Mode::JoinCurrentBlock: {
          Result<EditActionResult, nsresult> result =
              HandleDeleteAtCurrentBlockBoundary(
                  aHTMLEditor, aDirectionAndAmount, aCaretPoint, aEditingHost);
          NS_WARNING_ASSERTION(result.isOk(),
                               "AutoBlockElementsJoiner::"
                               "HandleDeleteAtCurrentBlockBoundary() failed");
          return result;
        }
        case Mode::JoinOtherBlock: {
          Result<EditActionResult, nsresult> result =
              HandleDeleteAtOtherBlockBoundary(aHTMLEditor, aDirectionAndAmount,
                                               aStripWrappers, aCaretPoint,
                                               aRangeToDelete, aEditingHost);
          NS_WARNING_ASSERTION(result.isOk(),
                               "AutoBlockElementsJoiner::"
                               "HandleDeleteAtOtherBlockBoundary() failed");
          return result;
        }
        case Mode::DeleteBRElement:
        case Mode::DeletePrecedingBRElementOfBlock:
        case Mode::DeletePrecedingPreformattedLineBreak: {
          Result<EditActionResult, nsresult> result = HandleDeleteLineBreak(
              aHTMLEditor, aDirectionAndAmount, aCaretPoint, aEditingHost);
          NS_WARNING_ASSERTION(
              result.isOk(),
              "AutoBlockElementsJoiner::HandleDeleteLineBreak() failed");
          return result;
        }
        case Mode::JoinBlocksInSameParent:
        case Mode::DeleteContentInRange:
        case Mode::DeleteNonCollapsedRange:
        case Mode::DeletePrecedingLinesAndContentInRange:
          MOZ_ASSERT_UNREACHABLE(
              "This mode should be handled in the other Run()");
          return Err(NS_ERROR_UNEXPECTED);
        case Mode::NotInitialized:
          return EditActionResult::IgnoredResult();
      }
      return Err(NS_ERROR_NOT_INITIALIZED);
    }

    nsresult ComputeRangeToDelete(const HTMLEditor& aHTMLEditor,
                                  nsIEditor::EDirection aDirectionAndAmount,
                                  const EditorDOMPoint& aCaretPoint,
                                  nsRange& aRangeToDelete,
                                  const Element& aEditingHost) const {
      switch (mMode) {
        case Mode::JoinCurrentBlock: {
          nsresult rv = ComputeRangeToDeleteAtCurrentBlockBoundary(
              aHTMLEditor, aCaretPoint, aRangeToDelete, aEditingHost);
          NS_WARNING_ASSERTION(
              NS_SUCCEEDED(rv),
              "AutoBlockElementsJoiner::"
              "ComputeRangeToDeleteAtCurrentBlockBoundary() failed");
          return rv;
        }
        case Mode::JoinOtherBlock: {
          nsresult rv = ComputeRangeToDeleteAtOtherBlockBoundary(
              aHTMLEditor, aDirectionAndAmount, aCaretPoint, aRangeToDelete,
              aEditingHost);
          NS_WARNING_ASSERTION(
              NS_SUCCEEDED(rv),
              "AutoBlockElementsJoiner::"
              "ComputeRangeToDeleteAtOtherBlockBoundary() failed");
          return rv;
        }
        case Mode::DeleteBRElement:
        case Mode::DeletePrecedingBRElementOfBlock:
        case Mode::DeletePrecedingPreformattedLineBreak: {
          nsresult rv = ComputeRangeToDeleteLineBreak(
              aHTMLEditor, aRangeToDelete, aEditingHost,
              ComputeRangeFor::GetTargetRanges);
          NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                               "AutoBlockElementsJoiner::"
                               "ComputeRangeToDeleteLineBreak() failed");
          return rv;
        }
        case Mode::JoinBlocksInSameParent:
        case Mode::DeleteContentInRange:
        case Mode::DeleteNonCollapsedRange:
        case Mode::DeletePrecedingLinesAndContentInRange:
          MOZ_ASSERT_UNREACHABLE(
              "This mode should be handled in the other "
              "ComputeRangesToDelete()");
          return NS_ERROR_UNEXPECTED;
        case Mode::NotInitialized:
          return NS_OK;
      }
      return NS_ERROR_NOT_IMPLEMENTED;
    }

    /**
     * Run() executes the joining.
     *
     * @param aHTMLEditor               The HTML editor.
     * @param aDirectionAndAmount       Direction of the deletion.
     * @param aStripWrappers            Whether delete or keep new empty
     *                                  ancestor elements.
     * @param aRangeToDelete            The range to delete.  Must not be
     *                                  collapsed.
     * @param aSelectionWasCollapsed    Whether selection was or was not
     *                                  collapsed when starting to handle
     *                                  deletion.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) {
      switch (mMode) {
        case Mode::JoinCurrentBlock:
        case Mode::JoinOtherBlock:
        case Mode::DeleteBRElement:
        case Mode::DeletePrecedingBRElementOfBlock:
        case Mode::DeletePrecedingPreformattedLineBreak:
          MOZ_ASSERT_UNREACHABLE(
              "This mode should be handled in the other Run()");
          return Err(NS_ERROR_UNEXPECTED);
        case Mode::JoinBlocksInSameParent: {
          Result<EditActionResult, nsresult> result =
              JoinBlockElementsInSameParent(
                  aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                  aRangeToDelete, aSelectionWasCollapsed, aEditingHost);
          NS_WARNING_ASSERTION(result.isOk(),
                               "AutoBlockElementsJoiner::"
                               "JoinBlockElementsInSameParent() failed");
          return result;
        }
        case Mode::DeleteContentInRange: {
          Result<EditActionResult, nsresult> result = DeleteContentInRange(
              aHTMLEditor, aDirectionAndAmount, aStripWrappers, aRangeToDelete);
          NS_WARNING_ASSERTION(
              result.isOk(),
              "AutoBlockElementsJoiner::DeleteContentInRange() failed");
          return result;
        }
        case Mode::DeleteNonCollapsedRange:
        case Mode::DeletePrecedingLinesAndContentInRange: {
          Result<EditActionResult, nsresult> result =
              HandleDeleteNonCollapsedRange(
                  aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                  aRangeToDelete, aSelectionWasCollapsed, aEditingHost);
          NS_WARNING_ASSERTION(result.isOk(),
                               "AutoBlockElementsJoiner::"
                               "HandleDeleteNonCollapsedRange() failed");
          return result;
        }
        case Mode::NotInitialized:
          MOZ_ASSERT_UNREACHABLE(
              "Call Run() after calling a preparation method");
          return EditActionResult::IgnoredResult();
      }
      return Err(NS_ERROR_NOT_INITIALIZED);
    }

    nsresult ComputeRangeToDelete(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) const {
      switch (mMode) {
        case Mode::JoinCurrentBlock:
        case Mode::JoinOtherBlock:
        case Mode::DeleteBRElement:
        case Mode::DeletePrecedingBRElementOfBlock:
        case Mode::DeletePrecedingPreformattedLineBreak:
          MOZ_ASSERT_UNREACHABLE(
              "This mode should be handled in the other "
              "ComputeRangesToDelete()");
          return NS_ERROR_UNEXPECTED;
        case Mode::JoinBlocksInSameParent: {
          nsresult rv = ComputeRangeToJoinBlockElementsInSameParent(
              aHTMLEditor, aDirectionAndAmount, aRangeToDelete, aEditingHost);
          NS_WARNING_ASSERTION(
              NS_SUCCEEDED(rv),
              "AutoBlockElementsJoiner::"
              "ComputeRangesToJoinBlockElementsInSameParent() failed");
          return rv;
        }
        case Mode::DeleteContentInRange: {
          nsresult rv = ComputeRangeToDeleteContentInRange(
              aHTMLEditor, aDirectionAndAmount, aRangeToDelete, aEditingHost);
          NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                               "AutoBlockElementsJoiner::"
                               "ComputeRangesToDeleteContentInRanges() failed");
          return rv;
        }
        case Mode::DeleteNonCollapsedRange:
        case Mode::DeletePrecedingLinesAndContentInRange: {
          nsresult rv = ComputeRangeToDeleteNonCollapsedRange(
              aHTMLEditor, aDirectionAndAmount, aRangeToDelete,
              aSelectionWasCollapsed, aEditingHost);
          NS_WARNING_ASSERTION(
              NS_SUCCEEDED(rv),
              "AutoBlockElementsJoiner::"
              "ComputeRangesToDeleteNonCollapsedRanges() failed");
          return rv;
        }
        case Mode::NotInitialized:
          MOZ_ASSERT_UNREACHABLE(
              "Call ComputeRangesToDelete() after calling a preparation "
              "method");
          return NS_ERROR_NOT_INITIALIZED;
      }
      return NS_ERROR_NOT_INITIALIZED;
    }

    nsIContent* GetLeafContentInOtherBlockElement() const {
      MOZ_ASSERT(mMode == Mode::JoinOtherBlock);
      return mLeafContentInOtherBlock;
    }

   private:
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    HandleDeleteAtCurrentBlockBoundary(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aCaretPoint, const Element& aEditingHost);
    nsresult ComputeRangeToDeleteAtCurrentBlockBoundary(
        const HTMLEditor& aHTMLEditor, const EditorDOMPoint& aCaretPoint,
        nsRange& aRangeToDelete, const Element& aEditingHost) const;
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    HandleDeleteAtOtherBlockBoundary(HTMLEditor& aHTMLEditor,
                                     nsIEditor::EDirection aDirectionAndAmount,
                                     nsIEditor::EStripWrappers aStripWrappers,
                                     const EditorDOMPoint& aCaretPoint,
                                     nsRange& aRangeToDelete,
                                     const Element& aEditingHost);
    // FYI: This method may modify selection, but it won't cause running
    //      script because of `AutoHideSelectionChanges` which blocks
    //      selection change listeners and the selection change event
    //      dispatcher.
    MOZ_CAN_RUN_SCRIPT_BOUNDARY nsresult
    ComputeRangeToDeleteAtOtherBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
        const Element& aEditingHost) const;
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    JoinBlockElementsInSameParent(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost);
    nsresult ComputeRangeToJoinBlockElementsInSameParent(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        const Element& aEditingHost) const;
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    HandleDeleteLineBreak(HTMLEditor& aHTMLEditor,
                          nsIEditor::EDirection aDirectionAndAmount,
                          const EditorDOMPoint& aCaretPoint,
                          const Element& aEditingHost);
    enum class ComputeRangeFor : bool { GetTargetRanges, ToDeleteTheRange };
    nsresult ComputeRangeToDeleteLineBreak(
        const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
        const Element& aEditingHost, ComputeRangeFor aComputeRangeFor) const;
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    DeleteContentInRange(HTMLEditor& aHTMLEditor,
                         nsIEditor::EDirection aDirectionAndAmount,
                         nsIEditor::EStripWrappers aStripWrappers,
                         nsRange& aRangeToDelete);
    nsresult ComputeRangeToDeleteContentInRange(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRange,
        const Element& aEditingHost) const;
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    HandleDeleteNonCollapsedRange(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost);
    nsresult ComputeRangeToDeleteNonCollapsedRange(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) const;

    /**
     * JoinNodesDeepWithTransaction() joins aLeftNode and aRightNode "deeply".
     * First, they are joined simply, then, new right node is assumed as the
     * child at length of the left node before joined and new left node is
     * assumed as its previous sibling.  Then, they will be joined again.
     * And then, these steps are repeated.
     *
     * @param aLeftContent    The node which will be removed form the tree.
     * @param aRightContent   The node which will be inserted the contents of
     *                        aRightContent.
     * @return                The point of the first child of the last right
     * node. The result is always set if this succeeded.
     */
    MOZ_CAN_RUN_SCRIPT Result<EditorDOMPoint, nsresult>
    JoinNodesDeepWithTransaction(HTMLEditor& aHTMLEditor,
                                 nsIContent& aLeftContent,
                                 nsIContent& aRightContent);

    /**
     * DeleteNodesEntirelyInRangeButKeepTableStructure() removes nodes which are
     * entirely in aRange.  Howevers, if some nodes are part of a table,
     * removes all children of them instead.  I.e., this does not make damage to
     * table structure at the range, but may remove table entirely if it's
     * in the range.
     *
     * @return                  true if inclusive ancestor block elements at
     *                          start and end of the range should be joined.
     */
    MOZ_CAN_RUN_SCRIPT Result<bool, nsresult>
    DeleteNodesEntirelyInRangeButKeepTableStructure(
        HTMLEditor& aHTMLEditor, nsRange& aRange,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed);
    bool NeedsToJoinNodesAfterDeleteNodesEntirelyInRangeButKeepTableStructure(
        const HTMLEditor& aHTMLEditor,
        const nsTArray<OwningNonNull<nsIContent>>& aArrayOfContents,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
        const;
    Result<bool, nsresult>
    ComputeRangeToDeleteNodesEntirelyInRangeButKeepTableStructure(
        const HTMLEditor& aHTMLEditor, nsRange& aRange,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
        const;

    /**
     * DeleteContentButKeepTableStructure() removes aContent if it's an element
     * which is part of a table structure.  If it's a part of table structure,
     * removes its all children recursively.  I.e., this may delete all of a
     * table, but won't break table structure partially.
     *
     * @param aContent            The content which or whose all children should
     *                            be removed.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
    DeleteContentButKeepTableStructure(HTMLEditor& aHTMLEditor,
                                       nsIContent& aContent);

    /**
     * DeleteTextAtStartAndEndOfRange() removes text if start and/or end of
     * aRange is in a text node.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT nsresult
    DeleteTextAtStartAndEndOfRange(HTMLEditor& aHTMLEditor, nsRange& aRange);

    /**
     * Return a block element which is an inclusive ancestor of the container of
     * aPoint if aPoint is start of ancestor blocks.  For example, if `<div
     * id=div1>abc<div id=div2><div id=div3>[]def</div></div></div>`, return
     * #div2.
     */
    template <typename EditorDOMPointType>
    static Result<Element*, nsresult>
    GetMostDistantBlockAncestorIfPointIsStartAtBlock(
        const EditorDOMPointType& aPoint, const Element& aEditingHost,
        const Element* aAncestorLimiter = nullptr);

    /**
     * Extend aRangeToDelete to contain new empty inline ancestors and contain
     * an invisible <br> element before right child block which causes an empty
     * line but the range starts after it.
     */
    void ExtendRangeToDeleteNonCollapsedRange(
        const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
        const Element& aEditingHost, ComputeRangeFor aComputeRangeFor) const;

    class MOZ_STACK_CLASS AutoInclusiveAncestorBlockElementsJoiner final {
     public:
      AutoInclusiveAncestorBlockElementsJoiner() = delete;
      AutoInclusiveAncestorBlockElementsJoiner(
          nsIContent& aInclusiveDescendantOfLeftBlockElement,
          nsIContent& aInclusiveDescendantOfRightBlockElement)
          : mInclusiveDescendantOfLeftBlockElement(
                aInclusiveDescendantOfLeftBlockElement),
            mInclusiveDescendantOfRightBlockElement(
                aInclusiveDescendantOfRightBlockElement),
            mCanJoinBlocks(false),
            mFallbackToDeleteLeafContent(false) {}

      bool IsSet() const { return mLeftBlockElement && mRightBlockElement; }
      bool IsSameBlockElement() const {
        return mLeftBlockElement && mLeftBlockElement == mRightBlockElement;
      }

      const EditorDOMPoint& PointRefToPutCaret() const {
        return mPointToPutCaret;
      }

      /**
       * Prepare for joining inclusive ancestor block elements.  When this
       * returns false, the deletion should be canceled.
       */
      Result<bool, nsresult> Prepare(const HTMLEditor& aHTMLEditor,
                                     const Element& aEditingHost);

      /**
       * When this returns true, this can join the blocks with `Run()`.
       */
      bool CanJoinBlocks() const { return mCanJoinBlocks; }

      /**
       * When this returns true, `Run()` must return "ignored" so that
       * caller can skip calling `Run()`.  This is available only when
       * `CanJoinBlocks()` returns `true`.
       * TODO: This should be merged into `CanJoinBlocks()` in the future.
       */
      bool ShouldDeleteLeafContentInstead() const {
        MOZ_ASSERT(CanJoinBlocks());
        return mFallbackToDeleteLeafContent;
      }

      /**
       * ComputeRangesToDelete() extends aRangeToDelete includes the element
       * boundaries between joining blocks.  If they won't be joined, this
       * collapses the range to aCaretPoint.
       */
      nsresult ComputeRangeToDelete(const HTMLEditor& aHTMLEditor,
                                    const EditorDOMPoint& aCaretPoint,
                                    nsRange& aRangeToDelete) const;

      /**
       * Join inclusive ancestor block elements which are found by preceding
       * Prepare() call.
       * The right element is always joined to the left element.
       * If the elements are the same type and not nested within each other,
       * JoinEditableNodesWithTransaction() is called (example, joining two
       * list items together into one).
       * If the elements are not the same type, or one is a descendant of the
       * other, we instead destroy the right block placing its children into
       * left block.
       */
      [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
          HTMLEditor& aHTMLEditor, const Element& aEditingHost);

     private:
      /**
       * This method returns true when
       * `MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement()`,
       * `MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement()` and
       * `MergeFirstLineOfRightBlockElementIntoLeftBlockElement()` handle it
       * with the `if` block of their main blocks.
       */
      bool CanMergeLeftAndRightBlockElements() const {
        if (!IsSet()) {
          return false;
        }
        // `MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement()`
        if (mPointContainingTheOtherBlockElement.GetContainer() ==
            mRightBlockElement) {
          return mNewListElementTagNameOfRightListElement.isSome();
        }
        // `MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement()`
        if (mPointContainingTheOtherBlockElement.GetContainer() ==
            mLeftBlockElement) {
          return mNewListElementTagNameOfRightListElement.isSome() &&
                 !mRightBlockElement->GetChildCount();
        }
        MOZ_ASSERT(!mPointContainingTheOtherBlockElement.IsSet());
        // `MergeFirstLineOfRightBlockElementIntoLeftBlockElement()`
        return mNewListElementTagNameOfRightListElement.isSome() ||
               mLeftBlockElement->NodeInfo()->NameAtom() ==
                   mRightBlockElement->NodeInfo()->NameAtom();
      }

      OwningNonNull<nsIContent> mInclusiveDescendantOfLeftBlockElement;
      OwningNonNull<nsIContent> mInclusiveDescendantOfRightBlockElement;
      RefPtr<Element> mLeftBlockElement;
      RefPtr<Element> mRightBlockElement;
      Maybe<nsAtom*> mNewListElementTagNameOfRightListElement;
      EditorDOMPoint mPointContainingTheOtherBlockElement;
      EditorDOMPoint mPointToPutCaret;
      RefPtr<dom::HTMLBRElement> mPrecedingInvisibleBRElement;
      bool mCanJoinBlocks;
      bool mFallbackToDeleteLeafContent;
    };  // HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
        // AutoInclusiveAncestorBlockElementsJoiner

    enum class Mode {
      NotInitialized,
      JoinCurrentBlock,
      JoinOtherBlock,
      JoinBlocksInSameParent,
      DeleteBRElement,
      // The instance will handle only the <br> element immediately before a
      // block.
      DeletePrecedingBRElementOfBlock,
      // The instance will handle only the preceding preformatted line break
      // before a block.
      DeletePrecedingPreformattedLineBreak,
      DeleteContentInRange,
      DeleteNonCollapsedRange,
      // The instance will handle preceding lines of the right block and content
      // in the range in the right block.
      DeletePrecedingLinesAndContentInRange,
    };
    AutoDeleteRangesHandler* mDeleteRangesHandler;
    const AutoDeleteRangesHandler& mDeleteRangesHandlerConst;
    nsCOMPtr<nsIContent> mLeftContent;
    nsCOMPtr<nsIContent> mRightContent;
    nsCOMPtr<nsIContent> mLeafContentInOtherBlock;
    // mSkippedInvisibleContents stores all content nodes which are skipped at
    // scanning mLeftContent and mRightContent.  The content nodes should be
    // removed at deletion.
    AutoTArray<OwningNonNull<nsIContent>, 8> mSkippedInvisibleContents;
    RefPtr<dom::HTMLBRElement> mBRElement;
    EditorDOMPointInText mPreformattedLineBreak;
    Mode mMode = Mode::NotInitialized;
  };  // HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner

  class MOZ_STACK_CLASS AutoEmptyBlockAncestorDeleter final {
   public:
    /**
     * ScanEmptyBlockInclusiveAncestor() scans an inclusive ancestor element
     * which is empty and a block element.  Then, stores the result and
     * returns the found empty block element.
     *
     * @param aHTMLEditor         The HTMLEditor.
     * @param aStartContent       Start content to look for empty ancestors.
     */
    [[nodiscard]] Element* ScanEmptyBlockInclusiveAncestor(
        const HTMLEditor& aHTMLEditor, nsIContent& aStartContent);

    /**
     * ComputeTargetRanges() computes "target ranges" for deleting
     * `mEmptyInclusiveAncestorBlockElement`.
     */
    nsresult ComputeTargetRanges(const HTMLEditor& aHTMLEditor,
                                 nsIEditor::EDirection aDirectionAndAmount,
                                 const Element& aEditingHost,
                                 AutoRangeArray& aRangesToDelete) const;

    /**
     * Deletes found empty block element by `ScanEmptyBlockInclusiveAncestor()`.
     * If found one is a list item element, calls
     * `MaybeInsertBRElementBeforeEmptyListItemElement()` before deleting
     * the list item element.
     * If found empty ancestor is not a list item element,
     * `GetNewCaretPosition()` will be called to determine new caret position.
     * Finally, removes the empty block ancestor.
     *
     * @param aHTMLEditor         The HTMLEditor.
     * @param aDirectionAndAmount If found empty ancestor block is a list item
     *                            element, this is ignored.  Otherwise:
     *                            - If eNext, eNextWord or eToEndOfLine,
     *                              collapse Selection to after found empty
     *                              ancestor.
     *                            - If ePrevious, ePreviousWord or
     *                              eToBeginningOfLine, collapse Selection to
     *                              end of previous editable node.
     *                            - Otherwise, eNone is allowed but does
     *                              nothing.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult> Run(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount);

   private:
    /**
     * MaybeReplaceSubListWithNewListItem() replaces
     * mEmptyInclusiveAncestorBlockElement with new list item element
     * (containing <br>) if:
     * - mEmptyInclusiveAncestorBlockElement is a list element
     * - The parent of mEmptyInclusiveAncestorBlockElement is a list element
     * - The parent becomes empty after deletion
     * If this does not perform the replacement, returns "ignored".
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<EditActionResult, nsresult>
    MaybeReplaceSubListWithNewListItem(HTMLEditor& aHTMLEditor);

    /**
     * MaybeInsertBRElementBeforeEmptyListItemElement() inserts a `<br>` element
     * if `mEmptyInclusiveAncestorBlockElement` is a list item element which
     * is first editable element in its parent, and its grand parent is not a
     * list element, inserts a `<br>` element before the empty list item.
     */
    [[nodiscard]] MOZ_CAN_RUN_SCRIPT Result<RefPtr<Element>, nsresult>
    MaybeInsertBRElementBeforeEmptyListItemElement(HTMLEditor& aHTMLEditor);

    /**
     * GetNewCaretPosition() returns new caret position after deleting
     * `mEmptyInclusiveAncestorBlockElement`.
     */
    [[nodiscard]] Result<CaretPoint, nsresult> GetNewCaretPosition(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount) const;

    RefPtr<Element> mEmptyInclusiveAncestorBlockElement;
  };  // HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter

  const AutoDeleteRangesHandler* const mParent;
  nsIEditor::EDirection mOriginalDirectionAndAmount;
  nsIEditor::EStripWrappers mOriginalStripWrappers;
};  // HTMLEditor::AutoDeleteRangesHandler

nsresult HTMLEditor::ComputeTargetRanges(
    nsIEditor::EDirection aDirectionAndAmount,
    AutoRangeArray& aRangesToDelete) const {
  MOZ_ASSERT(IsEditActionDataAvailable());

  Element* editingHost = ComputeEditingHost();
  if (!editingHost) {
    aRangesToDelete.RemoveAllRanges();
    return NS_ERROR_EDITOR_NO_EDITABLE_RANGE;
  }

  // First check for table selection mode.  If so, hand off to table editor.
  SelectedTableCellScanner scanner(aRangesToDelete);
  if (scanner.IsInTableCellSelectionMode()) {
    // If it's in table cell selection mode, we'll delete all childen in
    // the all selected table cell elements,
    if (scanner.ElementsRef().Length() == aRangesToDelete.Ranges().Length()) {
      return NS_OK;
    }
    // but will ignore all ranges which does not select a table cell.
    size_t removedRanges = 0;
    for (size_t i = 1; i < scanner.ElementsRef().Length(); i++) {
      if (HTMLEditUtils::GetTableCellElementIfOnlyOneSelected(
              aRangesToDelete.Ranges()[i - removedRanges]) !=
          scanner.ElementsRef()[i]) {
        // XXX Need to manage anchor-focus range too!
        aRangesToDelete.Ranges().RemoveElementAt(i - removedRanges);
        removedRanges++;
      }
    }
    return NS_OK;
  }

  aRangesToDelete.EnsureOnlyEditableRanges(*editingHost);
  if (aRangesToDelete.Ranges().IsEmpty()) {
    NS_WARNING(
        "There is no range which we can delete entire of or around the caret");
    return NS_ERROR_EDITOR_NO_EDITABLE_RANGE;
  }
  AutoDeleteRangesHandler deleteHandler;
  // Should we delete target ranges which cannot delete actually?
  nsresult rv = deleteHandler.ComputeRangesToDelete(
      *this, aDirectionAndAmount, aRangesToDelete, *editingHost);
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "AutoDeleteRangesHandler::ComputeRangesToDelete() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::HandleDeleteSelection(
    nsIEditor::EDirection aDirectionAndAmount,
    nsIEditor::EStripWrappers aStripWrappers) {
  MOZ_ASSERT(IsEditActionDataAvailable());
  MOZ_ASSERT(aStripWrappers == nsIEditor::eStrip ||
             aStripWrappers == nsIEditor::eNoStrip);

  if (MOZ_UNLIKELY(!SelectionRef().RangeCount())) {
    return Err(NS_ERROR_EDITOR_NO_EDITABLE_RANGE);
  }

  RefPtr<Element> editingHost = ComputeEditingHost();
  if (MOZ_UNLIKELY(!editingHost)) {
    return Err(NS_ERROR_EDITOR_NO_EDITABLE_RANGE);
  }

  // Remember that we did a selection deletion.  Used by
  // CreateStyleForInsertText()
  TopLevelEditSubActionDataRef().mDidDeleteSelection = true;

  if (MOZ_UNLIKELY(IsEmpty())) {
    return EditActionResult::CanceledResult();
  }

  // First check for table selection mode.  If so, hand off to table editor.
  if (HTMLEditUtils::IsInTableCellSelectionMode(SelectionRef())) {
    nsresult rv = DeleteTableCellContentsWithTransaction();
    if (NS_WARN_IF(Destroyed())) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    if (NS_FAILED(rv)) {
      NS_WARNING("HTMLEditor::DeleteTableCellContentsWithTransaction() failed");
      return Err(rv);
    }
    return EditActionResult::HandledResult();
  }

  AutoRangeArray rangesToDelete(SelectionRef());
  rangesToDelete.EnsureOnlyEditableRanges(*editingHost);
  if (MOZ_UNLIKELY(rangesToDelete.Ranges().IsEmpty())) {
    NS_WARNING(
        "There is no range which we can delete entire the ranges or around the "
        "caret");
    return Err(NS_ERROR_EDITOR_NO_EDITABLE_RANGE);
  }
  AutoDeleteRangesHandler deleteHandler;
  Result<EditActionResult, nsresult> result = deleteHandler.Run(
      *this, aDirectionAndAmount, aStripWrappers, rangesToDelete, *editingHost);
  if (MOZ_UNLIKELY(result.isErr()) || result.inspect().Canceled()) {
    NS_WARNING_ASSERTION(result.isOk(),
                         "AutoDeleteRangesHandler::Run() failed");
    return result;
  }

  // XXX At here, selection may have no range because of mutation event
  //     listeners can do anything so that we should just return NS_OK instead
  //     of returning error.
  const auto atNewStartOfSelection =
      GetFirstSelectionStartPoint<EditorDOMPoint>();
  if (NS_WARN_IF(!atNewStartOfSelection.IsSet())) {
    return Err(NS_ERROR_FAILURE);
  }
  if (atNewStartOfSelection.IsInContentNode()) {
    nsresult rv = DeleteMostAncestorMailCiteElementIfEmpty(
        MOZ_KnownLive(*atNewStartOfSelection.ContainerAs<nsIContent>()));
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "HTMLEditor::DeleteMostAncestorMailCiteElementIfEmpty() failed");
      return Err(rv);
    }
  }
  return EditActionResult::HandledResult();
}

nsresult HTMLEditor::AutoDeleteRangesHandler::ComputeRangesToDelete(
    const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    AutoRangeArray& aRangesToDelete, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());

  mOriginalDirectionAndAmount = aDirectionAndAmount;
  mOriginalStripWrappers = nsIEditor::eNoStrip;

  if (aHTMLEditor.mPaddingBRElementForEmptyEditor) {
    nsresult rv = aRangesToDelete.Collapse(
        EditorRawDOMPoint(aHTMLEditor.mPaddingBRElementForEmptyEditor));
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "AutoRangeArray::Collapse() failed");
    return rv;
  }

  SelectionWasCollapsed selectionWasCollapsed = aRangesToDelete.IsCollapsed()
                                                    ? SelectionWasCollapsed::Yes
                                                    : SelectionWasCollapsed::No;
  if (selectionWasCollapsed == SelectionWasCollapsed::Yes) {
    const auto startPoint =
        aRangesToDelete.GetFirstRangeStartPoint<EditorDOMPoint>();
    if (NS_WARN_IF(!startPoint.IsSet())) {
      return NS_ERROR_FAILURE;
    }
    RefPtr<Element> editingHost = aHTMLEditor.ComputeEditingHost();
    if (NS_WARN_IF(!editingHost)) {
      return NS_ERROR_FAILURE;
    }
    if (startPoint.IsInContentNode()) {
      AutoEmptyBlockAncestorDeleter deleter;
      if (deleter.ScanEmptyBlockInclusiveAncestor(
              aHTMLEditor, *startPoint.ContainerAs<nsIContent>())) {
        nsresult rv = deleter.ComputeTargetRanges(
            aHTMLEditor, aDirectionAndAmount, *editingHost, aRangesToDelete);
        NS_WARNING_ASSERTION(
            NS_SUCCEEDED(rv),
            "AutoEmptyBlockAncestorDeleter::ComputeTargetRanges() failed");
        return rv;
      }
    }

    // We shouldn't update caret bidi level right now, but we need to check
    // whether the deletion will be canceled or not.
    AutoCaretBidiLevelManager bidiLevelManager(aHTMLEditor, aDirectionAndAmount,
                                               startPoint);
    if (bidiLevelManager.Failed()) {
      NS_WARNING(
          "EditorBase::AutoCaretBidiLevelManager failed to initialize itself");
      return NS_ERROR_FAILURE;
    }
    if (bidiLevelManager.Canceled()) {
      return NS_SUCCESS_DOM_NO_OPERATION;
    }

    // AutoRangeArray::ExtendAnchorFocusRangeFor() will use `nsFrameSelection`
    // to extend the range for deletion.  But if focus event doesn't receive
    // yet, ancestor isn't set.  So we must set root element of editor to
    // ancestor temporarily.
    AutoSetTemporaryAncestorLimiter autoSetter(
        aHTMLEditor, aHTMLEditor.SelectionRef(), *startPoint.GetContainer(),
        &aRangesToDelete);

    Result<nsIEditor::EDirection, nsresult> extendResult =
        aRangesToDelete.ExtendAnchorFocusRangeFor(aHTMLEditor,
                                                  aDirectionAndAmount);
    if (extendResult.isErr()) {
      NS_WARNING("AutoRangeArray::ExtendAnchorFocusRangeFor() failed");
      return extendResult.unwrapErr();
    }

    // For compatibility with other browsers, we should set target ranges
    // to start from and/or end after an atomic content rather than start
    // from preceding text node end nor end at following text node start.
    Result<bool, nsresult> shrunkenResult =
        aRangesToDelete.ShrinkRangesIfStartFromOrEndAfterAtomicContent(
            aHTMLEditor, aDirectionAndAmount,
            AutoRangeArray::IfSelectingOnlyOneAtomicContent::Collapse,
            editingHost);
    if (shrunkenResult.isErr()) {
      NS_WARNING(
          "AutoRangeArray::ShrinkRangesIfStartFromOrEndAfterAtomicContent() "
          "failed");
      return shrunkenResult.unwrapErr();
    }

    if (!shrunkenResult.inspect() || !aRangesToDelete.IsCollapsed()) {
      aDirectionAndAmount = extendResult.unwrap();
    }

    if (aDirectionAndAmount == nsIEditor::eNone) {
      MOZ_ASSERT(aRangesToDelete.Ranges().Length() == 1);
      if (!CanFallbackToDeleteRangesWithTransaction(aRangesToDelete)) {
        // XXX In this case, do we need to modify the range again?
        return NS_SUCCESS_DOM_NO_OPERATION;
      }
      nsresult rv = FallbackToComputeRangesToDeleteRangesWithTransaction(
          aHTMLEditor, aRangesToDelete, *editingHost);
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "AutoDeleteRangesHandler::"
          "FallbackToComputeRangesToDeleteRangesWithTransaction() failed");
      return rv;
    }

    if (aRangesToDelete.IsCollapsed()) {
      const auto caretPoint =
          aRangesToDelete.GetFirstRangeStartPoint<EditorDOMPoint>();
      if (MOZ_UNLIKELY(NS_WARN_IF(!caretPoint.IsInContentNode()))) {
        return NS_ERROR_FAILURE;
      }
      if (!EditorUtils::IsEditableContent(*caretPoint.ContainerAs<nsIContent>(),
                                          EditorType::HTML)) {
        return NS_SUCCESS_DOM_NO_OPERATION;
      }
      WSRunScanner wsRunScannerAtCaret(
          editingHost, caretPoint,
          BlockInlineCheck::UseComputedDisplayOutsideStyle);
      const WSScanResult scanFromCaretPointResult =
          aDirectionAndAmount == nsIEditor::eNext
              ? wsRunScannerAtCaret
                    .ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(caretPoint)
              : wsRunScannerAtCaret.ScanPreviousVisibleNodeOrBlockBoundaryFrom(
                    caretPoint);
      if (scanFromCaretPointResult.Failed()) {
        NS_WARNING(
            "WSRunScanner::Scan(Next|Previous)VisibleNodeOrBlockBoundaryFrom() "
            "failed");
        return NS_ERROR_FAILURE;
      }
      MOZ_ASSERT(scanFromCaretPointResult.GetContent());

      if (scanFromCaretPointResult.ReachedBRElement()) {
        if (scanFromCaretPointResult.BRElementPtr() ==
            wsRunScannerAtCaret.GetEditingHost()) {
          return NS_OK;
        }
        if (!scanFromCaretPointResult.IsContentEditable()) {
          return NS_SUCCESS_DOM_NO_OPERATION;
        }
        if (scanFromCaretPointResult.ReachedInvisibleBRElement()) {
          EditorDOMPoint newCaretPosition =
              aDirectionAndAmount == nsIEditor::eNext
                  ? scanFromCaretPointResult
                        .PointAfterReachedContent<EditorDOMPoint>()
                  : scanFromCaretPointResult
                        .PointAtReachedContent<EditorDOMPoint>();
          if (NS_WARN_IF(!newCaretPosition.IsSet())) {
            return NS_ERROR_FAILURE;
          }
          AutoHideSelectionChanges blockSelectionListeners(
              aHTMLEditor.SelectionRef());
          nsresult rv = aHTMLEditor.CollapseSelectionTo(newCaretPosition);
          if (MOZ_UNLIKELY(NS_FAILED(rv))) {
            NS_WARNING("EditorBase::CollapseSelectionTo() failed");
            return NS_ERROR_FAILURE;
          }
          if (NS_WARN_IF(!aHTMLEditor.SelectionRef().RangeCount())) {
            return NS_ERROR_UNEXPECTED;
          }
          aRangesToDelete.Initialize(aHTMLEditor.SelectionRef());
          AutoDeleteRangesHandler anotherHandler(this);
          rv = anotherHandler.ComputeRangesToDelete(
              aHTMLEditor, aDirectionAndAmount, aRangesToDelete, aEditingHost);
          NS_WARNING_ASSERTION(
              NS_SUCCEEDED(rv),
              "Recursive AutoDeleteRangesHandler::ComputeRangesToDelete() "
              "failed");

          rv = aHTMLEditor.CollapseSelectionTo(caretPoint);
          if (MOZ_UNLIKELY(rv == NS_ERROR_EDITOR_DESTROYED)) {
            NS_WARNING(
                "EditorBase::CollapseSelectionTo() caused destroying the "
                "editor");
            return NS_ERROR_EDITOR_DESTROYED;
          }
          NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                               "EditorBase::CollapseSelectionTo() failed to "
                               "restore original selection, but ignored");

          MOZ_ASSERT(aRangesToDelete.Ranges().Length() == 1);
          // If the range is collapsed, there is no content which should
          // be removed together.  In this case, only the invisible `<br>`
          // element should be selected.
          if (aRangesToDelete.IsCollapsed()) {
            nsresult rv = aRangesToDelete.SelectNode(
                *scanFromCaretPointResult.BRElementPtr());
            NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                                 "AutoRangeArray::SelectNode() failed");
            return rv;
          }

          // Otherwise, extend the range to contain the invisible `<br>`
          // element.
          if (scanFromCaretPointResult
                  .PointAtReachedContent<EditorRawDOMPoint>()
                  .IsBefore(
                      aRangesToDelete
                          .GetFirstRangeStartPoint<EditorRawDOMPoint>())) {
            nsresult rv = aRangesToDelete.FirstRangeRef()->SetStartAndEnd(
                EditorRawDOMPoint(scanFromCaretPointResult.BRElementPtr())
                    .ToRawRangeBoundary(),
                aRangesToDelete.FirstRangeRef()->EndRef());
            NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                                 "nsRange::SetStartAndEnd() failed");
            return rv;
          }
          if (aRangesToDelete.GetFirstRangeEndPoint<EditorRawDOMPoint>()
                  .IsBefore(
                      scanFromCaretPointResult
                          .PointAfterReachedContent<EditorRawDOMPoint>())) {
            nsresult rv = aRangesToDelete.FirstRangeRef()->SetStartAndEnd(
                aRangesToDelete.FirstRangeRef()->StartRef(),
                scanFromCaretPointResult
                    .PointAfterReachedContent<EditorRawDOMPoint>()
                    .ToRawRangeBoundary());
            NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                                 "nsRange::SetStartAndEnd() failed");
            return rv;
          }
          NS_WARNING("Was the invisible `<br>` element selected?");
          return NS_OK;
        }
      }

      nsresult rv = ComputeRangesToDeleteAroundCollapsedRanges(
          aHTMLEditor, aDirectionAndAmount, aRangesToDelete,
          wsRunScannerAtCaret, scanFromCaretPointResult, aEditingHost);
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "AutoDeleteRangesHandler::ComputeRangesToDeleteAroundCollapsedRanges("
          ") failed");
      return rv;
    }
  }

  nsresult rv = ComputeRangesToDeleteNonCollapsedRanges(
      aHTMLEditor, aDirectionAndAmount, aRangesToDelete, selectionWasCollapsed,
      aEditingHost);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoDeleteRangesHandler::"
                       "ComputeRangesToDeleteNonCollapsedRanges() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::Run(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    nsIEditor::EStripWrappers aStripWrappers, AutoRangeArray& aRangesToDelete,
    const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aStripWrappers == nsIEditor::eStrip ||
             aStripWrappers == nsIEditor::eNoStrip);
  MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());

  mOriginalDirectionAndAmount = aDirectionAndAmount;
  mOriginalStripWrappers = aStripWrappers;

  if (MOZ_UNLIKELY(aHTMLEditor.IsEmpty())) {
    return EditActionResult::CanceledResult();
  }

  // selectionWasCollapsed is used later to determine whether we should join
  // blocks in HandleDeleteNonCollapsedRanges(). We don't really care about
  // collapsed because it will be modified by
  // AutoRangeArray::ExtendAnchorFocusRangeFor() later.
  // AutoBlockElementsJoiner::AutoInclusiveAncestorBlockElementsJoiner should
  // happen if the original selection is collapsed and the cursor is at the end
  // of a block element, in which case
  // AutoRangeArray::ExtendAnchorFocusRangeFor() would always make the selection
  // not collapsed.
  SelectionWasCollapsed selectionWasCollapsed = aRangesToDelete.IsCollapsed()
                                                    ? SelectionWasCollapsed::Yes
                                                    : SelectionWasCollapsed::No;

  if (selectionWasCollapsed == SelectionWasCollapsed::Yes) {
    const auto startPoint =
        aRangesToDelete.GetFirstRangeStartPoint<EditorDOMPoint>();
    if (NS_WARN_IF(!startPoint.IsSet())) {
      return Err(NS_ERROR_FAILURE);
    }

    // If we are inside an empty block, delete it.
    if (startPoint.IsInContentNode()) {
#ifdef DEBUG
      nsMutationGuard debugMutation;
#endif  // #ifdef DEBUG
      AutoEmptyBlockAncestorDeleter deleter;
      if (deleter.ScanEmptyBlockInclusiveAncestor(
              aHTMLEditor, *startPoint.ContainerAs<nsIContent>())) {
        Result<EditActionResult, nsresult> result =
            deleter.Run(aHTMLEditor, aDirectionAndAmount);
        if (MOZ_UNLIKELY(result.isErr()) || result.inspect().Handled()) {
          NS_WARNING_ASSERTION(result.isOk(),
                               "AutoEmptyBlockAncestorDeleter::Run() failed");
          return result;
        }
      }
      MOZ_ASSERT(!debugMutation.Mutated(0),
                 "AutoEmptyBlockAncestorDeleter shouldn't modify the DOM tree "
                 "if it returns not handled nor error");
    }

    // Test for distance between caret and text that will be deleted.
    // Note that this call modifies `nsFrameSelection` without modifying
    // `Selection`.  However, it does not have problem for now because
    // it'll be referred by `AutoRangeArray::ExtendAnchorFocusRangeFor()`
    // before modifying `Selection`.
    // XXX This looks odd.  `ExtendAnchorFocusRangeFor()` will extend
    //     anchor-focus range, but here refers the first range.
    AutoCaretBidiLevelManager bidiLevelManager(aHTMLEditor, aDirectionAndAmount,
                                               startPoint);
    if (MOZ_UNLIKELY(bidiLevelManager.Failed())) {
      NS_WARNING(
          "EditorBase::AutoCaretBidiLevelManager failed to initialize itself");
      return Err(NS_ERROR_FAILURE);
    }
    bidiLevelManager.MaybeUpdateCaretBidiLevel(aHTMLEditor);
    if (bidiLevelManager.Canceled()) {
      return EditActionResult::CanceledResult();
    }

    // AutoRangeArray::ExtendAnchorFocusRangeFor() will use `nsFrameSelection`
    // to extend the range for deletion.  But if focus event doesn't receive
    // yet, ancestor isn't set.  So we must set root element of editor to
    // ancestor temporarily.
    AutoSetTemporaryAncestorLimiter autoSetter(
        aHTMLEditor, aHTMLEditor.SelectionRef(), *startPoint.GetContainer(),
        &aRangesToDelete);

    // Calling `ExtendAnchorFocusRangeFor()` and
    // `ShrinkRangesIfStartFromOrEndAfterAtomicContent()` may move caret to
    // the container of deleting atomic content.  However, it may be different
    // from the original caret's container.  The original caret container may
    // be important to put caret after deletion so that let's cache the
    // original position.
    Maybe<EditorDOMPoint> caretPoint;
    if (aRangesToDelete.IsCollapsed() && !aRangesToDelete.Ranges().IsEmpty()) {
      caretPoint =
          Some(aRangesToDelete.GetFirstRangeStartPoint<EditorDOMPoint>());
      if (NS_WARN_IF(!caretPoint.ref().IsInContentNode())) {
        return Err(NS_ERROR_FAILURE);
      }
    }

    Result<nsIEditor::EDirection, nsresult> extendResult =
        aRangesToDelete.ExtendAnchorFocusRangeFor(aHTMLEditor,
                                                  aDirectionAndAmount);
    if (MOZ_UNLIKELY(extendResult.isErr())) {
      NS_WARNING("AutoRangeArray::ExtendAnchorFocusRangeFor() failed");
      return extendResult.propagateErr();
    }
    if (caretPoint.isSome() &&
        MOZ_UNLIKELY(!caretPoint.ref().IsSetAndValid())) {
      NS_WARNING("The caret position became invalid");
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }

    // If there is only one range and it selects an atomic content, we should
    // delete it with collapsed range path for making consistent behavior
    // between both cases, the content is selected case and caret is at it or
    // after it case.
    Result<bool, nsresult> shrunkenResult =
        aRangesToDelete.ShrinkRangesIfStartFromOrEndAfterAtomicContent(
            aHTMLEditor, aDirectionAndAmount,
            AutoRangeArray::IfSelectingOnlyOneAtomicContent::Collapse,
            &aEditingHost);
    if (MOZ_UNLIKELY(shrunkenResult.isErr())) {
      NS_WARNING(
          "AutoRangeArray::ShrinkRangesIfStartFromOrEndAfterAtomicContent() "
          "failed");
      return shrunkenResult.propagateErr();
    }

    if (!shrunkenResult.inspect() || !aRangesToDelete.IsCollapsed()) {
      aDirectionAndAmount = extendResult.unwrap();
    }

    if (aDirectionAndAmount == nsIEditor::eNone) {
      MOZ_ASSERT(aRangesToDelete.Ranges().Length() == 1);
      if (!CanFallbackToDeleteRangesWithTransaction(aRangesToDelete)) {
        return EditActionResult::IgnoredResult();
      }
      Result<CaretPoint, nsresult> caretPointOrError =
          FallbackToDeleteRangesWithTransaction(aHTMLEditor, aRangesToDelete);
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING(
            "AutoDeleteRangesHandler::FallbackToDeleteRangesWithTransaction() "
            "failed");
      }
      nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
          aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                        SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                        SuggestCaret::AndIgnoreTrivialError});
      if (NS_FAILED(rv)) {
        NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      NS_WARNING_ASSERTION(
          rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
          "CaretPoint::SuggestCaretPointTo() failed, but ignored");
      // Don't return "ignored" to avoid to fall it back to delete ranges
      // recursively.
      return EditActionResult::HandledResult();
    }

    if (aRangesToDelete.IsCollapsed()) {
      // Use the original caret position for handling the deletion around
      // collapsed range because the container may be different from the
      // new collapsed position's container.
      if (!EditorUtils::IsEditableContent(
              *caretPoint.ref().ContainerAs<nsIContent>(), EditorType::HTML)) {
        return EditActionResult::CanceledResult();
      }
      WSRunScanner wsRunScannerAtCaret(
          &aEditingHost, caretPoint.ref(),
          BlockInlineCheck::UseComputedDisplayOutsideStyle);
      const WSScanResult scanFromCaretPointResult =
          aDirectionAndAmount == nsIEditor::eNext
              ? wsRunScannerAtCaret
                    .ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
                        caretPoint.ref())
              : wsRunScannerAtCaret.ScanPreviousVisibleNodeOrBlockBoundaryFrom(
                    caretPoint.ref());
      if (MOZ_UNLIKELY(scanFromCaretPointResult.Failed())) {
        NS_WARNING(
            "WSRunScanner::Scan(Next|Previous)VisibleNodeOrBlockBoundaryFrom() "
            "failed");
        return Err(NS_ERROR_FAILURE);
      }
      MOZ_ASSERT(scanFromCaretPointResult.GetContent());

      // Short circuit for invisible breaks.  delete them and recurse.
      if (scanFromCaretPointResult.ReachedBRElement()) {
        if (scanFromCaretPointResult.BRElementPtr() == &aEditingHost) {
          return EditActionResult::HandledResult();
        }
        if (!scanFromCaretPointResult.IsContentEditable()) {
          return EditActionResult::CanceledResult();
        }
        if (scanFromCaretPointResult.ReachedInvisibleBRElement()) {
          // TODO: We should extend the range to delete again before/after
          //       the caret point and use `HandleDeleteNonCollapsedRanges()`
          //       instead after we would create delete range computation
          //       method at switching to the new white-space normalizer.
          Result<CaretPoint, nsresult> caretPointOrError =
              WhiteSpaceVisibilityKeeper::
                  DeleteContentNodeAndJoinTextNodesAroundIt(
                      aHTMLEditor,
                      MOZ_KnownLive(*scanFromCaretPointResult.BRElementPtr()),
                      caretPoint.ref(), aEditingHost);
          if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
            NS_WARNING(
                "WhiteSpaceVisibilityKeeper::"
                "DeleteContentNodeAndJoinTextNodesAroundIt() failed");
            return caretPointOrError.propagateErr();
          }
          if (caretPointOrError.inspect().HasCaretPointSuggestion()) {
            caretPoint = Some(caretPointOrError.unwrap().UnwrapCaretPoint());
          }
          if (NS_WARN_IF(!caretPoint->IsSetAndValid())) {
            return Err(NS_ERROR_FAILURE);
          }
          AutoRangeArray rangesToDelete(caretPoint.ref());
          if (aHTMLEditor.MayHaveMutationEventListeners(
                  NS_EVENT_BITS_MUTATION_SUBTREEMODIFIED |
                  NS_EVENT_BITS_MUTATION_NODEREMOVED |
                  NS_EVENT_BITS_MUTATION_NODEREMOVEDFROMDOCUMENT)) {
            // Let's check whether there is new invisible `<br>` element
            // for avoiding infinite recursive calls.
            WSRunScanner wsRunScannerAtCaret(
                &aEditingHost, caretPoint.ref(),
                BlockInlineCheck::UseComputedDisplayOutsideStyle);
            const WSScanResult scanFromCaretPointResult =
                aDirectionAndAmount == nsIEditor::eNext
                    ? wsRunScannerAtCaret
                          .ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
                              caretPoint.ref())
                    : wsRunScannerAtCaret
                          .ScanPreviousVisibleNodeOrBlockBoundaryFrom(
                              caretPoint.ref());
            if (MOZ_UNLIKELY(scanFromCaretPointResult.Failed())) {
              NS_WARNING(
                  "WSRunScanner::Scan(Next|Previous)"
                  "VisibleNodeOrBlockBoundaryFrom() failed");
              return Err(NS_ERROR_FAILURE);
            }
            if (NS_WARN_IF(
                    scanFromCaretPointResult.ReachedInvisibleBRElement())) {
              return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
            }
          }
          AutoDeleteRangesHandler anotherHandler(this);
          Result<EditActionResult, nsresult> result =
              anotherHandler.Run(aHTMLEditor, aDirectionAndAmount,
                                 aStripWrappers, rangesToDelete, aEditingHost);
          NS_WARNING_ASSERTION(
              result.isOk(), "Recursive AutoDeleteRangesHandler::Run() failed");
          return result;
        }
      }

      Result<EditActionResult, nsresult> result =
          HandleDeleteAroundCollapsedRanges(
              aHTMLEditor, aDirectionAndAmount, aStripWrappers, aRangesToDelete,
              wsRunScannerAtCaret, scanFromCaretPointResult, aEditingHost);
      NS_WARNING_ASSERTION(result.isOk(),
                           "AutoDeleteRangesHandler::"
                           "HandleDeleteAroundCollapsedRanges() failed");
      return result;
    }
  }

  Result<EditActionResult, nsresult> result = HandleDeleteNonCollapsedRanges(
      aHTMLEditor, aDirectionAndAmount, aStripWrappers, aRangesToDelete,
      selectionWasCollapsed, aEditingHost);
  NS_WARNING_ASSERTION(
      result.isOk(),
      "AutoDeleteRangesHandler::HandleDeleteNonCollapsedRanges() failed");
  return result;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::ComputeRangesToDeleteAroundCollapsedRanges(
    const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    AutoRangeArray& aRangesToDelete, const WSRunScanner& aWSRunScannerAtCaret,
    const WSScanResult& aScanFromCaretPointResult,
    const Element& aEditingHost) const {
  if (aScanFromCaretPointResult.InCollapsibleWhiteSpaces() ||
      aScanFromCaretPointResult.InNonCollapsibleCharacters() ||
      aScanFromCaretPointResult.ReachedPreformattedLineBreak()) {
    // This means that if aDirectionAndAmount == nsIEditor::eNext, collapse
    // selection at the found character.  Otherwise, collapse selection after
    // the found character.
    nsresult rv = aRangesToDelete.Collapse(
        aScanFromCaretPointResult.Point_Deprecated<EditorRawDOMPoint>());
    if (MOZ_UNLIKELY(NS_FAILED(rv))) {
      NS_WARNING("AutoRangeArray::Collapse() failed");
      return NS_ERROR_FAILURE;
    }
    rv = ComputeRangesToDeleteTextAroundCollapsedRanges(
        aDirectionAndAmount, aRangesToDelete, aEditingHost);
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "AutoDeleteRangesHandler::"
        "ComputeRangesToDeleteTextAroundCollapsedRanges() failed");
    return rv;
  }

  if (aScanFromCaretPointResult.ReachedSpecialContent() ||
      aScanFromCaretPointResult.ReachedBRElement() ||
      aScanFromCaretPointResult.ReachedHRElement() ||
      aScanFromCaretPointResult.ReachedNonEditableOtherBlockElement()) {
    if (aScanFromCaretPointResult.GetContent() ==
        aWSRunScannerAtCaret.GetEditingHost()) {
      return NS_OK;
    }
    nsIContent* atomicContent = GetAtomicContentToDelete(
        aDirectionAndAmount, aWSRunScannerAtCaret, aScanFromCaretPointResult);
    if (!HTMLEditUtils::IsRemovableNode(*atomicContent)) {
      NS_WARNING(
          "AutoDeleteRangesHandler::GetAtomicContentToDelete() cannot find "
          "removable atomic content");
      return NS_ERROR_FAILURE;
    }
    nsresult rv = ComputeRangesToDeleteAtomicContent(
        aWSRunScannerAtCaret.GetEditingHost(), *atomicContent, aRangesToDelete);
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "AutoDeleteRangesHandler::ComputeRangesToDeleteAtomicContent() failed");
    return rv;
  }

  if (aScanFromCaretPointResult.ReachedOtherBlockElement()) {
    if (NS_WARN_IF(!aScanFromCaretPointResult.ContentIsElement())) {
      return NS_ERROR_FAILURE;
    }
    MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
    bool handled = false;
    for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
      MOZ_ASSERT(range->IsPositioned());
      AutoBlockElementsJoiner joiner(*this);
      if (!joiner.PrepareToDeleteAtOtherBlockBoundary(
              aHTMLEditor, aDirectionAndAmount,
              *aScanFromCaretPointResult.ElementPtr(),
              aWSRunScannerAtCaret.ScanStartRef(), aWSRunScannerAtCaret)) {
        continue;
      }
      handled = true;
      nsresult rv = joiner.ComputeRangeToDelete(
          aHTMLEditor, aDirectionAndAmount, aWSRunScannerAtCaret.ScanStartRef(),
          range, aEditingHost);
      if (NS_FAILED(rv)) {
        NS_WARNING(
            "AutoBlockElementsJoiner::ComputeRangeToDelete() failed (other "
            "block boundary)");
        return rv;
      }
    }
    return handled ? NS_OK : NS_SUCCESS_DOM_NO_OPERATION;
  }

  if (aScanFromCaretPointResult.ReachedCurrentBlockBoundary() ||
      aScanFromCaretPointResult.ReachedInlineEditingHostBoundary()) {
    MOZ_ASSERT(aScanFromCaretPointResult.ContentIsElement());
    MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
    bool handled = false;
    for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
      AutoBlockElementsJoiner joiner(*this);
      if (!joiner.PrepareToDeleteAtCurrentBlockBoundary(
              aHTMLEditor, aDirectionAndAmount,
              *aScanFromCaretPointResult.ElementPtr(),
              aWSRunScannerAtCaret.ScanStartRef(), aEditingHost)) {
        continue;
      }
      handled = true;
      nsresult rv = joiner.ComputeRangeToDelete(
          aHTMLEditor, aDirectionAndAmount, aWSRunScannerAtCaret.ScanStartRef(),
          range, aEditingHost);
      if (NS_FAILED(rv)) {
        NS_WARNING(
            "AutoBlockElementsJoiner::ComputeRangeToDelete() failed (current "
            "block boundary)");
        return rv;
      }
    }
    return handled ? NS_OK : NS_SUCCESS_DOM_NO_OPERATION;
  }

  return NS_OK;
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoDeleteRangesHandler::HandleDeleteAroundCollapsedRanges(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    nsIEditor::EStripWrappers aStripWrappers, AutoRangeArray& aRangesToDelete,
    const WSRunScanner& aWSRunScannerAtCaret,
    const WSScanResult& aScanFromCaretPointResult,
    const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsTopLevelEditSubActionDataAvailable());
  MOZ_ASSERT(aRangesToDelete.IsCollapsed());
  MOZ_ASSERT(aDirectionAndAmount != nsIEditor::eNone);
  MOZ_ASSERT(aWSRunScannerAtCaret.ScanStartRef().IsInContentNode());
  MOZ_ASSERT(EditorUtils::IsEditableContent(
      *aWSRunScannerAtCaret.ScanStartRef().ContainerAs<nsIContent>(),
      EditorType::HTML));

  if (StaticPrefs::editor_white_space_normalization_blink_compatible()) {
    if (aScanFromCaretPointResult.InCollapsibleWhiteSpaces() ||
        aScanFromCaretPointResult.InNonCollapsibleCharacters() ||
        aScanFromCaretPointResult.ReachedPreformattedLineBreak()) {
      // This means that if aDirectionAndAmount == nsIEditor::eNext, collapse
      // selection at the found character.  Otherwise, collapse selection after
      // the found character.
      nsresult rv = aRangesToDelete.Collapse(
          aScanFromCaretPointResult.Point_Deprecated<EditorRawDOMPoint>());
      if (NS_FAILED(rv)) {
        NS_WARNING("AutoRangeArray::Collapse() failed");
        return Err(NS_ERROR_FAILURE);
      }
      Result<CaretPoint, nsresult> caretPointOrError =
          HandleDeleteTextAroundCollapsedRanges(
              aHTMLEditor, aDirectionAndAmount, aRangesToDelete, aEditingHost);
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING(
            "AutoDeleteRangesHandler::HandleDeleteTextAroundCollapsedRanges() "
            "failed");
        return caretPointOrError.propagateErr();
      }
      rv = caretPointOrError.unwrap().SuggestCaretPointTo(
          aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                        SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                        SuggestCaret::AndIgnoreTrivialError});
      if (NS_FAILED(rv)) {
        NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      NS_WARNING_ASSERTION(
          rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
          "CaretPoint::SuggestCaretPoint() failed, but ignored");
      return EditActionResult::HandledResult();
    }
  }

  if (aScanFromCaretPointResult.InCollapsibleWhiteSpaces() ||
      aScanFromCaretPointResult.ReachedPreformattedLineBreak()) {
    Result<CaretPoint, nsresult> caretPointOrError =
        HandleDeleteCollapsedSelectionAtWhiteSpaces(
            aHTMLEditor, aDirectionAndAmount,
            aWSRunScannerAtCaret.ScanStartRef(), aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "AutoDeleteRangesHandler::"
          "HandleDeleteCollapsedSelectionAtWhiteSpaces() failed");
      return caretPointOrError.propagateErr();
    }
    nsresult rv = caretPointOrError.unwrap().SuggestCaretPointTo(
        aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(
        rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
        "CaretPoint::SuggestCaretPointTo() failed, but ignored");
    return EditActionResult::HandledResult();
  }

  if (aScanFromCaretPointResult.InNonCollapsibleCharacters()) {
    if (NS_WARN_IF(!aScanFromCaretPointResult.ContentIsText())) {
      return Err(NS_ERROR_FAILURE);
    }
    Result<CaretPoint, nsresult> caretPointOrError =
        HandleDeleteCollapsedSelectionAtVisibleChar(
            aHTMLEditor, aDirectionAndAmount, aRangesToDelete,
            // This means that if aDirectionAndAmount == nsIEditor::eNext,
            // at the found character.  Otherwise, after the found character.
            aScanFromCaretPointResult.Point_Deprecated<EditorDOMPoint>(),
            aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "AutoDeleteRangesHandler::"
          "HandleDeleteCollapsedSelectionAtVisibleChar() failed");
      return caretPointOrError.propagateErr();
    }
    nsresult rv = caretPointOrError.unwrap().SuggestCaretPointTo(
        aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(
        rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
        "CaretPoint::SuggestCaretPointTo() failed, but ignored");
    return EditActionResult::HandledResult();
  }

  if (aScanFromCaretPointResult.ReachedSpecialContent() ||
      aScanFromCaretPointResult.ReachedBRElement() ||
      aScanFromCaretPointResult.ReachedHRElement() ||
      aScanFromCaretPointResult.ReachedNonEditableOtherBlockElement()) {
    if (aScanFromCaretPointResult.GetContent() == &aEditingHost) {
      return EditActionResult::HandledResult();
    }
    nsCOMPtr<nsIContent> atomicContent = GetAtomicContentToDelete(
        aDirectionAndAmount, aWSRunScannerAtCaret, aScanFromCaretPointResult);
    if (MOZ_UNLIKELY(!HTMLEditUtils::IsRemovableNode(*atomicContent))) {
      NS_WARNING(
          "AutoDeleteRangesHandler::GetAtomicContentToDelete() cannot find "
          "removable atomic content");
      return Err(NS_ERROR_FAILURE);
    }
    Result<CaretPoint, nsresult> caretPointOrError = HandleDeleteAtomicContent(
        aHTMLEditor, *atomicContent, aWSRunScannerAtCaret.ScanStartRef(),
        aWSRunScannerAtCaret, aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING("AutoDeleteRangesHandler::HandleDeleteAtomicContent() failed");
      return caretPointOrError.propagateErr();
    }
    nsresult rv = caretPointOrError.unwrap().SuggestCaretPointTo(
        aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(
        rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
        "CaretPoint::SuggestCaretPointTo() failed, but ignored");
    return EditActionResult::HandledResult();
  }

  if (aScanFromCaretPointResult.ReachedOtherBlockElement()) {
    if (NS_WARN_IF(!aScanFromCaretPointResult.ContentIsElement())) {
      return Err(NS_ERROR_FAILURE);
    }
    MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
    bool allRangesNotHandled = true;
    auto ret = EditActionResult::IgnoredResult();
    for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
      AutoBlockElementsJoiner joiner(*this);
      if (!joiner.PrepareToDeleteAtOtherBlockBoundary(
              aHTMLEditor, aDirectionAndAmount,
              *aScanFromCaretPointResult.ElementPtr(),
              aWSRunScannerAtCaret.ScanStartRef(), aWSRunScannerAtCaret)) {
        continue;
      }
      allRangesNotHandled = false;
      Result<EditActionResult, nsresult> result =
          joiner.Run(aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                     aWSRunScannerAtCaret.ScanStartRef(), MOZ_KnownLive(range),
                     aEditingHost);
      if (MOZ_UNLIKELY(result.isErr())) {
        NS_WARNING(
            "AutoBlockElementsJoiner::Run() failed (other block boundary)");
        return result;
      }
      ret |= result.inspect();
    }
    return allRangesNotHandled ? EditActionResult::CanceledResult()
                               : std::move(ret);
  }

  if (aScanFromCaretPointResult.ReachedCurrentBlockBoundary() ||
      aScanFromCaretPointResult.ReachedInlineEditingHostBoundary()) {
    MOZ_ASSERT(aScanFromCaretPointResult.ContentIsElement());
    MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
    bool allRangesNotHandled = true;
    auto ret = EditActionResult::IgnoredResult();
    for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
      AutoBlockElementsJoiner joiner(*this);
      if (!joiner.PrepareToDeleteAtCurrentBlockBoundary(
              aHTMLEditor, aDirectionAndAmount,
              *aScanFromCaretPointResult.ElementPtr(),
              aWSRunScannerAtCaret.ScanStartRef(), aEditingHost)) {
        continue;
      }
      allRangesNotHandled = false;
      Result<EditActionResult, nsresult> result =
          joiner.Run(aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                     aWSRunScannerAtCaret.ScanStartRef(), MOZ_KnownLive(range),
                     aEditingHost);
      if (MOZ_UNLIKELY(result.isErr())) {
        NS_WARNING(
            "AutoBlockElementsJoiner::Run() failed (current block boundary)");
        return result;
      }
      ret |= result.inspect();
    }
    return allRangesNotHandled ? EditActionResult::CanceledResult()
                               : std::move(ret);
  }

  MOZ_ASSERT_UNREACHABLE("New type of reached content hasn't been handled yet");
  return EditActionResult::IgnoredResult();
}

nsresult HTMLEditor::AutoDeleteRangesHandler::
    ComputeRangesToDeleteTextAroundCollapsedRanges(
        nsIEditor::EDirection aDirectionAndAmount,
        AutoRangeArray& aRangesToDelete, const Element& aEditingHost) const {
  MOZ_ASSERT(aDirectionAndAmount == nsIEditor::eNext ||
             aDirectionAndAmount == nsIEditor::ePrevious);

  const auto caretPosition =
      aRangesToDelete.GetFirstRangeStartPoint<EditorDOMPoint>();
  MOZ_ASSERT(caretPosition.IsSetAndValid());
  if (MOZ_UNLIKELY(NS_WARN_IF(!caretPosition.IsInContentNode()))) {
    return NS_ERROR_FAILURE;
  }

  EditorDOMRangeInTexts rangeToDelete;
  if (aDirectionAndAmount == nsIEditor::eNext) {
    Result<EditorDOMRangeInTexts, nsresult> result =
        WSRunScanner::GetRangeInTextNodesToForwardDeleteFrom(caretPosition,
                                                             aEditingHost);
    if (result.isErr()) {
      NS_WARNING(
          "WSRunScanner::GetRangeInTextNodesToForwardDeleteFrom() failed");
      return result.unwrapErr();
    }
    rangeToDelete = result.unwrap();
    if (!rangeToDelete.IsPositioned()) {
      return NS_OK;  // no range to delete, but consume it.
    }
  } else {
    Result<EditorDOMRangeInTexts, nsresult> result =
        WSRunScanner::GetRangeInTextNodesToBackspaceFrom(caretPosition,
                                                         aEditingHost);
    if (result.isErr()) {
      NS_WARNING("WSRunScanner::GetRangeInTextNodesToBackspaceFrom() failed");
      return result.unwrapErr();
    }
    rangeToDelete = result.unwrap();
    if (!rangeToDelete.IsPositioned()) {
      return NS_OK;  // no range to delete, but consume it.
    }
  }

  nsresult rv = aRangesToDelete.SetStartAndEnd(rangeToDelete.StartRef(),
                                               rangeToDelete.EndRef());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoArrayRanges::SetStartAndEnd() failed");
  return rv;
}

Result<CaretPoint, nsresult>
HTMLEditor::AutoDeleteRangesHandler::HandleDeleteTextAroundCollapsedRanges(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    AutoRangeArray& aRangesToDelete, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aDirectionAndAmount == nsIEditor::eNext ||
             aDirectionAndAmount == nsIEditor::ePrevious);

  nsresult rv = ComputeRangesToDeleteTextAroundCollapsedRanges(
      aDirectionAndAmount, aRangesToDelete, aEditingHost);
  if (NS_FAILED(rv)) {
    return Err(NS_ERROR_FAILURE);
  }
  if (MOZ_UNLIKELY(aRangesToDelete.IsCollapsed())) {
    return CaretPoint(EditorDOMPoint());  // no range to delete
  }

  // FYI: rangeToDelete does not contain newly empty inline ancestors which
  //      are removed by DeleteTextAndNormalizeSurroundingWhiteSpaces().
  //      So, if `getTargetRanges()` needs to include parent empty elements,
  //      we need to extend the range with
  //      HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement().
  EditorRawDOMRange rangeToDelete(aRangesToDelete.FirstRangeRef());
  if (MOZ_UNLIKELY(!rangeToDelete.IsInTextNodes())) {
    NS_WARNING("The extended range to delete character was not in text nodes");
    return Err(NS_ERROR_FAILURE);
  }

  Result<CaretPoint, nsresult> caretPointOrError =
      aHTMLEditor.DeleteTextAndNormalizeSurroundingWhiteSpaces(
          rangeToDelete.StartRef().AsInText(),
          rangeToDelete.EndRef().AsInText(),
          TreatEmptyTextNodes::RemoveAllEmptyInlineAncestors,
          aDirectionAndAmount == nsIEditor::eNext ? DeleteDirection::Forward
                                                  : DeleteDirection::Backward);
  aHTMLEditor.TopLevelEditSubActionDataRef().mDidNormalizeWhitespaces = true;
  NS_WARNING_ASSERTION(
      caretPointOrError.isOk(),
      "HTMLEditor::DeleteTextAndNormalizeSurroundingWhiteSpaces() failed");
  return caretPointOrError;
}

Result<CaretPoint, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    HandleDeleteCollapsedSelectionAtWhiteSpaces(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aPointToDelete, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!StaticPrefs::editor_white_space_normalization_blink_compatible());

  EditorDOMPoint pointToPutCaret;
  if (aDirectionAndAmount == nsIEditor::eNext) {
    Result<CaretPoint, nsresult> caretPointOrError =
        WhiteSpaceVisibilityKeeper::DeleteInclusiveNextWhiteSpace(
            aHTMLEditor, aPointToDelete, aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::DeleteInclusiveNextWhiteSpace() failed");
      return caretPointOrError;
    }
    caretPointOrError.unwrap().MoveCaretPointTo(
        pointToPutCaret, aHTMLEditor,
        {SuggestCaret::OnlyIfHasSuggestion,
         SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
  } else {
    Result<CaretPoint, nsresult> caretPointOrError =
        WhiteSpaceVisibilityKeeper::DeletePreviousWhiteSpace(
            aHTMLEditor, aPointToDelete, aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::DeletePreviousWhiteSpace() failed");
      return caretPointOrError;
    }
    caretPointOrError.unwrap().MoveCaretPointTo(
        pointToPutCaret, aHTMLEditor,
        {SuggestCaret::OnlyIfHasSuggestion,
         SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
  }
  const auto newCaretPosition =
      aHTMLEditor.GetFirstSelectionStartPoint<EditorDOMPoint>();
  if (MOZ_UNLIKELY(!newCaretPosition.IsSet())) {
    NS_WARNING("There was no selection range");
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  Result<CaretPoint, nsresult> caretPointOrError =
      aHTMLEditor.InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary(
          newCaretPosition);
  if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
    NS_WARNING(
        "HTMLEditor::InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary()"
        " failed");
    return caretPointOrError;
  }
  caretPointOrError.unwrap().MoveCaretPointTo(
      pointToPutCaret, {SuggestCaret::OnlyIfHasSuggestion});
  return CaretPoint(std::move(pointToPutCaret));
}

Result<CaretPoint, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    HandleDeleteCollapsedSelectionAtVisibleChar(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        AutoRangeArray& aRangesToDelete,
        const EditorDOMPoint& aPointAtDeletingChar,
        const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsTopLevelEditSubActionDataAvailable());
  MOZ_ASSERT(!StaticPrefs::editor_white_space_normalization_blink_compatible());
  MOZ_ASSERT(aPointAtDeletingChar.IsSet());
  MOZ_ASSERT(aPointAtDeletingChar.IsInTextNode());

  OwningNonNull<Text> visibleTextNode =
      *aPointAtDeletingChar.ContainerAs<Text>();
  EditorDOMPoint startToDelete, endToDelete;
  // FIXME: This does not care grapheme cluster of complicate character
  // sequence like Emoji.
  // TODO: Investigate what happens if a grapheme cluster which should be
  // delete once is split to multiple text nodes.
  // TODO: We should stop using this path, instead, we should extend the range
  // before calling this method.
  if (aDirectionAndAmount == nsIEditor::ePrevious) {
    if (MOZ_UNLIKELY(aPointAtDeletingChar.IsStartOfContainer())) {
      return Err(NS_ERROR_UNEXPECTED);
    }
    startToDelete = aPointAtDeletingChar.PreviousPoint();
    endToDelete = aPointAtDeletingChar;
    // Bug 1068979: delete both codepoints if surrogate pair
    if (!startToDelete.IsStartOfContainer()) {
      const nsTextFragment* text = &visibleTextNode->TextFragment();
      if (text->IsLowSurrogateFollowingHighSurrogateAt(
              startToDelete.Offset())) {
        startToDelete.RewindOffset();
      }
    }
  } else {
    if (NS_WARN_IF(aRangesToDelete.Ranges().IsEmpty()) ||
        NS_WARN_IF(aRangesToDelete.FirstRangeRef()->GetStartContainer() !=
                   aPointAtDeletingChar.GetContainer()) ||
        NS_WARN_IF(aRangesToDelete.FirstRangeRef()->GetEndContainer() !=
                   aPointAtDeletingChar.GetContainer())) {
      return Err(NS_ERROR_FAILURE);
    }
    startToDelete = aRangesToDelete.FirstRangeRef()->StartRef();
    endToDelete = aRangesToDelete.FirstRangeRef()->EndRef();
  }

  {
    Result<CaretPoint, nsresult> caretPointOrError =
        WhiteSpaceVisibilityKeeper::PrepareToDeleteRangeAndTrackPoints(
            aHTMLEditor, &startToDelete, &endToDelete, aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::PrepareToDeleteRangeAndTrackPoints() "
          "failed");
      return caretPointOrError.propagateErr();
    }
    // Ignore caret position because we'll set caret position below
    caretPointOrError.unwrap().IgnoreCaretPointSuggestion();
  }

  if (aHTMLEditor.MayHaveMutationEventListeners(
          NS_EVENT_BITS_MUTATION_NODEREMOVED |
          NS_EVENT_BITS_MUTATION_NODEREMOVEDFROMDOCUMENT |
          NS_EVENT_BITS_MUTATION_ATTRMODIFIED |
          NS_EVENT_BITS_MUTATION_CHARACTERDATAMODIFIED) &&
      (NS_WARN_IF(!startToDelete.IsSetAndValid()) ||
       NS_WARN_IF(!startToDelete.IsInTextNode()) ||
       NS_WARN_IF(!endToDelete.IsSetAndValid()) ||
       NS_WARN_IF(!endToDelete.IsInTextNode()) ||
       NS_WARN_IF(startToDelete.ContainerAs<Text>() != visibleTextNode) ||
       NS_WARN_IF(endToDelete.ContainerAs<Text>() != visibleTextNode) ||
       NS_WARN_IF(startToDelete.Offset() >= endToDelete.Offset()))) {
    NS_WARNING("Mutation event listener changed the DOM tree");
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  EditorDOMPoint pointToPutCaret = startToDelete;
  {
    AutoTrackDOMPoint trackPointToPutCaret(aHTMLEditor.RangeUpdaterRef(),
                                           &pointToPutCaret);
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.DeleteTextWithTransaction(
            visibleTextNode, startToDelete.Offset(),
            endToDelete.Offset() - startToDelete.Offset());
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
      return caretPointOrError.propagateErr();
    }
    trackPointToPutCaret.FlushAndStopTracking();
    caretPointOrError.unwrap().MoveCaretPointTo(
        pointToPutCaret, aHTMLEditor,
        {SuggestCaret::OnlyIfHasSuggestion,
         SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
  }

  // XXX When Backspace key is pressed, Chromium removes following empty
  //     text nodes when removing the last character of the non-empty text
  //     node.  However, Edge never removes empty text nodes even if
  //     selection is in the following empty text node(s).  For now, we
  //     should keep our traditional behavior same as Edge for backward
  //     compatibility.
  // XXX When Delete key is pressed, Edge removes all preceding empty
  //     text nodes when removing the first character of the non-empty
  //     text node.  Chromium removes only selected empty text node and
  //     following empty text nodes and the first character of the
  //     non-empty text node.  For now, we should keep our traditional
  //     behavior same as Chromium for backward compatibility.
  {
    AutoTrackDOMPoint trackPointToPutCaret(aHTMLEditor.RangeUpdaterRef(),
                                           &pointToPutCaret);
    nsresult rv =
        DeleteNodeIfInvisibleAndEditableTextNode(aHTMLEditor, visibleTextNode);
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "AutoDeleteRangesHandler::DeleteNodeIfInvisibleAndEditableTextNode() "
        "failed, but ignored");
  }

  if (NS_WARN_IF(!pointToPutCaret.IsSet())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  // XXX `Selection` may be modified by mutation event listeners so
  //     that we should use EditorDOMPoint::AtEndOf(visibleTextNode)
  //     instead.  (Perhaps, we don't and/or shouldn't need to do this
  //     if the text node is preformatted.)
  AutoTrackDOMPoint trackPointToPutCaret(aHTMLEditor.RangeUpdaterRef(),
                                         &pointToPutCaret);
  Result<CaretPoint, nsresult> caretPointOrError =
      aHTMLEditor.InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary(
          pointToPutCaret);
  if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
    NS_WARNING(
        "HTMLEditor::InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary()"
        " failed");
    return caretPointOrError.propagateErr();
  }
  trackPointToPutCaret.FlushAndStopTracking();
  caretPointOrError.unwrap().MoveCaretPointTo(
      pointToPutCaret, {SuggestCaret::OnlyIfHasSuggestion});
  // Remember that we did a ranged delete for the benefit of
  // AfterEditInner().
  aHTMLEditor.TopLevelEditSubActionDataRef().mDidDeleteNonCollapsedRange = true;
  return CaretPoint(std::move(pointToPutCaret));
}

// static
nsIContent* HTMLEditor::AutoDeleteRangesHandler::GetAtomicContentToDelete(
    nsIEditor::EDirection aDirectionAndAmount,
    const WSRunScanner& aWSRunScannerAtCaret,
    const WSScanResult& aScanFromCaretPointResult) {
  MOZ_ASSERT(aScanFromCaretPointResult.GetContent());

  if (!aScanFromCaretPointResult.ReachedSpecialContent()) {
    return aScanFromCaretPointResult.GetContent();
  }

  if (!aScanFromCaretPointResult.GetContent()->IsText() ||
      HTMLEditUtils::IsRemovableNode(*aScanFromCaretPointResult.GetContent())) {
    return aScanFromCaretPointResult.GetContent();
  }

  // aScanFromCaretPointResult is non-removable text node.
  // Since we try removing atomic content, we look for removable node from
  // scanned point that is non-removable text.
  nsIContent* removableRoot = aScanFromCaretPointResult.GetContent();
  while (removableRoot && !HTMLEditUtils::IsRemovableNode(*removableRoot)) {
    removableRoot = removableRoot->GetParent();
  }

  if (removableRoot) {
    return removableRoot;
  }

  // Not found better content. This content may not be removable.
  return aScanFromCaretPointResult.GetContent();
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::ComputeRangesToDeleteAtomicContent(
    Element* aEditingHost, const nsIContent& aAtomicContent,
    AutoRangeArray& aRangesToDelete) const {
  EditorDOMRange rangeToDelete =
      WSRunScanner::GetRangesForDeletingAtomicContent(aEditingHost,
                                                      aAtomicContent);
  if (!rangeToDelete.IsPositioned()) {
    NS_WARNING("WSRunScanner::GetRangeForDeleteAContentNode() failed");
    return NS_ERROR_FAILURE;
  }
  nsresult rv = aRangesToDelete.SetStartAndEnd(rangeToDelete.StartRef(),
                                               rangeToDelete.EndRef());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoRangeArray::SetStartAndEnd() failed");
  return rv;
}

Result<CaretPoint, nsresult>
HTMLEditor::AutoDeleteRangesHandler::HandleDeleteAtomicContent(
    HTMLEditor& aHTMLEditor, nsIContent& aAtomicContent,
    const EditorDOMPoint& aCaretPoint, const WSRunScanner& aWSRunScannerAtCaret,
    const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!HTMLEditUtils::IsInvisibleBRElement(aAtomicContent));
  MOZ_ASSERT(&aAtomicContent != aWSRunScannerAtCaret.GetEditingHost());

  EditorDOMPoint pointToPutCaret = aCaretPoint;
  {
    AutoTrackDOMPoint trackPointToPutCaret(aHTMLEditor.RangeUpdaterRef(),
                                           &pointToPutCaret);
    Result<CaretPoint, nsresult> caretPointOrError =
        WhiteSpaceVisibilityKeeper::DeleteContentNodeAndJoinTextNodesAroundIt(
            aHTMLEditor, aAtomicContent, aCaretPoint, aEditingHost);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::"
          "DeleteContentNodeAndJoinTextNodesAroundIt() failed");
      return caretPointOrError;
    }
    trackPointToPutCaret.FlushAndStopTracking();
    caretPointOrError.unwrap().MoveCaretPointTo(
        pointToPutCaret, aHTMLEditor,
        {SuggestCaret::OnlyIfHasSuggestion,
         SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
    if (NS_WARN_IF(!pointToPutCaret.IsSet())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  {
    AutoTrackDOMPoint trackPointToPutCaret(aHTMLEditor.RangeUpdaterRef(),
                                           &pointToPutCaret);
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary(
            pointToPutCaret);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "HTMLEditor::"
          "InsertBRElementIfHardLineIsEmptyAndEndsWithBlockBoundary()"
          " failed");
      return caretPointOrError;
    }
    trackPointToPutCaret.FlushAndStopTracking();
    caretPointOrError.unwrap().MoveCaretPointTo(
        pointToPutCaret, aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion});
    if (NS_WARN_IF(!pointToPutCaret.IsSet())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }
  return CaretPoint(std::move(pointToPutCaret));
}

// static
Result<bool, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    ExtendRangeToContainAncestorInlineElementsAtStart(
        nsRange& aRangeToDelete, const Element& aEditingHost) {
  MOZ_ASSERT(aRangeToDelete.IsPositioned());
  MOZ_ASSERT(aRangeToDelete.GetCommonAncestorContainer(IgnoreErrors()));
  MOZ_ASSERT(aRangeToDelete.GetCommonAncestorContainer(IgnoreErrors())
                 ->IsInclusiveDescendantOf(&aEditingHost));

  EditorRawDOMPoint startPoint(aRangeToDelete.StartRef());
  if (startPoint.IsInTextNode()) {
    if (!startPoint.IsStartOfContainer()) {
      // FIXME: If before the point has only collapsible white-spaces and the
      // text node follows a block boundary, we should treat the range start
      // from start of the text node.
      return true;
    }
    startPoint.Set(startPoint.ContainerAs<Text>());
    if (NS_WARN_IF(!startPoint.IsSet())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (startPoint.GetContainer() == &aEditingHost) {
      return false;
    }
  } else if (startPoint.IsInDataNode()) {
    startPoint.Set(startPoint.ContainerAs<nsIContent>());
    if (NS_WARN_IF(!startPoint.IsSet())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (startPoint.GetContainer() == &aEditingHost) {
      return false;
    }
  } else if (startPoint.GetContainer() == &aEditingHost) {
    return false;
  }

  // FYI: This method is designed for deleting inline elements which become
  // empty if aRangeToDelete which crosses a block boundary of right block
  // child.  Therefore, you may need to improve this method if you want to use
  // this in the other cases.

  nsINode* const commonAncestor =
      nsContentUtils::GetClosestCommonInclusiveAncestor(
          startPoint.GetContainer(), aRangeToDelete.GetEndContainer());
  if (NS_WARN_IF(!commonAncestor)) {
    return Err(NS_ERROR_FAILURE);
  }
  MOZ_ASSERT(commonAncestor->IsInclusiveDescendantOf(&aEditingHost));

  EditorRawDOMPoint newStartPoint(startPoint);
  while (newStartPoint.GetContainer() != &aEditingHost &&
         newStartPoint.GetContainer() != commonAncestor) {
    if (NS_WARN_IF(!newStartPoint.IsInContentNode())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (!HTMLEditUtils::IsInlineContent(
            *newStartPoint.ContainerAs<nsIContent>(),
            BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
      break;
    }
    // The container is inline, check whether the point is first visible point
    // or not to consider whether climbing up the tree.
    bool foundVisiblePrevSibling = false;
    for (nsIContent* content = newStartPoint.GetPreviousSiblingOfChild();
         content; content = content->GetPreviousSibling()) {
      if (Text* text = Text::FromNode(content)) {
        if (HTMLEditUtils::IsVisibleTextNode(*text)) {
          foundVisiblePrevSibling = true;
          break;
        }
        // The text node is invisible.
      } else if (content->IsComment()) {
        // Ignore the comment node.
      } else if (!HTMLEditUtils::IsInlineContent(
                     *content,
                     BlockInlineCheck::UseComputedDisplayOutsideStyle) ||
                 !HTMLEditUtils::IsEmptyNode(
                     *content,
                     {EmptyCheckOption::TreatSingleBRElementAsVisible})) {
        foundVisiblePrevSibling = true;
        break;
      }
    }
    if (foundVisiblePrevSibling) {
      break;
    }
    // the point can be treated as start of the parent inline now.
    newStartPoint.Set(newStartPoint.ContainerAs<nsIContent>());
    if (NS_WARN_IF(!newStartPoint.IsSet())) {
      return Err(NS_ERROR_FAILURE);
    }
  }
  if (newStartPoint == startPoint) {
    return false;  // Don't need to modify the range
  }
  IgnoredErrorResult error;
  aRangeToDelete.SetStart(newStartPoint.ToRawRangeBoundary(), error);
  if (MOZ_UNLIKELY(error.Failed())) {
    return Err(NS_ERROR_FAILURE);
  }
  return true;
}

bool HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    PrepareToDeleteAtOtherBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, Element& aOtherBlockElement,
        const EditorDOMPoint& aCaretPoint,
        const WSRunScanner& aWSRunScannerAtCaret) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aCaretPoint.IsSetAndValid());

  mMode = Mode::JoinOtherBlock;

  // Make sure it's not a table element.  If so, cancel the operation
  // (translation: users cannot backspace or delete across table cells)
  if (HTMLEditUtils::IsAnyTableElement(&aOtherBlockElement)) {
    return false;
  }

  // First find the adjacent node in the block
  if (aDirectionAndAmount == nsIEditor::ePrevious) {
    mLeafContentInOtherBlock = HTMLEditUtils::GetLastLeafContent(
        aOtherBlockElement, {LeafNodeType::OnlyEditableLeafNode},
        BlockInlineCheck::Unused, &aOtherBlockElement);
    mLeftContent = mLeafContentInOtherBlock;
    mRightContent = aCaretPoint.GetContainerAs<nsIContent>();
  } else {
    mLeafContentInOtherBlock = HTMLEditUtils::GetFirstLeafContent(
        aOtherBlockElement, {LeafNodeType::OnlyEditableLeafNode},
        BlockInlineCheck::Unused, &aOtherBlockElement);
    mLeftContent = aCaretPoint.GetContainerAs<nsIContent>();
    mRightContent = mLeafContentInOtherBlock;
  }

  // Next to a block.  See if we are between the block and a `<br>`.
  // If so, we really want to delete the `<br>`.  Else join content at
  // selection to the block.
  const WSScanResult scanFromCaretResult =
      aDirectionAndAmount == nsIEditor::eNext
          ? aWSRunScannerAtCaret.ScanPreviousVisibleNodeOrBlockBoundaryFrom(
                aCaretPoint)
          : aWSRunScannerAtCaret
                .ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(aCaretPoint);
  // If we found a `<br>` element, we need to delete it instead of joining the
  // contents.
  if (scanFromCaretResult.ReachedBRElement()) {
    mBRElement = scanFromCaretResult.BRElementPtr();
    mMode = Mode::DeleteBRElement;
    return true;
  }

  return mLeftContent && mRightContent;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteLineBreak(const HTMLEditor& aHTMLEditor,
                                  nsRange& aRangeToDelete,
                                  const Element& aEditingHost,
                                  ComputeRangeFor aComputeRangeFor) const {
  // FIXME: Scan invisible leading white-spaces after the <br>.
  MOZ_ASSERT_IF(mMode == Mode::DeleteBRElement, mBRElement);
  MOZ_ASSERT_IF(mMode == Mode::DeletePrecedingBRElementOfBlock, mBRElement);
  MOZ_ASSERT_IF(mMode == Mode::DeletePrecedingPreformattedLineBreak,
                mPreformattedLineBreak.IsSetAndValid());
  MOZ_ASSERT_IF(mMode == Mode::DeletePrecedingPreformattedLineBreak,
                mPreformattedLineBreak.IsCharPreformattedNewLine());
  MOZ_ASSERT_IF(aComputeRangeFor == ComputeRangeFor::GetTargetRanges,
                aRangeToDelete.IsPositioned());

  // If we're computing for beforeinput.getTargetRanges() and the inputType
  // is not a simple deletion like replacing selected content with new
  // content, the range should end at the original end boundary of the given
  // range.
  const bool preserveEndBoundary =
      (mMode == Mode::DeletePrecedingBRElementOfBlock ||
       mMode == Mode::DeletePrecedingPreformattedLineBreak) &&
      aComputeRangeFor == ComputeRangeFor::GetTargetRanges &&
      !MayEditActionDeleteAroundCollapsedSelection(aHTMLEditor.GetEditAction());

  if (mMode != Mode::DeletePrecedingPreformattedLineBreak) {
    Element* const mostDistantInlineAncestor =
        HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
            *mBRElement, BlockInlineCheck::UseComputedDisplayOutsideStyle,
            &aEditingHost);
    if (preserveEndBoundary) {
      // FIXME: If the range ends at end of an inline element, we may need to
      // extend the range.
      IgnoredErrorResult error;
      aRangeToDelete.SetStart(EditorRawDOMPoint(mostDistantInlineAncestor
                                                    ? mostDistantInlineAncestor
                                                    : mBRElement)
                                  .ToRawRangeBoundary(),
                              error);
      NS_WARNING_ASSERTION(!error.Failed(), "nsRange::SetStart() failed");
      MOZ_ASSERT_IF(!error.Failed(), !aRangeToDelete.Collapsed());
      return error.StealNSResult();
    }
    IgnoredErrorResult error;
    aRangeToDelete.SelectNode(
        mostDistantInlineAncestor ? *mostDistantInlineAncestor : *mBRElement,
        error);
    NS_WARNING_ASSERTION(!error.Failed(), "nsRange::SelectNode() failed");
    return error.StealNSResult();
  }

  Element* const mostDistantInlineAncestor =
      mPreformattedLineBreak.ContainerAs<Text>()->TextDataLength() == 1
          ? HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
                *mPreformattedLineBreak.ContainerAs<Text>(),
                BlockInlineCheck::UseComputedDisplayOutsideStyle, &aEditingHost)
          : nullptr;

  if (!mostDistantInlineAncestor) {
    if (preserveEndBoundary) {
      // FIXME: If the range ends at end of an inline element, we may need to
      // extend the range.
      IgnoredErrorResult error;
      aRangeToDelete.SetStart(mPreformattedLineBreak.ToRawRangeBoundary(),
                              error);
      MOZ_ASSERT_IF(!error.Failed(), !aRangeToDelete.Collapsed());
      NS_WARNING_ASSERTION(!error.Failed(), "nsRange::SetStart() failed");
      return error.StealNSResult();
    }
    nsresult rv = aRangeToDelete.SetStartAndEnd(
        mPreformattedLineBreak.ToRawRangeBoundary(),
        mPreformattedLineBreak.NextPoint().ToRawRangeBoundary());
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "nsRange::SetStartAndEnd() failed");
    return rv;
  }

  if (preserveEndBoundary) {
    // FIXME: If the range ends at end of an inline element, we may need to
    // extend the range.
    IgnoredErrorResult error;
    aRangeToDelete.SetStart(
        EditorRawDOMPoint(mostDistantInlineAncestor).ToRawRangeBoundary(),
        error);
    MOZ_ASSERT_IF(!error.Failed(), !aRangeToDelete.Collapsed());
    NS_WARNING_ASSERTION(!error.Failed(), "nsRange::SetStart() failed");
    return error.StealNSResult();
  }

  IgnoredErrorResult error;
  aRangeToDelete.SelectNode(*mostDistantInlineAncestor, error);
  NS_WARNING_ASSERTION(!error.Failed(), "nsRange::SelectNode() failed");
  return error.StealNSResult();
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::HandleDeleteLineBreak(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aCaretPoint, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(mBRElement || mPreformattedLineBreak.IsSet());

  // If we're deleting selection (not replacing with new content), we should
  // put caret to end of preceding text node if there is.  Then, users can type
  // text in it like the other browsers.
  EditorDOMPoint pointToPutCaret = [&]() {
    // but when we're deleting a preceding line break of current block, we
    // should keep the caret position in the current block.
    if (mMode == Mode::DeletePrecedingBRElementOfBlock ||
        mMode == Mode::DeletePrecedingPreformattedLineBreak) {
      return aCaretPoint;
    }
    if (!MayEditActionDeleteAroundCollapsedSelection(
            aHTMLEditor.GetEditAction())) {
      return EditorDOMPoint();
    }
    WSRunScanner scanner(&aEditingHost, EditorRawDOMPoint(mBRElement),
                         BlockInlineCheck::UseComputedDisplayOutsideStyle);
    const WSScanResult maybePreviousText =
        scanner.ScanPreviousVisibleNodeOrBlockBoundaryFrom(
            EditorRawDOMPoint(mBRElement));
    if (maybePreviousText.IsContentEditable() &&
        maybePreviousText.InVisibleOrCollapsibleCharacters() &&
        !HTMLEditor::GetLinkElement(maybePreviousText.TextPtr())) {
      return maybePreviousText.PointAfterReachedContent<EditorDOMPoint>();
    }
    const WSScanResult maybeNextText =
        scanner.ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
            EditorRawDOMPoint::After(*mBRElement));
    if (maybeNextText.IsContentEditable() &&
        maybeNextText.InVisibleOrCollapsibleCharacters()) {
      return maybeNextText.PointAtReachedContent<EditorDOMPoint>();
    }
    return EditorDOMPoint();
  }();

  RefPtr<nsRange> rangeToDelete =
      nsRange::Create(const_cast<Element*>(&aEditingHost));
  MOZ_ASSERT(rangeToDelete);
  nsresult rv =
      ComputeRangeToDeleteLineBreak(aHTMLEditor, *rangeToDelete, aEditingHost,
                                    ComputeRangeFor::ToDeleteTheRange);
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoBlockElementsJoiner::ComputeRangeToDeleteLineBreak() failed");
    return Err(rv);
  }
  Result<EditActionResult, nsresult> result = HandleDeleteNonCollapsedRange(
      aHTMLEditor, aDirectionAndAmount, nsIEditor::eNoStrip, *rangeToDelete,
      SelectionWasCollapsed::Yes, aEditingHost);
  if (MOZ_UNLIKELY(result.isErr())) {
    NS_WARNING(
        "AutoBlockElementsJoiner::HandleDeleteNonCollapsedRange() failed");
    return result;
  }

  if (mLeftContent && mRightContent &&
      HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mLeftContent) !=
          HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mRightContent)) {
    return EditActionResult::HandledResult();
  }

  // Put selection at edge of block and we are done.
  if (NS_WARN_IF(mMode == Mode::DeleteBRElement && !mLeafContentInOtherBlock)) {
    // XXX This must be odd case.  The other block can be empty.
    return Err(NS_ERROR_FAILURE);
  }

  if (pointToPutCaret.IsSet()) {
    nsresult rv = aHTMLEditor.CollapseSelectionTo(pointToPutCaret);
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    if (mMode == Mode::DeleteBRElement && NS_SUCCEEDED(rv)) {
      // If we prefer to use style in the previous line, we should forget
      // previous styles since the caret position has all styles which we want
      // to use with new content.
      if (nsIEditor::DirectionIsBackspace(aDirectionAndAmount)) {
        aHTMLEditor.TopLevelEditSubActionDataRef()
            .mCachedPendingStyles->Clear();
      }
      // And we don't want to keep extending a link at ex-end of the previous
      // paragraph.
      if (HTMLEditor::GetLinkElement(pointToPutCaret.GetContainer())) {
        aHTMLEditor.mPendingStylesToApplyToNewContent
            ->ClearLinkAndItsSpecifiedStyle();
      }
    } else {
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "EditorBase::CollapseSelectionTo() failed, but ignored");
    }
    return EditActionResult::HandledResult();
  }

  EditorRawDOMPoint newCaretPosition =
      HTMLEditUtils::GetGoodCaretPointFor<EditorRawDOMPoint>(
          *mLeafContentInOtherBlock, aDirectionAndAmount);
  if (MOZ_UNLIKELY(!newCaretPosition.IsSet())) {
    NS_WARNING("HTMLEditUtils::GetGoodCaretPointFor() failed");
    return Err(NS_ERROR_FAILURE);
  }
  rv = aHTMLEditor.CollapseSelectionTo(newCaretPosition);
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return Err(NS_ERROR_EDITOR_DESTROYED);
  }
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed, but ignored");
  return EditActionResult::HandledResult();
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteAtOtherBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
        const Element& aEditingHost) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aCaretPoint.IsSetAndValid());
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mRightContent);

  if (HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mLeftContent) !=
      HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mRightContent)) {
    if (!mDeleteRangesHandlerConst.CanFallbackToDeleteRangeWithTransaction(
            aRangeToDelete)) {
      nsresult rv = aRangeToDelete.CollapseTo(aCaretPoint.ToRawRangeBoundary());
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "nsRange::CollapseTo() failed");
      return rv;
    }
    nsresult rv = mDeleteRangesHandlerConst
                      .FallbackToComputeRangeToDeleteRangeWithTransaction(
                          aHTMLEditor, aRangeToDelete, aEditingHost);
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "AutoDeleteRangesHandler::"
        "FallbackToComputeRangeToDeleteRangeWithTransaction() failed");
    return rv;
  }

  AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                  *mRightContent);
  Result<bool, nsresult> canJoinThem =
      joiner.Prepare(aHTMLEditor, aEditingHost);
  if (canJoinThem.isErr()) {
    NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
    return canJoinThem.unwrapErr();
  }
  if (canJoinThem.inspect() && joiner.CanJoinBlocks() &&
      !joiner.ShouldDeleteLeafContentInstead()) {
    nsresult rv =
        joiner.ComputeRangeToDelete(aHTMLEditor, aCaretPoint, aRangeToDelete);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoInclusiveAncestorBlockElementsJoiner::"
                         "ComputeRangeToDelete() failed");
    return rv;
  }

  // If AutoInclusiveAncestorBlockElementsJoiner didn't handle it and it's not
  // canceled, user may want to modify the start leaf node or the last leaf
  // node of the block.
  if (mLeafContentInOtherBlock == aCaretPoint.GetContainer()) {
    return NS_OK;
  }

  AutoHideSelectionChanges hideSelectionChanges(aHTMLEditor.SelectionRef());

  // If it's ignored, it didn't modify the DOM tree.  In this case, user must
  // want to delete nearest leaf node in the other block element.
  // TODO: We need to consider this before calling ComputeRangesToDelete() for
  //       computing the deleting range.
  EditorRawDOMPoint newCaretPoint =
      aDirectionAndAmount == nsIEditor::ePrevious
          ? EditorRawDOMPoint::AtEndOf(*mLeafContentInOtherBlock)
          : EditorRawDOMPoint(mLeafContentInOtherBlock, 0);
  // If new caret position is same as current caret position, we can do
  // nothing anymore.
  if (aRangeToDelete.Collapsed() &&
      aRangeToDelete.EndRef() == newCaretPoint.ToRawRangeBoundary()) {
    return NS_OK;
  }
  // TODO: Stop modifying the `Selection` for computing the target ranges.
  nsresult rv = aHTMLEditor.CollapseSelectionTo(newCaretPoint);
  if (MOZ_UNLIKELY(rv == NS_ERROR_EDITOR_DESTROYED)) {
    NS_WARNING(
        "EditorBase::CollapseSelectionTo() caused destroying the editor");
    return NS_ERROR_EDITOR_DESTROYED;
  }
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed");
  if (NS_SUCCEEDED(rv)) {
    AutoRangeArray rangeArray(aHTMLEditor.SelectionRef());
    AutoDeleteRangesHandler anotherHandler(mDeleteRangesHandlerConst);
    rv = anotherHandler.ComputeRangesToDelete(aHTMLEditor, aDirectionAndAmount,
                                              rangeArray, aEditingHost);
    if (NS_SUCCEEDED(rv)) {
      if (MOZ_LIKELY(!rangeArray.Ranges().IsEmpty())) {
        MOZ_ASSERT(rangeArray.Ranges().Length() == 1);
        aRangeToDelete.SetStartAndEnd(rangeArray.FirstRangeRef()->StartRef(),
                                      rangeArray.FirstRangeRef()->EndRef());
      } else {
        NS_WARNING(
            "Recursive AutoDeleteRangesHandler::ComputeRangesToDelete() "
            "returned no range");
        rv = NS_ERROR_FAILURE;
      }
    } else {
      NS_WARNING(
          "Recursive AutoDeleteRangesHandler::ComputeRangesToDelete() failed");
    }
  }
  // Restore selection.
  nsresult rvCollapsingSelectionTo =
      aHTMLEditor.CollapseSelectionTo(aCaretPoint);
  if (MOZ_UNLIKELY(rvCollapsingSelectionTo == NS_ERROR_EDITOR_DESTROYED)) {
    NS_WARNING(
        "EditorBase::CollapseSelectionTo() caused destroying the editor");
    return NS_ERROR_EDITOR_DESTROYED;
  }
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rvCollapsingSelectionTo),
      "EditorBase::CollapseSelectionTo() failed to restore caret position");
  return NS_SUCCEEDED(rv) && NS_SUCCEEDED(rvCollapsingSelectionTo)
             ? NS_OK
             : NS_ERROR_FAILURE;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::HandleDeleteAtOtherBlockBoundary(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers,
        const EditorDOMPoint& aCaretPoint, nsRange& aRangeToDelete,
        const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aCaretPoint.IsSetAndValid());
  MOZ_ASSERT(mDeleteRangesHandler);
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mRightContent);

  if (HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mLeftContent) !=
      HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mRightContent)) {
    // If we have not deleted `<br>` element and are not called recursively,
    // we should call `DeleteRangesWithTransaction()` here.
    if (!mDeleteRangesHandler->CanFallbackToDeleteRangeWithTransaction(
            aRangeToDelete)) {
      return EditActionResult::IgnoredResult();
    }
    Result<CaretPoint, nsresult> caretPointOrError =
        mDeleteRangesHandler->FallbackToDeleteRangeWithTransaction(
            aHTMLEditor, aRangeToDelete);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      NS_WARNING(
          "AutoDeleteRangesHandler::FallbackToDeleteRangesWithTransaction() "
          "failed");
      return caretPointOrError.propagateErr();
    }
    nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
        aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                      SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                      SuggestCaret::AndIgnoreTrivialError});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(
        rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
        "CaretPoint::SuggestCaretPointTo() failed, but ignored");
    // Don't return "ignored" to avoid to fall it back to delete ranges
    // recursively.
    return EditActionResult::HandledResult();
  }

  // Else we are joining content to block
  AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                  *mRightContent);
  Result<bool, nsresult> canJoinThem =
      joiner.Prepare(aHTMLEditor, aEditingHost);
  if (MOZ_UNLIKELY(canJoinThem.isErr())) {
    NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
    return canJoinThem.propagateErr();
  }

  if (!canJoinThem.inspect()) {
    nsresult rv = aHTMLEditor.CollapseSelectionTo(aCaretPoint);
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "EditorBase::CollapseSelectionTo() failed, but ignored");
    return EditActionResult::CanceledResult();
  }

  auto result = EditActionResult::IgnoredResult();
  EditorDOMPoint pointToPutCaret(aCaretPoint);
  if (joiner.CanJoinBlocks()) {
    {
      AutoTrackDOMPoint tracker(aHTMLEditor.RangeUpdaterRef(),
                                &pointToPutCaret);
      Result<EditActionResult, nsresult> joinResult =
          joiner.Run(aHTMLEditor, aEditingHost);
      if (MOZ_UNLIKELY(joinResult.isErr())) {
        NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Run() failed");
        return joinResult;
      }
      result |= joinResult.unwrap();
#ifdef DEBUG
      if (joiner.ShouldDeleteLeafContentInstead()) {
        NS_ASSERTION(
            result.Ignored(),
            "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
            "returning ignored, but returned not ignored");
      } else {
        NS_ASSERTION(
            !result.Ignored(),
            "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
            "returning handled, but returned ignored");
      }
#endif  // #ifdef DEBUG
      // If we're deleting selection (not replacing with new content) and
      // AutoInclusiveAncestorBlockElementsJoiner computed new caret position,
      // we should use it.  Otherwise, we should keep the our traditional
      // behavior.
      if (result.Handled() && joiner.PointRefToPutCaret().IsSet()) {
        nsresult rv =
            aHTMLEditor.CollapseSelectionTo(joiner.PointRefToPutCaret());
        if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
          return Err(NS_ERROR_EDITOR_DESTROYED);
        }
        if (NS_FAILED(rv)) {
          NS_WARNING("EditorBase::CollapseSelectionTo() failed, but ignored");
          return result;
        }
        // If we prefer to use style in the previous line, we should forget
        // previous styles since the caret position has all styles which we want
        // to use with new content.
        if (nsIEditor::DirectionIsBackspace(aDirectionAndAmount)) {
          aHTMLEditor.TopLevelEditSubActionDataRef()
              .mCachedPendingStyles->Clear();
        }
        // And we don't want to keep extending a link at ex-end of the previous
        // paragraph.
        if (HTMLEditor::GetLinkElement(
                joiner.PointRefToPutCaret().GetContainer())) {
          aHTMLEditor.mPendingStylesToApplyToNewContent
              ->ClearLinkAndItsSpecifiedStyle();
        }
        return result;
      }
    }

    // If AutoInclusiveAncestorBlockElementsJoiner didn't handle it and it's not
    // canceled, user may want to modify the start leaf node or the last leaf
    // node of the block.
    if (result.Ignored() &&
        mLeafContentInOtherBlock != aCaretPoint.GetContainer()) {
      // If it's ignored, it didn't modify the DOM tree.  In this case, user
      // must want to delete nearest leaf node in the other block element.
      // TODO: We need to consider this before calling Run() for computing the
      //       deleting range.
      EditorRawDOMPoint newCaretPoint =
          aDirectionAndAmount == nsIEditor::ePrevious
              ? EditorRawDOMPoint::AtEndOf(*mLeafContentInOtherBlock)
              : EditorRawDOMPoint(mLeafContentInOtherBlock, 0);
      // If new caret position is same as current caret position, we can do
      // nothing anymore.
      if (aRangeToDelete.Collapsed() &&
          aRangeToDelete.EndRef() == newCaretPoint.ToRawRangeBoundary()) {
        return EditActionResult::CanceledResult();
      }
      nsresult rv = aHTMLEditor.CollapseSelectionTo(newCaretPoint);
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::CollapseSelectionTo() failed");
        return Err(rv);
      }
      AutoRangeArray rangesToDelete(aHTMLEditor.SelectionRef());
      AutoDeleteRangesHandler anotherHandler(mDeleteRangesHandler);
      Result<EditActionResult, nsresult> fallbackResult =
          anotherHandler.Run(aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                             rangesToDelete, aEditingHost);
      if (MOZ_UNLIKELY(fallbackResult.isErr())) {
        NS_WARNING("Recursive AutoDeleteRangesHandler::Run() failed");
        return fallbackResult;
      }
      result |= fallbackResult.unwrap();
      return result;
    }
  } else {
    result.MarkAsHandled();
  }

  // Otherwise, we must have deleted the selection as user expected.
  nsresult rv = aHTMLEditor.CollapseSelectionTo(pointToPutCaret);
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return Err(NS_ERROR_EDITOR_DESTROYED);
  }
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed, but ignored");
  return result;
}

bool HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    PrepareToDeleteAtCurrentBlockBoundary(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount,
        Element& aCurrentBlockElement, const EditorDOMPoint& aCaretPoint,
        const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  // At edge of our block.  Look beside it and see if we can join to an
  // adjacent block
  mMode = Mode::JoinCurrentBlock;

  // Don't break the basic structure of the HTML document.
  if (aCurrentBlockElement.IsAnyOfHTMLElements(nsGkAtoms::html, nsGkAtoms::head,
                                               nsGkAtoms::body)) {
    return false;
  }

  // Make sure it's not a table element.  If so, cancel the operation
  // (translation: users cannot backspace or delete across table cells)
  if (HTMLEditUtils::IsAnyTableElement(&aCurrentBlockElement)) {
    return false;
  }

  auto ScanJoinTarget = [&]() -> nsIContent* {
    nsIContent* targetContent =
        aDirectionAndAmount == nsIEditor::ePrevious
            ? HTMLEditUtils::GetPreviousContent(
                  aCurrentBlockElement, {WalkTreeOption::IgnoreNonEditableNode},
                  BlockInlineCheck::Unused, &aEditingHost)
            : HTMLEditUtils::GetNextContent(
                  aCurrentBlockElement, {WalkTreeOption::IgnoreNonEditableNode},
                  BlockInlineCheck::Unused, &aEditingHost);
    // If found content is an invisible text node, let's scan visible things.
    auto IsIgnorableDataNode = [](nsIContent* aContent) {
      return aContent && HTMLEditUtils::IsRemovableNode(*aContent) &&
             ((aContent->IsText() &&
               aContent->AsText()->TextIsOnlyWhitespace() &&
               !HTMLEditUtils::IsVisibleTextNode(*aContent->AsText())) ||
              (aContent->IsCharacterData() && !aContent->IsText()));
    };
    if (!IsIgnorableDataNode(targetContent)) {
      return targetContent;
    }
    MOZ_ASSERT(mSkippedInvisibleContents.IsEmpty());
    for (nsIContent* adjacentContent =
             aDirectionAndAmount == nsIEditor::ePrevious
                 ? HTMLEditUtils::GetPreviousContent(
                       *targetContent, {WalkTreeOption::StopAtBlockBoundary},
                       BlockInlineCheck::UseComputedDisplayOutsideStyle,
                       &aEditingHost)
                 : HTMLEditUtils::GetNextContent(
                       *targetContent, {WalkTreeOption::StopAtBlockBoundary},
                       BlockInlineCheck::UseComputedDisplayOutsideStyle,
                       &aEditingHost);
         adjacentContent;
         adjacentContent =
             aDirectionAndAmount == nsIEditor::ePrevious
                 ? HTMLEditUtils::GetPreviousContent(
                       *adjacentContent, {WalkTreeOption::StopAtBlockBoundary},
                       BlockInlineCheck::UseComputedDisplayOutsideStyle,
                       &aEditingHost)
                 : HTMLEditUtils::GetNextContent(
                       *adjacentContent, {WalkTreeOption::StopAtBlockBoundary},
                       BlockInlineCheck::UseComputedDisplayOutsideStyle,
                       &aEditingHost)) {
      // If non-editable element is found, we should not skip it to avoid
      // joining too far nodes.
      if (!HTMLEditUtils::IsSimplyEditableNode(*adjacentContent)) {
        break;
      }
      // If block element is found, we should join last leaf content in it.
      if (HTMLEditUtils::IsBlockElement(
              *adjacentContent,
              BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
        nsIContent* leafContent =
            aDirectionAndAmount == nsIEditor::ePrevious
                ? HTMLEditUtils::GetLastLeafContent(
                      *adjacentContent, {LeafNodeType::OnlyEditableLeafNode})
                : HTMLEditUtils::GetFirstLeafContent(
                      *adjacentContent, {LeafNodeType::OnlyEditableLeafNode});
        mSkippedInvisibleContents.AppendElement(*targetContent);
        return leafContent ? leafContent : adjacentContent;
      }
      // Only when the found node is an invisible text node or a non-text data
      // node, we should keep scanning.
      if (IsIgnorableDataNode(adjacentContent)) {
        mSkippedInvisibleContents.AppendElement(*targetContent);
        targetContent = adjacentContent;
        continue;
      }
      // Otherwise, we find a visible things. We should join with last found
      // invisible text node.
      break;
    }
    return targetContent;
  };

  if (aDirectionAndAmount == nsIEditor::ePrevious) {
    const WSScanResult prevVisibleThing = [&]() {
      // When Backspace at start of a block, we need to delete only a preceding
      // <br> element if there is.
      const Result<Element*, nsresult>
          inclusiveAncestorOfRightChildBlockOrError = AutoBlockElementsJoiner::
              GetMostDistantBlockAncestorIfPointIsStartAtBlock(aCaretPoint,
                                                               aEditingHost);
      if (NS_WARN_IF(inclusiveAncestorOfRightChildBlockOrError.isErr()) ||
          !inclusiveAncestorOfRightChildBlockOrError.inspect()) {
        return WSScanResult::Error();
      }
      const WSScanResult prevVisibleThingBeforeCurrentBlock =
          WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
              &aEditingHost,
              EditorRawDOMPoint(
                  inclusiveAncestorOfRightChildBlockOrError.inspect()),
              BlockInlineCheck::UseComputedDisplayOutsideStyle);
      if (!prevVisibleThingBeforeCurrentBlock.ReachedBRElement() &&
          !prevVisibleThingBeforeCurrentBlock.ReachedPreformattedLineBreak()) {
        return WSScanResult::Error();
      }
      // There is a preceding line break, but it may be invisible.  Then, users
      // want to delete its preceding content not only the line break.
      // Therefore, let's check whether the line break follows another line
      // break or a block boundary. In these cases, the line break causes an
      // empty line which users may want to delete.
      const auto atPrecedingLineBreak =
          prevVisibleThingBeforeCurrentBlock
              .PointAtReachedContent<EditorRawDOMPoint>();
      MOZ_ASSERT(atPrecedingLineBreak.IsSet());
      const WSScanResult prevVisibleThingBeforeLineBreak =
          WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
              &aEditingHost, atPrecedingLineBreak,
              BlockInlineCheck::UseComputedDisplayOutsideStyle);
      if (prevVisibleThingBeforeLineBreak.ReachedBRElement() ||
          prevVisibleThingBeforeLineBreak.ReachedPreformattedLineBreak() ||
          prevVisibleThingBeforeLineBreak.ReachedCurrentBlockBoundary()) {
        // Target the latter line break for things simpler.  It's easier to
        // compute the target range.
        MOZ_ASSERT_IF(
            prevVisibleThingBeforeCurrentBlock.ReachedPreformattedLineBreak() &&
                prevVisibleThingBeforeLineBreak.ReachedPreformattedLineBreak(),
            prevVisibleThingBeforeCurrentBlock
                    .PointAtReachedContent<EditorRawDOMPoint>() !=
                prevVisibleThingBeforeLineBreak
                    .PointAtReachedContent<EditorRawDOMPoint>());
        return prevVisibleThingBeforeCurrentBlock;
      }
      return WSScanResult::Error();
    }();

    // If previous visible thing is a <br>, we should just delete it without
    // unwrapping the first line of the right child block.  Note that the <br>
    // is always treated as invisible by HTMLEditUtils because it's immediately
    // preceding <br> of the block boundary.  However, deleting it is fine
    // because the above checks whether it causes empty line or not.
    if (prevVisibleThing.ReachedBRElement()) {
      mMode = Mode::DeletePrecedingBRElementOfBlock;
      mBRElement = prevVisibleThing.BRElementPtr();
      return true;
    }

    // Same for a preformatted line break.
    if (prevVisibleThing.ReachedPreformattedLineBreak()) {
      mMode = Mode::DeletePrecedingPreformattedLineBreak;
      mPreformattedLineBreak =
          prevVisibleThing.PointAtReachedContent<EditorRawDOMPoint>()
              .AsInText();
      return true;
    }

    mLeftContent = ScanJoinTarget();
    mRightContent = aCaretPoint.GetContainerAs<nsIContent>();
  } else {
    mRightContent = ScanJoinTarget();
    mLeftContent = aCaretPoint.GetContainerAs<nsIContent>();
  }

  // Nothing to join
  if (!mLeftContent || !mRightContent) {
    return false;
  }

  // Don't cross table boundaries.
  return HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mLeftContent) ==
         HTMLEditUtils::GetInclusiveAncestorAnyTableElement(*mRightContent);
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteAtCurrentBlockBoundary(
        const HTMLEditor& aHTMLEditor, const EditorDOMPoint& aCaretPoint,
        nsRange& aRangeToDelete, const Element& aEditingHost) const {
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mRightContent);

  AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                  *mRightContent);
  Result<bool, nsresult> canJoinThem =
      joiner.Prepare(aHTMLEditor, aEditingHost);
  if (canJoinThem.isErr()) {
    NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
    return canJoinThem.unwrapErr();
  }
  if (canJoinThem.inspect()) {
    nsresult rv =
        joiner.ComputeRangeToDelete(aHTMLEditor, aCaretPoint, aRangeToDelete);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "AutoInclusiveAncestorBlockElementsJoiner::"
                         "ComputeRangesToDelete() failed");
    return rv;
  }

  // In this case, nothing will be deleted so that the affected range should
  // be collapsed.
  nsresult rv = aRangeToDelete.CollapseTo(aCaretPoint.ToRawRangeBoundary());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "nsRange::CollapseTo() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::HandleDeleteAtCurrentBlockBoundary(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        const EditorDOMPoint& aCaretPoint, const Element& aEditingHost) {
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mRightContent);

  AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                  *mRightContent);
  Result<bool, nsresult> canJoinThem =
      joiner.Prepare(aHTMLEditor, aEditingHost);
  if (MOZ_UNLIKELY(canJoinThem.isErr())) {
    NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
    return Err(canJoinThem.unwrapErr());
  }

  if (!canJoinThem.inspect()) {
    nsresult rv = aHTMLEditor.CollapseSelectionTo(aCaretPoint);
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "EditorBase::CollapseSelectionTo() failed, but ignored");
    return EditActionResult::CanceledResult();
  }

  EditActionResult result = EditActionResult::IgnoredResult();
  EditorDOMPoint pointToPutCaret(aCaretPoint);
  if (joiner.CanJoinBlocks()) {
    AutoTrackDOMPoint tracker(aHTMLEditor.RangeUpdaterRef(), &pointToPutCaret);
    Result<EditActionResult, nsresult> joinResult =
        joiner.Run(aHTMLEditor, aEditingHost);
    if (MOZ_UNLIKELY(joinResult.isErr())) {
      NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Run() failed");
      return joinResult;
    }
    result |= joinResult.unwrap();
#ifdef DEBUG
    if (joiner.ShouldDeleteLeafContentInstead()) {
      NS_ASSERTION(result.Ignored(),
                   "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
                   "returning ignored, but returned not ignored");
    } else {
      NS_ASSERTION(!result.Ignored(),
                   "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
                   "returning handled, but returned ignored");
    }
#endif  // #ifdef DEBUG

    // Cleaning up invisible nodes which are skipped at scanning mLeftContent or
    // mRightContent.
    for (const OwningNonNull<nsIContent>& content : mSkippedInvisibleContents) {
      nsresult rv =
          aHTMLEditor.DeleteNodeWithTransaction(MOZ_KnownLive(content));
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
        return Err(rv);
      }
    }
    mSkippedInvisibleContents.Clear();

    // If we're deleting selection (not replacing with new content) and
    // AutoInclusiveAncestorBlockElementsJoiner computed new caret position, we
    // should use it.  Otherwise, we should keep the our traditional behavior.
    if (result.Handled() && joiner.PointRefToPutCaret().IsSet()) {
      nsresult rv =
          aHTMLEditor.CollapseSelectionTo(joiner.PointRefToPutCaret());
      if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
        return Err(NS_ERROR_EDITOR_DESTROYED);
      }
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::CollapseSelectionTo() failed, but ignored");
        return result;
      }
      // If we prefer to use style in the previous line, we should forget
      // previous styles since the caret position has all styles which we want
      // to use with new content.
      if (nsIEditor::DirectionIsBackspace(aDirectionAndAmount)) {
        aHTMLEditor.TopLevelEditSubActionDataRef()
            .mCachedPendingStyles->Clear();
      }
      // And we don't want to keep extending a link at ex-end of the previous
      // paragraph.
      if (HTMLEditor::GetLinkElement(
              joiner.PointRefToPutCaret().GetContainer())) {
        aHTMLEditor.mPendingStylesToApplyToNewContent
            ->ClearLinkAndItsSpecifiedStyle();
      }
      return result;
    }
  }
  // This should claim that trying to join the block means that
  // this handles the action because the caller shouldn't do anything
  // anymore in this case.
  result.MarkAsHandled();

  nsresult rv = aHTMLEditor.CollapseSelectionTo(pointToPutCaret);
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return Err(NS_ERROR_EDITOR_DESTROYED);
  }
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed, but ignored");
  return result;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::ComputeRangesToDeleteNonCollapsedRanges(
    const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    AutoRangeArray& aRangesToDelete,
    AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
    const Element& aEditingHost) const {
  MOZ_ASSERT(!aRangesToDelete.IsCollapsed());

  if (NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->StartRef().IsSet()) ||
      NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->EndRef().IsSet())) {
    return NS_ERROR_FAILURE;
  }

  if (aRangesToDelete.Ranges().Length() == 1) {
    nsFrameSelection* frameSelection =
        aHTMLEditor.SelectionRef().GetFrameSelection();
    if (NS_WARN_IF(!frameSelection)) {
      return NS_ERROR_FAILURE;
    }
    Result<EditorRawDOMRange, nsresult> result = ExtendOrShrinkRangeToDelete(
        aHTMLEditor, frameSelection,
        EditorRawDOMRange(aRangesToDelete.FirstRangeRef()));
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "AutoDeleteRangesHandler::ExtendOrShrinkRangeToDelete() failed");
      return NS_ERROR_FAILURE;
    }
    EditorRawDOMRange newRange(result.unwrap());
    if (MOZ_UNLIKELY(NS_FAILED(aRangesToDelete.FirstRangeRef()->SetStartAndEnd(
            newRange.StartRef().ToRawRangeBoundary(),
            newRange.EndRef().ToRawRangeBoundary())))) {
      NS_WARNING("nsRange::SetStartAndEnd() failed");
      return NS_ERROR_FAILURE;
    }
    if (MOZ_UNLIKELY(
            NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->IsPositioned()))) {
      return NS_ERROR_FAILURE;
    }
    if (NS_WARN_IF(aRangesToDelete.FirstRangeRef()->Collapsed())) {
      return NS_OK;  // Hmm, there is nothing to delete...?
    }
  }

  if (!aHTMLEditor.IsPlaintextMailComposer()) {
    EditorDOMRange firstRange(aRangesToDelete.FirstRangeRef());
    EditorDOMRange extendedRange =
        WSRunScanner::GetRangeContainingInvisibleWhiteSpacesAtRangeBoundaries(
            aHTMLEditor.ComputeEditingHost(),
            EditorDOMRange(aRangesToDelete.FirstRangeRef()));
    if (firstRange != extendedRange) {
      nsresult rv = aRangesToDelete.FirstRangeRef()->SetStartAndEnd(
          extendedRange.StartRef().ToRawRangeBoundary(),
          extendedRange.EndRef().ToRawRangeBoundary());
      if (NS_FAILED(rv)) {
        NS_WARNING("nsRange::SetStartAndEnd() failed");
        return NS_ERROR_FAILURE;
      }
    }
  }

  if (aRangesToDelete.FirstRangeRef()->GetStartContainer() ==
      aRangesToDelete.FirstRangeRef()->GetEndContainer()) {
    if (!aRangesToDelete.FirstRangeRef()->Collapsed()) {
      nsresult rv = ComputeRangesToDeleteRangesWithTransaction(
          aHTMLEditor, aDirectionAndAmount, aRangesToDelete, aEditingHost);
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "AutoDeleteRangesHandler::ComputeRangesToDeleteRangesWithTransaction("
          ") failed");
      return rv;
    }
    // `DeleteUnnecessaryNodesAndCollapseSelection()` may delete parent
    // elements, but it does not affect computing target ranges.  Therefore,
    // we don't need to touch aRangesToDelete in this case.
    return NS_OK;
  }

  Element* startCiteNode = aHTMLEditor.GetMostDistantAncestorMailCiteElement(
      *aRangesToDelete.FirstRangeRef()->GetStartContainer());
  Element* endCiteNode = aHTMLEditor.GetMostDistantAncestorMailCiteElement(
      *aRangesToDelete.FirstRangeRef()->GetEndContainer());

  if (startCiteNode && !endCiteNode) {
    aDirectionAndAmount = nsIEditor::eNext;
  } else if (!startCiteNode && endCiteNode) {
    aDirectionAndAmount = nsIEditor::ePrevious;
  }

  for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
    if (MOZ_UNLIKELY(range->Collapsed())) {
      continue;
    }
    AutoBlockElementsJoiner joiner(*this);
    if (!joiner.PrepareToDeleteNonCollapsedRange(aHTMLEditor, range,
                                                 aEditingHost)) {
      return NS_ERROR_FAILURE;
    }
    nsresult rv =
        joiner.ComputeRangeToDelete(aHTMLEditor, aDirectionAndAmount, range,
                                    aSelectionWasCollapsed, aEditingHost);
    if (NS_FAILED(rv)) {
      NS_WARNING("AutoBlockElementsJoiner::ComputeRangeToDelete() failed");
      return rv;
    }
  }
  return NS_OK;
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoDeleteRangesHandler::HandleDeleteNonCollapsedRanges(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    nsIEditor::EStripWrappers aStripWrappers, AutoRangeArray& aRangesToDelete,
    SelectionWasCollapsed aSelectionWasCollapsed, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsTopLevelEditSubActionDataAvailable());
  MOZ_ASSERT(!aRangesToDelete.IsCollapsed());

  if (NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->StartRef().IsSet()) ||
      NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->EndRef().IsSet())) {
    return Err(NS_ERROR_FAILURE);
  }

  MOZ_ASSERT_IF(aRangesToDelete.Ranges().Length() == 1,
                aRangesToDelete.IsFirstRangeEditable(aEditingHost));

  // Else we have a non-collapsed selection.  First adjust the selection.
  // XXX Why do we extend selection only when there is only one range?
  if (aRangesToDelete.Ranges().Length() == 1) {
    nsFrameSelection* frameSelection =
        aHTMLEditor.SelectionRef().GetFrameSelection();
    if (NS_WARN_IF(!frameSelection)) {
      return Err(NS_ERROR_FAILURE);
    }
    Result<EditorRawDOMRange, nsresult> result = ExtendOrShrinkRangeToDelete(
        aHTMLEditor, frameSelection,
        EditorRawDOMRange(aRangesToDelete.FirstRangeRef()));
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "AutoDeleteRangesHandler::ExtendOrShrinkRangeToDelete() failed");
      return Err(NS_ERROR_FAILURE);
    }
    EditorRawDOMRange newRange(result.unwrap());
    if (NS_FAILED(aRangesToDelete.FirstRangeRef()->SetStartAndEnd(
            newRange.StartRef().ToRawRangeBoundary(),
            newRange.EndRef().ToRawRangeBoundary()))) {
      NS_WARNING("nsRange::SetStartAndEnd() failed");
      return Err(NS_ERROR_FAILURE);
    }
    if (NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->IsPositioned())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (NS_WARN_IF(aRangesToDelete.FirstRangeRef()->Collapsed())) {
      // Hmm, there is nothing to delete...?
      // In this case, the callers want collapsed selection.  Therefore, we need
      // to change the `Selection` here.
      nsresult rv = aHTMLEditor.CollapseSelectionTo(
          aRangesToDelete.GetFirstRangeStartPoint<EditorRawDOMPoint>());
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::CollapseSelectionTo() failed");
        return Err(rv);
      }
      return EditActionResult::HandledResult();
    }
    MOZ_ASSERT(aRangesToDelete.IsFirstRangeEditable(aEditingHost));
  }

  // Remember that we did a ranged delete for the benefit of AfterEditInner().
  aHTMLEditor.TopLevelEditSubActionDataRef().mDidDeleteNonCollapsedRange = true;

  // Figure out if the endpoints are in nodes that can be merged.  Adjust
  // surrounding white-space in preparation to delete selection.
  if (!aHTMLEditor.IsPlaintextMailComposer()) {
    {
      AutoTrackDOMRange firstRangeTracker(aHTMLEditor.RangeUpdaterRef(),
                                          &aRangesToDelete.FirstRangeRef());
      Result<CaretPoint, nsresult> caretPointOrError =
          WhiteSpaceVisibilityKeeper::PrepareToDeleteRange(
              aHTMLEditor, EditorDOMRange(aRangesToDelete.FirstRangeRef()),
              aEditingHost);
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING("WhiteSpaceVisibilityKeeper::PrepareToDeleteRange() failed");
        return caretPointOrError.propagateErr();
      }
      // Ignore caret point suggestion because there was
      // AutoTransactionsConserveSelection.
      caretPointOrError.unwrap().IgnoreCaretPointSuggestion();
    }
    if (NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->IsPositioned()) ||
        (aHTMLEditor.MayHaveMutationEventListeners() &&
         NS_WARN_IF(!aRangesToDelete.IsFirstRangeEditable(aEditingHost)))) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::PrepareToDeleteRange() made the first "
          "range invalid");
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  // XXX This is odd.  We do we simply use `DeleteRangesWithTransaction()`
  //     only when **first** range is in same container?
  if (aRangesToDelete.FirstRangeRef()->GetStartContainer() ==
      aRangesToDelete.FirstRangeRef()->GetEndContainer()) {
    // Because of previous DOM tree changes, the range may be collapsed.
    // If we've already removed all contents in the range, we shouldn't
    // delete anything around the caret.
    if (!aRangesToDelete.FirstRangeRef()->Collapsed()) {
      {
        AutoTrackDOMRange firstRangeTracker(aHTMLEditor.RangeUpdaterRef(),
                                            &aRangesToDelete.FirstRangeRef());
        Result<CaretPoint, nsresult> caretPointOrError =
            aHTMLEditor.DeleteRangesWithTransaction(
                aDirectionAndAmount, aStripWrappers, aRangesToDelete);
        if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
          NS_WARNING("EditorBase::DeleteRangesWithTransaction() failed");
          return caretPointOrError.propagateErr();
        }
        nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
            aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                          SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                          SuggestCaret::AndIgnoreTrivialError});
        if (NS_FAILED(rv)) {
          NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
          return Err(rv);
        }
        NS_WARNING_ASSERTION(
            rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
            "CaretPoint::SuggestCaretPointTo() failed, but ignored");
      }
      if (NS_WARN_IF(!aRangesToDelete.FirstRangeRef()->IsPositioned()) ||
          (aHTMLEditor.MayHaveMutationEventListeners(
               NS_EVENT_BITS_MUTATION_NODEREMOVED |
               NS_EVENT_BITS_MUTATION_NODEREMOVEDFROMDOCUMENT |
               NS_EVENT_BITS_MUTATION_SUBTREEMODIFIED) &&
           NS_WARN_IF(!aRangesToDelete.IsFirstRangeEditable(aEditingHost)))) {
        NS_WARNING(
            "EditorBase::DeleteRangesWithTransaction() made the first range "
            "invalid");
        return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
      }
    }
    // However, even if the range is removed, we may need to clean up the
    // containers which become empty.
    nsresult rv = DeleteUnnecessaryNodesAndCollapseSelection(
        aHTMLEditor, aDirectionAndAmount,
        EditorDOMPoint(aRangesToDelete.FirstRangeRef()->StartRef()),
        EditorDOMPoint(aRangesToDelete.FirstRangeRef()->EndRef()));
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "AutoDeleteRangesHandler::DeleteUnnecessaryNodesAndCollapseSelection("
          ") failed");
      return Err(rv);
    }
    return EditActionResult::HandledResult();
  }

  if (NS_WARN_IF(
          !aRangesToDelete.FirstRangeRef()->GetStartContainer()->IsContent()) ||
      NS_WARN_IF(
          !aRangesToDelete.FirstRangeRef()->GetEndContainer()->IsContent())) {
    return Err(NS_ERROR_FAILURE);
  }

  // Figure out mailcite ancestors
  RefPtr<Element> startCiteNode =
      aHTMLEditor.GetMostDistantAncestorMailCiteElement(
          *aRangesToDelete.FirstRangeRef()->GetStartContainer());
  RefPtr<Element> endCiteNode =
      aHTMLEditor.GetMostDistantAncestorMailCiteElement(
          *aRangesToDelete.FirstRangeRef()->GetEndContainer());

  // If we only have a mailcite at one of the two endpoints, set the
  // directionality of the deletion so that the selection will end up
  // outside the mailcite.
  if (startCiteNode && !endCiteNode) {
    aDirectionAndAmount = nsIEditor::eNext;
  } else if (!startCiteNode && endCiteNode) {
    aDirectionAndAmount = nsIEditor::ePrevious;
  }

  MOZ_ASSERT(!aRangesToDelete.Ranges().IsEmpty());
  auto ret = EditActionResult::IgnoredResult();
  for (const OwningNonNull<nsRange>& range : aRangesToDelete.Ranges()) {
    if (MOZ_UNLIKELY(range->Collapsed())) {
      continue;
    }
    AutoBlockElementsJoiner joiner(*this);
    if (!joiner.PrepareToDeleteNonCollapsedRange(aHTMLEditor, range,
                                                 aEditingHost)) {
      return Err(NS_ERROR_FAILURE);
    }
    Result<EditActionResult, nsresult> result =
        joiner.Run(aHTMLEditor, aDirectionAndAmount, aStripWrappers,
                   MOZ_KnownLive(range), aSelectionWasCollapsed, aEditingHost);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING("AutoBlockElementsJoiner::Run() failed");
      return result;
    }
    ret |= result.inspect();
  }
  return ret;
}

bool HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    PrepareToDeleteNonCollapsedRange(const HTMLEditor& aHTMLEditor,
                                     const nsRange& aRangeToDelete,
                                     const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());

  mLeftContent = HTMLEditUtils::GetInclusiveAncestorElement(
      *aRangeToDelete.GetStartContainer()->AsContent(),
      HTMLEditUtils::ClosestEditableBlockElement,
      BlockInlineCheck::UseComputedDisplayOutsideStyle);
  mRightContent = HTMLEditUtils::GetInclusiveAncestorElement(
      *aRangeToDelete.GetEndContainer()->AsContent(),
      HTMLEditUtils::ClosestEditableBlockElement,
      BlockInlineCheck::UseComputedDisplayOutsideStyle);
  // Note that mLeftContent and/or mRightContent can be nullptr if editing host
  // is an inline element.  If both editable ancestor block is exactly same
  // one or one reaches an inline editing host, we can just delete the content
  // in ranges.
  if (mLeftContent == mRightContent || !mLeftContent || !mRightContent) {
    MOZ_ASSERT_IF(
        !mLeftContent || !mRightContent,
        aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost() ==
            aRangeToDelete.GetEndContainer()->AsContent()->GetEditingHost());
    mMode = Mode::DeleteContentInRange;
    return true;
  }

  // If left block and right block are adjacent siblings and they are same
  // type of elements, we can merge them after deleting the selected contents.
  // MOOSE: this could conceivably screw up a table.. fix me.
  if (mLeftContent->GetParentNode() == mRightContent->GetParentNode() &&
      HTMLEditUtils::CanContentsBeJoined(*mLeftContent, *mRightContent) &&
      // XXX What's special about these three types of block?
      (mLeftContent->IsHTMLElement(nsGkAtoms::p) ||
       HTMLEditUtils::IsListItem(mLeftContent) ||
       HTMLEditUtils::IsHeader(*mLeftContent))) {
    mMode = Mode::JoinBlocksInSameParent;
    return true;
  }

  // If the range starts immediately after a line end and ends in a
  // child right block, we should not unwrap the right block unless the
  // right block will have no nodes.
  if (mRightContent->IsInclusiveDescendantOf(mLeftContent)) {
    // FYI: Chrome does not remove the right child block even if there will be
    // only single <br> or a comment node in it.  Therefore, we should use this
    // rough check.
    const WSScanResult nextVisibleThingOfEndBoundary =
        WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
            &aEditingHost, EditorRawDOMPoint(aRangeToDelete.EndRef()),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    if (!nextVisibleThingOfEndBoundary.ReachedCurrentBlockBoundary()) {
      MOZ_ASSERT(mLeftContent->IsElement());
      Result<Element*, nsresult> mostDistantBlockOrError =
          AutoBlockElementsJoiner::
              GetMostDistantBlockAncestorIfPointIsStartAtBlock(
                  EditorRawDOMPoint(mRightContent, 0), aEditingHost,
                  mLeftContent->AsElement());
      MOZ_ASSERT(mostDistantBlockOrError.isOk());
      if (MOZ_LIKELY(mostDistantBlockOrError.inspect())) {
        const WSScanResult prevVisibleThingOfStartBoundary =
            WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
                &aEditingHost, EditorRawDOMPoint(aRangeToDelete.StartRef()),
                BlockInlineCheck::UseComputedDisplayOutsideStyle);
        if (prevVisibleThingOfStartBoundary.ReachedBRElement()) {
          // If the range start after a <br> followed by the block boundary,
          // we want to delete the <br> or following <br> element unless it's
          // not a part of empty line like `<div>abc<br>{<div>]def`.
          const WSScanResult nextVisibleThingOfBR =
              WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  EditorRawDOMPoint::After(
                      *prevVisibleThingOfStartBoundary.GetContent()),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          MOZ_ASSERT(!nextVisibleThingOfBR.ReachedCurrentBlockBoundary());
          if (!nextVisibleThingOfBR.ReachedOtherBlockElement() ||
              nextVisibleThingOfBR.GetContent() !=
                  mostDistantBlockOrError.inspect()) {
            // The range selects a non-empty line or a child block at least.
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
          const WSScanResult prevVisibleThingOfBR =
              WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  EditorRawDOMPoint(
                      prevVisibleThingOfStartBoundary.GetContent()),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          if (prevVisibleThingOfBR.ReachedBRElement() ||
              prevVisibleThingOfBR.ReachedPreformattedLineBreak() ||
              prevVisibleThingOfBR.ReachedBlockBoundary()) {
            // The preceding <br> causes an empty line.
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
        } else if (prevVisibleThingOfStartBoundary
                       .ReachedPreformattedLineBreak()) {
          const WSScanResult nextVisibleThingOfLineBreak =
              WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  prevVisibleThingOfStartBoundary
                      .PointAfterReachedContent<EditorRawDOMPoint>(),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          MOZ_ASSERT(
              !nextVisibleThingOfLineBreak.ReachedCurrentBlockBoundary());
          if (!nextVisibleThingOfLineBreak.ReachedOtherBlockElement() ||
              nextVisibleThingOfLineBreak.GetContent() !=
                  mostDistantBlockOrError.inspect()) {
            // The range selects a non-empty line or a child block at least.
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
          const WSScanResult prevVisibleThingOfLineBreak =
              WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  prevVisibleThingOfStartBoundary
                      .PointAtReachedContent<EditorRawDOMPoint>(),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          if (prevVisibleThingOfLineBreak.ReachedBRElement() ||
              prevVisibleThingOfLineBreak.ReachedPreformattedLineBreak() ||
              prevVisibleThingOfLineBreak.ReachedBlockBoundary()) {
            // The preceding line break causes an empty line.
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
        } else if (prevVisibleThingOfStartBoundary
                       .ReachedCurrentBlockBoundary()) {
          MOZ_ASSERT(prevVisibleThingOfStartBoundary.ElementPtr() ==
                     mLeftContent);
          const WSScanResult firstVisibleThingInBlock =
              WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  EditorRawDOMPoint(
                      prevVisibleThingOfStartBoundary.ElementPtr(), 0),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          if (!firstVisibleThingInBlock.ReachedOtherBlockElement() ||
              firstVisibleThingInBlock.ElementPtr() !=
                  mostDistantBlockOrError.inspect()) {
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
        } else if (prevVisibleThingOfStartBoundary.ReachedOtherBlockElement()) {
          const WSScanResult firstVisibleThingAfterBlock =
              WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                  &aEditingHost,
                  EditorRawDOMPoint::After(
                      *prevVisibleThingOfStartBoundary.ElementPtr()),
                  BlockInlineCheck::UseComputedDisplayOutsideStyle);
          if (!firstVisibleThingAfterBlock.ReachedOtherBlockElement() ||
              firstVisibleThingAfterBlock.ElementPtr() !=
                  mostDistantBlockOrError.inspect()) {
            mMode = Mode::DeletePrecedingLinesAndContentInRange;
            return true;
          }
        }
      }
    }
  }

  mMode = Mode::DeleteNonCollapsedRange;
  return true;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteContentInRange(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        const Element& aEditingHost) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mMode == Mode::DeleteContentInRange);
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost());
  MOZ_ASSERT(
      aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost() ==
      aRangeToDelete.GetEndContainer()->AsContent()->GetEditingHost());
  MOZ_ASSERT(!mLeftContent == !mRightContent);
  MOZ_ASSERT_IF(mLeftContent, mLeftContent->IsElement());
  MOZ_ASSERT_IF(mLeftContent,
                aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
                    mLeftContent));
  MOZ_ASSERT_IF(mRightContent, mRightContent->IsElement());
  MOZ_ASSERT_IF(
      mRightContent,
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));
  MOZ_ASSERT_IF(
      !mLeftContent,
      HTMLEditUtils::IsInlineContent(
          *aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost(),
          BlockInlineCheck::UseComputedDisplayOutsideStyle));

  nsresult rv =
      mDeleteRangesHandlerConst.ComputeRangeToDeleteRangeWithTransaction(
          aHTMLEditor, aDirectionAndAmount, aRangeToDelete, aEditingHost);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoDeleteRangesHandler::"
                       "ComputeRangeToDeleteRangeWithTransaction() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::DeleteContentInRange(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mMode == Mode::DeleteContentInRange);
  MOZ_ASSERT(mDeleteRangesHandler);
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost());
  MOZ_ASSERT(
      aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost() ==
      aRangeToDelete.GetEndContainer()->AsContent()->GetEditingHost());
  MOZ_ASSERT_IF(mLeftContent, mLeftContent->IsElement());
  MOZ_ASSERT_IF(mLeftContent,
                aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
                    mLeftContent));
  MOZ_ASSERT_IF(mRightContent, mRightContent->IsElement());
  MOZ_ASSERT_IF(
      mRightContent,
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));
  MOZ_ASSERT_IF(
      !mLeftContent,
      HTMLEditUtils::IsInlineContent(
          *aRangeToDelete.GetStartContainer()->AsContent()->GetEditingHost(),
          BlockInlineCheck::UseComputedDisplayOutsideStyle));

  {
    AutoRangeArray rangesToDelete(aRangeToDelete);
    AutoTrackDOMRange firstRangeTracker(aHTMLEditor.RangeUpdaterRef(),
                                        &rangesToDelete.FirstRangeRef());
    Result<CaretPoint, nsresult> caretPointOrError =
        aHTMLEditor.DeleteRangesWithTransaction(aDirectionAndAmount,
                                                aStripWrappers, rangesToDelete);
    if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
      if (NS_WARN_IF(caretPointOrError.inspectErr() ==
                     NS_ERROR_EDITOR_DESTROYED)) {
        return Err(NS_ERROR_EDITOR_DESTROYED);
      }
      NS_WARNING(
          "EditorBase::DeleteRangesWithTransaction() failed, but ignored");
    } else {
      nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
          aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                        SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                        SuggestCaret::AndIgnoreTrivialError});
      if (NS_FAILED(rv)) {
        NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      NS_WARNING_ASSERTION(
          rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
          "CaretPoint::SuggestCaretPointTo() failed, but ignored");
    }
  }

  if (NS_WARN_IF(!aRangeToDelete.IsPositioned())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  nsresult rv =
      mDeleteRangesHandler->DeleteUnnecessaryNodesAndCollapseSelection(
          aHTMLEditor, aDirectionAndAmount,
          EditorDOMPoint(aRangeToDelete.StartRef()),
          EditorDOMPoint(aRangeToDelete.EndRef()));
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoDeleteRangesHandler::DeleteUnnecessaryNodesAndCollapseSelection() "
        "failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToJoinBlockElementsInSameParent(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        const Element& aEditingHost) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mMode == Mode::JoinBlocksInSameParent);
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mLeftContent->IsElement());
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
      mLeftContent));
  MOZ_ASSERT(mRightContent);
  MOZ_ASSERT(mRightContent->IsElement());
  MOZ_ASSERT(
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));
  MOZ_ASSERT(mLeftContent->GetParentNode() == mRightContent->GetParentNode());

  nsresult rv =
      mDeleteRangesHandlerConst.ComputeRangeToDeleteRangeWithTransaction(
          aHTMLEditor, aDirectionAndAmount, aRangeToDelete, aEditingHost);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoDeleteRangesHandler::"
                       "ComputeRangeToDeleteRangeWithTransaction() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::JoinBlockElementsInSameParent(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
        SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mMode == Mode::JoinBlocksInSameParent);
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mLeftContent->IsElement());
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
      mLeftContent));
  MOZ_ASSERT(mRightContent);
  MOZ_ASSERT(mRightContent->IsElement());
  MOZ_ASSERT(
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));
  MOZ_ASSERT(mLeftContent->GetParentNode() == mRightContent->GetParentNode());

  const bool backspaceInRightBlock =
      aSelectionWasCollapsed == SelectionWasCollapsed::Yes &&
      nsIEditor::DirectionIsBackspace(aDirectionAndAmount);

  AutoRangeArray rangesToDelete(aRangeToDelete);
  Result<CaretPoint, nsresult> caretPointOrError =
      aHTMLEditor.DeleteRangesWithTransaction(aDirectionAndAmount,
                                              aStripWrappers, rangesToDelete);
  if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
    NS_WARNING("EditorBase::DeleteRangesWithTransaction() failed");
    return caretPointOrError.propagateErr();
  }

  nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
      aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                    SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                    SuggestCaret::AndIgnoreTrivialError});
  if (NS_FAILED(rv)) {
    NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
    return Err(rv);
  }
  NS_WARNING_ASSERTION(rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
                       "CaretPoint::SuggestCaretPointTo() failed, but ignored");

  if (NS_WARN_IF(!mLeftContent->GetParentNode()) ||
      NS_WARN_IF(!mRightContent->GetParentNode()) ||
      NS_WARN_IF(mLeftContent->GetParentNode() !=
                 mRightContent->GetParentNode())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  auto startOfRightContent =
      HTMLEditUtils::GetDeepestEditableStartPointOf<EditorDOMPoint>(
          *mRightContent);
  AutoTrackDOMPoint trackStartOfRightContent(aHTMLEditor.RangeUpdaterRef(),
                                             &startOfRightContent);
  Result<EditorDOMPoint, nsresult> atFirstChildOfTheLastRightNodeOrError =
      JoinNodesDeepWithTransaction(aHTMLEditor, MOZ_KnownLive(*mLeftContent),
                                   MOZ_KnownLive(*mRightContent));
  if (MOZ_UNLIKELY(atFirstChildOfTheLastRightNodeOrError.isErr())) {
    NS_WARNING("HTMLEditor::JoinNodesDeepWithTransaction() failed");
    return atFirstChildOfTheLastRightNodeOrError.propagateErr();
  }
  MOZ_ASSERT(atFirstChildOfTheLastRightNodeOrError.inspect().IsSet());
  trackStartOfRightContent.FlushAndStopTracking();
  if (NS_WARN_IF(!startOfRightContent.IsSet()) ||
      NS_WARN_IF(!startOfRightContent.GetContainer()->IsInComposedDoc())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  // If we're deleting selection (not replacing with new content) and the joined
  // point follows a text node, we should put caret to end of the preceding text
  // node because the other browsers insert following inputs into there.
  if (MayEditActionDeleteAroundCollapsedSelection(
          aHTMLEditor.GetEditAction())) {
    WSRunScanner scanner(&aEditingHost, startOfRightContent,
                         BlockInlineCheck::UseComputedDisplayOutsideStyle);
    const WSScanResult maybePreviousText =
        scanner.ScanPreviousVisibleNodeOrBlockBoundaryFrom(startOfRightContent);
    if (maybePreviousText.IsContentEditable() &&
        maybePreviousText.InVisibleOrCollapsibleCharacters()) {
      nsresult rv = aHTMLEditor.CollapseSelectionTo(
          maybePreviousText.PointAfterReachedContent<EditorRawDOMPoint>());
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::CollapseSelectionTo() failed");
        return Err(rv);
      }
      // If we prefer to use style in the previous line, we should forget
      // previous styles since the caret position has all styles which we want
      // to use with new content.
      if (backspaceInRightBlock) {
        aHTMLEditor.TopLevelEditSubActionDataRef()
            .mCachedPendingStyles->Clear();
      }
      // And we don't want to keep extending a link at ex-end of the previous
      // paragraph.
      if (HTMLEditor::GetLinkElement(maybePreviousText.TextPtr())) {
        aHTMLEditor.mPendingStylesToApplyToNewContent
            ->ClearLinkAndItsSpecifiedStyle();
      }
      return EditActionResult::HandledResult();
    }
  }

  // Otherwise, we should put caret at start of the right content.
  rv = aHTMLEditor.CollapseSelectionTo(
      atFirstChildOfTheLastRightNodeOrError.inspect());
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::CollapseSelectionTo() failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

Result<bool, nsresult>
HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteNodesEntirelyInRangeButKeepTableStructure(
        const HTMLEditor& aHTMLEditor, nsRange& aRange,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
        const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  AutoTArray<OwningNonNull<nsIContent>, 10> arrayOfTopChildren;
  DOMSubtreeIterator iter;
  nsresult rv = iter.Init(aRange);
  if (NS_FAILED(rv)) {
    NS_WARNING("DOMSubtreeIterator::Init() failed");
    return Err(rv);
  }
  iter.AppendAllNodesToArray(arrayOfTopChildren);
  return NeedsToJoinNodesAfterDeleteNodesEntirelyInRangeButKeepTableStructure(
      aHTMLEditor, arrayOfTopChildren, aSelectionWasCollapsed);
}

Result<bool, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::DeleteNodesEntirelyInRangeButKeepTableStructure(
        HTMLEditor& aHTMLEditor, nsRange& aRange,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  // Build a list of direct child nodes in the range
  AutoTArray<OwningNonNull<nsIContent>, 10> arrayOfTopChildren;
  DOMSubtreeIterator iter;
  nsresult rv = iter.Init(aRange);
  if (NS_FAILED(rv)) {
    NS_WARNING("DOMSubtreeIterator::Init() failed");
    return Err(rv);
  }
  iter.AppendAllNodesToArray(arrayOfTopChildren);

  // Now that we have the list, delete non-table elements
  bool needsToJoinLater =
      NeedsToJoinNodesAfterDeleteNodesEntirelyInRangeButKeepTableStructure(
          aHTMLEditor, arrayOfTopChildren, aSelectionWasCollapsed);
  for (auto& content : arrayOfTopChildren) {
    // XXX After here, the child contents in the array may have been moved
    //     to somewhere or removed.  We should handle it.
    //
    // MOZ_KnownLive because 'arrayOfTopChildren' is guaranteed to
    // keep it alive.
    //
    // Even with https://bugzilla.mozilla.org/show_bug.cgi?id=1620312 fixed
    // this might need to stay, because 'arrayOfTopChildren' is not const,
    // so it's not obvious how to prove via static analysis that it won't
    // change and release us.
    nsresult rv =
        DeleteContentButKeepTableStructure(aHTMLEditor, MOZ_KnownLive(content));
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    NS_WARNING_ASSERTION(
        NS_SUCCEEDED(rv),
        "AutoBlockElementsJoiner::DeleteContentButKeepTableStructure() failed, "
        "but ignored");
  }
  return needsToJoinLater;
}

bool HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    NeedsToJoinNodesAfterDeleteNodesEntirelyInRangeButKeepTableStructure(
        const HTMLEditor& aHTMLEditor,
        const nsTArray<OwningNonNull<nsIContent>>& aArrayOfContents,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed)
        const {
  switch (mMode) {
    case Mode::DeletePrecedingLinesAndContentInRange:
    case Mode::DeleteBRElement:
    case Mode::DeletePrecedingBRElementOfBlock:
    case Mode::DeletePrecedingPreformattedLineBreak:
      return false;
    default:
      break;
  }

  // If original selection was collapsed, we need always to join the nodes.
  // XXX Why?
  if (aSelectionWasCollapsed ==
      AutoDeleteRangesHandler::SelectionWasCollapsed::No) {
    return true;
  }
  // If something visible is deleted, no need to join.  Visible means
  // all nodes except non-visible textnodes and breaks.
  if (aArrayOfContents.IsEmpty()) {
    return true;
  }
  for (const OwningNonNull<nsIContent>& content : aArrayOfContents) {
    if (content->IsText()) {
      if (HTMLEditUtils::IsInVisibleTextFrames(aHTMLEditor.GetPresContext(),
                                               *content->AsText())) {
        return false;
      }
      continue;
    }
    // XXX If it's an element node, we should check whether it has visible
    //     frames or not.
    if (!content->IsElement() ||
        HTMLEditUtils::IsEmptyNode(
            *content->AsElement(),
            {EmptyCheckOption::TreatSingleBRElementAsVisible,
             EmptyCheckOption::TreatNonEditableContentAsInvisible})) {
      continue;
    }
    if (!HTMLEditUtils::IsInvisibleBRElement(*content)) {
      return false;
    }
  }
  return true;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    DeleteTextAtStartAndEndOfRange(HTMLEditor& aHTMLEditor, nsRange& aRange) {
  EditorDOMPoint rangeStart(aRange.StartRef());
  EditorDOMPoint rangeEnd(aRange.EndRef());
  if (MOZ_UNLIKELY(aRange.Collapsed())) {
    return NS_OK;
  }

  EditorDOMPoint pointToPutCaret;
  // If the range is in a text node, delete middle of the text or the text node
  // itself.
  if (rangeStart.IsInTextNode() &&
      rangeStart.ContainerAs<Text>() == rangeEnd.GetContainer()) {
    OwningNonNull<Text> textNode = *rangeStart.ContainerAs<Text>();
    if (rangeStart.IsStartOfContainer() && rangeEnd.IsEndOfContainer()) {
      EditorDOMPoint pointToPutCaret(textNode);
      AutoTrackDOMPoint trackTextNodePoint(aHTMLEditor.RangeUpdaterRef(),
                                           &pointToPutCaret);
      nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(textNode);
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
        return rv;
      }
    } else {
      MOZ_ASSERT(rangeEnd.Offset() - rangeStart.Offset() > 0);
      Result<CaretPoint, nsresult> caretPointOrError =
          aHTMLEditor.DeleteTextWithTransaction(
              textNode, rangeStart.Offset(),
              rangeEnd.Offset() - rangeStart.Offset());
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
        return caretPointOrError.unwrapErr();
      }
      caretPointOrError.unwrap().MoveCaretPointTo(
          pointToPutCaret, aHTMLEditor,
          {SuggestCaret::OnlyIfHasSuggestion,
           SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
    }
  } else {
    // If the range starts in a text node and ends in a different node, delete
    // the text after the start boundary.
    if (rangeStart.IsInTextNode() && !rangeStart.IsEndOfContainer()) {
      OwningNonNull<Text> textNode = *rangeStart.ContainerAs<Text>();
      if (rangeStart.IsStartOfContainer()) {
        pointToPutCaret.Set(textNode);
        AutoTrackDOMPoint trackTextNodePoint(aHTMLEditor.RangeUpdaterRef(),
                                             &pointToPutCaret);
        nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(textNode);
        if (NS_FAILED(rv)) {
          NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
          return rv;
        }
      } else {
        Result<CaretPoint, nsresult> caretPointOrError =
            aHTMLEditor.DeleteTextWithTransaction(
                textNode, rangeStart.Offset(),
                rangeStart.GetContainer()->Length() - rangeStart.Offset());
        if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
          NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
          return caretPointOrError.unwrapErr();
        }
        caretPointOrError.unwrap().MoveCaretPointTo(
            pointToPutCaret, aHTMLEditor,
            {SuggestCaret::OnlyIfHasSuggestion,
             SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
      }
    }

    // If the range ends in a text node and starts from a different node, delete
    // the text before the end boundary.
    if (rangeEnd.IsInTextNode() && !rangeEnd.IsStartOfContainer()) {
      OwningNonNull<Text> textNode = *rangeEnd.ContainerAs<Text>();
      if (rangeEnd.IsEndOfContainer()) {
        pointToPutCaret.Set(textNode);
        AutoTrackDOMPoint trackTextNodePoint(aHTMLEditor.RangeUpdaterRef(),
                                             &pointToPutCaret);
        nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(textNode);
        if (NS_FAILED(rv)) {
          NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
          return rv;
        }
      } else {
        Result<CaretPoint, nsresult> caretPointOrError =
            aHTMLEditor.DeleteTextWithTransaction(textNode, 0,
                                                  rangeEnd.Offset());
        if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
          NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
          return caretPointOrError.unwrapErr();
        }
        caretPointOrError.unwrap().MoveCaretPointTo(
            pointToPutCaret, aHTMLEditor,
            {SuggestCaret::OnlyIfHasSuggestion,
             SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
      }
    }
  }

  if (pointToPutCaret.IsSet()) {
    CaretPoint caretPoint(std::move(pointToPutCaret));
    nsresult rv = caretPoint.SuggestCaretPointTo(
        aHTMLEditor, {SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                      SuggestCaret::AndIgnoreTrivialError});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return rv;
    }
    NS_WARNING_ASSERTION(
        rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
        "CaretPoint::SuggestCaretPointTo() failed, but ignored");
  }
  return NS_OK;
}

// static
template <typename EditorDOMPointType>
Result<Element*, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::GetMostDistantBlockAncestorIfPointIsStartAtBlock(
        const EditorDOMPointType& aPoint, const Element& aEditingHost,
        const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(aPoint.IsSetAndValid());
  MOZ_ASSERT(aPoint.IsInComposedDoc());

  if (!aAncestorLimiter) {
    aAncestorLimiter = &aEditingHost;
  }

  const auto ReachedCurrentBlockBoundaryWhichWeCanCross =
      [&aEditingHost, aAncestorLimiter](const WSScanResult& aScanResult) {
        // When the scan result is "reached current block boundary", it may not
        // be so literally.
        return aScanResult.ReachedCurrentBlockBoundary() &&
               HTMLEditUtils::IsRemovableFromParentNode(
                   *aScanResult.ElementPtr()) &&
               aScanResult.ElementPtr() != &aEditingHost &&
               aScanResult.ElementPtr() != aAncestorLimiter &&
               // Don't cross <body>, <head> and <html>
               !aScanResult.ElementPtr()->IsAnyOfHTMLElements(
                   nsGkAtoms::body, nsGkAtoms::head, nsGkAtoms::html) &&
               // Don't cross table elements
               !HTMLEditUtils::IsAnyTableElement(aScanResult.ElementPtr());
      };

  const WSScanResult prevVisibleThing =
      WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
          aAncestorLimiter, aPoint,
          BlockInlineCheck::UseComputedDisplayOutsideStyle);
  if (!ReachedCurrentBlockBoundaryWhichWeCanCross(prevVisibleThing)) {
    return nullptr;
  }
  MOZ_ASSERT(HTMLEditUtils::IsBlockElement(
      *prevVisibleThing.ElementPtr(),
      BlockInlineCheck::UseComputedDisplayOutsideStyle));
  for (Element* ancestorBlock = prevVisibleThing.ElementPtr(); ancestorBlock;) {
    const WSScanResult prevVisibleThing =
        WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
            aAncestorLimiter, EditorRawDOMPoint(ancestorBlock),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    if (!ReachedCurrentBlockBoundaryWhichWeCanCross(prevVisibleThing)) {
      return ancestorBlock;
    }
    MOZ_ASSERT(HTMLEditUtils::IsBlockElement(
        *prevVisibleThing.ElementPtr(),
        BlockInlineCheck::UseComputedDisplayOutsideStyle));
    ancestorBlock = prevVisibleThing.ElementPtr();
  }
  return Err(NS_ERROR_FAILURE);
}

void HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ExtendRangeToDeleteNonCollapsedRange(
        const HTMLEditor& aHTMLEditor, nsRange& aRangeToDelete,
        const Element& aEditingHost, ComputeRangeFor aComputeRangeFor) const {
  MOZ_ASSERT_IF(aComputeRangeFor == ComputeRangeFor::GetTargetRanges,
                aRangeToDelete.IsPositioned());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mLeftContent->IsElement());
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
      mLeftContent));
  MOZ_ASSERT(mRightContent);
  MOZ_ASSERT(mRightContent->IsElement());
  MOZ_ASSERT(
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));

  const DebugOnly<Result<bool, nsresult>> extendRangeResult =
      AutoDeleteRangesHandler::
          ExtendRangeToContainAncestorInlineElementsAtStart(aRangeToDelete,
                                                            aEditingHost);
  NS_WARNING_ASSERTION(extendRangeResult.value.isOk(),
                       "AutoDeleteRangesHandler::"
                       "ExtendRangeToContainAncestorInlineElementsAtStart() "
                       "failed, but ignored");
  if (mMode != Mode::DeletePrecedingLinesAndContentInRange) {
    return;
  }

  // If we're computing for beforeinput.getTargetRanges() and the inputType
  // is not a simple deletion like replacing selected content with new
  // content, the range should end at the original end boundary of the given
  // range even if we're deleting only preceding lines of the right child
  // block.
  const bool preserveEndBoundary =
      aComputeRangeFor == ComputeRangeFor::GetTargetRanges &&
      !MayEditActionDeleteAroundCollapsedSelection(aHTMLEditor.GetEditAction());
  // We need to delete only the preceding lines of the right block. Therefore,
  // we need to shrink the range to ends before the right block if the range
  // does not contain any meaningful content in the right block.
  const Result<Element*, nsresult> inclusiveAncestorCurrentBlockOrError =
      AutoBlockElementsJoiner::GetMostDistantBlockAncestorIfPointIsStartAtBlock(
          EditorRawDOMPoint(aRangeToDelete.EndRef()), aEditingHost,
          mLeftContent->AsElement());
  MOZ_ASSERT(inclusiveAncestorCurrentBlockOrError.isOk());
  MOZ_ASSERT_IF(inclusiveAncestorCurrentBlockOrError.inspect(),
                mRightContent->IsInclusiveDescendantOf(
                    inclusiveAncestorCurrentBlockOrError.inspect()));
  if (MOZ_UNLIKELY(!inclusiveAncestorCurrentBlockOrError.isOk() ||
                   !inclusiveAncestorCurrentBlockOrError.inspect())) {
    return;
  }

  const WSScanResult prevVisibleThingOfStartBoundary =
      WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
          &aEditingHost, EditorRawDOMPoint(aRangeToDelete.StartRef()),
          BlockInlineCheck::UseComputedDisplayOutsideStyle);
  // If the range starts after an invisible <br> of empty line immediately
  // before the most distant inclusive ancestor of the right block like
  // `<br><br>{<div>]abc`, we should delete the last empty line because
  // users won't see any reaction of the builtin editor in this case.
  if (prevVisibleThingOfStartBoundary.ReachedBRElement() ||
      prevVisibleThingOfStartBoundary.ReachedPreformattedLineBreak()) {
    const WSScanResult prevVisibleThingOfPreviousLineBreak =
        WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
            &aEditingHost,
            prevVisibleThingOfStartBoundary
                .PointAtReachedContent<EditorRawDOMPoint>(),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    const WSScanResult nextVisibleThingOfPreviousBR =
        WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
            &aEditingHost,
            prevVisibleThingOfStartBoundary
                .PointAfterReachedContent<EditorRawDOMPoint>(),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    if ((prevVisibleThingOfPreviousLineBreak.ReachedBRElement() ||
         prevVisibleThingOfPreviousLineBreak.ReachedPreformattedLineBreak()) &&
        nextVisibleThingOfPreviousBR.ReachedOtherBlockElement() &&
        nextVisibleThingOfPreviousBR.ElementPtr() ==
            inclusiveAncestorCurrentBlockOrError.inspect()) {
      aRangeToDelete.SetStart(prevVisibleThingOfStartBoundary
                                  .PointAtReachedContent<EditorRawDOMPoint>()
                                  .ToRawRangeBoundary(),
                              IgnoreErrors());
    }
  }

  if (preserveEndBoundary) {
    return;
  }

  if (aComputeRangeFor == ComputeRangeFor::GetTargetRanges) {
    // When we set the end boundary to around the right block, the new end
    // boundary should not after inline ancestors of the line break which won't
    // be deleted.
    const WSScanResult lastVisibleThingBeforeRightChildBlock =
        [&]() -> WSScanResult {
      EditorRawDOMPoint scanStartPoint(aRangeToDelete.StartRef());
      WSScanResult lastScanResult = WSScanResult::Error();
      while (true) {
        WSScanResult scanResult =
            WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                mLeftContent->AsElement(), scanStartPoint,
                BlockInlineCheck::UseComputedDisplayOutsideStyle);
        if (scanResult.ReachedBlockBoundary() ||
            scanResult.ReachedInlineEditingHostBoundary()) {
          return lastScanResult;
        }
        scanStartPoint =
            scanResult.PointAfterReachedContent<EditorRawDOMPoint>();
        lastScanResult = scanResult;
      }
    }();
    if (lastVisibleThingBeforeRightChildBlock.GetContent()) {
      const nsIContent* commonAncestor = nsIContent::FromNode(
          nsContentUtils::GetClosestCommonInclusiveAncestor(
              aRangeToDelete.StartRef().Container(),
              lastVisibleThingBeforeRightChildBlock.GetContent()));
      MOZ_ASSERT(commonAncestor);
      if (commonAncestor &&
          !mRightContent->IsInclusiveDescendantOf(commonAncestor)) {
        IgnoredErrorResult error;
        aRangeToDelete.SetEnd(
            EditorRawDOMPoint::AtEndOf(*commonAncestor).ToRawRangeBoundary(),
            error);
        NS_WARNING_ASSERTION(!error.Failed(),
                             "nsRange::SetEnd() failed, but ignored");
        return;
      }
    }
  }

  IgnoredErrorResult error;
  aRangeToDelete.SetEnd(
      EditorRawDOMPoint(inclusiveAncestorCurrentBlockOrError.inspect())
          .ToRawRangeBoundary(),
      error);
  NS_WARNING_ASSERTION(!error.Failed(),
                       "nsRange::SetEnd() failed, but ignored");
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    ComputeRangeToDeleteNonCollapsedRange(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mLeftContent);
  MOZ_ASSERT(mLeftContent->IsElement());
  MOZ_ASSERT(aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
      mLeftContent));
  MOZ_ASSERT(mRightContent);
  MOZ_ASSERT(mRightContent->IsElement());
  MOZ_ASSERT(
      aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(mRightContent));

  ExtendRangeToDeleteNonCollapsedRange(aHTMLEditor, aRangeToDelete,
                                       aEditingHost,
                                       ComputeRangeFor::GetTargetRanges);

  Result<bool, nsresult> result =
      ComputeRangeToDeleteNodesEntirelyInRangeButKeepTableStructure(
          aHTMLEditor, aRangeToDelete, aSelectionWasCollapsed);
  if (result.isErr()) {
    NS_WARNING(
        "AutoBlockElementsJoiner::"
        "ComputeRangeToDeleteNodesEntirelyInRangeButKeepTableStructure() "
        "failed");
    return result.unwrapErr();
  }
  if (!result.unwrap()) {
    return NS_OK;
  }

  AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                  *mRightContent);
  Result<bool, nsresult> canJoinThem =
      joiner.Prepare(aHTMLEditor, aEditingHost);
  if (canJoinThem.isErr()) {
    NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
    return canJoinThem.unwrapErr();
  }

  if (!canJoinThem.unwrap()) {
    return NS_SUCCESS_DOM_NO_OPERATION;
  }

  if (!joiner.CanJoinBlocks()) {
    return NS_OK;
  }

  nsresult rv = joiner.ComputeRangeToDelete(aHTMLEditor, EditorDOMPoint(),
                                            aRangeToDelete);
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "AutoInclusiveAncestorBlockElementsJoiner::ComputeRangeToDelete() "
      "failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::HandleDeleteNonCollapsedRange(
        HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
        nsIEditor::EStripWrappers aStripWrappers, nsRange& aRangeToDelete,
        AutoDeleteRangesHandler::SelectionWasCollapsed aSelectionWasCollapsed,
        const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(mDeleteRangesHandler);

  const bool isDeletingLineBreak =
      mMode == Mode::DeleteBRElement ||
      mMode == Mode::DeletePrecedingBRElementOfBlock ||
      mMode == Mode::DeletePrecedingPreformattedLineBreak;
  if (!isDeletingLineBreak) {
    MOZ_ASSERT(aRangeToDelete.GetStartContainer()->IsInclusiveDescendantOf(
        mLeftContent));
    MOZ_ASSERT(aRangeToDelete.GetEndContainer()->IsInclusiveDescendantOf(
        mRightContent));
    ExtendRangeToDeleteNonCollapsedRange(aHTMLEditor, aRangeToDelete,
                                         aEditingHost,
                                         ComputeRangeFor::ToDeleteTheRange);
  }

  const bool backspaceInRightBlock =
      aSelectionWasCollapsed == SelectionWasCollapsed::Yes &&
      nsIEditor::DirectionIsBackspace(aDirectionAndAmount);

  // Otherwise, delete every nodes in the range, then, clean up something.
  EditActionResult result = EditActionResult::IgnoredResult();
  EditorDOMPoint pointToPutCaret;
  while (true) {
    OwningNonNull<nsRange> rangeToDelete(aRangeToDelete);
    AutoTrackDOMRange firstRangeTracker(aHTMLEditor.RangeUpdaterRef(),
                                        &rangeToDelete);

    Result<bool, nsresult> deleteResult =
        DeleteNodesEntirelyInRangeButKeepTableStructure(
            aHTMLEditor, rangeToDelete, aSelectionWasCollapsed);
    if (MOZ_UNLIKELY(deleteResult.isErr())) {
      NS_WARNING(
          "AutoBlockElementsJoiner::"
          "DeleteNodesEntirelyInRangeButKeepTableStructure() failed");
      return deleteResult.propagateErr();
    }

    const bool joinInclusiveAncestorBlockElements =
        !isDeletingLineBreak && deleteResult.unwrap();

    // Check endpoints for possible text deletion.  We can assume that if
    // text node is found, we can delete to end or to beginning as
    // appropriate, since the case where both sel endpoints in same text
    // node was already handled (we wouldn't be here)
    nsresult rv = DeleteTextAtStartAndEndOfRange(aHTMLEditor, rangeToDelete);
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "AutoBlockElementsJoiner::DeleteTextAtStartAndEndOfRange() failed");
      return Err(rv);
    }

    if (!joinInclusiveAncestorBlockElements) {
      // When we delete only preceding lines of the right child block, we should
      // put caret into start of the right block.
      if (mMode == Mode::DeletePrecedingLinesAndContentInRange) {
        result.MarkAsHandled();
        if (MOZ_LIKELY(mRightContent->IsInComposedDoc())) {
          pointToPutCaret =
              HTMLEditUtils::GetDeepestEditableStartPointOf<EditorDOMPoint>(
                  *mRightContent);
        }
      }
      break;
    }

    MOZ_ASSERT(mLeftContent);
    MOZ_ASSERT(mLeftContent->IsElement());
    MOZ_ASSERT(mRightContent);
    MOZ_ASSERT(mRightContent->IsElement());

    AutoInclusiveAncestorBlockElementsJoiner joiner(*mLeftContent,
                                                    *mRightContent);
    Result<bool, nsresult> canJoinThem =
        joiner.Prepare(aHTMLEditor, aEditingHost);
    if (canJoinThem.isErr()) {
      NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Prepare() failed");
      return canJoinThem.propagateErr();
    }

    // If we're joining blocks: if deleting forward the selection should
    // be collapsed to the end of the selection, if deleting backward the
    // selection should be collapsed to the beginning of the selection.
    // But if we're not joining then the selection should collapse to the
    // beginning of the selection if we're deleting forward, because the
    // end of the selection will still be in the next block. And same
    // thing for deleting backwards (selection should collapse to the end,
    // because the beginning will still be in the first block). See Bug
    // 507936.
    if (aDirectionAndAmount == nsIEditor::eNext) {
      aDirectionAndAmount = nsIEditor::ePrevious;
    } else {
      aDirectionAndAmount = nsIEditor::eNext;
    }

    if (!canJoinThem.inspect()) {
      result.MarkAsCanceled();
      break;
    }

    if (!joiner.CanJoinBlocks()) {
      break;
    }

    Result<EditActionResult, nsresult> joinResult =
        joiner.Run(aHTMLEditor, aEditingHost);
    if (MOZ_UNLIKELY(joinResult.isErr())) {
      NS_WARNING("AutoInclusiveAncestorBlockElementsJoiner::Run() failed");
      return joinResult;
    }
    result |= joinResult.unwrap();
#ifdef DEBUG
    if (joiner.ShouldDeleteLeafContentInstead()) {
      NS_ASSERTION(result.Ignored(),
                   "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
                   "returning ignored, but returned not ignored");
    } else {
      NS_ASSERTION(!result.Ignored(),
                   "Assumed `AutoInclusiveAncestorBlockElementsJoiner::Run()` "
                   "returning handled, but returned ignored");
    }
#endif  // #ifdef DEBUG
    pointToPutCaret = joiner.PointRefToPutCaret();
    break;
  }

  // HandleDeleteLineBreak() should handle the new caret position by itself.
  if (isDeletingLineBreak) {
    result.MarkAsHandled();
    return result;
  }

  // If we're deleting selection (not replacing with new content) and
  // AutoInclusiveAncestorBlockElementsJoiner computed new caret position, we
  // should use it.  Otherwise, we should keep the traditional behavior.
  if (result.Handled() && pointToPutCaret.IsSet()) {
    EditorDOMRange range(aRangeToDelete);
    nsresult rv =
        mDeleteRangesHandler->DeleteUnnecessaryNodes(aHTMLEditor, range);
    if (NS_FAILED(rv)) {
      NS_WARNING("AutoDeleteRangesHandler::DeleteUnnecessaryNodes() failed");
      return Err(rv);
    }
    rv = aHTMLEditor.CollapseSelectionTo(pointToPutCaret);
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::CollapseSelectionTo() failed");
      return Err(rv);
    }
    // If we prefer to use style in the previous line, we should forget
    // previous styles since the caret position has all styles which we want
    // to use with new content.
    if (backspaceInRightBlock) {
      aHTMLEditor.TopLevelEditSubActionDataRef().mCachedPendingStyles->Clear();
    }
    // And we don't want to keep extending a link at ex-end of the previous
    // paragraph.
    if (HTMLEditor::GetLinkElement(pointToPutCaret.GetContainer())) {
      aHTMLEditor.mPendingStylesToApplyToNewContent
          ->ClearLinkAndItsSpecifiedStyle();
    }
    return result;
  }

  nsresult rv =
      mDeleteRangesHandler->DeleteUnnecessaryNodesAndCollapseSelection(
          aHTMLEditor, aDirectionAndAmount,
          EditorDOMPoint(aRangeToDelete.StartRef()),
          EditorDOMPoint(aRangeToDelete.EndRef()));
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoDeleteRangesHandler::DeleteUnnecessaryNodesAndCollapseSelection() "
        "failed");
    return Err(rv);
  }

  result.MarkAsHandled();
  return result;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::DeleteUnnecessaryNodes(
    HTMLEditor& aHTMLEditor, EditorDOMRange& aRange) {
  MOZ_ASSERT(aHTMLEditor.IsTopLevelEditSubActionDataAvailable());
  MOZ_ASSERT(EditorUtils::IsEditableContent(
      *aRange.StartRef().ContainerAs<nsIContent>(), EditorType::HTML));
  MOZ_ASSERT(EditorUtils::IsEditableContent(
      *aRange.EndRef().ContainerAs<nsIContent>(), EditorType::HTML));

  // If we're handling DnD, this is called to delete dragging item from the
  // tree.  In this case, we should remove parent blocks if it becomes empty.
  if (aHTMLEditor.GetEditAction() == EditAction::eDrop ||
      aHTMLEditor.GetEditAction() == EditAction::eDeleteByDrag) {
    MOZ_ASSERT(aRange.Collapsed() ||
               (aRange.StartRef().GetContainer()->GetNextSibling() ==
                    aRange.EndRef().GetContainer() &&
                aRange.StartRef().IsEndOfContainer() &&
                aRange.EndRef().IsStartOfContainer()));
    AutoTrackDOMRange trackRange(aHTMLEditor.RangeUpdaterRef(), &aRange);

    nsresult rv = DeleteParentBlocksWithTransactionIfEmpty(aHTMLEditor,
                                                           aRange.StartRef());
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "HTMLEditor::DeleteParentBlocksWithTransactionIfEmpty() failed");
      return rv;
    }
    aHTMLEditor.TopLevelEditSubActionDataRef().mDidDeleteEmptyParentBlocks =
        rv == NS_OK;
    // If we removed parent blocks, Selection should be collapsed at where
    // the most ancestor empty block has been.
    if (aHTMLEditor.TopLevelEditSubActionDataRef()
            .mDidDeleteEmptyParentBlocks) {
      return NS_OK;
    }
  }

  if (NS_WARN_IF(!aRange.IsInContentNodes()) ||
      NS_WARN_IF(!EditorUtils::IsEditableContent(
          *aRange.StartRef().ContainerAs<nsIContent>(), EditorType::HTML)) ||
      NS_WARN_IF(!EditorUtils::IsEditableContent(
          *aRange.EndRef().ContainerAs<nsIContent>(), EditorType::HTML))) {
    return NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE;
  }

  // We might have left only collapsed white-space in the start/end nodes
  AutoTrackDOMRange trackRange(aHTMLEditor.RangeUpdaterRef(), &aRange);

  OwningNonNull<nsIContent> startContainer =
      *aRange.StartRef().ContainerAs<nsIContent>();
  OwningNonNull<nsIContent> endContainer =
      *aRange.EndRef().ContainerAs<nsIContent>();
  nsresult rv =
      DeleteNodeIfInvisibleAndEditableTextNode(aHTMLEditor, startContainer);
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return NS_ERROR_EDITOR_DESTROYED;
  }
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "AutoDeleteRangesHandler::DeleteNodeIfInvisibleAndEditableTextNode() "
      "failed to remove start node, but ignored");
  // If we've not handled the selection end container, and it's still
  // editable, let's handle it.
  if (aRange.InSameContainer() ||
      !EditorUtils::IsEditableContent(
          *aRange.EndRef().ContainerAs<nsIContent>(), EditorType::HTML)) {
    return NS_OK;
  }
  rv = DeleteNodeIfInvisibleAndEditableTextNode(aHTMLEditor, endContainer);
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return NS_ERROR_EDITOR_DESTROYED;
  }
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "AutoDeleteRangesHandler::DeleteNodeIfInvisibleAndEditableTextNode() "
      "failed to remove end node, but ignored");
  return NS_OK;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::DeleteUnnecessaryNodesAndCollapseSelection(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    const EditorDOMPoint& aSelectionStartPoint,
    const EditorDOMPoint& aSelectionEndPoint) {
  EditorDOMRange range(aSelectionStartPoint, aSelectionEndPoint);
  nsresult rv = DeleteUnnecessaryNodes(aHTMLEditor, range);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoDeleteRangesHandler::DeleteUnnecessaryNodes() failed");
    return rv;
  }

  if (aHTMLEditor.GetEditAction() == EditAction::eDrop ||
      aHTMLEditor.GetEditAction() == EditAction::eDeleteByDrag) {
    // If we removed parent blocks, Selection should be collapsed at where
    // the most ancestor empty block has been.
    // XXX I think that if the range is not in active editing host, we should
    // not try to collapse selection here.
    if (aHTMLEditor.TopLevelEditSubActionDataRef()
            .mDidDeleteEmptyParentBlocks) {
      nsresult rv = aHTMLEditor.CollapseSelectionTo(range.StartRef());
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                           "EditorBase::CollapseSelectionTo() failed");
      return rv;
    }
  }

  rv = aHTMLEditor.CollapseSelectionTo(
      aDirectionAndAmount == nsIEditor::ePrevious ? range.EndRef()
                                                  : range.StartRef());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed");
  return rv;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::DeleteNodeIfInvisibleAndEditableTextNode(
    HTMLEditor& aHTMLEditor, nsIContent& aContent) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  Text* text = aContent.GetAsText();
  if (!text) {
    return NS_OK;
  }

  if (!HTMLEditUtils::IsRemovableFromParentNode(*text) ||
      HTMLEditUtils::IsVisibleTextNode(*text)) {
    return NS_OK;
  }

  nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(aContent);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::DeleteNodeWithTransaction() failed");
  return rv;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::DeleteParentBlocksWithTransactionIfEmpty(
    HTMLEditor& aHTMLEditor, const EditorDOMPoint& aPoint) {
  MOZ_ASSERT(aPoint.IsSet());
  MOZ_ASSERT(aHTMLEditor.mPlaceholderBatch);

  // First, check there is visible contents before the point in current block.
  RefPtr<Element> editingHost = aHTMLEditor.ComputeEditingHost();
  WSRunScanner wsScannerForPoint(
      editingHost, aPoint, BlockInlineCheck::UseComputedDisplayOutsideStyle);
  if (!wsScannerForPoint.StartsFromCurrentBlockBoundary() &&
      !wsScannerForPoint.StartsFromInlineEditingHostBoundary()) {
    // If there is visible node before the point, we shouldn't remove the
    // parent block.
    return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
  }
  if (NS_WARN_IF(!wsScannerForPoint.GetStartReasonContent()) ||
      NS_WARN_IF(!wsScannerForPoint.GetStartReasonContent()->GetParentNode())) {
    return NS_ERROR_FAILURE;
  }
  if (editingHost == wsScannerForPoint.GetStartReasonContent()) {
    // If we reach editing host, there is no parent blocks which can be removed.
    return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
  }
  if (HTMLEditUtils::IsTableCellOrCaption(
          *wsScannerForPoint.GetStartReasonContent())) {
    // If we reach a <td>, <th> or <caption>, we shouldn't remove it even
    // becomes empty because removing such element changes the structure of
    // the <table>.
    return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
  }

  // Next, check there is visible contents after the point in current block.
  const WSScanResult forwardScanFromPointResult =
      wsScannerForPoint.ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(aPoint);
  if (forwardScanFromPointResult.Failed()) {
    NS_WARNING("WSRunScanner::ScanNextVisibleNodeOrBlockBoundaryFrom() failed");
    return NS_ERROR_FAILURE;
  }
  if (forwardScanFromPointResult.ReachedBRElement()) {
    // XXX In my understanding, this is odd.  The end reason may not be
    //     same as the reached <br> element because the equality is
    //     guaranteed only when ReachedCurrentBlockBoundary() returns true.
    //     However, looks like that this code assumes that
    //     GetEndReasonContent() returns the (or a) <br> element.
    NS_ASSERTION(wsScannerForPoint.GetEndReasonContent() ==
                     forwardScanFromPointResult.BRElementPtr(),
                 "End reason is not the reached <br> element");
    // If the <br> element is visible, we shouldn't remove the parent block.
    if (HTMLEditUtils::IsVisibleBRElement(
            *wsScannerForPoint.GetEndReasonContent())) {
      return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
    }
    if (wsScannerForPoint.GetEndReasonContent()->GetNextSibling()) {
      const WSScanResult scanResult =
          WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
              editingHost,
              EditorRawDOMPoint::After(
                  *wsScannerForPoint.GetEndReasonContent()),
              BlockInlineCheck::UseComputedDisplayOutsideStyle);
      if (scanResult.Failed()) {
        NS_WARNING("WSRunScanner::ScanNextVisibleNodeOrBlockBoundary() failed");
        return NS_ERROR_FAILURE;
      }
      if (!scanResult.ReachedCurrentBlockBoundary() &&
          !scanResult.ReachedInlineEditingHostBoundary()) {
        // If we couldn't reach the block's end after the invisible <br>,
        // that means that there is visible content.
        return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
      }
    }
  } else if (!forwardScanFromPointResult.ReachedCurrentBlockBoundary() &&
             !forwardScanFromPointResult.ReachedInlineEditingHostBoundary()) {
    // If we couldn't reach the block's end, the block has visible content.
    return NS_SUCCESS_EDITOR_ELEMENT_NOT_FOUND;
  }

  // Delete the parent block.
  EditorDOMPoint nextPoint(
      wsScannerForPoint.GetStartReasonContent()->GetParentNode(), 0);
  nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(
      MOZ_KnownLive(*wsScannerForPoint.GetStartReasonContent()));
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
    return rv;
  }
  // If we reach editing host, return NS_OK.
  if (nextPoint.GetContainer() == editingHost) {
    return NS_OK;
  }

  // Otherwise, we need to check whether we're still in empty block or not.

  // If we have mutation event listeners, the next point is now outside of
  // editing host or editing hos has been changed.
  if (aHTMLEditor.MayHaveMutationEventListeners(
          NS_EVENT_BITS_MUTATION_NODEREMOVED |
          NS_EVENT_BITS_MUTATION_NODEREMOVEDFROMDOCUMENT |
          NS_EVENT_BITS_MUTATION_SUBTREEMODIFIED)) {
    Element* newEditingHost = aHTMLEditor.ComputeEditingHost();
    if (NS_WARN_IF(!newEditingHost) ||
        NS_WARN_IF(newEditingHost != editingHost)) {
      return NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE;
    }
    if (NS_WARN_IF(!EditorUtils::IsDescendantOf(*nextPoint.GetContainer(),
                                                *newEditingHost))) {
      return NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE;
    }
  }

  rv = DeleteParentBlocksWithTransactionIfEmpty(aHTMLEditor, nextPoint);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoDeleteRangesHandler::"
                       "DeleteParentBlocksWithTransactionIfEmpty() failed");
  return rv;
}

nsresult
HTMLEditor::AutoDeleteRangesHandler::ComputeRangeToDeleteRangeWithTransaction(
    const HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount,
    nsRange& aRangeToDelete, const Element& aEditingHost) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  const EditorBase::HowToHandleCollapsedRange howToHandleCollapsedRange =
      EditorBase::HowToHandleCollapsedRangeFor(aDirectionAndAmount);
  if (MOZ_UNLIKELY(aRangeToDelete.Collapsed() &&
                   howToHandleCollapsedRange ==
                       EditorBase::HowToHandleCollapsedRange::Ignore)) {
    return NS_SUCCESS_DOM_NO_OPERATION;
  }

  // If it's not collapsed, `DeleteRangeTransaction::Create()` will be called
  // with it and `DeleteRangeTransaction` won't modify the range.
  if (!aRangeToDelete.Collapsed()) {
    return NS_OK;
  }

  const auto ExtendRangeToSelectCharacterForward =
      [](nsRange& aRange, const EditorRawDOMPointInText& aCaretPoint) -> void {
    const nsTextFragment& textFragment =
        aCaretPoint.ContainerAs<Text>()->TextFragment();
    if (!textFragment.GetLength()) {
      return;
    }
    if (textFragment.IsHighSurrogateFollowedByLowSurrogateAt(
            aCaretPoint.Offset())) {
      DebugOnly<nsresult> rvIgnored = aRange.SetStartAndEnd(
          aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset(),
          aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset() + 2);
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rvIgnored),
                           "nsRange::SetStartAndEnd() failed");
      return;
    }
    DebugOnly<nsresult> rvIgnored = aRange.SetStartAndEnd(
        aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset(),
        aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset() + 1);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rvIgnored),
                         "nsRange::SetStartAndEnd() failed");
  };
  const auto ExtendRangeToSelectCharacterBackward =
      [](nsRange& aRange, const EditorRawDOMPointInText& aCaretPoint) -> void {
    if (aCaretPoint.IsStartOfContainer()) {
      return;
    }
    const nsTextFragment& textFragment =
        aCaretPoint.ContainerAs<Text>()->TextFragment();
    if (!textFragment.GetLength()) {
      return;
    }
    if (textFragment.IsLowSurrogateFollowingHighSurrogateAt(
            aCaretPoint.Offset() - 1)) {
      DebugOnly<nsresult> rvIgnored = aRange.SetStartAndEnd(
          aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset() - 2,
          aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset());
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rvIgnored),
                           "nsRange::SetStartAndEnd() failed");
      return;
    }
    DebugOnly<nsresult> rvIgnored = aRange.SetStartAndEnd(
        aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset() - 1,
        aCaretPoint.ContainerAs<Text>(), aCaretPoint.Offset());
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rvIgnored),
                         "nsRange::SetStartAndEnd() failed");
  };

  // In the other cases, `EditorBase::CreateTransactionForCollapsedRange()`
  // will handle the collapsed range.
  EditorRawDOMPoint caretPoint(aRangeToDelete.StartRef());
  if (howToHandleCollapsedRange ==
          EditorBase::HowToHandleCollapsedRange::ExtendBackward &&
      caretPoint.IsStartOfContainer()) {
    nsIContent* previousEditableContent = HTMLEditUtils::GetPreviousContent(
        *caretPoint.GetContainer(), {WalkTreeOption::IgnoreNonEditableNode},
        BlockInlineCheck::Unused, &aEditingHost);
    if (!previousEditableContent) {
      return NS_OK;
    }
    if (!previousEditableContent->IsText()) {
      IgnoredErrorResult ignoredError;
      aRangeToDelete.SelectNode(*previousEditableContent, ignoredError);
      NS_WARNING_ASSERTION(!ignoredError.Failed(),
                           "nsRange::SelectNode() failed");
      return NS_OK;
    }

    ExtendRangeToSelectCharacterBackward(
        aRangeToDelete,
        EditorRawDOMPointInText::AtEndOf(*previousEditableContent->AsText()));
    return NS_OK;
  }

  if (howToHandleCollapsedRange ==
          EditorBase::HowToHandleCollapsedRange::ExtendForward &&
      caretPoint.IsEndOfContainer()) {
    nsIContent* nextEditableContent = HTMLEditUtils::GetNextContent(
        *caretPoint.GetContainer(), {WalkTreeOption::IgnoreNonEditableNode},
        BlockInlineCheck::Unused, &aEditingHost);
    if (!nextEditableContent) {
      return NS_OK;
    }

    if (!nextEditableContent->IsText()) {
      IgnoredErrorResult ignoredError;
      aRangeToDelete.SelectNode(*nextEditableContent, ignoredError);
      NS_WARNING_ASSERTION(!ignoredError.Failed(),
                           "nsRange::SelectNode() failed");
      return NS_OK;
    }

    ExtendRangeToSelectCharacterForward(
        aRangeToDelete,
        EditorRawDOMPointInText(nextEditableContent->AsText(), 0));
    return NS_OK;
  }

  if (caretPoint.IsInTextNode()) {
    if (howToHandleCollapsedRange ==
        EditorBase::HowToHandleCollapsedRange::ExtendBackward) {
      ExtendRangeToSelectCharacterBackward(
          aRangeToDelete,
          EditorRawDOMPointInText(caretPoint.ContainerAs<Text>(),
                                  caretPoint.Offset()));
      return NS_OK;
    }
    ExtendRangeToSelectCharacterForward(
        aRangeToDelete, EditorRawDOMPointInText(caretPoint.ContainerAs<Text>(),
                                                caretPoint.Offset()));
    return NS_OK;
  }

  nsIContent* editableContent =
      howToHandleCollapsedRange ==
              EditorBase::HowToHandleCollapsedRange::ExtendBackward
          ? HTMLEditUtils::GetPreviousContent(
                caretPoint, {WalkTreeOption::IgnoreNonEditableNode},
                BlockInlineCheck::Unused, &aEditingHost)
          : HTMLEditUtils::GetNextContent(
                caretPoint, {WalkTreeOption::IgnoreNonEditableNode},
                BlockInlineCheck::Unused, &aEditingHost);
  if (!editableContent) {
    return NS_OK;
  }
  while (editableContent && editableContent->IsCharacterData() &&
         !editableContent->Length()) {
    editableContent =
        howToHandleCollapsedRange ==
                EditorBase::HowToHandleCollapsedRange::ExtendBackward
            ? HTMLEditUtils::GetPreviousContent(
                  *editableContent, {WalkTreeOption::IgnoreNonEditableNode},
                  BlockInlineCheck::Unused, &aEditingHost)
            : HTMLEditUtils::GetNextContent(
                  *editableContent, {WalkTreeOption::IgnoreNonEditableNode},
                  BlockInlineCheck::Unused, &aEditingHost);
  }
  if (!editableContent) {
    return NS_OK;
  }

  if (!editableContent->IsText()) {
    IgnoredErrorResult ignoredError;
    aRangeToDelete.SelectNode(*editableContent, ignoredError);
    NS_WARNING_ASSERTION(!ignoredError.Failed(),
                         "nsRange::SelectNode() failed, but ignored");
    return NS_OK;
  }

  if (howToHandleCollapsedRange ==
      EditorBase::HowToHandleCollapsedRange::ExtendBackward) {
    ExtendRangeToSelectCharacterBackward(
        aRangeToDelete,
        EditorRawDOMPointInText::AtEndOf(*editableContent->AsText()));
    return NS_OK;
  }
  ExtendRangeToSelectCharacterForward(
      aRangeToDelete, EditorRawDOMPointInText(editableContent->AsText(), 0));

  return NS_OK;
}

template <typename EditorDOMPointType>
Result<CaretPoint, nsresult> HTMLEditor::DeleteTextAndTextNodesWithTransaction(
    const EditorDOMPointType& aStartPoint, const EditorDOMPointType& aEndPoint,
    TreatEmptyTextNodes aTreatEmptyTextNodes) {
  if (NS_WARN_IF(!aStartPoint.IsSet()) || NS_WARN_IF(!aEndPoint.IsSet())) {
    return Err(NS_ERROR_INVALID_ARG);
  }

  // MOOSE: this routine needs to be modified to preserve the integrity of the
  // wsFragment info.

  if (aStartPoint == aEndPoint) {
    // Nothing to delete
    return CaretPoint(EditorDOMPoint());
  }

  RefPtr<Element> editingHost = ComputeEditingHost();
  auto DeleteEmptyContentNodeWithTransaction =
      [this, &aTreatEmptyTextNodes, &editingHost](nsIContent& aContent)
          MOZ_CAN_RUN_SCRIPT_FOR_DEFINITION -> nsresult {
    OwningNonNull<nsIContent> nodeToRemove = aContent;
    if (aTreatEmptyTextNodes ==
        TreatEmptyTextNodes::RemoveAllEmptyInlineAncestors) {
      Element* emptyParentElementToRemove =
          HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
              nodeToRemove, BlockInlineCheck::UseComputedDisplayOutsideStyle,
              editingHost);
      if (emptyParentElementToRemove) {
        nodeToRemove = *emptyParentElementToRemove;
      }
    }
    nsresult rv = DeleteNodeWithTransaction(nodeToRemove);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "EditorBase::DeleteNodeWithTransaction() failed");
    return rv;
  };

  if (aStartPoint.GetContainer() == aEndPoint.GetContainer() &&
      aStartPoint.IsInTextNode()) {
    if (aTreatEmptyTextNodes !=
            TreatEmptyTextNodes::KeepIfContainerOfRangeBoundaries &&
        aStartPoint.IsStartOfContainer() && aEndPoint.IsEndOfContainer()) {
      nsresult rv = DeleteEmptyContentNodeWithTransaction(
          MOZ_KnownLive(*aStartPoint.template ContainerAs<Text>()));
      if (NS_FAILED(rv)) {
        NS_WARNING("deleteEmptyContentNodeWithTransaction() failed");
        return Err(rv);
      }
      return CaretPoint(EditorDOMPoint());
    }
    RefPtr<Text> textNode = aStartPoint.template ContainerAs<Text>();
    Result<CaretPoint, nsresult> caretPointOrError =
        DeleteTextWithTransaction(*textNode, aStartPoint.Offset(),
                                  aEndPoint.Offset() - aStartPoint.Offset());
    NS_WARNING_ASSERTION(caretPointOrError.isOk(),
                         "HTMLEditor::DeleteTextWithTransaction() failed");
    return caretPointOrError;
  }

  RefPtr<nsRange> range =
      nsRange::Create(aStartPoint.ToRawRangeBoundary(),
                      aEndPoint.ToRawRangeBoundary(), IgnoreErrors());
  if (!range) {
    NS_WARNING("nsRange::Create() failed");
    return Err(NS_ERROR_FAILURE);
  }

  // Collect editable text nodes in the given range.
  AutoTArray<OwningNonNull<Text>, 16> arrayOfTextNodes;
  DOMIterator iter;
  if (NS_FAILED(iter.Init(*range))) {
    return CaretPoint(EditorDOMPoint());  // Nothing to delete in the range.
  }
  iter.AppendNodesToArray(
      +[](nsINode& aNode, void*) {
        MOZ_ASSERT(aNode.IsText());
        return HTMLEditUtils::IsSimplyEditableNode(aNode);
      },
      arrayOfTextNodes);
  EditorDOMPoint pointToPutCaret;
  for (OwningNonNull<Text>& textNode : arrayOfTextNodes) {
    if (textNode == aStartPoint.GetContainer()) {
      if (aStartPoint.IsEndOfContainer()) {
        continue;
      }
      if (aStartPoint.IsStartOfContainer() &&
          aTreatEmptyTextNodes !=
              TreatEmptyTextNodes::KeepIfContainerOfRangeBoundaries) {
        AutoTrackDOMPoint trackPointToPutCaret(RangeUpdaterRef(),
                                               &pointToPutCaret);
        nsresult rv = DeleteEmptyContentNodeWithTransaction(
            MOZ_KnownLive(*aStartPoint.template ContainerAs<Text>()));
        if (NS_FAILED(rv)) {
          NS_WARNING("DeleteEmptyContentNodeWithTransaction() failed");
          return Err(rv);
        }
        continue;
      }
      AutoTrackDOMPoint trackPointToPutCaret(RangeUpdaterRef(),
                                             &pointToPutCaret);
      Result<CaretPoint, nsresult> caretPointOrError =
          DeleteTextWithTransaction(MOZ_KnownLive(textNode),
                                    aStartPoint.Offset(),
                                    textNode->Length() - aStartPoint.Offset());
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
        return caretPointOrError;
      }
      trackPointToPutCaret.FlushAndStopTracking();
      caretPointOrError.unwrap().MoveCaretPointTo(
          pointToPutCaret, {SuggestCaret::OnlyIfHasSuggestion});
      continue;
    }

    if (textNode == aEndPoint.GetContainer()) {
      if (aEndPoint.IsStartOfContainer()) {
        break;
      }
      if (aEndPoint.IsEndOfContainer() &&
          aTreatEmptyTextNodes !=
              TreatEmptyTextNodes::KeepIfContainerOfRangeBoundaries) {
        AutoTrackDOMPoint trackPointToPutCaret(RangeUpdaterRef(),
                                               &pointToPutCaret);
        nsresult rv = DeleteEmptyContentNodeWithTransaction(
            MOZ_KnownLive(*aEndPoint.template ContainerAs<Text>()));
        NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                             "DeleteEmptyContentNodeWithTransaction() failed");
        return Err(rv);
      }
      AutoTrackDOMPoint trackPointToPutCaret(RangeUpdaterRef(),
                                             &pointToPutCaret);
      Result<CaretPoint, nsresult> caretPointOrError =
          DeleteTextWithTransaction(MOZ_KnownLive(textNode), 0,
                                    aEndPoint.Offset());
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
        return caretPointOrError;
      }
      trackPointToPutCaret.FlushAndStopTracking();
      caretPointOrError.unwrap().MoveCaretPointTo(
          pointToPutCaret, {SuggestCaret::OnlyIfHasSuggestion});
      return CaretPoint(pointToPutCaret);
    }

    nsresult rv =
        DeleteEmptyContentNodeWithTransaction(MOZ_KnownLive(textNode));
    if (NS_FAILED(rv)) {
      NS_WARNING("DeleteEmptyContentNodeWithTransaction() failed");
      return Err(rv);
    }
  }

  return CaretPoint(pointToPutCaret);
}

Result<EditorDOMPoint, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::JoinNodesDeepWithTransaction(
        HTMLEditor& aHTMLEditor, nsIContent& aLeftContent,
        nsIContent& aRightContent) {
  // While the rightmost children and their descendants of the left node match
  // the leftmost children and their descendants of the right node, join them
  // up.

  nsCOMPtr<nsIContent> leftContentToJoin = &aLeftContent;
  nsCOMPtr<nsIContent> rightContentToJoin = &aRightContent;
  nsCOMPtr<nsINode> parentNode = aRightContent.GetParentNode();

  EditorDOMPoint ret;
  while (leftContentToJoin && rightContentToJoin && parentNode &&
         HTMLEditUtils::CanContentsBeJoined(*leftContentToJoin,
                                            *rightContentToJoin)) {
    // Do the join
    Result<JoinNodesResult, nsresult> joinNodesResult =
        aHTMLEditor.JoinNodesWithTransaction(*leftContentToJoin,
                                             *rightContentToJoin);
    if (MOZ_UNLIKELY(joinNodesResult.isErr())) {
      NS_WARNING("HTMLEditor::JoinNodesWithTransaction() failed");
      return joinNodesResult.propagateErr();
    }

    ret = joinNodesResult.inspect().AtJoinedPoint<EditorDOMPoint>();
    if (NS_WARN_IF(!ret.IsSet())) {
      return Err(NS_ERROR_FAILURE);
    }

    if (parentNode->IsText()) {
      // We've joined all the way down to text nodes, we're done!
      return ret;
    }

    // Get new left and right nodes, and begin anew
    rightContentToJoin = ret.GetCurrentChildAtOffset();
    if (rightContentToJoin) {
      leftContentToJoin = rightContentToJoin->GetPreviousSibling();
    } else {
      leftContentToJoin = nullptr;
    }

    // Skip over non-editable nodes
    while (leftContentToJoin && !EditorUtils::IsEditableContent(
                                    *leftContentToJoin, EditorType::HTML)) {
      leftContentToJoin = leftContentToJoin->GetPreviousSibling();
    }
    if (!leftContentToJoin) {
      return ret;
    }

    while (rightContentToJoin && !EditorUtils::IsEditableContent(
                                     *rightContentToJoin, EditorType::HTML)) {
      rightContentToJoin = rightContentToJoin->GetNextSibling();
    }
    if (!rightContentToJoin) {
      return ret;
    }
  }

  if (!ret.IsSet()) {
    NS_WARNING("HTMLEditor::JoinNodesDeepWithTransaction() joined no contents");
    return Err(NS_ERROR_FAILURE);
  }
  return ret;
}

Result<bool, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::AutoInclusiveAncestorBlockElementsJoiner::Prepare(
        const HTMLEditor& aHTMLEditor, const Element& aEditingHost) {
  mLeftBlockElement = HTMLEditUtils::GetInclusiveAncestorElement(
      mInclusiveDescendantOfLeftBlockElement,
      HTMLEditUtils::ClosestEditableBlockElementExceptHRElement,
      BlockInlineCheck::UseComputedDisplayOutsideStyle);
  mRightBlockElement = HTMLEditUtils::GetInclusiveAncestorElement(
      mInclusiveDescendantOfRightBlockElement,
      HTMLEditUtils::ClosestEditableBlockElementExceptHRElement,
      BlockInlineCheck::UseComputedDisplayOutsideStyle);

  if (NS_WARN_IF(!IsSet())) {
    mCanJoinBlocks = false;
    return Err(NS_ERROR_UNEXPECTED);
  }

  // Don't join the blocks if both of them are basic structure of the HTML
  // document (Note that `<body>` can be joined with its children).
  if (mLeftBlockElement->IsAnyOfHTMLElements(nsGkAtoms::html, nsGkAtoms::head,
                                             nsGkAtoms::body) &&
      mRightBlockElement->IsAnyOfHTMLElements(nsGkAtoms::html, nsGkAtoms::head,
                                              nsGkAtoms::body)) {
    mCanJoinBlocks = false;
    return false;
  }

  if (HTMLEditUtils::IsAnyTableElement(mLeftBlockElement) ||
      HTMLEditUtils::IsAnyTableElement(mRightBlockElement)) {
    // Do not try to merge table elements, cancel the deletion.
    mCanJoinBlocks = false;
    return false;
  }

  // Bail if both blocks the same
  if (IsSameBlockElement()) {
    mCanJoinBlocks = true;  // XXX Anyway, Run() will ingore this case.
    mFallbackToDeleteLeafContent = true;
    return true;
  }

  // Joining a list item to its parent is a NOP.
  if (HTMLEditUtils::IsAnyListElement(mLeftBlockElement) &&
      HTMLEditUtils::IsListItem(mRightBlockElement) &&
      mRightBlockElement->GetParentNode() == mLeftBlockElement) {
    mCanJoinBlocks = false;
    return true;
  }

  // Special rule here: if we are trying to join list items, and they are in
  // different lists, join the lists instead.
  if (HTMLEditUtils::IsListItem(mLeftBlockElement) &&
      HTMLEditUtils::IsListItem(mRightBlockElement)) {
    // XXX leftListElement and/or rightListElement may be not list elements.
    Element* leftListElement = mLeftBlockElement->GetParentElement();
    Element* rightListElement = mRightBlockElement->GetParentElement();
    EditorDOMPoint atChildInBlock;
    if (leftListElement && rightListElement &&
        leftListElement != rightListElement &&
        !EditorUtils::IsDescendantOf(*leftListElement, *mRightBlockElement,
                                     &atChildInBlock) &&
        !EditorUtils::IsDescendantOf(*rightListElement, *mLeftBlockElement,
                                     &atChildInBlock)) {
      // There are some special complications if the lists are descendants of
      // the other lists' items.  Note that it is okay for them to be
      // descendants of the other lists themselves, which is the usual case for
      // sublists in our implementation.
      MOZ_DIAGNOSTIC_ASSERT(!atChildInBlock.IsSet());
      mLeftBlockElement = leftListElement;
      mRightBlockElement = rightListElement;
      mNewListElementTagNameOfRightListElement =
          Some(leftListElement->NodeInfo()->NameAtom());
    }
  }

  if (!EditorUtils::IsDescendantOf(*mLeftBlockElement, *mRightBlockElement,
                                   &mPointContainingTheOtherBlockElement)) {
    Unused << EditorUtils::IsDescendantOf(
        *mRightBlockElement, *mLeftBlockElement,
        &mPointContainingTheOtherBlockElement);
  }

  if (mPointContainingTheOtherBlockElement.GetContainer() ==
      mRightBlockElement) {
    mPrecedingInvisibleBRElement =
        WSRunScanner::GetPrecedingBRElementUnlessVisibleContentFound(
            aHTMLEditor.ComputeEditingHost(),
            EditorDOMPoint::AtEndOf(mLeftBlockElement),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    // `WhiteSpaceVisibilityKeeper::
    // MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement()`
    // returns ignored when:
    // - No preceding invisible `<br>` element and
    // - mNewListElementTagNameOfRightListElement is nothing and
    // - There is no content to move from right block element.
    if (!mPrecedingInvisibleBRElement) {
      if (CanMergeLeftAndRightBlockElements()) {
        // Always marked as handled in this case.
        mFallbackToDeleteLeafContent = false;
      } else {
        // Marked as handled only when it actually moves a content node.
        Result<bool, nsresult> firstLineHasContent =
            AutoMoveOneLineHandler::CanMoveOrDeleteSomethingInLine(
                mPointContainingTheOtherBlockElement
                    .NextPoint<EditorDOMPoint>(),
                aEditingHost);
        mFallbackToDeleteLeafContent =
            firstLineHasContent.isOk() && !firstLineHasContent.inspect();
      }
    } else {
      // Marked as handled when deleting the invisible `<br>` element.
      mFallbackToDeleteLeafContent = false;
    }
  } else if (mPointContainingTheOtherBlockElement.GetContainer() ==
             mLeftBlockElement) {
    mPrecedingInvisibleBRElement =
        WSRunScanner::GetPrecedingBRElementUnlessVisibleContentFound(
            aHTMLEditor.ComputeEditingHost(),
            mPointContainingTheOtherBlockElement,
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    // `WhiteSpaceVisibilityKeeper::
    // MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement()`
    // returns ignored when:
    // - No preceding invisible `<br>` element and
    // - mNewListElementTagNameOfRightListElement is some and
    // - The right block element has no children
    // or,
    // - No preceding invisible `<br>` element and
    // - mNewListElementTagNameOfRightListElement is nothing and
    // - There is no content to move from right block element.
    if (!mPrecedingInvisibleBRElement) {
      if (CanMergeLeftAndRightBlockElements()) {
        // Marked as handled only when it actualy moves a content node.
        Result<bool, nsresult> rightBlockHasContent =
            aHTMLEditor.CanMoveChildren(*mRightBlockElement,
                                        *mLeftBlockElement);
        mFallbackToDeleteLeafContent =
            rightBlockHasContent.isOk() && !rightBlockHasContent.inspect();
      } else {
        // Marked as handled only when it actually moves a content node.
        Result<bool, nsresult> firstLineHasContent =
            AutoMoveOneLineHandler::CanMoveOrDeleteSomethingInLine(
                EditorDOMPoint(mRightBlockElement, 0u), aEditingHost);
        mFallbackToDeleteLeafContent =
            firstLineHasContent.isOk() && !firstLineHasContent.inspect();
      }
    } else {
      // Marked as handled when deleting the invisible `<br>` element.
      mFallbackToDeleteLeafContent = false;
    }
  } else {
    mPrecedingInvisibleBRElement =
        WSRunScanner::GetPrecedingBRElementUnlessVisibleContentFound(
            aHTMLEditor.ComputeEditingHost(),
            EditorDOMPoint::AtEndOf(mLeftBlockElement),
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    // `WhiteSpaceVisibilityKeeper::
    // MergeFirstLineOfRightBlockElementIntoLeftBlockElement()` always
    // return "handled".
    mFallbackToDeleteLeafContent = false;
  }

  mCanJoinBlocks = true;
  return true;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    AutoInclusiveAncestorBlockElementsJoiner::ComputeRangeToDelete(
        const HTMLEditor& aHTMLEditor, const EditorDOMPoint& aCaretPoint,
        nsRange& aRangeToDelete) const {
  MOZ_ASSERT(mLeftBlockElement);
  MOZ_ASSERT(mRightBlockElement);

  if (IsSameBlockElement()) {
    if (!aCaretPoint.IsSet()) {
      return NS_OK;  // The ranges are not collapsed, keep them as-is.
    }
    nsresult rv = aRangeToDelete.CollapseTo(aCaretPoint.ToRawRangeBoundary());
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "nsRange::CollapseTo() failed");
    return rv;
  }

  EditorDOMPoint pointContainingTheOtherBlock;
  if (!EditorUtils::IsDescendantOf(*mLeftBlockElement, *mRightBlockElement,
                                   &pointContainingTheOtherBlock)) {
    Unused << EditorUtils::IsDescendantOf(
        *mRightBlockElement, *mLeftBlockElement, &pointContainingTheOtherBlock);
  }
  EditorDOMRange range =
      WSRunScanner::GetRangeForDeletingBlockElementBoundaries(
          aHTMLEditor, *mLeftBlockElement, *mRightBlockElement,
          pointContainingTheOtherBlock);
  if (!range.IsPositioned()) {
    NS_WARNING(
        "WSRunScanner::GetRangeForDeletingBlockElementBoundaries() failed");
    return NS_ERROR_FAILURE;
  }
  if (!aCaretPoint.IsSet()) {
    // Don't shrink the original range.
    bool noNeedToChangeStart = false;
    const EditorDOMPoint atStart(aRangeToDelete.StartRef());
    if (atStart.IsBefore(range.StartRef())) {
      // If the range starts from end of a container, and computed block
      // boundaries range starts from an invisible `<br>` element,  we
      // may need to shrink the range.
      Element* editingHost = aHTMLEditor.ComputeEditingHost();
      NS_WARNING_ASSERTION(editingHost, "There was no editing host");
      nsIContent* nextContent =
          atStart.IsEndOfContainer() && range.StartRef().GetChild() &&
                  HTMLEditUtils::IsInvisibleBRElement(
                      *range.StartRef().GetChild())
              ? HTMLEditUtils::GetNextContent(
                    *atStart.ContainerAs<nsIContent>(),
                    {WalkTreeOption::IgnoreDataNodeExceptText,
                     WalkTreeOption::StopAtBlockBoundary},
                    BlockInlineCheck::UseComputedDisplayOutsideStyle,
                    editingHost)
              : nullptr;
      if (!nextContent || nextContent != range.StartRef().GetChild()) {
        noNeedToChangeStart = true;
        range.SetStart(EditorRawDOMPoint(aRangeToDelete.StartRef()));
      }
    }
    if (range.EndRef().IsBefore(EditorRawDOMPoint(aRangeToDelete.EndRef()))) {
      if (noNeedToChangeStart) {
        return NS_OK;  // We don't need to modify the range.
      }
      range.SetEnd(EditorRawDOMPoint(aRangeToDelete.EndRef()));
    }
  }
  nsresult rv =
      aRangeToDelete.SetStartAndEnd(range.StartRef().ToRawRangeBoundary(),
                                    range.EndRef().ToRawRangeBoundary());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "AutoRangeArray::SetStartAndEnd() failed");
  return rv;
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoBlockElementsJoiner::AutoInclusiveAncestorBlockElementsJoiner::Run(
        HTMLEditor& aHTMLEditor, const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(mLeftBlockElement);
  MOZ_ASSERT(mRightBlockElement);

  if (IsSameBlockElement()) {
    return EditActionResult::IgnoredResult();
  }

  if (!mCanJoinBlocks) {
    return EditActionResult::HandledResult();
  }

  EditorDOMPoint startOfRightContent;

  // If the left block element is in the right block element, move the hard
  // line including the right block element to end of the left block.
  // However, if we are merging list elements, we don't join them.
  Result<EditActionResult, nsresult> result(NS_ERROR_NOT_INITIALIZED);
  if (mPointContainingTheOtherBlockElement.GetContainer() ==
      mRightBlockElement) {
    startOfRightContent = mPointContainingTheOtherBlockElement.NextPoint();
    if (Element* element = startOfRightContent.GetChildAs<Element>()) {
      startOfRightContent =
          HTMLEditUtils::GetDeepestEditableStartPointOf<EditorDOMPoint>(
              *element);
    }
    AutoTrackDOMPoint trackStartOfRightBlock(aHTMLEditor.RangeUpdaterRef(),
                                             &startOfRightContent);
    result = WhiteSpaceVisibilityKeeper::
        MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement(
            aHTMLEditor, MOZ_KnownLive(*mLeftBlockElement),
            MOZ_KnownLive(*mRightBlockElement),
            mPointContainingTheOtherBlockElement,
            mNewListElementTagNameOfRightListElement,
            MOZ_KnownLive(mPrecedingInvisibleBRElement), aEditingHost);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::"
          "MergeFirstLineOfRightBlockElementIntoDescendantLeftBlockElement() "
          "failed");
      return result;
    }
    if (NS_WARN_IF(!startOfRightContent.IsSet()) ||
        NS_WARN_IF(!startOfRightContent.GetContainer()->IsInComposedDoc())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  // If the right block element is in the left block element:
  // - move list item elements in the right block element to where the left
  //   list element is
  // - or first hard line in the right block element to where:
  //   - the left block element is.
  //   - or the given left content in the left block is.
  else if (mPointContainingTheOtherBlockElement.GetContainer() ==
           mLeftBlockElement) {
    startOfRightContent =
        HTMLEditUtils::GetDeepestEditableStartPointOf<EditorDOMPoint>(
            *mRightBlockElement);
    AutoTrackDOMPoint trackStartOfRightBlock(aHTMLEditor.RangeUpdaterRef(),
                                             &startOfRightContent);
    result = WhiteSpaceVisibilityKeeper::
        MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement(
            aHTMLEditor, MOZ_KnownLive(*mLeftBlockElement),
            MOZ_KnownLive(*mRightBlockElement),
            mPointContainingTheOtherBlockElement,
            MOZ_KnownLive(*mInclusiveDescendantOfLeftBlockElement),
            mNewListElementTagNameOfRightListElement,
            MOZ_KnownLive(mPrecedingInvisibleBRElement), aEditingHost);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::"
          "MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement() "
          "failed");
      return result;
    }
    trackStartOfRightBlock.FlushAndStopTracking();
    if (NS_WARN_IF(!startOfRightContent.IsSet()) ||
        NS_WARN_IF(!startOfRightContent.GetContainer()->IsInComposedDoc())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }

  }

  // Normal case.  Blocks are siblings, or at least close enough.  An example
  // of the latter is <p>paragraph</p><ul><li>one<li>two<li>three</ul>.  The
  // first li and the p are not true siblings, but we still want to join them
  // if you backspace from li into p.
  else {
    MOZ_ASSERT(!mPointContainingTheOtherBlockElement.IsSet());

    startOfRightContent =
        HTMLEditUtils::GetDeepestEditableStartPointOf<EditorDOMPoint>(
            *mRightBlockElement);
    AutoTrackDOMPoint trackStartOfRightBlock(aHTMLEditor.RangeUpdaterRef(),
                                             &startOfRightContent);
    result = WhiteSpaceVisibilityKeeper::
        MergeFirstLineOfRightBlockElementIntoLeftBlockElement(
            aHTMLEditor, MOZ_KnownLive(*mLeftBlockElement),
            MOZ_KnownLive(*mRightBlockElement),
            mNewListElementTagNameOfRightListElement,
            MOZ_KnownLive(mPrecedingInvisibleBRElement), aEditingHost);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::"
          "MergeFirstLineOfRightBlockElementIntoLeftBlockElement() failed");
      return result;
    }
    trackStartOfRightBlock.FlushAndStopTracking();
    if (NS_WARN_IF(!startOfRightContent.IsSet()) ||
        NS_WARN_IF(!startOfRightContent.GetContainer()->IsInComposedDoc())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  // If we're deleting selection (meaning not replacing selection with new
  // content), we should put caret to end of preceding text node if there is.
  // Then, users can type text into it like the other browsers.
  if (MayEditActionDeleteAroundCollapsedSelection(
          aHTMLEditor.GetEditAction())) {
    WSRunScanner scanner(&aEditingHost, startOfRightContent,
                         BlockInlineCheck::UseComputedDisplayStyle);
    const WSScanResult maybePreviousText =
        scanner.ScanPreviousVisibleNodeOrBlockBoundaryFrom(startOfRightContent);
    if (maybePreviousText.IsContentEditable() &&
        maybePreviousText.InVisibleOrCollapsibleCharacters()) {
      mPointToPutCaret =
          maybePreviousText.PointAfterReachedContent<EditorDOMPoint>();
    }
  }
  return result;
}

// static
Result<bool, nsresult>
HTMLEditor::AutoMoveOneLineHandler::CanMoveOrDeleteSomethingInLine(
    const EditorDOMPoint& aPointInHardLine, const Element& aEditingHost) {
  if (NS_WARN_IF(!aPointInHardLine.IsSet()) ||
      NS_WARN_IF(aPointInHardLine.IsInNativeAnonymousSubtree())) {
    return Err(NS_ERROR_INVALID_ARG);
  }

  RefPtr<nsRange> oneLineRange =
      AutoRangeArray::CreateRangeWrappingStartAndEndLinesContainingBoundaries(
          aPointInHardLine, aPointInHardLine,
          EditSubAction::eMergeBlockContents,
          BlockInlineCheck::UseComputedDisplayOutsideStyle, aEditingHost);
  if (!oneLineRange || oneLineRange->Collapsed() ||
      !oneLineRange->IsPositioned() ||
      !oneLineRange->GetStartContainer()->IsContent() ||
      !oneLineRange->GetEndContainer()->IsContent()) {
    return false;
  }

  // If there is only a padding `<br>` element in a empty block, it's selected
  // by `UpdatePointsToSelectAllChildrenIfCollapsedInEmptyBlockElement()`.
  // However, it won't be moved.  Although it'll be deleted,
  // AutoMoveOneLineHandler returns "ignored".  Therefore, we should return
  // `false` in this case.
  if (nsIContent* childContent = oneLineRange->GetChildAtStartOffset()) {
    if (childContent->IsHTMLElement(nsGkAtoms::br) &&
        childContent->GetParent()) {
      if (const Element* blockElement =
              HTMLEditUtils::GetInclusiveAncestorElement(
                  *childContent->GetParent(),
                  HTMLEditUtils::ClosestBlockElement,
                  BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
        if (HTMLEditUtils::IsEmptyNode(
                *blockElement,
                {EmptyCheckOption::TreatNonEditableContentAsInvisible})) {
          return false;
        }
      }
    }
  }

  nsINode* commonAncestor = oneLineRange->GetClosestCommonInclusiveAncestor();
  // Currently, we move non-editable content nodes too.
  EditorRawDOMPoint startPoint(oneLineRange->StartRef());
  if (!startPoint.IsEndOfContainer()) {
    return true;
  }
  EditorRawDOMPoint endPoint(oneLineRange->EndRef());
  if (!endPoint.IsStartOfContainer()) {
    return true;
  }
  if (startPoint.GetContainer() != commonAncestor) {
    while (true) {
      EditorRawDOMPoint pointInParent(startPoint.GetContainerAs<nsIContent>());
      if (NS_WARN_IF(!pointInParent.IsInContentNode())) {
        return Err(NS_ERROR_FAILURE);
      }
      if (pointInParent.GetContainer() == commonAncestor) {
        startPoint = pointInParent;
        break;
      }
      if (!pointInParent.IsEndOfContainer()) {
        return true;
      }
    }
  }
  if (endPoint.GetContainer() != commonAncestor) {
    while (true) {
      EditorRawDOMPoint pointInParent(endPoint.GetContainerAs<nsIContent>());
      if (NS_WARN_IF(!pointInParent.IsInContentNode())) {
        return Err(NS_ERROR_FAILURE);
      }
      if (pointInParent.GetContainer() == commonAncestor) {
        endPoint = pointInParent;
        break;
      }
      if (!pointInParent.IsStartOfContainer()) {
        return true;
      }
    }
  }
  // If start point and end point in the common ancestor are direct siblings,
  // there is no content to move or delete.
  // E.g., `<b>abc<br>[</b><i>]<br>def</i>`.
  return startPoint.GetNextSiblingOfChild() != endPoint.GetChild();
}

nsresult HTMLEditor::AutoMoveOneLineHandler::Prepare(
    HTMLEditor& aHTMLEditor, const EditorDOMPoint& aPointInHardLine,
    const Element& aEditingHost) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(aPointInHardLine.IsInContentNode());
  MOZ_ASSERT(mPointToInsert.IsSetAndValid());

  MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
          ("Prepare(aHTMLEditor=%p, aPointInHardLine=%s, aEditingHost=%s), "
           "mPointToInsert=%s, mMoveToEndOfContainer=%s",
           &aHTMLEditor, ToString(aPointInHardLine).c_str(),
           ToString(aEditingHost).c_str(), ToString(mPointToInsert).c_str(),
           ForceMoveToEndOfContainer() ? "MoveToEndOfContainer::Yes"
                                       : "MoveToEndOfContainer::No"));

  if (NS_WARN_IF(mPointToInsert.IsInNativeAnonymousSubtree())) {
    MOZ_LOG(
        gOneLineMoverLog, LogLevel::Error,
        ("Failed because mPointToInsert was in a native anonymous subtree"));
    return Err(NS_ERROR_INVALID_ARG);
  }

  mSrcInclusiveAncestorBlock =
      aPointInHardLine.IsInContentNode()
          ? HTMLEditUtils::GetInclusiveAncestorElement(
                *aPointInHardLine.ContainerAs<nsIContent>(),
                HTMLEditUtils::ClosestBlockElement,
                BlockInlineCheck::UseComputedDisplayOutsideStyle)
          : nullptr;
  mDestInclusiveAncestorBlock =
      mPointToInsert.IsInContentNode()
          ? HTMLEditUtils::GetInclusiveAncestorElement(
                *mPointToInsert.ContainerAs<nsIContent>(),
                HTMLEditUtils::ClosestBlockElement,
                BlockInlineCheck::UseComputedDisplayOutsideStyle)
          : nullptr;
  mMovingToParentBlock =
      mDestInclusiveAncestorBlock && mSrcInclusiveAncestorBlock &&
      mDestInclusiveAncestorBlock != mSrcInclusiveAncestorBlock &&
      mSrcInclusiveAncestorBlock->IsInclusiveDescendantOf(
          mDestInclusiveAncestorBlock);
  mTopmostSrcAncestorBlockInDestBlock =
      mMovingToParentBlock
          ? AutoMoveOneLineHandler::
                GetMostDistantInclusiveAncestorBlockInSpecificAncestorElement(
                    *mSrcInclusiveAncestorBlock, *mDestInclusiveAncestorBlock)
          : nullptr;
  MOZ_ASSERT_IF(mMovingToParentBlock, mTopmostSrcAncestorBlockInDestBlock);

  mPreserveWhiteSpaceStyle =
      AutoMoveOneLineHandler::ConsiderWhetherPreserveWhiteSpaceStyle(
          aPointInHardLine.GetContainerAs<nsIContent>(),
          mDestInclusiveAncestorBlock);

  AutoRangeArray rangesToWrapTheLine(aPointInHardLine);
  rangesToWrapTheLine.ExtendRangesToWrapLines(
      EditSubAction::eMergeBlockContents,
      BlockInlineCheck::UseComputedDisplayOutsideStyle, aEditingHost);
  MOZ_ASSERT(rangesToWrapTheLine.Ranges().Length() <= 1u);
  mLineRange = EditorDOMRange(rangesToWrapTheLine.FirstRangeRef());

  MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
          ("mSrcInclusiveAncestorBlock=%s, mDestInclusiveAncestorBlock=%s, "
           "mMovingToParentBlock=%s, mTopmostSrcAncestorBlockInDestBlock=%s, "
           "mPreserveWhiteSpaceStyle=%s, mLineRange=%s",
           mSrcInclusiveAncestorBlock
               ? ToString(*mSrcInclusiveAncestorBlock).c_str()
               : "nullptr",
           mDestInclusiveAncestorBlock
               ? ToString(*mDestInclusiveAncestorBlock).c_str()
               : "nullptr",
           mMovingToParentBlock ? "true" : "false",
           mTopmostSrcAncestorBlockInDestBlock
               ? ToString(*mTopmostSrcAncestorBlockInDestBlock).c_str()
               : "nullptr",
           ToString(mPreserveWhiteSpaceStyle).c_str(),
           ToString(mLineRange).c_str()));

  return NS_OK;
}

Result<CaretPoint, nsresult>
HTMLEditor::AutoMoveOneLineHandler::SplitToMakeTheLineIsolated(
    HTMLEditor& aHTMLEditor, const nsIContent& aNewContainer,
    const Element& aEditingHost,
    nsTArray<OwningNonNull<nsIContent>>& aOutArrayOfContents) const {
  AutoRangeArray rangesToWrapTheLine(mLineRange);
  Result<EditorDOMPoint, nsresult> splitResult =
      rangesToWrapTheLine
          .SplitTextAtEndBoundariesAndInlineAncestorsAtBothBoundaries(
              aHTMLEditor, BlockInlineCheck::UseComputedDisplayOutsideStyle,
              aEditingHost, &aNewContainer);
  if (MOZ_UNLIKELY(splitResult.isErr())) {
    NS_WARNING(
        "AutoRangeArray::"
        "SplitTextAtEndBoundariesAndInlineAncestorsAtBothBoundaries() failed");
    return Err(splitResult.unwrapErr());
  }
  EditorDOMPoint pointToPutCaret;
  if (splitResult.inspect().IsSet()) {
    pointToPutCaret = splitResult.unwrap();
  }
  nsresult rv = rangesToWrapTheLine.CollectEditTargetNodes(
      aHTMLEditor, aOutArrayOfContents, EditSubAction::eMergeBlockContents,
      AutoRangeArray::CollectNonEditableNodes::Yes);
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoRangeArray::CollectEditTargetNodes(EditSubAction::"
        "eMergeBlockContents, CollectNonEditableNodes::Yes) failed");
    return Err(rv);
  }
  return CaretPoint(pointToPutCaret);
}

// static
Element* HTMLEditor::AutoMoveOneLineHandler::
    GetMostDistantInclusiveAncestorBlockInSpecificAncestorElement(
        Element& aBlockElement, const Element& aAncestorElement) {
  MOZ_ASSERT(aBlockElement.IsInclusiveDescendantOf(&aAncestorElement));
  MOZ_ASSERT(HTMLEditUtils::IsBlockElement(
      aBlockElement, BlockInlineCheck::UseComputedDisplayOutsideStyle));

  if (&aBlockElement == &aAncestorElement) {
    return nullptr;
  }

  Element* lastBlockAncestor = &aBlockElement;
  for (Element* element : aBlockElement.InclusiveAncestorsOfType<Element>()) {
    if (element == &aAncestorElement) {
      return lastBlockAncestor;
    }
    if (HTMLEditUtils::IsBlockElement(
            *lastBlockAncestor,
            BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
      lastBlockAncestor = element;
    }
  }
  return nullptr;
}

// static
HTMLEditor::PreserveWhiteSpaceStyle
HTMLEditor::AutoMoveOneLineHandler::ConsiderWhetherPreserveWhiteSpaceStyle(
    const nsIContent* aContentInLine,
    const Element* aInclusiveAncestorBlockOfInsertionPoint) {
  if (MOZ_UNLIKELY(!aInclusiveAncestorBlockOfInsertionPoint)) {
    return PreserveWhiteSpaceStyle::No;
  }

  // If we move content from or to <pre>, we don't need to preserve the
  // white-space style for compatibility with both our traditional behavior
  // and the other browsers.

  // TODO: If `white-space` is specified by non-UA stylesheet, we should
  // preserve it even if the right block is <pre> for compatibility with the
  // other browsers.
  const auto IsInclusiveDescendantOfPre = [](const nsIContent& aContent) {
    // If the content has different `white-space` style from <pre>, we
    // shouldn't treat it as a descendant of <pre> because web apps or
    // the user intent to treat the white-spaces in aContent not as `pre`.
    if (EditorUtils::GetComputedWhiteSpaceStyles(aContent).valueOr(std::pair(
            StyleWhiteSpaceCollapse::Collapse, StyleTextWrapMode::Wrap)) !=
        std::pair(StyleWhiteSpaceCollapse::Preserve,
                  StyleTextWrapMode::Nowrap)) {
      return false;
    }
    for (const Element* element :
         aContent.InclusiveAncestorsOfType<Element>()) {
      if (element->IsHTMLElement(nsGkAtoms::pre)) {
        return true;
      }
    }
    return false;
  };
  if (IsInclusiveDescendantOfPre(*aInclusiveAncestorBlockOfInsertionPoint) ||
      MOZ_UNLIKELY(!aContentInLine) ||
      IsInclusiveDescendantOfPre(*aContentInLine)) {
    return PreserveWhiteSpaceStyle::No;
  }
  return PreserveWhiteSpaceStyle::Yes;
}

Result<MoveNodeResult, nsresult> HTMLEditor::AutoMoveOneLineHandler::Run(
    HTMLEditor& aHTMLEditor, const Element& aEditingHost) {
  EditorDOMPoint pointToInsert(NextInsertionPointRef());
  MOZ_ASSERT(pointToInsert.IsInContentNode());

  MOZ_LOG(
      gOneLineMoverLog, LogLevel::Info,
      ("Run(aHTMLEditor=%p, aEditingHost=%s), pointToInsert=%s", &aHTMLEditor,
       ToString(aEditingHost).c_str(), ToString(pointToInsert).c_str()));

  EditorDOMPoint pointToPutCaret;
  AutoTArray<OwningNonNull<nsIContent>, 64> arrayOfContents;
  {
    AutoTrackDOMPoint tackPointToInsert(aHTMLEditor.RangeUpdaterRef(),
                                        &pointToInsert);

    Result<CaretPoint, nsresult> splitAtLineEdgesResult =
        SplitToMakeTheLineIsolated(
            aHTMLEditor,
            MOZ_KnownLive(*pointToInsert.ContainerAs<nsIContent>()),
            aEditingHost, arrayOfContents);
    if (MOZ_UNLIKELY(splitAtLineEdgesResult.isErr())) {
      NS_WARNING("AutoMoveOneLineHandler::SplitToMakeTheLineIsolated() failed");
      MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
              ("Run: SplitToMakeTheLineIsolated() failed"));
      return splitAtLineEdgesResult.propagateErr();
    }
    splitAtLineEdgesResult.unwrap().MoveCaretPointTo(
        pointToPutCaret, {SuggestCaret::OnlyIfHasSuggestion});
    MOZ_LOG(gOneLineMoverLog, LogLevel::Verbose,
            ("Run: pointToPutCaret=%s", ToString(pointToPutCaret).c_str()));

    Result<EditorDOMPoint, nsresult> splitAtBRElementsResult =
        aHTMLEditor.MaybeSplitElementsAtEveryBRElement(
            arrayOfContents, EditSubAction::eMergeBlockContents);
    if (MOZ_UNLIKELY(splitAtBRElementsResult.isErr())) {
      NS_WARNING(
          "HTMLEditor::MaybeSplitElementsAtEveryBRElement(EditSubAction::"
          "eMergeBlockContents) failed");
      MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
              ("Run: MaybeSplitElementsAtEveryBRElement() failed"));
      return splitAtBRElementsResult.propagateErr();
    }
    if (splitAtBRElementsResult.inspect().IsSet()) {
      pointToPutCaret = splitAtBRElementsResult.unwrap();
    }
    MOZ_LOG(gOneLineMoverLog, LogLevel::Verbose,
            ("Run: pointToPutCaret=%s", ToString(pointToPutCaret).c_str()));
  }

  if (!pointToInsert.IsSetAndValid()) {
    MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
            ("Run: Failed because pointToInsert pointed invalid position"));
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  if (aHTMLEditor.AllowsTransactionsToChangeSelection() &&
      pointToPutCaret.IsSet()) {
    nsresult rv = aHTMLEditor.CollapseSelectionTo(pointToPutCaret);
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::CollapseSelectionTo() failed");
      MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
              ("Run: Failed because of "
               "aHTMLEditor.CollapseSelectionTo(pointToPutCaret) failure"));
      return Err(rv);
    }
  }

  if (arrayOfContents.IsEmpty()) {
    MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
            ("Run: Did nothing because of no content to be moved"));
    return MoveNodeResult::IgnoredResult(std::move(pointToInsert));
  }

  // Track the range which contains the moved contents.
  if (ForceMoveToEndOfContainer()) {
    pointToInsert = NextInsertionPointRef();
  }
  EditorDOMRange movedContentRange(pointToInsert);
  MoveNodeResult moveContentsInLineResult =
      MoveNodeResult::IgnoredResult(pointToInsert);
  for (const OwningNonNull<nsIContent>& content : arrayOfContents) {
    MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
            ("Run: content=%s, pointToInsert=%s, movedContentRange=%s, "
             "mPointToInsert=%s",
             ToString(content.ref()).c_str(), ToString(pointToInsert).c_str(),
             ToString(movedContentRange).c_str(),
             ToString(mPointToInsert).c_str()));
    {
      AutoEditorDOMRangeChildrenInvalidator lockOffsets(movedContentRange);
      AutoTrackDOMRange trackMovedContentRange(aHTMLEditor.RangeUpdaterRef(),
                                               &movedContentRange);
      // If the content is a block element, move all children of it to the
      // new container, and then, remove the (probably) empty block element.
      if (HTMLEditUtils::IsBlockElement(
              content, BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
        MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
                ("Run: Unwrapping children of content because of a block"));
        Result<MoveNodeResult, nsresult> moveChildrenResult =
            aHTMLEditor.MoveChildrenWithTransaction(
                MOZ_KnownLive(*content->AsElement()), pointToInsert,
                mPreserveWhiteSpaceStyle, RemoveIfCommentNode::Yes);
        if (MOZ_UNLIKELY(moveChildrenResult.isErr())) {
          NS_WARNING("HTMLEditor::MoveChildrenWithTransaction() failed");
          MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
                  ("Run: MoveChildrenWithTransaction() failed"));
          moveContentsInLineResult.IgnoreCaretPointSuggestion();
          return moveChildrenResult;
        }
        moveContentsInLineResult |= moveChildrenResult.inspect();
        // MOZ_KnownLive due to bug 1620312
        nsresult rv =
            aHTMLEditor.DeleteNodeWithTransaction(MOZ_KnownLive(content));
        if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
          MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
                  ("Run: Aborted because DeleteNodeWithTransaction() caused "
                   "destroying the editor"));
          moveContentsInLineResult.IgnoreCaretPointSuggestion();
          return Err(NS_ERROR_EDITOR_DESTROYED);
        }
        if (NS_FAILED(rv)) {
          NS_WARNING(
              "EditorBase::DeleteNodeWithTransaction() failed, but ignored");
          MOZ_LOG(gOneLineMoverLog, LogLevel::Warning,
                  ("Run: Failed to delete content but the error was ignored"));
        }
      }
      // If the moving content is a comment node or an empty inline node, we
      // don't want it to appear in the dist paragraph.
      else if (content->IsComment() ||
               (content->IsText() && !content->AsText()->TextDataLength()) ||
               HTMLEditUtils::IsEmptyInlineContainer(
                   content,
                   {EmptyCheckOption::TreatSingleBRElementAsVisible,
                    EmptyCheckOption::TreatListItemAsVisible,
                    EmptyCheckOption::TreatTableCellAsVisible,
                    EmptyCheckOption::TreatNonEditableContentAsInvisible},
                   BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
        nsCOMPtr<nsIContent> emptyContent =
            HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
                content, BlockInlineCheck::UseComputedDisplayOutsideStyle,
                &aEditingHost, pointToInsert.ContainerAs<nsIContent>());
        if (!emptyContent) {
          emptyContent = content;
        }
        MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
                ("Run: Deleting content because of %s%s",
                 content->IsComment() ? "a comment node"
                 : content->IsText()  ? "an empty text node"
                                      : "an empty inline container",
                 content != emptyContent
                     ? nsPrintfCString(" (deleting topmost empty ancestor: %s)",
                                       ToString(*emptyContent).c_str())
                           .get()
                     : ""));
        nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(*emptyContent);
        if (NS_FAILED(rv)) {
          NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
          MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
                  ("Run: DeleteNodeWithTransaction() failed"));
          moveContentsInLineResult.IgnoreCaretPointSuggestion();
          return Err(rv);
        }
      } else {
        MOZ_LOG(gOneLineMoverLog, LogLevel::Info, ("Run: Moving content"));
        // MOZ_KnownLive due to bug 1620312
        Result<MoveNodeResult, nsresult> moveNodeOrChildrenResult =
            aHTMLEditor.MoveNodeOrChildrenWithTransaction(
                MOZ_KnownLive(content), pointToInsert, mPreserveWhiteSpaceStyle,
                RemoveIfCommentNode::Yes);
        if (MOZ_UNLIKELY(moveNodeOrChildrenResult.isErr())) {
          NS_WARNING("HTMLEditor::MoveNodeOrChildrenWithTransaction() failed");
          MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
                  ("Run: MoveNodeOrChildrenWithTransaction() failed"));
          moveContentsInLineResult.IgnoreCaretPointSuggestion();
          return moveNodeOrChildrenResult;
        }
        moveContentsInLineResult |= moveNodeOrChildrenResult.inspect();
      }
    }
    MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
            ("Run: movedContentRange=%s, mPointToInsert=%s",
             ToString(movedContentRange).c_str(),
             ToString(mPointToInsert).c_str()));
    moveContentsInLineResult.MarkAsHandled();
    if (NS_WARN_IF(!movedContentRange.IsPositioned())) {
      MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
              ("Run: Failed because movedContentRange was not positioned"));
      moveContentsInLineResult.IgnoreCaretPointSuggestion();
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
    // For backward compatibility, we should move contents to end of the
    // container if the instance is created without specific insertion point.
    if (ForceMoveToEndOfContainer()) {
      pointToInsert = NextInsertionPointRef();
      MOZ_ASSERT(pointToInsert.IsSet());
      MOZ_ASSERT(movedContentRange.StartRef().EqualsOrIsBefore(pointToInsert));
      movedContentRange.SetEnd(pointToInsert);
      MOZ_LOG(gOneLineMoverLog, LogLevel::Debug,
              ("Run: Updated movedContentRange end to next insertion point"));
    }
    // And also if pointToInsert has been made invalid with removing preceding
    // children, we should move the content to the end of the container.
    else if (aHTMLEditor.MayHaveMutationEventListeners() &&
             MOZ_UNLIKELY(!moveContentsInLineResult.NextInsertionPointRef()
                               .IsSetAndValid())) {
      mPointToInsert.SetToEndOf(mPointToInsert.GetContainer());
      pointToInsert = NextInsertionPointRef();
      movedContentRange.SetEnd(pointToInsert);
      MOZ_LOG(gOneLineMoverLog, LogLevel::Debug,
              ("Run: Updated mPointToInsert to end of container and updated "
               "movedContentRange"));
    } else {
      MOZ_DIAGNOSTIC_ASSERT(
          moveContentsInLineResult.NextInsertionPointRef().IsSet());
      mPointToInsert = moveContentsInLineResult.NextInsertionPointRef();
      pointToInsert = NextInsertionPointRef();
      if (!aHTMLEditor.MayHaveMutationEventListeners() ||
          movedContentRange.EndRef().IsBefore(pointToInsert)) {
        MOZ_ASSERT(pointToInsert.IsSet());
        MOZ_ASSERT(
            movedContentRange.StartRef().EqualsOrIsBefore(pointToInsert));
        movedContentRange.SetEnd(pointToInsert);
        MOZ_LOG(gOneLineMoverLog, LogLevel::Debug,
                ("Run: Updated mPointToInsert and updated movedContentRange"));
      } else {
        MOZ_LOG(gOneLineMoverLog, LogLevel::Debug,
                ("Run: Updated only mPointToInsert"));
      }
    }
  }

  // Nothing has been moved, we don't need to clean up unnecessary <br> element.
  // And also if we're not moving content into a block, we can quit right now.
  if (moveContentsInLineResult.Ignored() ||
      MOZ_UNLIKELY(!mDestInclusiveAncestorBlock)) {
    MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
            (moveContentsInLineResult.Ignored()
                 ? "Run: Did nothing for any children"
                 : "Run: Finished (not dest block)"));
    return moveContentsInLineResult;
  }

  // If we couldn't track the range to clean up, we should just stop cleaning up
  // because returning error from here may change the behavior of web apps using
  // mutation event listeners.
  if (MOZ_UNLIKELY(!movedContentRange.IsPositioned() ||
                   movedContentRange.Collapsed())) {
    MOZ_LOG(gOneLineMoverLog, LogLevel::Info,
            (!movedContentRange.IsPositioned()
                 ? "Run: Finished (Couldn't track moved line)"
                 : "Run: Finished (Moved line was empty)"));
    return moveContentsInLineResult;
  }

  nsresult rv = DeleteUnnecessaryTrailingLineBreakInMovedLineEnd(
      aHTMLEditor, movedContentRange, aEditingHost);
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoMoveOneLineHandler::"
        "DeleteUnnecessaryTrailingLineBreakInMovedLineEnd() failed");
    MOZ_LOG(gOneLineMoverLog, LogLevel::Error,
            ("Run: DeleteUnnecessaryTrailingLineBreakInMovedLineEnd() failed"));
    moveContentsInLineResult.IgnoreCaretPointSuggestion();
    return Err(rv);
  }

  MOZ_LOG(gOneLineMoverLog, LogLevel::Info, ("Run: Finished"));
  return moveContentsInLineResult;
}

nsresult HTMLEditor::AutoMoveOneLineHandler::
    DeleteUnnecessaryTrailingLineBreakInMovedLineEnd(
        HTMLEditor& aHTMLEditor, const EditorDOMRange& aMovedContentRange,
        const Element& aEditingHost) const {
  MOZ_ASSERT(mDestInclusiveAncestorBlock);
  MOZ_ASSERT(aMovedContentRange.IsPositioned());
  MOZ_ASSERT(!aMovedContentRange.Collapsed());

  // If we didn't preserve white-space for backward compatibility and
  // white-space becomes not preformatted, we need to clean it up the last text
  // node if it ends with a preformatted line break.
  if (mPreserveWhiteSpaceStyle == PreserveWhiteSpaceStyle::No) {
    const RefPtr<Text> textNodeEndingWithUnnecessaryLineBreak = [&]() -> Text* {
      Text* lastTextNode = Text::FromNodeOrNull(
          mMovingToParentBlock
              ? HTMLEditUtils::GetPreviousContent(
                    *mTopmostSrcAncestorBlockInDestBlock,
                    {WalkTreeOption::StopAtBlockBoundary},
                    BlockInlineCheck::UseComputedDisplayOutsideStyle,
                    mDestInclusiveAncestorBlock)
              : HTMLEditUtils::GetLastLeafContent(
                    *mDestInclusiveAncestorBlock,
                    {LeafNodeType::LeafNodeOrNonEditableNode}));
      if (!lastTextNode ||
          !HTMLEditUtils::IsSimplyEditableNode(*lastTextNode)) {
        return nullptr;
      }
      const nsTextFragment& textFragment = lastTextNode->TextFragment();
      const char16_t lastCh =
          textFragment.GetLength()
              ? textFragment.CharAt(textFragment.GetLength() - 1u)
              : 0;
      return lastCh == HTMLEditUtils::kNewLine &&
                     !EditorUtils::IsNewLinePreformatted(*lastTextNode)
                 ? lastTextNode
                 : nullptr;
    }();
    if (textNodeEndingWithUnnecessaryLineBreak) {
      if (textNodeEndingWithUnnecessaryLineBreak->TextDataLength() == 1u) {
        const RefPtr<Element> inlineElement =
            HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
                *textNodeEndingWithUnnecessaryLineBreak,
                BlockInlineCheck::UseComputedDisplayOutsideStyle,
                &aEditingHost);
        nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(
            inlineElement ? static_cast<nsIContent&>(*inlineElement)
                          : static_cast<nsIContent&>(
                                *textNodeEndingWithUnnecessaryLineBreak));
        if (NS_FAILED(rv)) {
          NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
          return Err(rv);
        }
      } else {
        Result<CaretPoint, nsresult> caretPointOrError =
            aHTMLEditor.DeleteTextWithTransaction(
                *textNodeEndingWithUnnecessaryLineBreak,
                textNodeEndingWithUnnecessaryLineBreak->TextDataLength() - 1u,
                1u);
        if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
          NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
          return caretPointOrError.propagateErr();
        }
        nsresult rv = caretPointOrError.inspect().SuggestCaretPointTo(
            aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                          SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                          SuggestCaret::AndIgnoreTrivialError});
        if (NS_FAILED(rv)) {
          NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
          return Err(rv);
        }
        NS_WARNING_ASSERTION(
            rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
            "CaretPoint::SuggestCaretPointTo() failed, but ignored");
      }
    }
  }

  nsCOMPtr<nsIContent> lastLineBreakContent =
      mMovingToParentBlock
          ? HTMLEditUtils::GetUnnecessaryLineBreakContent(
                *mTopmostSrcAncestorBlockInDestBlock,
                ScanLineBreak::BeforeBlock)
          : HTMLEditUtils::GetUnnecessaryLineBreakContent(
                *mDestInclusiveAncestorBlock, ScanLineBreak::AtEndOfBlock);
  if (!lastLineBreakContent) {
    return NS_OK;
  }
  EditorRawDOMPoint atUnnecessaryLineBreak(lastLineBreakContent);
  if (NS_WARN_IF(!atUnnecessaryLineBreak.IsSet())) {
    return NS_ERROR_FAILURE;
  }
  // If the found unnecessary line break is not what we moved above, we
  // shouldn't remove it.  E.g., the web app may have inserted it intentionally.
  MOZ_ASSERT(aMovedContentRange.StartRef().IsSetAndValid());
  MOZ_ASSERT(aMovedContentRange.EndRef().IsSetAndValid());
  if (!aMovedContentRange.Contains(atUnnecessaryLineBreak)) {
    return NS_OK;
  }

  AutoTransactionsConserveSelection dontChangeMySelection(aHTMLEditor);
  // If it's a text node and ending with a preformatted line break, we should
  // delete it.
  if (Text* textNode = Text::FromNode(lastLineBreakContent)) {
    MOZ_ASSERT(EditorUtils::IsNewLinePreformatted(*textNode));
    if (textNode->TextDataLength() > 1) {
      Result<CaretPoint, nsresult> caretPointOrError =
          aHTMLEditor.DeleteTextWithTransaction(
              MOZ_KnownLive(*textNode), textNode->TextDataLength() - 1u, 1u);
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING("HTMLEditor::DeleteTextWithTransaction() failed");
        return caretPointOrError.unwrapErr();
      }
      // IgnoreCaretPointSuggestion() because of dontChangeMySelection above.
      caretPointOrError.unwrap().IgnoreCaretPointSuggestion();
      return NS_OK;
    }
  } else {
    MOZ_ASSERT(lastLineBreakContent->IsHTMLElement(nsGkAtoms::br));
  }
  // If last line break content is the only content of its inline parent, we
  // should remove the parent too.
  if (const RefPtr<Element> inlineElement =
          HTMLEditUtils::GetMostDistantAncestorEditableEmptyInlineElement(
              *lastLineBreakContent,
              BlockInlineCheck::UseComputedDisplayOutsideStyle,
              &aEditingHost)) {
    nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(*inlineElement);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "EditorBase::DeleteNodeWithTransaction() failed");
    return rv;
  }
  // Or if the text node has only the preformatted line break or <br> element,
  // we should remove it.
  nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(*lastLineBreakContent);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::DeleteNodeWithTransaction() failed");
  return rv;
}

Result<bool, nsresult> HTMLEditor::CanMoveNodeOrChildren(
    const nsIContent& aContent, const nsINode& aNewContainer) const {
  if (HTMLEditUtils::CanNodeContain(aNewContainer, aContent)) {
    return true;
  }
  if (aContent.IsElement()) {
    return CanMoveChildren(*aContent.AsElement(), aNewContainer);
  }
  return true;
}

Result<MoveNodeResult, nsresult> HTMLEditor::MoveNodeOrChildrenWithTransaction(
    nsIContent& aContentToMove, const EditorDOMPoint& aPointToInsert,
    PreserveWhiteSpaceStyle aPreserveWhiteSpaceStyle,
    RemoveIfCommentNode aRemoveIfCommentNode) {
  MOZ_ASSERT(IsEditActionDataAvailable());
  MOZ_ASSERT(aPointToInsert.IsInContentNode());

  const auto destWhiteSpaceStyles =
      [&]() -> Maybe<std::pair<StyleWhiteSpaceCollapse, StyleTextWrapMode>> {
    if (aPreserveWhiteSpaceStyle == PreserveWhiteSpaceStyle::No ||
        !aPointToInsert.IsInContentNode()) {
      return Nothing();
    }
    auto styles = EditorUtils::GetComputedWhiteSpaceStyles(
        *aPointToInsert.ContainerAs<nsIContent>());
    if (NS_WARN_IF(styles.isSome() &&
                   styles.value().first ==
                       StyleWhiteSpaceCollapse::PreserveSpaces)) {
      return Nothing();
    }
    return styles;
  }();
  const auto srcWhiteSpaceStyles =
      [&]() -> Maybe<std::pair<StyleWhiteSpaceCollapse, StyleTextWrapMode>> {
    if (aPreserveWhiteSpaceStyle == PreserveWhiteSpaceStyle::No) {
      return Nothing();
    }
    auto styles = EditorUtils::GetComputedWhiteSpaceStyles(aContentToMove);
    if (NS_WARN_IF(styles.isSome() &&
                   styles.value().first ==
                       StyleWhiteSpaceCollapse::PreserveSpaces)) {
      return Nothing();
    }
    return styles;
  }();
  // Get the `white-space` shorthand form for the given collapse + mode pair.
  const auto GetWhiteSpaceStyleValue =
      [](std::pair<StyleWhiteSpaceCollapse, StyleTextWrapMode> aStyles) {
        if (aStyles.second == StyleTextWrapMode::Wrap) {
          switch (aStyles.first) {
            case StyleWhiteSpaceCollapse::Collapse:
              return u"normal"_ns;
            case StyleWhiteSpaceCollapse::Preserve:
              return u"pre-wrap"_ns;
            case StyleWhiteSpaceCollapse::PreserveBreaks:
              return u"pre-line"_ns;
            case StyleWhiteSpaceCollapse::PreserveSpaces:
              return u"preserve-spaces"_ns;
            case StyleWhiteSpaceCollapse::BreakSpaces:
              return u"break-spaces"_ns;
          }
        } else {
          switch (aStyles.first) {
            case StyleWhiteSpaceCollapse::Collapse:
              return u"nowrap"_ns;
            case StyleWhiteSpaceCollapse::Preserve:
              return u"pre"_ns;
            case StyleWhiteSpaceCollapse::PreserveBreaks:
              return u"nowrap preserve-breaks"_ns;
            case StyleWhiteSpaceCollapse::PreserveSpaces:
              return u"nowrap preserve-spaces"_ns;
            case StyleWhiteSpaceCollapse::BreakSpaces:
              return u"nowrap break-spaces"_ns;
          }
        }
        MOZ_ASSERT_UNREACHABLE("all values should be handled above!");
        return u"normal"_ns;
      };

  if (aRemoveIfCommentNode == RemoveIfCommentNode::Yes &&
      aContentToMove.IsComment()) {
    EditorDOMPoint pointToInsert(aPointToInsert);
    {
      AutoTrackDOMPoint trackPointToInsert(RangeUpdaterRef(), &pointToInsert);
      nsresult rv = DeleteNodeWithTransaction(aContentToMove);
      if (NS_FAILED(rv)) {
        NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
        return Err(rv);
      }
    }
    if (NS_WARN_IF(!pointToInsert.IsSetAndValid())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
    return MoveNodeResult::HandledResult(std::move(pointToInsert));
  }

  // Check if this node can go into the destination node
  if (HTMLEditUtils::CanNodeContain(*aPointToInsert.GetContainer(),
                                    aContentToMove)) {
    EditorDOMPoint pointToInsert(aPointToInsert);
    // Preserve white-space in the new position with using `style` attribute.
    // This is additional path from point of view of our traditional behavior.
    // Therefore, ignore errors especially if we got unexpected DOM tree.
    if (destWhiteSpaceStyles.isSome() && srcWhiteSpaceStyles.isSome() &&
        destWhiteSpaceStyles.value() != srcWhiteSpaceStyles.value()) {
      // Set `white-space` with `style` attribute if it's nsStyledElement.
      if (nsStyledElement* styledElement =
              nsStyledElement::FromNode(&aContentToMove)) {
        DebugOnly<nsresult> rvIgnored =
            CSSEditUtils::SetCSSPropertyWithTransaction(
                *this, MOZ_KnownLive(*styledElement), *nsGkAtoms::white_space,
                GetWhiteSpaceStyleValue(srcWhiteSpaceStyles.value()));
        if (NS_WARN_IF(Destroyed())) {
          return Err(NS_ERROR_EDITOR_DESTROYED);
        }
        NS_WARNING_ASSERTION(NS_SUCCEEDED(rvIgnored),
                             "CSSEditUtils::SetCSSPropertyWithTransaction("
                             "nsGkAtoms::white_space) failed, but ignored");
      }
      // Otherwise, if the dest container can have <span> element and <span>
      // element can have the moving content node, we should insert it.
      else if (HTMLEditUtils::CanNodeContain(*aPointToInsert.GetContainer(),
                                             *nsGkAtoms::span) &&
               HTMLEditUtils::CanNodeContain(*nsGkAtoms::span,
                                             aContentToMove)) {
        RefPtr<Element> newSpanElement = CreateHTMLContent(nsGkAtoms::span);
        if (NS_WARN_IF(!newSpanElement)) {
          return Err(NS_ERROR_FAILURE);
        }
        nsAutoString styleAttrValue(u"white-space: "_ns);
        styleAttrValue.Append(
            GetWhiteSpaceStyleValue(srcWhiteSpaceStyles.value()));
        IgnoredErrorResult error;
        newSpanElement->SetAttr(nsGkAtoms::style, styleAttrValue, error);
        NS_WARNING_ASSERTION(!error.Failed(),
                             "Element::SetAttr(nsGkAtoms::span) failed");
        if (MOZ_LIKELY(!error.Failed())) {
          Result<CreateElementResult, nsresult> insertSpanElementResult =
              InsertNodeWithTransaction<Element>(*newSpanElement,
                                                 aPointToInsert);
          if (MOZ_UNLIKELY(insertSpanElementResult.isErr())) {
            if (NS_WARN_IF(insertSpanElementResult.inspectErr() ==
                           NS_ERROR_EDITOR_DESTROYED)) {
              return Err(NS_ERROR_EDITOR_DESTROYED);
            }
            NS_WARNING(
                "HTMLEditor::InsertNodeWithTransaction() failed, but ignored");
          } else {
            // We should move the node into the new <span> to preserve the
            // style.
            pointToInsert.Set(newSpanElement, 0u);
            // We should put caret after aContentToMove after moving it so that
            // we do not need the suggested caret point here.
            insertSpanElementResult.inspect().IgnoreCaretPointSuggestion();
          }
        }
      }
    }
    // If it can, move it there.
    Result<MoveNodeResult, nsresult> moveNodeResult =
        MoveNodeWithTransaction(aContentToMove, pointToInsert);
    NS_WARNING_ASSERTION(moveNodeResult.isOk(),
                         "HTMLEditor::MoveNodeWithTransaction() failed");
    // XXX This is odd to override the handled state here, but stopping this
    //     hits an NS_ASSERTION in WhiteSpaceVisibilityKeeper::
    //     MergeFirstLineOfRightBlockElementIntoAncestorLeftBlockElement.
    if (moveNodeResult.isOk()) {
      MoveNodeResult unwrappedMoveNodeResult = moveNodeResult.unwrap();
      unwrappedMoveNodeResult.MarkAsHandled();
      return unwrappedMoveNodeResult;
    }
    return moveNodeResult;
  }

  // If it can't, move its children (if any), and then delete it.
  auto moveNodeResult =
      [&]() MOZ_CAN_RUN_SCRIPT -> Result<MoveNodeResult, nsresult> {
    if (!aContentToMove.IsElement()) {
      return MoveNodeResult::HandledResult(aPointToInsert);
    }
    Result<MoveNodeResult, nsresult> moveChildrenResult =
        MoveChildrenWithTransaction(MOZ_KnownLive(*aContentToMove.AsElement()),
                                    aPointToInsert, aPreserveWhiteSpaceStyle,
                                    aRemoveIfCommentNode);
    NS_WARNING_ASSERTION(moveChildrenResult.isOk(),
                         "HTMLEditor::MoveChildrenWithTransaction() failed");
    return moveChildrenResult;
  }();
  if (MOZ_UNLIKELY(moveNodeResult.isErr())) {
    return moveNodeResult;  // Already warned in the lambda.
  }

  nsresult rv = DeleteNodeWithTransaction(aContentToMove);
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
    moveNodeResult.inspect().IgnoreCaretPointSuggestion();
    return Err(rv);
  }
  if (!MayHaveMutationEventListeners()) {
    return moveNodeResult;
  }
  // Mutation event listener may make `offset` value invalid with
  // removing some previous children while we call
  // `DeleteNodeWithTransaction()` so that we should adjust it here.
  if (moveNodeResult.inspect().NextInsertionPointRef().IsSetAndValid()) {
    return moveNodeResult;
  }
  moveNodeResult.inspect().IgnoreCaretPointSuggestion();
  return MoveNodeResult::HandledResult(
      EditorDOMPoint::AtEndOf(*aPointToInsert.GetContainer()));
}

Result<bool, nsresult> HTMLEditor::CanMoveChildren(
    const Element& aElement, const nsINode& aNewContainer) const {
  if (NS_WARN_IF(&aElement == &aNewContainer)) {
    return Err(NS_ERROR_FAILURE);
  }
  for (nsIContent* childContent = aElement.GetFirstChild(); childContent;
       childContent = childContent->GetNextSibling()) {
    Result<bool, nsresult> result =
        CanMoveNodeOrChildren(*childContent, aNewContainer);
    if (result.isErr() || result.inspect()) {
      return result;
    }
  }
  return false;
}

Result<MoveNodeResult, nsresult> HTMLEditor::MoveChildrenWithTransaction(
    Element& aElement, const EditorDOMPoint& aPointToInsert,
    PreserveWhiteSpaceStyle aPreserveWhiteSpaceStyle,
    RemoveIfCommentNode aRemoveIfCommentNode) {
  MOZ_ASSERT(aPointToInsert.IsSet());

  if (NS_WARN_IF(&aElement == aPointToInsert.GetContainer())) {
    return Err(NS_ERROR_INVALID_ARG);
  }

  MoveNodeResult moveChildrenResult =
      MoveNodeResult::IgnoredResult(aPointToInsert);
  while (aElement.GetFirstChild()) {
    Result<MoveNodeResult, nsresult> moveNodeOrChildrenResult =
        MoveNodeOrChildrenWithTransaction(
            MOZ_KnownLive(*aElement.GetFirstChild()),
            moveChildrenResult.NextInsertionPointRef(),
            aPreserveWhiteSpaceStyle, aRemoveIfCommentNode);
    if (MOZ_UNLIKELY(moveNodeOrChildrenResult.isErr())) {
      NS_WARNING("HTMLEditor::MoveNodeOrChildrenWithTransaction() failed");
      moveChildrenResult.IgnoreCaretPointSuggestion();
      return moveNodeOrChildrenResult;
    }
    moveChildrenResult |= moveNodeOrChildrenResult.inspect();
  }
  return moveChildrenResult;
}

nsresult HTMLEditor::MoveAllChildren(nsINode& aContainer,
                                     const EditorRawDOMPoint& aPointToInsert) {
  if (!aContainer.HasChildren()) {
    return NS_OK;
  }
  nsIContent* firstChild = aContainer.GetFirstChild();
  if (NS_WARN_IF(!firstChild)) {
    return NS_ERROR_FAILURE;
  }
  nsIContent* lastChild = aContainer.GetLastChild();
  if (NS_WARN_IF(!lastChild)) {
    return NS_ERROR_FAILURE;
  }
  nsresult rv = MoveChildrenBetween(*firstChild, *lastChild, aPointToInsert);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "HTMLEditor::MoveChildrenBetween() failed");
  return rv;
}

nsresult HTMLEditor::MoveChildrenBetween(
    nsIContent& aFirstChild, nsIContent& aLastChild,
    const EditorRawDOMPoint& aPointToInsert) {
  nsCOMPtr<nsINode> oldContainer = aFirstChild.GetParentNode();
  if (NS_WARN_IF(oldContainer != aLastChild.GetParentNode()) ||
      NS_WARN_IF(!aPointToInsert.IsInContentNode()) ||
      NS_WARN_IF(!aPointToInsert.CanContainerHaveChildren())) {
    return NS_ERROR_INVALID_ARG;
  }

  // First, store all children which should be moved to the new container.
  AutoTArray<nsCOMPtr<nsIContent>, 10> children;
  for (nsIContent* child = &aFirstChild; child;
       child = child->GetNextSibling()) {
    children.AppendElement(child);
    if (child == &aLastChild) {
      break;
    }
  }

  if (NS_WARN_IF(children.LastElement() != &aLastChild)) {
    return NS_ERROR_INVALID_ARG;
  }

  nsCOMPtr<nsIContent> newContainer = aPointToInsert.ContainerAs<nsIContent>();
  nsCOMPtr<nsIContent> nextNode = aPointToInsert.GetChild();
  IgnoredErrorResult error;
  for (size_t i = children.Length(); i > 0; --i) {
    nsCOMPtr<nsIContent>& child = children[i - 1];
    if (child->GetParentNode() != oldContainer) {
      // If the child has been moved to different container, we shouldn't
      // touch it.
      continue;
    }
    if (NS_WARN_IF(!HTMLEditUtils::IsRemovableNode(*child))) {
      return NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE;
    }
    oldContainer->RemoveChild(*child, error);
    if (NS_WARN_IF(Destroyed())) {
      return NS_ERROR_EDITOR_DESTROYED;
    }
    if (error.Failed()) {
      NS_WARNING("nsINode::RemoveChild() failed");
      return error.StealNSResult();
    }
    if (nextNode) {
      // If we're not appending the children to the new container, we should
      // check if referring next node of insertion point is still in the new
      // container.
      EditorRawDOMPoint pointToInsert(nextNode);
      if (NS_WARN_IF(!pointToInsert.IsSet()) ||
          NS_WARN_IF(pointToInsert.GetContainer() != newContainer)) {
        // The next node of insertion point has been moved by mutation observer.
        // Let's stop moving the remaining nodes.
        // XXX Or should we move remaining children after the last moved child?
        return NS_ERROR_FAILURE;
      }
    }
    if (NS_WARN_IF(
            !EditorUtils::IsEditableContent(*newContainer, EditorType::HTML))) {
      return NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE;
    }
    newContainer->InsertBefore(*child, nextNode, error);
    if (NS_WARN_IF(Destroyed())) {
      return NS_ERROR_EDITOR_DESTROYED;
    }
    if (error.Failed()) {
      NS_WARNING("nsINode::InsertBefore() failed");
      return error.StealNSResult();
    }
    // If the child was inserted or appended properly, the following children
    // should be inserted before it.  Otherwise, keep using current position.
    if (child->GetParentNode() == newContainer) {
      nextNode = child;
    }
  }
  return NS_OK;
}

nsresult HTMLEditor::MovePreviousSiblings(
    nsIContent& aChild, const EditorRawDOMPoint& aPointToInsert) {
  if (NS_WARN_IF(!aChild.GetParentNode())) {
    return NS_ERROR_INVALID_ARG;
  }
  nsIContent* firstChild = aChild.GetParentNode()->GetFirstChild();
  if (NS_WARN_IF(!firstChild)) {
    return NS_ERROR_FAILURE;
  }
  nsIContent* lastChild =
      &aChild == firstChild ? firstChild : aChild.GetPreviousSibling();
  if (NS_WARN_IF(!lastChild)) {
    return NS_ERROR_FAILURE;
  }
  nsresult rv = MoveChildrenBetween(*firstChild, *lastChild, aPointToInsert);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "HTMLEditor::MoveChildrenBetween() failed");
  return rv;
}

nsresult HTMLEditor::MoveInclusiveNextSiblings(
    nsIContent& aChild, const EditorRawDOMPoint& aPointToInsert) {
  if (NS_WARN_IF(!aChild.GetParentNode())) {
    return NS_ERROR_INVALID_ARG;
  }
  nsIContent* lastChild = aChild.GetParentNode()->GetLastChild();
  if (NS_WARN_IF(!lastChild)) {
    return NS_ERROR_FAILURE;
  }
  nsresult rv = MoveChildrenBetween(aChild, *lastChild, aPointToInsert);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "HTMLEditor::MoveChildrenBetween() failed");
  return rv;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoBlockElementsJoiner::
    DeleteContentButKeepTableStructure(HTMLEditor& aHTMLEditor,
                                       nsIContent& aContent) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  if (!HTMLEditUtils::IsAnyTableElementButNotTable(&aContent)) {
    nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(aContent);
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "EditorBase::DeleteNodeWithTransaction() failed");
    return rv;
  }

  // XXX For performance, this should just call
  //     DeleteContentButKeepTableStructure() while there are children in
  //     aContent.  If we need to avoid infinite loop because mutation event
  //     listeners can add unexpected nodes into aContent, we should just loop
  //     only original count of the children.
  AutoTArray<OwningNonNull<nsIContent>, 10> childList;
  for (nsIContent* child = aContent.GetFirstChild(); child;
       child = child->GetNextSibling()) {
    childList.AppendElement(*child);
  }

  for (const auto& child : childList) {
    // MOZ_KnownLive because 'childList' is guaranteed to
    // keep it alive.
    nsresult rv =
        DeleteContentButKeepTableStructure(aHTMLEditor, MOZ_KnownLive(child));
    if (NS_FAILED(rv)) {
      NS_WARNING("HTMLEditor::DeleteContentButKeepTableStructure() failed");
      return rv;
    }
  }
  return NS_OK;
}

nsresult HTMLEditor::DeleteMostAncestorMailCiteElementIfEmpty(
    nsIContent& aContent) {
  MOZ_ASSERT(IsEditActionDataAvailable());

  // The element must be `<blockquote type="cite">` or
  // `<span _moz_quote="true">`.
  RefPtr<Element> mailCiteElement =
      GetMostDistantAncestorMailCiteElement(aContent);
  if (!mailCiteElement) {
    return NS_OK;
  }
  bool seenBR = false;
  if (!HTMLEditUtils::IsEmptyNode(
          *mailCiteElement,
          {EmptyCheckOption::TreatListItemAsVisible,
           EmptyCheckOption::TreatTableCellAsVisible,
           EmptyCheckOption::TreatNonEditableContentAsInvisible},
          &seenBR)) {
    return NS_OK;
  }
  EditorDOMPoint atEmptyMailCiteElement(mailCiteElement);
  {
    AutoEditorDOMPointChildInvalidator lockOffset(atEmptyMailCiteElement);
    nsresult rv = DeleteNodeWithTransaction(*mailCiteElement);
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
      return rv;
    }
  }

  if (!atEmptyMailCiteElement.IsSet() || !seenBR) {
    NS_WARNING_ASSERTION(
        atEmptyMailCiteElement.IsSet(),
        "Mutation event listener might changed the DOM tree during "
        "EditorBase::DeleteNodeWithTransaction(), but ignored");
    return NS_OK;
  }

  Result<CreateElementResult, nsresult> insertBRElementResult =
      InsertBRElement(WithTransaction::Yes, atEmptyMailCiteElement);
  if (MOZ_UNLIKELY(insertBRElementResult.isErr())) {
    NS_WARNING("HTMLEditor::InsertBRElement(WithTransaction::Yes) failed");
    return insertBRElementResult.unwrapErr();
  }
  MOZ_ASSERT(insertBRElementResult.inspect().GetNewNode());
  insertBRElementResult.inspect().IgnoreCaretPointSuggestion();
  nsresult rv = CollapseSelectionTo(
      EditorRawDOMPoint(insertBRElementResult.inspect().GetNewNode()));
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return NS_ERROR_EDITOR_DESTROYED;
  }
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "EditorBase::::CollapseSelectionTo() failed, but ignored");
  return NS_OK;
}

Element* HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter::
    ScanEmptyBlockInclusiveAncestor(const HTMLEditor& aHTMLEditor,
                                    nsIContent& aStartContent) {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!mEmptyInclusiveAncestorBlockElement);

  // If we are inside an empty block, delete it.
  // Note: do NOT delete table elements this way.
  // Note: do NOT delete non-editable block element.
  Element* editableBlockElement = HTMLEditUtils::GetInclusiveAncestorElement(
      aStartContent, HTMLEditUtils::ClosestEditableBlockElement,
      BlockInlineCheck::UseComputedDisplayOutsideStyle);
  if (!editableBlockElement) {
    return nullptr;
  }
  // XXX Perhaps, this is slow loop.  If empty blocks are nested, then,
  //     each block checks whether it's empty or not.  However, descendant
  //     blocks are checked again and again by IsEmptyNode().  Perhaps, it
  //     should be able to take "known empty element" for avoiding same checks.
  while (editableBlockElement &&
         HTMLEditUtils::IsRemovableFromParentNode(*editableBlockElement) &&
         !HTMLEditUtils::IsAnyTableElement(editableBlockElement) &&
         HTMLEditUtils::IsEmptyNode(*editableBlockElement)) {
    // If the removable empty list item is a child of editing host list element,
    // we should not delete it.
    if (HTMLEditUtils::IsListItem(editableBlockElement)) {
      Element* const parentElement = editableBlockElement->GetParentElement();
      if (parentElement && HTMLEditUtils::IsAnyListElement(parentElement) &&
          !HTMLEditUtils::IsRemovableFromParentNode(*parentElement) &&
          HTMLEditUtils::IsEmptyNode(*parentElement)) {
        break;
      }
    }
    mEmptyInclusiveAncestorBlockElement = editableBlockElement;
    editableBlockElement = HTMLEditUtils::GetAncestorElement(
        *mEmptyInclusiveAncestorBlockElement,
        HTMLEditUtils::ClosestEditableBlockElement,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
  }
  if (!mEmptyInclusiveAncestorBlockElement) {
    return nullptr;
  }

  // XXX Because of not checking whether found block element is editable
  //     in the above loop, empty ediable block element may be overwritten
  //     with empty non-editable clock element.  Therefore, we fail to
  //     remove the found empty nodes.
  if (NS_WARN_IF(!mEmptyInclusiveAncestorBlockElement->IsEditable()) ||
      NS_WARN_IF(!mEmptyInclusiveAncestorBlockElement->GetParentElement())) {
    mEmptyInclusiveAncestorBlockElement = nullptr;
  }
  return mEmptyInclusiveAncestorBlockElement;
}

nsresult HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter::
    ComputeTargetRanges(const HTMLEditor& aHTMLEditor,
                        nsIEditor::EDirection aDirectionAndAmount,
                        const Element& aEditingHost,
                        AutoRangeArray& aRangesToDelete) const {
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement);

  // We'll delete `mEmptyInclusiveAncestorBlockElement` node from the tree, but
  // we should return the range from start/end of next/previous editable content
  // to end/start of the element for compatiblity with the other browsers.
  switch (aDirectionAndAmount) {
    case nsIEditor::eNone:
      break;
    case nsIEditor::ePrevious:
    case nsIEditor::ePreviousWord:
    case nsIEditor::eToBeginningOfLine: {
      EditorRawDOMPoint startPoint =
          HTMLEditUtils::GetPreviousEditablePoint<EditorRawDOMPoint>(
              *mEmptyInclusiveAncestorBlockElement, &aEditingHost,
              // In this case, we don't join block elements so that we won't
              // delete invisible trailing whitespaces in the previous element.
              InvisibleWhiteSpaces::Preserve,
              // In this case, we won't join table cells so that we should
              // get a range which is in a table cell even if it's in a
              // table.
              TableBoundary::NoCrossAnyTableElement);
      if (!startPoint.IsSet()) {
        NS_WARNING(
            "HTMLEditUtils::GetPreviousEditablePoint() didn't return a valid "
            "point");
        return NS_ERROR_FAILURE;
      }
      nsresult rv = aRangesToDelete.SetStartAndEnd(
          startPoint,
          EditorRawDOMPoint::AtEndOf(mEmptyInclusiveAncestorBlockElement));
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                           "AutoRangeArray::SetStartAndEnd() failed");
      return rv;
    }
    case nsIEditor::eNext:
    case nsIEditor::eNextWord:
    case nsIEditor::eToEndOfLine: {
      EditorRawDOMPoint endPoint =
          HTMLEditUtils::GetNextEditablePoint<EditorRawDOMPoint>(
              *mEmptyInclusiveAncestorBlockElement, &aEditingHost,
              // In this case, we don't join block elements so that we won't
              // delete invisible trailing whitespaces in the next element.
              InvisibleWhiteSpaces::Preserve,
              // In this case, we won't join table cells so that we should
              // get a range which is in a table cell even if it's in a
              // table.
              TableBoundary::NoCrossAnyTableElement);
      if (!endPoint.IsSet()) {
        NS_WARNING(
            "HTMLEditUtils::GetNextEditablePoint() didn't return a valid "
            "point");
        return NS_ERROR_FAILURE;
      }
      nsresult rv = aRangesToDelete.SetStartAndEnd(
          EditorRawDOMPoint(mEmptyInclusiveAncestorBlockElement, 0), endPoint);
      NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                           "AutoRangeArray::SetStartAndEnd() failed");
      return rv;
    }
    default:
      MOZ_ASSERT_UNREACHABLE("Handle the nsIEditor::EDirection value");
      break;
  }
  // No direction, let's select the element to be deleted.
  nsresult rv =
      aRangesToDelete.SelectNode(*mEmptyInclusiveAncestorBlockElement);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "AutoRangeArray::SelectNode() failed");
  return rv;
}

Result<RefPtr<Element>, nsresult>
HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter::
    MaybeInsertBRElementBeforeEmptyListItemElement(HTMLEditor& aHTMLEditor) {
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement);
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement->GetParentElement());
  MOZ_ASSERT(HTMLEditUtils::IsListItem(mEmptyInclusiveAncestorBlockElement));

  // If the found empty block is a list item element and its grand parent
  // (i.e., parent of list element) is NOT a list element, insert <br>
  // element before the list element which has the empty list item.
  // This odd list structure may occur if `Document.execCommand("indent")`
  // is performed for list items.
  // XXX Chrome does not remove empty list elements when last content in
  //     last list item is deleted.  We should follow it since current
  //     behavior is annoying when you type new list item with selecting
  //     all list items.
  if (!HTMLEditUtils::IsFirstChild(*mEmptyInclusiveAncestorBlockElement,
                                   {WalkTreeOption::IgnoreNonEditableNode})) {
    return RefPtr<Element>();
  }

  EditorDOMPoint atParentOfEmptyListItem(
      mEmptyInclusiveAncestorBlockElement->GetParentElement());
  if (NS_WARN_IF(!atParentOfEmptyListItem.IsSet())) {
    return Err(NS_ERROR_FAILURE);
  }
  if (HTMLEditUtils::IsAnyListElement(atParentOfEmptyListItem.GetContainer())) {
    return RefPtr<Element>();
  }
  Result<CreateElementResult, nsresult> insertBRElementResult =
      aHTMLEditor.InsertBRElement(WithTransaction::Yes,
                                  atParentOfEmptyListItem);
  if (MOZ_UNLIKELY(insertBRElementResult.isErr())) {
    NS_WARNING("HTMLEditor::InsertBRElement(WithTransaction::Yes) failed");
    return insertBRElementResult.propagateErr();
  }
  CreateElementResult unwrappedInsertBRElementResult =
      insertBRElementResult.unwrap();
  nsresult rv = unwrappedInsertBRElementResult.SuggestCaretPointTo(
      aHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                    SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                    SuggestCaret::AndIgnoreTrivialError});
  if (NS_FAILED(rv)) {
    NS_WARNING("CreateElementResult::SuggestCaretPointTo() failed");
    return Err(rv);
  }
  MOZ_ASSERT(unwrappedInsertBRElementResult.GetNewNode());
  return unwrappedInsertBRElementResult.UnwrapNewNode();
}

Result<CaretPoint, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoEmptyBlockAncestorDeleter::GetNewCaretPosition(
        const HTMLEditor& aHTMLEditor,
        nsIEditor::EDirection aDirectionAndAmount) const {
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement);
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement->GetParentElement());
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  switch (aDirectionAndAmount) {
    case nsIEditor::eNext:
    case nsIEditor::eNextWord:
    case nsIEditor::eToEndOfLine: {
      // Collapse Selection to next node of after empty block element
      // if there is.  Otherwise, to just after the empty block.
      auto afterEmptyBlock(
          EditorDOMPoint::After(mEmptyInclusiveAncestorBlockElement));
      MOZ_ASSERT(afterEmptyBlock.IsSet());
      if (nsIContent* nextContentOfEmptyBlock = HTMLEditUtils::GetNextContent(
              afterEmptyBlock, {}, BlockInlineCheck::Unused,
              aHTMLEditor.ComputeEditingHost())) {
        EditorDOMPoint pt = HTMLEditUtils::GetGoodCaretPointFor<EditorDOMPoint>(
            *nextContentOfEmptyBlock, aDirectionAndAmount);
        if (!pt.IsSet()) {
          NS_WARNING("HTMLEditUtils::GetGoodCaretPointFor() failed");
          return Err(NS_ERROR_FAILURE);
        }
        return CaretPoint(std::move(pt));
      }
      if (NS_WARN_IF(!afterEmptyBlock.IsSet())) {
        return Err(NS_ERROR_FAILURE);
      }
      return CaretPoint(std::move(afterEmptyBlock));
    }
    case nsIEditor::ePrevious:
    case nsIEditor::ePreviousWord:
    case nsIEditor::eToBeginningOfLine: {
      // Collapse Selection to previous editable node of the empty block
      // if there is.  Otherwise, to after the empty block.
      EditorRawDOMPoint atEmptyBlock(mEmptyInclusiveAncestorBlockElement);
      if (nsIContent* previousContentOfEmptyBlock =
              HTMLEditUtils::GetPreviousContent(
                  atEmptyBlock, {WalkTreeOption::IgnoreNonEditableNode},
                  BlockInlineCheck::Unused, aHTMLEditor.ComputeEditingHost())) {
        EditorDOMPoint pt = HTMLEditUtils::GetGoodCaretPointFor<EditorDOMPoint>(
            *previousContentOfEmptyBlock, aDirectionAndAmount);
        if (!pt.IsSet()) {
          NS_WARNING("HTMLEditUtils::GetGoodCaretPointFor() failed");
          return Err(NS_ERROR_FAILURE);
        }
        return CaretPoint(std::move(pt));
      }
      auto afterEmptyBlock =
          EditorDOMPoint::After(*mEmptyInclusiveAncestorBlockElement);
      if (NS_WARN_IF(!afterEmptyBlock.IsSet())) {
        return Err(NS_ERROR_FAILURE);
      }
      return CaretPoint(std::move(afterEmptyBlock));
    }
    case nsIEditor::eNone: {
      // Collapse selection at the removing block when we are replacing
      // selected content.
      EditorDOMPoint atEmptyBlock(mEmptyInclusiveAncestorBlockElement);
      if (NS_WARN_IF(!atEmptyBlock.IsSet())) {
        return Err(NS_ERROR_FAILURE);
      }
      return CaretPoint(std::move(atEmptyBlock));
    }
    default:
      MOZ_CRASH(
          "AutoEmptyBlockAncestorDeleter doesn't support this action yet");
      return Err(NS_ERROR_FAILURE);
  }
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoDeleteRangesHandler::AutoEmptyBlockAncestorDeleter::Run(
    HTMLEditor& aHTMLEditor, nsIEditor::EDirection aDirectionAndAmount) {
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement);
  MOZ_ASSERT(mEmptyInclusiveAncestorBlockElement->GetParentElement());
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());

  {
    Result<EditActionResult, nsresult> result =
        MaybeReplaceSubListWithNewListItem(aHTMLEditor);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "AutoEmptyBlockAncestorDeleter::MaybeReplaceSubListWithNewListItem() "
          "failed");
      return result;
    }
    if (result.inspect().Handled()) {
      return result;
    }
  }

  if (HTMLEditUtils::IsListItem(mEmptyInclusiveAncestorBlockElement)) {
    Result<RefPtr<Element>, nsresult> result =
        MaybeInsertBRElementBeforeEmptyListItemElement(aHTMLEditor);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING(
          "AutoEmptyBlockAncestorDeleter::"
          "MaybeInsertBRElementBeforeEmptyListItemElement() failed");
      return result.propagateErr();
    }
    // If a `<br>` element is inserted, caret should be moved to after it.
    if (RefPtr<Element> brElement = result.unwrap()) {
      nsresult rv =
          aHTMLEditor.CollapseSelectionTo(EditorRawDOMPoint(brElement));
      if (NS_FAILED(rv)) {
        NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                             "EditorBase::CollapseSelectionTo() failed");
        return Err(rv);
      }
    }
  } else {
    Result<CaretPoint, nsresult> result =
        GetNewCaretPosition(aHTMLEditor, aDirectionAndAmount);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING("AutoEmptyBlockAncestorDeleter::GetNewCaretPosition() failed");
      return result.propagateErr();
    }
    MOZ_ASSERT(result.inspect().HasCaretPointSuggestion());
    nsresult rv = result.inspect().SuggestCaretPointTo(aHTMLEditor, {});
    if (NS_FAILED(rv)) {
      NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
      return Err(rv);
    }
  }
  nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(
      MOZ_KnownLive(*mEmptyInclusiveAncestorBlockElement));
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

Result<EditActionResult, nsresult> HTMLEditor::AutoDeleteRangesHandler::
    AutoEmptyBlockAncestorDeleter::MaybeReplaceSubListWithNewListItem(
        HTMLEditor& aHTMLEditor) {
  // If we're deleting sublist element and it's the last list item of its parent
  // list, we should replace it with a list element.
  if (!HTMLEditUtils::IsAnyListElement(mEmptyInclusiveAncestorBlockElement)) {
    return EditActionResult::IgnoredResult();
  }
  RefPtr<Element> parentElement =
      mEmptyInclusiveAncestorBlockElement->GetParentElement();
  if (!parentElement || !HTMLEditUtils::IsAnyListElement(parentElement) ||
      !HTMLEditUtils::IsEmptyNode(
          *parentElement,
          {EmptyCheckOption::TreatNonEditableContentAsInvisible})) {
    return EditActionResult::IgnoredResult();
  }

  nsCOMPtr<nsINode> nextSibling =
      mEmptyInclusiveAncestorBlockElement->GetNextSibling();
  nsresult rv = aHTMLEditor.DeleteNodeWithTransaction(
      MOZ_KnownLive(*mEmptyInclusiveAncestorBlockElement));
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
    return Err(rv);
  }
  Result<CreateElementResult, nsresult> insertListItemResult =
      aHTMLEditor.CreateAndInsertElement(
          WithTransaction::Yes,
          parentElement->IsHTMLElement(nsGkAtoms::dl) ? *nsGkAtoms::dd
                                                      : *nsGkAtoms::li,
          !nextSibling || nextSibling->GetParentNode() != parentElement
              ? EditorDOMPoint::AtEndOf(*parentElement)
              : EditorDOMPoint(nextSibling),
          [](HTMLEditor& aHTMLEditor, Element& aNewElement,
             const EditorDOMPoint& aPointToInsert) -> nsresult {
            RefPtr<Element> brElement =
                aHTMLEditor.CreateHTMLContent(nsGkAtoms::br);
            if (MOZ_UNLIKELY(!brElement)) {
              NS_WARNING(
                  "EditorBase::CreateHTMLContent(nsGkAtoms::br) failed, but "
                  "ignored");
              return NS_OK;  // Just gives up to insert <br>
            }
            IgnoredErrorResult error;
            aNewElement.AppendChild(*brElement, error);
            NS_WARNING_ASSERTION(!error.Failed(),
                                 "nsINode::AppendChild() failed, but ignored");
            return NS_OK;
          });
  if (MOZ_UNLIKELY(insertListItemResult.isErr())) {
    NS_WARNING("HTMLEditor::CreateAndInsertElement() failed");
    return insertListItemResult.propagateErr();
  }
  CreateElementResult unwrappedInsertListItemResult =
      insertListItemResult.unwrap();
  unwrappedInsertListItemResult.IgnoreCaretPointSuggestion();
  rv = aHTMLEditor.CollapseSelectionTo(
      EditorRawDOMPoint(unwrappedInsertListItemResult.GetNewNode(), 0u));
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::CollapseSelectionTo() failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

template <typename EditorDOMRangeType>
Result<EditorRawDOMRange, nsresult>
HTMLEditor::AutoDeleteRangesHandler::ExtendOrShrinkRangeToDelete(
    const HTMLEditor& aHTMLEditor, const nsFrameSelection* aFrameSelection,
    const EditorDOMRangeType& aRangeToDelete) const {
  MOZ_ASSERT(aHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(!aRangeToDelete.Collapsed());
  MOZ_ASSERT(aRangeToDelete.IsPositioned());

  const nsIContent* commonAncestor = nsIContent::FromNodeOrNull(
      nsContentUtils::GetClosestCommonInclusiveAncestor(
          aRangeToDelete.StartRef().GetContainer(),
          aRangeToDelete.EndRef().GetContainer()));
  if (MOZ_UNLIKELY(NS_WARN_IF(!commonAncestor))) {
    return Err(NS_ERROR_FAILURE);
  }

  // Editing host may be nested and outer one could have focus.  Let's use
  // the closest editing host instead.
  const RefPtr<Element> closestEditingHost =
      aHTMLEditor.ComputeEditingHost(*commonAncestor, LimitInBodyElement::No);
  if (NS_WARN_IF(!closestEditingHost)) {
    return Err(NS_ERROR_FAILURE);
  }

  // Look for the common ancestor's block element in the editing host.  It's
  // fine that we get non-editable block element which is ancestor of inline
  // editing host because the following code checks editing host too.
  const RefPtr<Element> closestBlockAncestorOrInlineEditingHost = [&]() {
    // Note that if non-closest editing host has focus, found block may be
    // non-editable.
    if (Element* const maybeEditableBlockElement =
            HTMLEditUtils::GetInclusiveAncestorElement(
                *commonAncestor, HTMLEditUtils::ClosestBlockElement,
                BlockInlineCheck::UseComputedDisplayOutsideStyle,
                closestEditingHost)) {
      return maybeEditableBlockElement;
    }
    return closestEditingHost.get();
  }();

  // Set up for loops and cache our root element
  // If only one list element is selected, and if the list element is empty,
  // we should delete only the list element.  Or if the list element is not
  // empty, we should make the list has only one empty list item element.
  if (const Element* maybeListElement =
          HTMLEditUtils::GetElementIfOnlyOneSelected(aRangeToDelete)) {
    if (HTMLEditUtils::IsAnyListElement(maybeListElement) &&
        !HTMLEditUtils::IsEmptyAnyListElement(*maybeListElement)) {
      EditorRawDOMRange range =
          HTMLEditUtils::GetRangeSelectingAllContentInAllListItems<
              EditorRawDOMRange>(*maybeListElement);
      if (range.IsPositioned()) {
        if (EditorUtils::IsEditableContent(
                *range.StartRef().ContainerAs<nsIContent>(),
                EditorType::HTML) &&
            EditorUtils::IsEditableContent(
                *range.EndRef().ContainerAs<nsIContent>(), EditorType::HTML)) {
          return range;
        }
      }
      // If the first and/or last list item is not editable, we need to do more
      // complicated things probably, but we just delete the list element with
      // invisible things around it for now since it must be rare case.
    }
    // Otherwise, if the list item is empty, we should delete it with invisible
    // things around it.
  }

  // Find previous visible things before start of selection
  EditorRawDOMRange rangeToDelete(aRangeToDelete);
  if (rangeToDelete.StartRef().GetContainer() !=
      closestBlockAncestorOrInlineEditingHost) {
    for (;;) {
      const WSScanResult backwardScanFromStartResult =
          WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
              closestEditingHost, rangeToDelete.StartRef(),
              BlockInlineCheck::UseComputedDisplayOutsideStyle);
      if (!backwardScanFromStartResult.ReachedCurrentBlockBoundary() &&
          !backwardScanFromStartResult.ReachedInlineEditingHostBoundary()) {
        break;
      }
      MOZ_ASSERT(backwardScanFromStartResult.GetContent() ==
                 WSRunScanner(closestEditingHost, rangeToDelete.StartRef(),
                              BlockInlineCheck::UseComputedDisplayOutsideStyle)
                     .GetStartReasonContent());
      // We want to keep looking up.  But stop if we are crossing table
      // element boundaries, or if we hit the root.
      if (HTMLEditUtils::IsAnyTableElement(
              backwardScanFromStartResult.GetContent()) ||
          backwardScanFromStartResult.GetContent() ==
              closestBlockAncestorOrInlineEditingHost ||
          backwardScanFromStartResult.GetContent() == closestEditingHost) {
        break;
      }
      // Don't cross list element boundary because we don't want to delete list
      // element at start position unless it's empty.
      if (HTMLEditUtils::IsAnyListElement(
              backwardScanFromStartResult.GetContent()) &&
          !HTMLEditUtils::IsEmptyAnyListElement(
              *backwardScanFromStartResult.ElementPtr())) {
        break;
      }
      // Don't cross flex-item/grid-item boundary to make new content inserted
      // into it.
      if (StaticPrefs::editor_block_inline_check_use_computed_style() &&
          backwardScanFromStartResult.ContentIsElement() &&
          HTMLEditUtils::IsFlexOrGridItem(
              *backwardScanFromStartResult.ElementPtr())) {
        break;
      }
      rangeToDelete.SetStart(backwardScanFromStartResult
                                 .PointAtReachedContent<EditorRawDOMPoint>());
    }
    if (aFrameSelection && !aFrameSelection->IsValidSelectionPoint(
                               rangeToDelete.StartRef().GetContainer())) {
      NS_WARNING("Computed start container was out of selection limiter");
      return Err(NS_ERROR_FAILURE);
    }
  }

  // Expand selection endpoint only if we don't pass an invisible `<br>`, or if
  // we really needed to pass that `<br>` (i.e., its block is now totally
  // selected).

  // Find next visible things after end of selection
  EditorDOMPoint atFirstInvisibleBRElement;
  if (rangeToDelete.EndRef().GetContainer() !=
      closestBlockAncestorOrInlineEditingHost) {
    for (;;) {
      WSRunScanner wsScannerAtEnd(
          closestEditingHost, rangeToDelete.EndRef(),
          BlockInlineCheck::UseComputedDisplayOutsideStyle);
      const WSScanResult forwardScanFromEndResult =
          wsScannerAtEnd.ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
              rangeToDelete.EndRef());
      if (forwardScanFromEndResult.ReachedBRElement()) {
        // XXX In my understanding, this is odd.  The end reason may not be
        //     same as the reached <br> element because the equality is
        //     guaranteed only when ReachedCurrentBlockBoundary() returns true.
        //     However, looks like that this code assumes that
        //     GetEndReasonContent() returns the (or a) <br> element.
        NS_ASSERTION(wsScannerAtEnd.GetEndReasonContent() ==
                         forwardScanFromEndResult.BRElementPtr(),
                     "End reason is not the reached <br> element");
        if (HTMLEditUtils::IsVisibleBRElement(
                *wsScannerAtEnd.GetEndReasonContent())) {
          break;
        }
        if (!atFirstInvisibleBRElement.IsSet()) {
          atFirstInvisibleBRElement =
              rangeToDelete.EndRef().To<EditorDOMPoint>();
        }
        rangeToDelete.SetEnd(
            EditorRawDOMPoint::After(*wsScannerAtEnd.GetEndReasonContent()));
        continue;
      }

      if (forwardScanFromEndResult.ReachedCurrentBlockBoundary() ||
          forwardScanFromEndResult.ReachedInlineEditingHostBoundary()) {
        MOZ_ASSERT(forwardScanFromEndResult.ContentIsElement());
        MOZ_ASSERT(forwardScanFromEndResult.GetContent() ==
                   wsScannerAtEnd.GetEndReasonContent());
        // We want to keep looking up.  But stop if we are crossing table
        // element boundaries, or if we hit the root.
        if (HTMLEditUtils::IsAnyTableElement(
                forwardScanFromEndResult.GetContent()) ||
            forwardScanFromEndResult.GetContent() ==
                closestBlockAncestorOrInlineEditingHost) {
          break;
        }
        // Don't cross flex-item/grid-item boundary to make new content inserted
        // into it.
        if (StaticPrefs::editor_block_inline_check_use_computed_style() &&
            HTMLEditUtils::IsFlexOrGridItem(
                *forwardScanFromEndResult.ElementPtr())) {
          break;
        }
        rangeToDelete.SetEnd(
            forwardScanFromEndResult
                .PointAfterReachedContent<EditorRawDOMPoint>());
        continue;
      }

      break;
    }

    if (aFrameSelection && !aFrameSelection->IsValidSelectionPoint(
                               rangeToDelete.EndRef().GetContainer())) {
      NS_WARNING("Computed end container was out of selection limiter");
      return Err(NS_ERROR_FAILURE);
    }
  }

  // If range boundaries are in list element, and the positions are very
  // start/end of first/last list item, we may need to shrink the ranges for
  // preventing to remove only all list item elements.
  {
    EditorRawDOMRange rangeToDeleteListOrLeaveOneEmptyListItem =
        AutoDeleteRangesHandler::
            GetRangeToAvoidDeletingAllListItemsIfSelectingAllOverListElements(
                rangeToDelete);
    if (rangeToDeleteListOrLeaveOneEmptyListItem.IsPositioned()) {
      rangeToDelete = std::move(rangeToDeleteListOrLeaveOneEmptyListItem);
    }
  }

  if (atFirstInvisibleBRElement.IsInContentNode()) {
    // Find block node containing invisible `<br>` element.
    if (const RefPtr<const Element> editableBlockContainingBRElement =
            HTMLEditUtils::GetInclusiveAncestorElement(
                *atFirstInvisibleBRElement.ContainerAs<nsIContent>(),
                HTMLEditUtils::ClosestEditableBlockElement,
                BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
      if (rangeToDelete.Contains(
              EditorRawDOMPoint(editableBlockContainingBRElement))) {
        return rangeToDelete;
      }
      // Otherwise, the new range should end at the invisible `<br>`.
      if (aFrameSelection && !aFrameSelection->IsValidSelectionPoint(
                                 atFirstInvisibleBRElement.GetContainer())) {
        NS_WARNING(
            "Computed end container (`<br>` element) was out of selection "
            "limiter");
        return Err(NS_ERROR_FAILURE);
      }
      rangeToDelete.SetEnd(atFirstInvisibleBRElement);
    }
  }

  return rangeToDelete;
}

// static
EditorRawDOMRange HTMLEditor::AutoDeleteRangesHandler::
    GetRangeToAvoidDeletingAllListItemsIfSelectingAllOverListElements(
        const EditorRawDOMRange& aRangeToDelete) {
  MOZ_ASSERT(aRangeToDelete.IsPositionedAndValid());

  auto GetDeepestEditableStartPointOfList = [](Element& aListElement) {
    Element* const firstListItemElement =
        HTMLEditUtils::GetFirstListItemElement(aListElement);
    if (MOZ_UNLIKELY(!firstListItemElement)) {
      return EditorRawDOMPoint();
    }
    if (MOZ_UNLIKELY(!EditorUtils::IsEditableContent(*firstListItemElement,
                                                     EditorType::HTML))) {
      return EditorRawDOMPoint(firstListItemElement);
    }
    return HTMLEditUtils::GetDeepestEditableStartPointOf<EditorRawDOMPoint>(
        *firstListItemElement);
  };

  auto GetDeepestEditableEndPointOfList = [](Element& aListElement) {
    Element* const lastListItemElement =
        HTMLEditUtils::GetLastListItemElement(aListElement);
    if (MOZ_UNLIKELY(!lastListItemElement)) {
      return EditorRawDOMPoint();
    }
    if (MOZ_UNLIKELY(!EditorUtils::IsEditableContent(*lastListItemElement,
                                                     EditorType::HTML))) {
      return EditorRawDOMPoint::After(*lastListItemElement);
    }
    return HTMLEditUtils::GetDeepestEditableEndPointOf<EditorRawDOMPoint>(
        *lastListItemElement);
  };

  Element* const startListElement =
      aRangeToDelete.StartRef().IsInContentNode()
          ? HTMLEditUtils::GetClosestInclusiveAncestorAnyListElement(
                *aRangeToDelete.StartRef().ContainerAs<nsIContent>())
          : nullptr;
  Element* const endListElement =
      aRangeToDelete.EndRef().IsInContentNode()
          ? HTMLEditUtils::GetClosestInclusiveAncestorAnyListElement(
                *aRangeToDelete.EndRef().ContainerAs<nsIContent>())
          : nullptr;
  if (!startListElement && !endListElement) {
    return EditorRawDOMRange();
  }

  // FIXME: If there are invalid children, we cannot handle first/last list item
  // elements properly.  In that case, we should treat list elements and list
  // item elements as normal block elements.
  if (startListElement &&
      NS_WARN_IF(!HTMLEditUtils::IsValidListElement(
          *startListElement, HTMLEditUtils::TreatSubListElementAs::Valid))) {
    return EditorRawDOMRange();
  }
  if (endListElement && startListElement != endListElement &&
      NS_WARN_IF(!HTMLEditUtils::IsValidListElement(
          *endListElement, HTMLEditUtils::TreatSubListElementAs::Valid))) {
    return EditorRawDOMRange();
  }

  const bool startListElementIsEmpty =
      startListElement &&
      HTMLEditUtils::IsEmptyAnyListElement(*startListElement);
  const bool endListElementIsEmpty =
      startListElement == endListElement
          ? startListElementIsEmpty
          : endListElement &&
                HTMLEditUtils::IsEmptyAnyListElement(*endListElement);
  // If both list elements are empty, we should not shrink the range since
  // we want to delete the list.
  if (startListElementIsEmpty && endListElementIsEmpty) {
    return EditorRawDOMRange();
  }

  // There may be invisible white-spaces and there are elements in the
  // list items.  Therefore, we need to compare the deepest positions
  // and range boundaries.
  EditorRawDOMPoint deepestStartPointOfStartList =
      startListElement ? GetDeepestEditableStartPointOfList(*startListElement)
                       : EditorRawDOMPoint();
  EditorRawDOMPoint deepestEndPointOfEndList =
      endListElement ? GetDeepestEditableEndPointOfList(*endListElement)
                     : EditorRawDOMPoint();
  if (MOZ_UNLIKELY(!deepestStartPointOfStartList.IsSet() &&
                   !deepestEndPointOfEndList.IsSet())) {
    // FIXME: This does not work well if there is non-list-item contents in the
    // list elements.  Perhaps, for fixing this invalid cases, we need to wrap
    // the content into new list item like Chrome.
    return EditorRawDOMRange();
  }

  // We don't want to shrink the range into empty sublist.
  if (deepestStartPointOfStartList.IsSet()) {
    for (nsIContent* const maybeList :
         deepestStartPointOfStartList.GetContainer()
             ->InclusiveAncestorsOfType<nsIContent>()) {
      if (aRangeToDelete.StartRef().GetContainer() == maybeList) {
        break;
      }
      if (HTMLEditUtils::IsAnyListElement(maybeList) &&
          HTMLEditUtils::IsEmptyAnyListElement(*maybeList->AsElement())) {
        deepestStartPointOfStartList.Set(maybeList);
      }
    }
  }
  if (deepestEndPointOfEndList.IsSet()) {
    for (nsIContent* const maybeList :
         deepestEndPointOfEndList.GetContainer()
             ->InclusiveAncestorsOfType<nsIContent>()) {
      if (aRangeToDelete.EndRef().GetContainer() == maybeList) {
        break;
      }
      if (HTMLEditUtils::IsAnyListElement(maybeList) &&
          HTMLEditUtils::IsEmptyAnyListElement(*maybeList->AsElement())) {
        deepestEndPointOfEndList.SetAfter(maybeList);
      }
    }
  }

  const EditorRawDOMPoint deepestEndPointOfStartList =
      startListElement ? GetDeepestEditableEndPointOfList(*startListElement)
                       : EditorRawDOMPoint();
  MOZ_ASSERT_IF(deepestStartPointOfStartList.IsSet(),
                deepestEndPointOfStartList.IsSet());
  MOZ_ASSERT_IF(!deepestStartPointOfStartList.IsSet(),
                !deepestEndPointOfStartList.IsSet());

  const bool rangeStartsFromBeginningOfStartList =
      deepestStartPointOfStartList.IsSet() &&
      aRangeToDelete.StartRef().EqualsOrIsBefore(deepestStartPointOfStartList);
  const bool rangeEndsByEndingOfStartListOrLater =
      !deepestEndPointOfStartList.IsSet() ||
      deepestEndPointOfStartList.EqualsOrIsBefore(aRangeToDelete.EndRef());
  const bool rangeEndsByEndingOfEndList =
      deepestEndPointOfEndList.IsSet() &&
      deepestEndPointOfEndList.EqualsOrIsBefore(aRangeToDelete.EndRef());

  EditorRawDOMRange newRangeToDelete;
  // If all over the list element at start boundary is selected, we should
  // shrink the range to start from the first list item to avoid to delete
  // all list items.
  if (!startListElementIsEmpty && rangeStartsFromBeginningOfStartList &&
      rangeEndsByEndingOfStartListOrLater) {
    newRangeToDelete.SetStart(EditorRawDOMPoint(
        deepestStartPointOfStartList.ContainerAs<nsIContent>(), 0u));
  }
  // If all over the list element at end boundary is selected, and...
  if (!endListElementIsEmpty && rangeEndsByEndingOfEndList) {
    // If the range starts before the range at end boundary of the range,
    // we want to delete the list completely, thus, we should extend the
    // range to contain the list element.
    if (aRangeToDelete.StartRef().IsBefore(
            EditorRawDOMPoint(endListElement, 0u))) {
      newRangeToDelete.SetEnd(EditorRawDOMPoint::After(*endListElement));
      MOZ_ASSERT_IF(newRangeToDelete.StartRef().IsSet(),
                    newRangeToDelete.IsPositionedAndValid());
    }
    // Otherwise, if the range starts in the end list element, we shouldn't
    // delete the list.  Therefore, we should shrink the range to end by end
    // of the last list item element to avoid to delete all list items.
    else {
      newRangeToDelete.SetEnd(EditorRawDOMPoint::AtEndOf(
          *deepestEndPointOfEndList.ContainerAs<nsIContent>()));
      MOZ_ASSERT_IF(newRangeToDelete.StartRef().IsSet(),
                    newRangeToDelete.IsPositionedAndValid());
    }
  }

  if (!newRangeToDelete.StartRef().IsSet() &&
      !newRangeToDelete.EndRef().IsSet()) {
    return EditorRawDOMRange();
  }

  if (!newRangeToDelete.StartRef().IsSet()) {
    newRangeToDelete.SetStart(aRangeToDelete.StartRef());
    MOZ_ASSERT(newRangeToDelete.IsPositionedAndValid());
  }
  if (!newRangeToDelete.EndRef().IsSet()) {
    newRangeToDelete.SetEnd(aRangeToDelete.EndRef());
    MOZ_ASSERT(newRangeToDelete.IsPositionedAndValid());
  }

  return newRangeToDelete;
}

}  // namespace mozilla

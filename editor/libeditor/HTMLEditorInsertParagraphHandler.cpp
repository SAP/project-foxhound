/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "EditorBase.h"
#include "HTMLEditor.h"
#include "HTMLEditorInlines.h"
#include "HTMLEditorNestedClasses.h"

#include <utility>

#include "AutoClonedRangeArray.h"
#include "CSSEditUtils.h"
#include "EditAction.h"
#include "EditorDOMPoint.h"
#include "EditorLineBreak.h"
#include "EditorUtils.h"
#include "HTMLEditHelpers.h"
#include "HTMLEditUtils.h"
#include "PendingStyles.h"  // for SpecifiedStyle
#include "WhiteSpaceVisibilityKeeper.h"
#include "WSRunScanner.h"

#include "ErrorList.h"
#include "mozilla/Assertions.h"
#include "mozilla/Attributes.h"
#include "mozilla/ContentIterator.h"
#include "mozilla/EditorForwards.h"
#include "mozilla/Maybe.h"
#include "mozilla/PresShell.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/HTMLBRElement.h"
#include "mozilla/dom/Selection.h"
#include "nsAtom.h"
#include "nsContentUtils.h"
#include "nsDebug.h"
#include "nsError.h"
#include "nsGkAtoms.h"
#include "nsIContent.h"
#include "nsIFrame.h"
#include "nsINode.h"
#include "nsTArray.h"
#include "nsTextNode.h"

namespace mozilla {

using namespace dom;
using EmptyCheckOption = HTMLEditUtils::EmptyCheckOption;
using EmptyCheckOptions = HTMLEditUtils::EmptyCheckOptions;
using LeafNodeOption = HTMLEditUtils::LeafNodeOption;
using LeafNodeOptions = HTMLEditUtils::LeafNodeOptions;

Result<EditActionResult, nsresult>
HTMLEditor::InsertParagraphSeparatorAsSubAction(const Element& aEditingHost) {
  if (NS_WARN_IF(!mInitSucceeded)) {
    return Err(NS_ERROR_NOT_INITIALIZED);
  }

  {
    Result<EditActionResult, nsresult> result =
        CanHandleHTMLEditSubAction(CheckSelectionInReplacedElement::No);
    if (MOZ_UNLIKELY(result.isErr())) {
      NS_WARNING("HTMLEditor::CanHandleHTMLEditSubAction() failed");
      return result;
    }
    if (result.inspect().Canceled()) {
      return result;
    }
  }

  // XXX This may be called by execCommand() with "insertParagraph".
  //     In such case, naming the transaction "TypingTxnName" is odd.
  AutoPlaceholderBatch treatAsOneTransaction(*this, *nsGkAtoms::TypingTxnName,
                                             ScrollSelectionIntoView::Yes,
                                             __FUNCTION__);

  IgnoredErrorResult ignoredError;
  AutoEditSubActionNotifier startToHandleEditSubAction(
      *this, EditSubAction::eInsertParagraphSeparator, nsIEditor::eNext,
      ignoredError);
  if (NS_WARN_IF(ignoredError.ErrorCodeIs(NS_ERROR_EDITOR_DESTROYED))) {
    return Err(ignoredError.StealNSResult());
  }
  NS_WARNING_ASSERTION(
      !ignoredError.Failed(),
      "HTMLEditor::OnStartToHandleTopLevelEditSubAction() failed, but ignored");

  UndefineCaretBidiLevel();

  // If the selection isn't collapsed, delete it.
  if (!SelectionRef().IsCollapsed()) {
    nsresult rv =
        DeleteSelectionAsSubAction(nsIEditor::eNone, nsIEditor::eStrip);
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "EditorBase::DeleteSelectionAsSubAction(eNone, eStrip) failed");
      return Err(rv);
    }
  }

  AutoInsertParagraphHandler insertParagraphHandler(*this, aEditingHost);
  Result<EditActionResult, nsresult> insertParagraphResult =
      insertParagraphHandler.Run();
  NS_WARNING_ASSERTION(insertParagraphResult.isOk(),
                       "AutoInsertParagraphHandler::Run() failed");
  return insertParagraphResult;
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::Run() {
  MOZ_ASSERT(mHTMLEditor.IsEditActionDataAvailable());
  MOZ_ASSERT(mHTMLEditor.IsTopLevelEditSubActionDataAvailable());

  nsresult rv = mHTMLEditor.EnsureNoPaddingBRElementForEmptyEditor();
  if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
    return Err(NS_ERROR_EDITOR_DESTROYED);
  }
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::EnsureNoPaddingBRElementForEmptyEditor() "
                       "failed, but ignored");

  if (NS_SUCCEEDED(rv) && mHTMLEditor.SelectionRef().IsCollapsed()) {
    nsresult rv =
        mHTMLEditor.EnsureCaretNotAfterInvisibleBRElement(mEditingHost);
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return Err(NS_ERROR_EDITOR_DESTROYED);
    }
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "HTMLEditor::EnsureCaretNotAfterInvisibleBRElement() "
                         "failed, but ignored");
    if (NS_SUCCEEDED(rv)) {
      nsresult rv = mHTMLEditor.PrepareInlineStylesForCaret();
      if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
        return Err(NS_ERROR_EDITOR_DESTROYED);
      }
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "HTMLEditor::PrepareInlineStylesForCaret() failed, but ignored");
    }
  }

  AutoClonedSelectionRangeArray selectionRanges(mHTMLEditor.SelectionRef());
  selectionRanges.EnsureOnlyEditableRanges(mEditingHost);

  auto pointToInsert =
      selectionRanges.GetFirstRangeStartPoint<EditorDOMPoint>();
  if (NS_WARN_IF(!pointToInsert.IsInContentNode())) {
    return Err(NS_ERROR_FAILURE);
  }
  // If the element can have a <br> element (it means that the element or its
  // container must be able to have <div> or <p> too), we can handle
  // insertParagraph at the point.
  pointToInsert = HTMLEditUtils::GetPossiblePointToInsert(
      pointToInsert, *nsGkAtoms::br, mEditingHost);
  if (NS_WARN_IF(!pointToInsert.IsSet())) {
    return Err(NS_ERROR_FAILURE);
  }
  MOZ_ASSERT(pointToInsert.IsInContentNode());

  if (mHTMLEditor.IsMailEditor()) {
    if (const RefPtr<Element> mailCiteElement =
            mHTMLEditor.GetMostDistantAncestorMailCiteElement(
                *pointToInsert.ContainerAs<nsIContent>())) {
      // Split any mailcites in the way.  Should we abort this if we encounter
      // table cell boundaries?
      Result<CaretPoint, nsresult> caretPointOrError =
          HandleInMailCiteElement(*mailCiteElement, pointToInsert);
      if (MOZ_UNLIKELY(caretPointOrError.isErr())) {
        NS_WARNING(
            "AutoInsertParagraphHandler::HandleInMailCiteElement() failed");
        return caretPointOrError.propagateErr();
      }
      CaretPoint caretPoint = caretPointOrError.unwrap();
      MOZ_ASSERT(caretPoint.HasCaretPointSuggestion());
      MOZ_ASSERT(caretPoint.CaretPointRef().GetInterlinePosition() ==
                 InterlinePosition::StartOfNextLine);
      MOZ_ASSERT(caretPoint.CaretPointRef().GetChild());
      MOZ_ASSERT(
          caretPoint.CaretPointRef().GetChild()->IsHTMLElement(nsGkAtoms::br));
      nsresult rv = caretPoint.SuggestCaretPointTo(mHTMLEditor, {});
      if (NS_FAILED(rv)) {
        NS_WARNING("CaretPoint::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      return EditActionResult::HandledResult();
    }
  }

  // If the active editing host is an inline element, or if the active editing
  // host is the block parent itself and we're configured to use <br> as a
  // paragraph separator, just append a <br>.
  // If the editing host parent element is editable, it means that the editing
  // host must be a <body> element and the selection may be outside the body
  // element.  If the selection is outside the editing host, we should not
  // insert new paragraph nor <br> element.
  // XXX Currently, we don't support editing outside <body> element, but Blink
  //     does it.
  if (mEditingHost.GetParentElement() &&
      HTMLEditUtils::IsSimplyEditableNode(*mEditingHost.GetParentElement()) &&
      !nsContentUtils::ContentIsFlattenedTreeDescendantOf(
          pointToInsert.ContainerAs<nsIContent>(), &mEditingHost)) {
    return Err(NS_ERROR_EDITOR_NO_EDITABLE_RANGE);
  }

  // Look for the nearest parent block.  However, don't return error even if
  // there is no block parent here because in such case, i.e., editing host
  // is an inline element, we should insert <br> simply.
  RefPtr<Element> editableBlockElement =
      HTMLEditUtils::GetInclusiveAncestorElement(
          *pointToInsert.ContainerAs<nsIContent>(),
          HTMLEditUtils::ClosestEditableBlockElementOrButtonElement,
          BlockInlineCheck::UseComputedDisplayOutsideStyle);

  // If we cannot insert a <p>/<div> element at the selection, we should insert
  // a <br> element or a linefeed instead.
  if (ShouldInsertLineBreakInstead(editableBlockElement, pointToInsert)) {
    const Maybe<LineBreakType> lineBreakType =
        mHTMLEditor.GetPreferredLineBreakType(
            *pointToInsert.ContainerAs<nsIContent>(), mEditingHost);
    if (MOZ_UNLIKELY(!lineBreakType)) {
      // Cannot insert a line break there.
      return EditActionResult::IgnoredResult();
    }
    if (lineBreakType.value() == LineBreakType::Linefeed) {
      Result<EditActionResult, nsresult> insertLinefeedResultOrError =
          HandleInsertLinefeed(pointToInsert);
      NS_WARNING_ASSERTION(
          insertLinefeedResultOrError.isOk(),
          "AutoInsertParagraphHandler::HandleInsertLinefeed() failed");
      return insertLinefeedResultOrError;
    }
    Result<EditActionResult, nsresult> insertBRElementResultOrError =
        HandleInsertBRElement(pointToInsert);
    NS_WARNING_ASSERTION(
        insertBRElementResultOrError.isOk(),
        "AutoInsertParagraphHandler::HandleInsertBRElement() failed");
    return insertBRElementResultOrError;
  }

  RefPtr<Element> blockElementToPutCaret;
  // If the default paragraph separator is not <br> and selection is not in
  // a splittable block element, we should wrap selected contents in a new
  // paragraph, then, split it.
  if (!HTMLEditUtils::IsSplittableNode(*editableBlockElement) &&
      mDefaultParagraphSeparator != ParagraphSeparator::br) {
    MOZ_ASSERT(mDefaultParagraphSeparator == ParagraphSeparator::div ||
               mDefaultParagraphSeparator == ParagraphSeparator::p);
    // FIXME: If there is no splittable block element, the other browsers wrap
    // the right nodes into new paragraph, but keep the left node as-is.
    // We should follow them to make here simpler and better compatibility.
    Result<RefPtr<Element>, nsresult> suggestBlockElementToPutCaretOrError =
        mHTMLEditor.FormatBlockContainerWithTransaction(
            selectionRanges,
            MOZ_KnownLive(HTMLEditor::ToParagraphSeparatorTagName(
                mDefaultParagraphSeparator)),
            // For keeping the traditional behavior at insertParagraph command,
            // let's use the XUL paragraph state command targets even if we're
            // handling HTML insertParagraph command.
            FormatBlockMode::XULParagraphStateCommand, mEditingHost);
    if (MOZ_UNLIKELY(suggestBlockElementToPutCaretOrError.isErr())) {
      NS_WARNING("HTMLEditor::FormatBlockContainerWithTransaction() failed");
      return suggestBlockElementToPutCaretOrError.propagateErr();
    }
    if (selectionRanges.HasSavedRanges()) {
      selectionRanges.RestoreFromSavedRanges();
    }
    pointToInsert = selectionRanges.GetFirstRangeStartPoint<EditorDOMPoint>();
    if (NS_WARN_IF(!pointToInsert.IsInContentNode())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
    MOZ_ASSERT(pointToInsert.IsSetAndValidInComposedDoc());

    editableBlockElement = HTMLEditUtils::GetInclusiveAncestorElement(
        *pointToInsert.ContainerAs<nsIContent>(),
        HTMLEditUtils::ClosestEditableBlockElementOrButtonElement,
        BlockInlineCheck::UseComputedDisplayOutsideStyle);
    if (NS_WARN_IF(!editableBlockElement)) {
      return Err(NS_ERROR_UNEXPECTED);
    }
    if (NS_WARN_IF(!HTMLEditUtils::IsSplittableNode(*editableBlockElement))) {
      // Didn't create a new block for some reason, fall back to <br>
      Result<EditActionResult, nsresult> insertBRElementResultOrError =
          HandleInsertBRElement(pointToInsert, blockElementToPutCaret);
      NS_WARNING_ASSERTION(
          insertBRElementResultOrError.isOk(),
          "AutoInsertParagraphHandler::HandleInsertBRElement() failed");
      return insertBRElementResultOrError;
    }
    // We want to collapse selection in the editable block element.
    blockElementToPutCaret = editableBlockElement;
  }

  // If block is empty, populate with br.  (For example, imagine a div that
  // contains the word "text".  The user selects "text" and types return.
  // "Text" is deleted leaving an empty block.  We want to put in one br to
  // make block have a line.  Then code further below will put in a second br.)
  RefPtr<Element> insertedPaddingBRElement;
  {
    Result<CreateLineBreakResult, nsresult> insertBRElementResultOrError =
        InsertBRElementIfEmptyBlockElement(
            *editableBlockElement, InsertBRElementIntoEmptyBlock::End,
            BlockInlineCheck::UseComputedDisplayOutsideStyle);
    if (MOZ_UNLIKELY(insertBRElementResultOrError.isErr())) {
      NS_WARNING(
          "AutoInsertParagraphHandler::InsertBRElementIfEmptyBlockElement("
          "InsertBRElementIntoEmptyBlock::End, "
          "BlockInlineCheck::UseComputedDisplayOutsideStyle) failed");
      return insertBRElementResultOrError.propagateErr();
    }

    CreateLineBreakResult insertBRElementResult =
        insertBRElementResultOrError.unwrap();
    insertBRElementResult.IgnoreCaretPointSuggestion();
    if (insertBRElementResult.Handled()) {
      insertedPaddingBRElement = &insertBRElementResult->BRElementRef();
    }

    pointToInsert = selectionRanges.GetFirstRangeStartPoint<EditorDOMPoint>();
    if (NS_WARN_IF(!pointToInsert.IsInContentNode())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  RefPtr<Element> maybeNonEditableListItem =
      HTMLEditUtils::GetClosestInclusiveAncestorListItemElement(
          *editableBlockElement, &mEditingHost);
  if (maybeNonEditableListItem &&
      HTMLEditUtils::IsSplittableNode(*maybeNonEditableListItem)) {
    Result<InsertParagraphResult, nsresult> insertParagraphInListItemResult =
        HandleInListItemElement(*maybeNonEditableListItem, pointToInsert);
    if (MOZ_UNLIKELY(insertParagraphInListItemResult.isErr())) {
      if (NS_WARN_IF(insertParagraphInListItemResult.unwrapErr() ==
                     NS_ERROR_EDITOR_DESTROYED)) {
        return Err(NS_ERROR_EDITOR_DESTROYED);
      }
      NS_WARNING(
          "AutoInsertParagraphHandler::HandleInListItemElement() failed, but "
          "ignored");
      return EditActionResult::HandledResult();
    }
    InsertParagraphResult unwrappedInsertParagraphInListItemResult =
        insertParagraphInListItemResult.unwrap();
    MOZ_ASSERT(unwrappedInsertParagraphInListItemResult.Handled());
    MOZ_ASSERT(unwrappedInsertParagraphInListItemResult.GetNewNode());
    const RefPtr<Element> listItemOrParagraphElement =
        unwrappedInsertParagraphInListItemResult.UnwrapNewNode();
    const EditorDOMPoint pointToPutCaret =
        unwrappedInsertParagraphInListItemResult.UnwrapCaretPoint();
    nsresult rv = CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
        pointToPutCaret, listItemOrParagraphElement,
        {SuggestCaret::AndIgnoreTrivialError});
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "AutoInsertParagraphHandler::"
          "CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
                         "CollapseSelection() failed, but ignored");
    return EditActionResult::HandledResult();
  }

  if (HTMLEditUtils::IsHeadingElement(*editableBlockElement)) {
    Result<InsertParagraphResult, nsresult>
        insertParagraphInHeadingElementResult =
            HandleInHeadingElement(*editableBlockElement, pointToInsert);
    if (MOZ_UNLIKELY(insertParagraphInHeadingElementResult.isErr())) {
      NS_WARNING(
          "AutoInsertParagraphHandler::HandleInHeadingElement() failed, but "
          "ignored");
      return EditActionResult::HandledResult();
    }
    InsertParagraphResult unwrappedInsertParagraphInHeadingElementResult =
        insertParagraphInHeadingElementResult.unwrap();
    if (unwrappedInsertParagraphInHeadingElementResult.Handled()) {
      MOZ_ASSERT(unwrappedInsertParagraphInHeadingElementResult.GetNewNode());
      blockElementToPutCaret =
          unwrappedInsertParagraphInHeadingElementResult.UnwrapNewNode();
    }
    const EditorDOMPoint pointToPutCaret =
        unwrappedInsertParagraphInHeadingElementResult.UnwrapCaretPoint();
    nsresult rv = CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
        pointToPutCaret, blockElementToPutCaret,
        {SuggestCaret::OnlyIfHasSuggestion,
         SuggestCaret::AndIgnoreTrivialError});
    if (NS_FAILED(rv)) {
      NS_WARNING(
          "AutoInsertParagraphHandler::"
          "CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret() failed");
      return Err(rv);
    }
    NS_WARNING_ASSERTION(rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
                         "CollapseSelection() failed, but ignored");
    return EditActionResult::HandledResult();
  }

  // XXX Ideally, we should take same behavior with both <p> container and
  //     <div> container.  However, we are still using <br> as default
  //     paragraph separator (non-standard) and we've split only <p> container
  //     long time.  Therefore, some web apps may depend on this behavior like
  //     Gmail.  So, let's use traditional odd behavior only when the default
  //     paragraph separator is <br>.  Otherwise, take consistent behavior
  //     between <p> container and <div> container.
  if ((mDefaultParagraphSeparator == ParagraphSeparator::br &&
       editableBlockElement->IsHTMLElement(nsGkAtoms::p)) ||
      (mDefaultParagraphSeparator != ParagraphSeparator::br &&
       editableBlockElement->IsAnyOfHTMLElements(nsGkAtoms::p,
                                                 nsGkAtoms::div))) {
    const EditorDOMPoint pointToSplit = GetBetterPointToSplitParagraph(
        *editableBlockElement, insertedPaddingBRElement
                                   ? EditorDOMPoint(insertedPaddingBRElement)
                                   : pointToInsert);
    if (ShouldCreateNewParagraph(*editableBlockElement, pointToSplit)) {
      MOZ_ASSERT(pointToSplit.IsInContentNodeAndValidInComposedDoc());
      // Paragraphs: special rules to look for <br>s
      Result<SplitNodeResult, nsresult> splitNodeResult =
          SplitParagraphWithTransaction(*editableBlockElement, pointToSplit);
      if (MOZ_UNLIKELY(splitNodeResult.isErr())) {
        NS_WARNING("HTMLEditor::SplitParagraphWithTransaction() failed");
        return splitNodeResult.propagateErr();
      }
      if (splitNodeResult.inspect().Handled()) {
        SplitNodeResult unwrappedSplitNodeResult = splitNodeResult.unwrap();
        const RefPtr<Element> rightParagraphElement =
            unwrappedSplitNodeResult.DidSplit()
                ? unwrappedSplitNodeResult.GetNextContentAs<Element>()
                : blockElementToPutCaret.get();
        const EditorDOMPoint pointToPutCaret =
            unwrappedSplitNodeResult.UnwrapCaretPoint();
        nsresult rv = CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
            pointToPutCaret, rightParagraphElement,
            {SuggestCaret::AndIgnoreTrivialError});
        if (NS_FAILED(rv)) {
          NS_WARNING(
              "AutoInsertParagraphHandler::"
              "CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret() "
              "failed");
          return Err(rv);
        }
        NS_WARNING_ASSERTION(
            rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
            "AutoInsertParagraphHandler::"
            "CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret() "
            "failed, but ignored");
        return EditActionResult::HandledResult();
      }
      MOZ_ASSERT(!splitNodeResult.inspect().HasCaretPointSuggestion());
    }

    // Fall through, if we didn't handle it above.
  }

  // If nobody handles this edit action, let's insert new <br> at the selection.
  Result<EditActionResult, nsresult> insertBRElementResultOrError =
      HandleInsertBRElement(pointToInsert, blockElementToPutCaret);
  NS_WARNING_ASSERTION(
      insertBRElementResultOrError.isOk(),
      "AutoInsertParagraphHandler::HandleInsertBRElement() failed");
  return insertBRElementResultOrError;
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleInsertBRElement(
    const EditorDOMPoint& aPointToInsert,
    const Element* aBlockElementWhichShouldHaveCaret /* = nullptr */) {
  Result<CreateElementResult, nsresult> insertBRElementResult =
      InsertBRElement(aPointToInsert);
  if (MOZ_UNLIKELY(insertBRElementResult.isErr())) {
    NS_WARNING("AutoInsertParagraphHandler::InsertBRElement() failed");
    return insertBRElementResult.propagateErr();
  }
  const EditorDOMPoint pointToPutCaret =
      insertBRElementResult.unwrap().UnwrapCaretPoint();
  if (MOZ_UNLIKELY(!pointToPutCaret.IsSet())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::InsertBRElement() didn't suggest a "
        "point to put caret");
    return Err(NS_ERROR_FAILURE);
  }
  nsresult rv = CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
      pointToPutCaret, aBlockElementWhichShouldHaveCaret, {});
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "AutoInsertParagraphHandler::"
        "CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret() failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

Result<EditActionResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleInsertLinefeed(
    const EditorDOMPoint& aPointToInsert) {
  Result<EditorDOMPoint, nsresult> insertLineFeedResult =
      AutoInsertLineBreakHandler::InsertLinefeed(mHTMLEditor, aPointToInsert,
                                                 mEditingHost);
  if (MOZ_UNLIKELY(insertLineFeedResult.isErr())) {
    NS_WARNING("AutoInsertLineBreakHandler::InsertLinefeed() failed");
    return insertLineFeedResult.propagateErr();
  }
  nsresult rv = mHTMLEditor.CollapseSelectionTo(insertLineFeedResult.inspect());
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::CollapseSelectionTo() failed");
    return Err(rv);
  }
  return EditActionResult::HandledResult();
}

bool HTMLEditor::AutoInsertParagraphHandler::ShouldInsertLineBreakInstead(
    const Element* aEditableBlockElement,
    const EditorDOMPoint& aCandidatePointToSplit) {
  // If there is no block parent in the editing host, i.e., the editing
  // host itself is also a non-block element, we should insert a line
  // break.
  if (!aEditableBlockElement) {
    // XXX Chromium checks if the CSS box of the editing host is a block.
    return true;
  }

  // If the editable block element is not splittable, e.g., it's an
  // editing host, and the default paragraph separator is <br> or the
  // element cannot contain a <p> element, we should insert a <br>
  // element.
  if (!HTMLEditUtils::IsSplittableNode(*aEditableBlockElement)) {
    return mDefaultParagraphSeparator == ParagraphSeparator::br ||
           !HTMLEditUtils::CanElementContainParagraph(*aEditableBlockElement) ||
           (aCandidatePointToSplit.IsInContentNode() &&
            mHTMLEditor
                    .GetPreferredLineBreakType(
                        *aCandidatePointToSplit.ContainerAs<nsIContent>(),
                        mEditingHost)
                    .valueOr(LineBreakType::BRElement) ==
                LineBreakType::Linefeed &&
            HTMLEditUtils::IsDisplayOutsideInline(mEditingHost));
  }

  // If the nearest block parent is a single-line container declared in
  // the execCommand spec and not the editing host, we should separate the
  // block even if the default paragraph separator is <br> element.
  if (HTMLEditUtils::IsSingleLineContainer(*aEditableBlockElement)) {
    return false;
  }

  // Otherwise, unless there is no block ancestor which can contain <p>
  // element, we shouldn't insert a line break here.
  for (const Element* editableBlockAncestor = aEditableBlockElement;
       editableBlockAncestor;
       editableBlockAncestor = HTMLEditUtils::GetAncestorElement(
           *editableBlockAncestor,
           HTMLEditUtils::ClosestEditableBlockElementOrButtonElement,
           BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
    if (HTMLEditUtils::CanElementContainParagraph(*editableBlockAncestor)) {
      return false;
    }
  }
  return true;
}

// static
nsresult HTMLEditor::AutoInsertParagraphHandler::
    CollapseSelectionToPointOrIntoBlockWhichShouldHaveCaret(
        const EditorDOMPoint& aCandidatePointToPutCaret,
        const Element* aBlockElementShouldHaveCaret,
        const SuggestCaretOptions& aOptions) {
  if (!aCandidatePointToPutCaret.IsSet()) {
    if (aOptions.contains(SuggestCaret::OnlyIfHasSuggestion)) {
      return NS_OK;
    }
    return aOptions.contains(SuggestCaret::AndIgnoreTrivialError)
               ? NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR
               : NS_ERROR_FAILURE;
  }
  EditorDOMPoint pointToPutCaret(aCandidatePointToPutCaret);
  if (aBlockElementShouldHaveCaret) {
    Result<EditorDOMPoint, nsresult> pointToPutCaretOrError =
        HTMLEditUtils::ComputePointToPutCaretInElementIfOutside<EditorDOMPoint>(
            *aBlockElementShouldHaveCaret, aCandidatePointToPutCaret);
    if (MOZ_UNLIKELY(pointToPutCaretOrError.isErr())) {
      NS_WARNING(
          "HTMLEditUtils::ComputePointToPutCaretInElementIfOutside() "
          "failed, but ignored");
    } else if (pointToPutCaretOrError.inspect().IsSet()) {
      pointToPutCaret = pointToPutCaretOrError.unwrap();
    }
  }
  nsresult rv = mHTMLEditor.CollapseSelectionTo(pointToPutCaret);
  if (NS_FAILED(rv) && MOZ_LIKELY(rv != NS_ERROR_EDITOR_DESTROYED) &&
      aOptions.contains(SuggestCaret::AndIgnoreTrivialError)) {
    rv = NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR;
  }
  return rv;
}

Result<CreateElementResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::InsertBRElement(
    const EditorDOMPoint& aPointToBreak) {
  MOZ_ASSERT(aPointToBreak.IsInContentNode());

  const bool editingHostIsEmpty = HTMLEditUtils::IsEmptyNode(
      mEditingHost, {EmptyCheckOption::TreatNonEditableContentAsInvisible});
  const WSRunScanner wsRunScanner({WSRunScanner::Option::OnlyEditableNodes},
                                  aPointToBreak);
  const WSScanResult backwardScanResult =
      wsRunScanner.ScanPreviousVisibleNodeOrBlockBoundaryFrom(aPointToBreak);
  if (MOZ_UNLIKELY(backwardScanResult.Failed())) {
    NS_WARNING(
        "WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom() failed");
    return Err(NS_ERROR_FAILURE);
  }
  const bool brElementIsAfterBlock =
      backwardScanResult.ReachedBlockBoundary() ||
      // FIXME: This is wrong considering because the inline editing host may
      // be surrounded by visible inline content.  However, WSRunScanner is
      // not aware of block boundary around it and stopping this change causes
      // starting to fail some WPT.  Therefore, we need to keep doing this for
      // now.
      backwardScanResult.ReachedInlineEditingHostBoundary();
  const WSScanResult forwardScanResult =
      wsRunScanner.ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
          aPointToBreak);
  if (MOZ_UNLIKELY(forwardScanResult.Failed())) {
    NS_WARNING("WSRunScanner::ScanNextVisibleNodeOrBlockBoundaryFrom() failed");
    return Err(NS_ERROR_FAILURE);
  }
  const bool brElementIsBeforeBlock =
      forwardScanResult.ReachedBlockBoundary() ||
      // FIXME: See above comment
      forwardScanResult.ReachedInlineEditingHostBoundary();

  // First, insert a <br> element.
  RefPtr<Element> brElement;
  if (mHTMLEditor.IsPlaintextMailComposer()) {
    Result<CreateLineBreakResult, nsresult> insertBRElementResultOrError =
        mHTMLEditor.InsertLineBreak(WithTransaction::Yes,
                                    LineBreakType::BRElement, aPointToBreak);
    if (MOZ_UNLIKELY(insertBRElementResultOrError.isErr())) {
      NS_WARNING(
          "HTMLEditor::InsertLineBreak(WithTransaction::Yes, "
          "LineBreakType::BRElement) failed");
      return insertBRElementResultOrError.propagateErr();
    }
    CreateLineBreakResult insertBRElementResult =
        insertBRElementResultOrError.unwrap();
    // We'll return with suggesting new caret position and nobody refers
    // selection after here.  So we don't need to update selection here.
    insertBRElementResult.IgnoreCaretPointSuggestion();
    brElement = &insertBRElementResult->BRElementRef();
  } else {
    EditorDOMPoint pointToBreak(aPointToBreak);
    // If the container of the break is a link, we need to split it and
    // insert new <br> between the split links.
    RefPtr<Element> linkNode =
        HTMLEditor::GetLinkElement(pointToBreak.GetContainer());
    if (linkNode) {
      // FIXME: Normalize surrounding white-spaces before splitting the
      // insertion point here.
      Result<SplitNodeResult, nsresult> splitLinkNodeResult =
          mHTMLEditor.SplitNodeDeepWithTransaction(
              *linkNode, pointToBreak,
              SplitAtEdges::eDoNotCreateEmptyContainer);
      if (MOZ_UNLIKELY(splitLinkNodeResult.isErr())) {
        NS_WARNING(
            "HTMLEditor::SplitNodeDeepWithTransaction(SplitAtEdges::"
            "eDoNotCreateEmptyContainer) failed");
        return splitLinkNodeResult.propagateErr();
      }
      // TODO: Some methods called by
      //       WhiteSpaceVisibilityKeeper::InsertLineBreak() use
      //       ComputeEditingHost() which depends on selection.  Therefore,
      //       we cannot skip updating selection here.
      nsresult rv = splitLinkNodeResult.inspect().SuggestCaretPointTo(
          mHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                        SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
      if (NS_FAILED(rv)) {
        NS_WARNING("SplitNodeResult::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      pointToBreak =
          splitLinkNodeResult.inspect().AtSplitPoint<EditorDOMPoint>();
    }
    Result<CreateLineBreakResult, nsresult> insertBRElementResultOrError =
        WhiteSpaceVisibilityKeeper::InsertLineBreak(LineBreakType::BRElement,
                                                    mHTMLEditor, pointToBreak);
    if (MOZ_UNLIKELY(insertBRElementResultOrError.isErr())) {
      NS_WARNING(
          "WhiteSpaceVisibilityKeeper::InsertLineBreak(LineBreakType::"
          "BRElement) failed");
      return insertBRElementResultOrError.propagateErr();
    }
    CreateLineBreakResult insertBRElementResult =
        insertBRElementResultOrError.unwrap();
    // We'll return with suggesting new caret position and nobody refers
    // selection after here.  So we don't need to update selection here.
    insertBRElementResult.IgnoreCaretPointSuggestion();
    brElement = &insertBRElementResult->BRElementRef();
  }

  if (MOZ_UNLIKELY(!brElement->GetParentNode())) {
    NS_WARNING("Inserted <br> element was removed by the web app");
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  auto afterBRElement = EditorDOMPoint::After(brElement);

  const auto InsertAdditionalInvisibleLineBreak =
      [this, &afterBRElement]()
          MOZ_CAN_RUN_SCRIPT -> Result<CreateLineBreakResult, nsresult> {
    // Empty last line is invisible if it's immediately before either parent or
    // another block's boundary so that we need to put invisible <br> element
    // here for making it visible.
    Result<CreateLineBreakResult, nsresult>
        insertPaddingBRElementResultOrError =
            WhiteSpaceVisibilityKeeper::InsertLineBreak(
                LineBreakType::BRElement, mHTMLEditor, afterBRElement);
    NS_WARNING_ASSERTION(insertPaddingBRElementResultOrError.isOk(),
                         "WhiteSpaceVisibilityKeeper::InsertLineBreak("
                         "LineBreakType::BRElement) failed");
    // afterBRElement points after the first <br> with referring an old child.
    // Therefore, we need to update it with new child which is the new invisible
    // <br>.
    afterBRElement = insertPaddingBRElementResultOrError.inspect()
                         .AtLineBreak<EditorDOMPoint>();
    return insertPaddingBRElementResultOrError;
  };

  if (brElementIsAfterBlock && brElementIsBeforeBlock) {
    // We just placed a <br> between block boundaries.  This is the one case
    // where we want the selection to be before the br we just placed, as the
    // br will be on a new line, rather than at end of prior line.
    // XXX brElementIsAfterBlock and brElementIsBeforeBlock were set before
    //     modifying the DOM tree.  So, now, the <br> element may not be
    //     between blocks.
    EditorDOMPoint pointToPutCaret;
    if (editingHostIsEmpty) {
      Result<CreateLineBreakResult, nsresult>
          insertPaddingBRElementResultOrError =
              InsertAdditionalInvisibleLineBreak();
      if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
        return insertPaddingBRElementResultOrError.propagateErr();
      }
      insertPaddingBRElementResultOrError.unwrap().IgnoreCaretPointSuggestion();
      pointToPutCaret = std::move(afterBRElement);
    } else {
      pointToPutCaret =
          EditorDOMPoint(brElement, InterlinePosition::StartOfNextLine);
    }
    return CreateElementResult(std::move(brElement),
                               std::move(pointToPutCaret));
  }

  const WSScanResult forwardScanFromAfterBRElementResult =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {WSRunScanner::Option::OnlyEditableNodes}, afterBRElement);
  if (MOZ_UNLIKELY(forwardScanFromAfterBRElementResult.Failed())) {
    NS_WARNING("WSRunScanner::ScanNextVisibleNodeOrBlockBoundary() failed");
    return Err(NS_ERROR_FAILURE);
  }
  if (forwardScanFromAfterBRElementResult.ReachedBRElement()) {
    // The next thing after the break we inserted is another break.  Move the
    // second break to be the first break's sibling.  This will prevent them
    // from being in different inline nodes, which would break
    // SetInterlinePosition().  It will also assure that if the user clicks
    // away and then clicks back on their new blank line, they will still get
    // the style from the line above.
    if (brElement->GetNextSibling() !=
        forwardScanFromAfterBRElementResult.BRElementPtr()) {
      MOZ_ASSERT(forwardScanFromAfterBRElementResult.BRElementPtr());
      Result<MoveNodeResult, nsresult> moveBRElementResult =
          mHTMLEditor.MoveNodeWithTransaction(
              MOZ_KnownLive(
                  *forwardScanFromAfterBRElementResult.BRElementPtr()),
              afterBRElement);
      if (MOZ_UNLIKELY(moveBRElementResult.isErr())) {
        NS_WARNING("HTMLEditor::MoveNodeWithTransaction() failed");
        return moveBRElementResult.propagateErr();
      }
      nsresult rv = moveBRElementResult.inspect().SuggestCaretPointTo(
          mHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                        SuggestCaret::OnlyIfTransactionsAllowedToDoIt,
                        SuggestCaret::AndIgnoreTrivialError});
      if (NS_FAILED(rv)) {
        NS_WARNING("MoveNodeResult::SuggestCaretPointTo() failed");
        return Err(rv);
      }
      NS_WARNING_ASSERTION(
          rv != NS_SUCCESS_EDITOR_BUT_IGNORED_TRIVIAL_ERROR,
          "MoveNodeResult::SuggestCaretPointTo() failed, but ignored");
      // afterBRElement points after the first <br> with referring an old child.
      // Therefore, we need to update it with new child which is the new
      // invisible <br>.
      afterBRElement.Set(forwardScanFromAfterBRElementResult.BRElementPtr());
    }
  } else if ((forwardScanFromAfterBRElementResult.ReachedBlockBoundary() ||
              // FIXME: This is wrong considering because the inline editing
              // host may be surrounded by visible inline content.  However,
              // WSRunScanner is not aware of block boundary around it and
              // stopping this change causes starting to fail some WPT.
              // Therefore, we need to keep doing this for now.
              forwardScanFromAfterBRElementResult
                  .ReachedInlineEditingHostBoundary()) &&
             !brElementIsAfterBlock) {
    Result<CreateLineBreakResult, nsresult>
        insertPaddingBRElementResultOrError =
            InsertAdditionalInvisibleLineBreak();
    if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
      return insertPaddingBRElementResultOrError.propagateErr();
    }
    insertPaddingBRElementResultOrError.unwrap().IgnoreCaretPointSuggestion();
  }

  // We want the caret to stick to whatever is past the break.  This is because
  // the break is on the same line we were on, but the next content will be on
  // the following line.

  // An exception to this is if the break has a next sibling that is a block
  // node.  Then we stick to the left to avoid an uber caret.
  nsIContent* nextSiblingOfBRElement = brElement->GetNextSibling();
  afterBRElement.SetInterlinePosition(
      nextSiblingOfBRElement && HTMLEditUtils::IsBlockElement(
                                    *nextSiblingOfBRElement,
                                    BlockInlineCheck::UseComputedDisplayStyle)
          ? InterlinePosition::EndOfLine
          : InterlinePosition::StartOfNextLine);
  return CreateElementResult(std::move(brElement), afterBRElement);
}

Result<CaretPoint, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleInMailCiteElement(
    Element& aMailCiteElement, const EditorDOMPoint& aPointToSplit) {
  MOZ_ASSERT(aPointToSplit.IsSet());
  NS_ASSERTION(!HTMLEditUtils::IsEmptyNode(
                   aMailCiteElement,
                   {EmptyCheckOption::TreatNonEditableContentAsInvisible}),
               "The mail-cite element will be deleted, does it expected result "
               "for you?");

  auto splitCiteElementResult =
      SplitMailCiteElement(aPointToSplit, aMailCiteElement);
  if (MOZ_UNLIKELY(splitCiteElementResult.isErr())) {
    NS_WARNING("Failed to split a mail-cite element");
    return splitCiteElementResult.propagateErr();
  }
  SplitNodeResult unwrappedSplitCiteElementResult =
      splitCiteElementResult.unwrap();
  // When adding caret suggestion to SplitNodeResult, here didn't change
  // selection so that just ignore it.
  unwrappedSplitCiteElementResult.IgnoreCaretPointSuggestion();

  // Add an invisible <br> to the end of left cite node if it was a <span> of
  // style="display: block".  This is important, since when serializing the cite
  // to plain text, the span which caused the visual break is discarded.  So the
  // added <br> will guarantee that the serializer will insert a break where the
  // user saw one.
  // FYI: unwrappedSplitCiteElementResult grabs the previous node and the next
  //      node with nsCOMPtr or EditorDOMPoint.  So, it's safe to access
  //      leftCiteElement and rightCiteElement even after changing the DOM tree
  //      and/or selection even though it's raw pointer.
  auto* const leftCiteElement =
      unwrappedSplitCiteElementResult.GetPreviousContentAs<Element>();
  auto* const rightCiteElement =
      unwrappedSplitCiteElementResult.GetNextContentAs<Element>();
  if (leftCiteElement && leftCiteElement->IsHTMLElement(nsGkAtoms::span) &&
      // XXX Oh, this depends on layout information of new element, and it's
      //     created by the hacky flush in DoSplitNode().  So we need to
      //     redesign around this for bug 1710784.
      leftCiteElement->GetPrimaryFrame() &&
      leftCiteElement->GetPrimaryFrame()->IsBlockFrameOrSubclass()) {
    nsIContent* lastChild = leftCiteElement->GetLastChild();
    if (lastChild && !lastChild->IsHTMLElement(nsGkAtoms::br)) {
      Result<CreateLineBreakResult, nsresult>
          insertPaddingBRElementResultOrError = mHTMLEditor.InsertLineBreak(
              WithTransaction::Yes, LineBreakType::BRElement,
              EditorDOMPoint::AtEndOf(*leftCiteElement));
      if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
        NS_WARNING(
            "HTMLEditor::InsertLineBreak(WithTransaction::Yes, "
            "LineBreakType::BRElement) failed");
        return insertPaddingBRElementResultOrError.propagateErr();
      }
      CreateLineBreakResult insertPaddingBRElementResult =
          insertPaddingBRElementResultOrError.unwrap();
      MOZ_ASSERT(insertPaddingBRElementResult.Handled());
      // We don't need to update selection here because we'll do another
      // InsertLineBreak call soon.
      insertPaddingBRElementResult.IgnoreCaretPointSuggestion();
    }
  }

  // In most cases, <br> should be inserted after current cite.  However, if
  // left cite hasn't been created because the split point was start of the
  // cite node, <br> should be inserted before the current cite.
  Result<CreateLineBreakResult, nsresult> insertBRElementResultOrError =
      mHTMLEditor.InsertLineBreak(
          WithTransaction::Yes, LineBreakType::BRElement,
          unwrappedSplitCiteElementResult.AtSplitPoint<EditorDOMPoint>());
  if (MOZ_UNLIKELY(insertBRElementResultOrError.isErr())) {
    NS_WARNING(
        "HTMLEditor::InsertLineBreak(WithTransaction::Yes, "
        "LineBreakType::BRElement) failed");
    return Err(insertBRElementResultOrError.unwrapErr());
  }
  CreateLineBreakResult insertBRElementResult =
      insertBRElementResultOrError.unwrap();
  MOZ_ASSERT(insertBRElementResult.Handled());
  // We'll return with suggesting caret position.  Therefore, we don't need
  // to update selection here.
  insertBRElementResult.IgnoreCaretPointSuggestion();
  // if aMailCiteElement wasn't a block, we might also want another break before
  // it. We need to examine the content both before the br we just added and
  // also just after it.  If we don't have another br or block boundary
  // adjacent, then we will need a 2nd br added to achieve blank line that user
  // expects.
  {
    nsresult rvOfInsertPaddingBRElement =
        MaybeInsertPaddingBRElementToInlineMailCiteElement(
            insertBRElementResult.AtLineBreak<EditorDOMPoint>(),
            aMailCiteElement);
    if (NS_FAILED(rvOfInsertPaddingBRElement)) {
      NS_WARNING(
          "Failed to insert additional <br> element before the inline right "
          "mail-cite element");
      return Err(rvOfInsertPaddingBRElement);
    }
  }

  if (leftCiteElement &&
      HTMLEditUtils::IsEmptyNode(
          *leftCiteElement,
          {EmptyCheckOption::TreatNonEditableContentAsInvisible})) {
    // MOZ_KnownLive(leftCiteElement) because it's grabbed by
    // unwrappedSplitCiteElementResult.
    nsresult rv =
        mHTMLEditor.DeleteNodeWithTransaction(MOZ_KnownLive(*leftCiteElement));
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
      return Err(rv);
    }
  }

  if (rightCiteElement &&
      HTMLEditUtils::IsEmptyNode(
          *rightCiteElement,
          {EmptyCheckOption::TreatNonEditableContentAsInvisible})) {
    // MOZ_KnownLive(rightCiteElement) because it's grabbed by
    // unwrappedSplitCiteElementResult.
    nsresult rv =
        mHTMLEditor.DeleteNodeWithTransaction(MOZ_KnownLive(*rightCiteElement));
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
      return Err(rv);
    }
  }

  if (NS_WARN_IF(!insertBRElementResult.LineBreakIsInComposedDoc())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  auto pointToPutCaret = insertBRElementResult.AtLineBreak<EditorDOMPoint>();
  pointToPutCaret.SetInterlinePosition(InterlinePosition::StartOfNextLine);
  return CaretPoint(std::move(pointToPutCaret));
}

Result<SplitNodeResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::SplitMailCiteElement(
    const EditorDOMPoint& aPointToSplit, Element& aMailCiteElement) {
  EditorDOMPoint pointToSplit(aPointToSplit);

  // If our selection is just before a break, nudge it to be just after
  // it. This does two things for us.  It saves us the trouble of having
  // to add a break here ourselves to preserve the "blockness" of the
  // inline span mailquote (in the inline case), and : it means the break
  // won't end up making an empty line that happens to be inside a
  // mailquote (in either inline or block case). The latter can confuse a
  // user if they click there and start typing, because being in the
  // mailquote may affect wrapping behavior, or font color, etc.
  const WSScanResult forwardScanFromPointToSplitResult =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {WSRunScanner::Option::OnlyEditableNodes,
           WSRunScanner::Option::ReferHTMLDefaultStyle},
          pointToSplit);
  if (forwardScanFromPointToSplitResult.Failed()) {
    return Err(NS_ERROR_FAILURE);
  }
  // If selection start point is before a break and it's inside the
  // mailquote, let's split it after the visible node.
  if (forwardScanFromPointToSplitResult.ReachedBRElement() &&
      forwardScanFromPointToSplitResult.BRElementPtr() != &aMailCiteElement &&
      aMailCiteElement.Contains(
          forwardScanFromPointToSplitResult.BRElementPtr())) {
    pointToSplit = forwardScanFromPointToSplitResult
                       .PointAfterReachedContent<EditorDOMPoint>();
  }

  if (NS_WARN_IF(!pointToSplit.IsInContentNode())) {
    return Err(NS_ERROR_FAILURE);
  }

  Result<EditorDOMPoint, nsresult> pointToSplitOrError =
      WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesToSplitAt(
          mHTMLEditor, pointToSplit,
          {WhiteSpaceVisibilityKeeper::NormalizeOption::
               StopIfPrecedingWhiteSpacesEndsWithNBP,
           WhiteSpaceVisibilityKeeper::NormalizeOption::
               StopIfFollowingWhiteSpacesStartsWithNBSP});
  if (MOZ_UNLIKELY(pointToSplitOrError.isErr())) {
    NS_WARNING(
        "WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesToSplitAt() "
        "failed");
    return pointToSplitOrError.propagateErr();
  }
  pointToSplit = pointToSplitOrError.unwrap();
  if (NS_WARN_IF(!pointToSplit.IsInContentNode())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  Result<SplitNodeResult, nsresult> splitResult =
      mHTMLEditor.SplitNodeDeepWithTransaction(
          aMailCiteElement, pointToSplit,
          SplitAtEdges::eDoNotCreateEmptyContainer);
  if (MOZ_UNLIKELY(splitResult.isErr())) {
    NS_WARNING(
        "HTMLEditor::SplitNodeDeepWithTransaction(aMailCiteElement, "
        "SplitAtEdges::eDoNotCreateEmptyContainer) failed");
    return splitResult;
  }
  // FIXME: We should make the caller handle `Selection`.
  nsresult rv = splitResult.inspect().SuggestCaretPointTo(
      mHTMLEditor, {SuggestCaret::OnlyIfHasSuggestion,
                    SuggestCaret::OnlyIfTransactionsAllowedToDoIt});
  if (NS_FAILED(rv)) {
    NS_WARNING("SplitNodeResult::SuggestCaretPointTo() failed");
    return Err(rv);
  }
  return splitResult;
}

nsresult HTMLEditor::AutoInsertParagraphHandler::
    MaybeInsertPaddingBRElementToInlineMailCiteElement(
        const EditorDOMPoint& aPointToInsertBRElement,
        Element& aMailCiteElement) {
  if (!HTMLEditUtils::IsInlineContent(aMailCiteElement,
                                      BlockInlineCheck::UseHTMLDefaultStyle)) {
    return NS_SUCCESS_DOM_NO_OPERATION;
  }
  // XXX Cannot we replace this complicated check with just a call of
  //     HTMLEditUtils::IsVisibleBRElement with
  //     resultOfInsertingBRElement.inspect()?
  const WSScanResult backwardScanFromPointToCreateNewBRElementResult =
      WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
          {WSRunScanner::Option::OnlyEditableNodes,
           WSRunScanner::Option::ReferHTMLDefaultStyle},
          aPointToInsertBRElement);
  if (MOZ_UNLIKELY(backwardScanFromPointToCreateNewBRElementResult.Failed())) {
    NS_WARNING(
        "WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary() "
        "failed");
    return NS_ERROR_FAILURE;
  }
  if (!backwardScanFromPointToCreateNewBRElementResult
           .InVisibleOrCollapsibleCharacters() &&
      !backwardScanFromPointToCreateNewBRElementResult
           .ReachedSpecialContent() &&
      !backwardScanFromPointToCreateNewBRElementResult
           .ReachedEmptyInlineContainerElement()) {
    return NS_SUCCESS_DOM_NO_OPERATION;
  }
  const WSScanResult forwardScanFromPointAfterNewBRElementResult =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {WSRunScanner::Option::OnlyEditableNodes,
           WSRunScanner::Option::ReferHTMLDefaultStyle},
          EditorRawDOMPoint::After(aPointToInsertBRElement));
  if (MOZ_UNLIKELY(forwardScanFromPointAfterNewBRElementResult.Failed())) {
    NS_WARNING("WSRunScanner::ScanNextVisibleNodeOrBlockBoundary() failed");
    return NS_ERROR_FAILURE;
  }
  if (!forwardScanFromPointAfterNewBRElementResult
           .InVisibleOrCollapsibleCharacters() &&
      !forwardScanFromPointAfterNewBRElementResult.ReachedSpecialContent() &&
      !forwardScanFromPointAfterNewBRElementResult
           .ReachedEmptyInlineContainerElement() &&
      // In case we're at the very end.
      !forwardScanFromPointAfterNewBRElementResult
           .ReachedCurrentBlockBoundary()) {
    return NS_SUCCESS_DOM_NO_OPERATION;
  }
  Result<CreateLineBreakResult, nsresult> insertAnotherBRElementResultOrError =
      mHTMLEditor.InsertLineBreak(WithTransaction::Yes,
                                  LineBreakType::BRElement,
                                  aPointToInsertBRElement);
  if (MOZ_UNLIKELY(insertAnotherBRElementResultOrError.isErr())) {
    NS_WARNING(
        "HTMLEditor::InsertLineBreak(WithTransaction::Yes, "
        "LineBreakType::BRElement) failed");
    return insertAnotherBRElementResultOrError.unwrapErr();
  }
  CreateLineBreakResult insertAnotherBRElementResult =
      insertAnotherBRElementResultOrError.unwrap();
  MOZ_ASSERT(insertAnotherBRElementResult.Handled());
  insertAnotherBRElementResult.IgnoreCaretPointSuggestion();
  return NS_OK;
}

Result<InsertParagraphResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleInHeadingElement(
    Element& aHeadingElement, const EditorDOMPoint& aPointToSplit) {
  // Don't preserve empty link at the end of the left heading element nor the
  // start of the right one.
  const EditorDOMPoint pointToSplit =
      GetBetterPointToSplitParagraph(aHeadingElement, aPointToSplit);
  MOZ_ASSERT(pointToSplit.IsInContentNodeAndValidInComposedDoc());

  // If the split point is end of the heading element, we should not touch the
  // heading element and insert a default paragraph next to the heading element.
  if (SplitPointIsEndOfSplittingBlock(aHeadingElement, pointToSplit,
                                      IgnoreBlockBoundaries::Yes)) {
    Result<InsertParagraphResult, nsresult>
        handleAtEndOfHeadingElementResultOrError =
            HandleAtEndOfHeadingElement(aHeadingElement);
    NS_WARNING_ASSERTION(
        handleAtEndOfHeadingElementResultOrError.isOk(),
        "AutoInsertParagraphHandler::HandleAtEndOfHeadingElement() failed");
    return handleAtEndOfHeadingElementResultOrError;
  }

  Result<SplitNodeResult, nsresult> splitHeadingResultOrError =
      SplitParagraphWithTransaction(aHeadingElement, pointToSplit);
  if (MOZ_UNLIKELY(splitHeadingResultOrError.isErr())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::SplitParagraphWithTransaction() failed");
    return splitHeadingResultOrError.propagateErr();
  }
  SplitNodeResult splitHeadingResult = splitHeadingResultOrError.unwrap();
  splitHeadingResult.IgnoreCaretPointSuggestion();
  if (MOZ_UNLIKELY(!splitHeadingResult.DidSplit())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::SplitParagraphWithTransaction() didn't "
        "split aHeadingElement");
    return Err(NS_ERROR_FAILURE);
  }

  // Put caret at start of the right head element if it's not empty.
  auto* const rightHeadingElement =
      splitHeadingResult.GetNextContentAs<Element>();
  MOZ_ASSERT(rightHeadingElement,
             "SplitNodeResult::GetNextContent() should return something if "
             "DidSplit() returns true");
  return InsertParagraphResult(*rightHeadingElement,
                               splitHeadingResult.UnwrapCaretPoint());
}

Result<InsertParagraphResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleAtEndOfHeadingElement(
    Element& aHeadingElement) {
  // XXX This makes HTMLEditor instance stateful.  So, we should move this out
  // from AutoInsertParagraphHandler with adding a method which HTMLEditor can
  // consider to do this.
  mHTMLEditor.TopLevelEditSubActionDataRef().mCachedPendingStyles->Clear();
  mHTMLEditor.mPendingStylesToApplyToNewContent->ClearAllStyles();

  // Create a paragraph if the right heading element is not followed by an
  // editable <br> element.
  nsStaticAtom& newParagraphTagName =
      &mDefaultParagraphSeparatorTagName == nsGkAtoms::br
          ? *nsGkAtoms::p
          : mDefaultParagraphSeparatorTagName;
  // We want a wrapper element even if we separate with a <br>.
  // FIXME: Chrome does not preserve the style coming from the heading element.
  // However, Chrome preserves the inline ancestors at the split point.
  // Perhaps, we should follow them.
  // MOZ_KnownLive(newParagraphTagName) because it's available until shutdown.
  Result<CreateElementResult, nsresult> createNewParagraphElementResult =
      mHTMLEditor.CreateAndInsertElement(WithTransaction::Yes,
                                         MOZ_KnownLive(newParagraphTagName),
                                         EditorDOMPoint::After(aHeadingElement),
                                         HTMLEditor::InsertNewBRElement);
  if (MOZ_UNLIKELY(createNewParagraphElementResult.isErr())) {
    NS_WARNING(
        "HTMLEditor::CreateAndInsertElement(WithTransaction::Yes) failed");
    return createNewParagraphElementResult.propagateErr();
  }
  CreateElementResult unwrappedCreateNewParagraphElementResult =
      createNewParagraphElementResult.unwrap();
  // Put caret at the <br> element in the following paragraph.
  unwrappedCreateNewParagraphElementResult.IgnoreCaretPointSuggestion();
  MOZ_ASSERT(unwrappedCreateNewParagraphElementResult.GetNewNode());
  EditorDOMPoint pointToPutCaret(
      unwrappedCreateNewParagraphElementResult.GetNewNode(), 0u);
  return InsertParagraphResult(
      unwrappedCreateNewParagraphElementResult.UnwrapNewNode(),
      std::move(pointToPutCaret));
}

// static
bool HTMLEditor::AutoInsertParagraphHandler::
    IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
        const dom::HTMLBRElement* aBRElement) {
  return !aBRElement || HTMLEditUtils::IsInvisibleBRElement(*aBRElement) ||
         EditorUtils::IsPaddingBRElementForEmptyLastLine(*aBRElement);
}

bool HTMLEditor::AutoInsertParagraphHandler::ShouldCreateNewParagraph(
    Element& aParentDivOrP, const EditorDOMPoint& aPointToSplit) const {
  MOZ_ASSERT(aPointToSplit.IsInContentNodeAndValidInComposedDoc());

  if (MOZ_LIKELY(mHTMLEditor.GetReturnInParagraphCreatesNewParagraph())) {
    // We should always create a new paragraph by default.
    return true;
  }
  if (aPointToSplit.GetContainer() == &aParentDivOrP) {
    // We are trying to split only the current paragraph, let's do it.
    return true;
  }
  if (aPointToSplit.IsInTextNode()) {
    if (aPointToSplit.IsStartOfContainer()) {
      // If we're splitting the paragraph at start of a `Text` and it does
      // not follow a <br> or follows an invisible <br>, we should not create a
      // new paragraph.
      // XXX It seems that here assumes that the paragraph has only this `Text`.
      const auto* const precedingBRElement =
          HTMLBRElement::FromNodeOrNull(HTMLEditUtils::GetPreviousSibling(
              *aPointToSplit.ContainerAs<Text>(),
              {LeafNodeOption::IgnoreNonEditableNode},
              BlockInlineCheck::UseComputedDisplayOutsideStyle));
      return !IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
          precedingBRElement);
    }
    if (aPointToSplit.IsEndOfContainer()) {
      // If we're splitting the paragraph at end of a `Text` and it's not
      // followed by a <br> or is followed by an invisible <br>, we should not
      // create a new paragraph.
      // XXX It seems that here assumes that the paragraph has only this `Text`.
      const auto* const followingBRElement =
          HTMLBRElement::FromNodeOrNull(HTMLEditUtils::GetNextSibling(
              *aPointToSplit.ContainerAs<Text>(),
              {LeafNodeOption::IgnoreNonEditableNode},
              BlockInlineCheck::UseComputedDisplayOutsideStyle));
      return !IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
          followingBRElement);
    }
    // If we're splitting the paragraph at middle of a `Text`, we should create
    // a new paragraph.
    return true;
  }

  // If we're splitting in a child element of the paragraph and it does not
  // follow a <br> or follows an invisible <br>, maybe we should not create a
  // new paragraph.
  // XXX Why? We probably need to do this if we're splitting in an inline
  //     element which and whose parents provide some styles, we should put
  //     the <br> element for making a placeholder in the left paragraph for
  //     moving to the caret, but I think that this could be handled in fewer
  //     cases than this.
  const auto* const precedingBRElement =
      HTMLBRElement::FromNodeOrNull(HTMLEditUtils::GetPreviousLeafContent(
          aPointToSplit, {LeafNodeOption::IgnoreNonEditableNode},
          BlockInlineCheck::Auto, &mEditingHost));
  if (!IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
          precedingBRElement)) {
    return true;
  }
  // If we're splitting in a child element of the paragraph and it's not
  // followed by a <br> or followed by an invisible <br>, we should not create a
  // new paragraph.
  const auto* followingBRElement =
      HTMLBRElement::FromNodeOrNull(HTMLEditUtils::GetNextLeafContent(
          aPointToSplit, {LeafNodeOption::IgnoreNonEditableNode},
          BlockInlineCheck::Auto, &mEditingHost));
  return !IsNullOrInvisibleBRElementOrPaddingOneForEmptyLastLine(
      followingBRElement);
}

// static
EditorDOMPoint
HTMLEditor::AutoInsertParagraphHandler::GetBetterPointToSplitParagraph(
    const Element& aBlockElementToSplit,
    const EditorDOMPoint& aCandidatePointToSplit) {
  EditorDOMPoint pointToSplit = [&]() MOZ_NEVER_INLINE_DEBUG {
    // We shouldn't create new anchor element which has non-empty href unless
    // splitting middle of it because we assume that users don't want to create
    // *same* anchor element across two or more paragraphs in most cases.
    // So, adjust selection start if it's edge of anchor element(s).
    {
      const WSScanResult prevVisibleThing =
          WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
              {}, aCandidatePointToSplit, &aBlockElementToSplit);
      if (prevVisibleThing.GetContent() &&
          // Only if the previous thing is not in the same container.
          prevVisibleThing.GetContent() !=
              aCandidatePointToSplit.GetContainer() &&
          // Only if the previous thing is a preceding node of closest inclusive
          // ancestor element at the split point.
          !prevVisibleThing.GetContent()->IsInclusiveDescendantOf(
              aCandidatePointToSplit.GetContainerOrContainerParentElement())) {
        EditorRawDOMPoint candidatePointToSplit =
            aCandidatePointToSplit.To<EditorRawDOMPoint>();
        const Element* const commonAncestor =
            Element::FromNode(nsContentUtils::GetClosestCommonInclusiveAncestor(
                candidatePointToSplit.GetContainerOrContainerParentElement(),
                prevVisibleThing.GetContent()));
        MOZ_ASSERT(commonAncestor);
        for (const Element* container =
                 candidatePointToSplit.GetContainerOrContainerParentElement();
             container && container != commonAncestor;
             container = container->GetParentElement()) {
          if (!HTMLEditUtils::IsHyperlinkElement(*container)) {
            continue;
          }
          // Found link should be only in right node.  So, we shouldn't split
          // it.
          candidatePointToSplit.Set(container);
          // Even if we found an anchor element, don't break because DOM API
          // allows to nest anchor elements.
        }
        return candidatePointToSplit.To<EditorDOMPoint>();
      }
    }
    WSScanResult nextVisibleThing =
        WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
            {}, aCandidatePointToSplit, &aBlockElementToSplit);
    if (nextVisibleThing.ReachedInvisibleBRElement()) {
      nextVisibleThing =
          WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
              {},
              nextVisibleThing.PointAfterReachedContent<EditorRawDOMPoint>(),
              &aBlockElementToSplit);
    }
    if (nextVisibleThing.GetContent() &&
        // Only if the next thing is not in the same container.
        nextVisibleThing.GetContent() !=
            aCandidatePointToSplit.GetContainer() &&
        // Only if the next thing is a preceding node of closest inclusive
        // ancestor element at the split point.
        !nextVisibleThing.GetContent()->IsInclusiveDescendantOf(
            aCandidatePointToSplit.GetContainerOrContainerParentElement())) {
      EditorRawDOMPoint candidatePointToSplit =
          aCandidatePointToSplit.To<EditorRawDOMPoint>();
      const Element* const commonAncestor =
          Element::FromNode(nsContentUtils::GetClosestCommonInclusiveAncestor(
              candidatePointToSplit.GetContainerOrContainerParentElement(),
              nextVisibleThing.GetContent()));
      MOZ_ASSERT(commonAncestor);
      for (const Element* container =
               candidatePointToSplit.GetContainerOrContainerParentElement();
           container && container != commonAncestor;
           container = container->GetParentElement()) {
        if (!HTMLEditUtils::IsHyperlinkElement(*container)) {
          continue;
        }
        // Found link should be only in left node.  So, we shouldn't split it.
        candidatePointToSplit.SetAfter(container);
        // Even if we found an anchor element, don't break because DOM API
        // allows to nest anchor elements.
      }
      return candidatePointToSplit.To<EditorDOMPoint>();
    }

    // Okay, split the ancestors as-is.
    return aCandidatePointToSplit;
  }();

  // If the candidate split point is not in a splittable node, let's move the
  // point after the parent.
  for (const nsIContent* container = pointToSplit.ContainerAs<nsIContent>();
       container && container != &aBlockElementToSplit &&
       !HTMLEditUtils::IsSplittableNode(*container);
       container = container->GetParent()) {
    pointToSplit = pointToSplit.ParentPoint();
  }
  return pointToSplit;
}

Result<EditorDOMPoint, nsresult> HTMLEditor::AutoInsertParagraphHandler::
    EnsureNoInvisibleLineBreakBeforePointToSplit(
        const Element& aBlockElementToSplit,
        const EditorDOMPoint& aPointToSplit) {
  const WSScanResult nextVisibleThing =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {}, aPointToSplit, &aBlockElementToSplit);
  if (!nextVisibleThing.ReachedBlockBoundary()) {
    return aPointToSplit;
  }
  const WSScanResult prevVisibleThing =
      WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
          {}, aPointToSplit, &aBlockElementToSplit);
  if (!prevVisibleThing.ReachedLineBreak()) {
    return aPointToSplit;
  }
  EditorDOMPoint pointToSplit = aPointToSplit;
  EditorLineBreak precedingLineBreak =
      prevVisibleThing.CreateEditorLineBreak<EditorLineBreak>();
  {
    // FIXME: Once bug 1951041 is fixed in the layout level, we don't need to
    // treat collapsible white-spaces before invisible <br> elements here.
    AutoTrackDOMPoint trackPointToSplit(mHTMLEditor.RangeUpdaterRef(),
                                        &pointToSplit);
    Maybe<AutoTrackLineBreak> trackPrecedingLineBreak;
    if (precedingLineBreak.IsPreformattedLineBreak()) {
      trackPrecedingLineBreak.emplace(mHTMLEditor.RangeUpdaterRef(),
                                      &precedingLineBreak);
    }
    Result<EditorDOMPoint, nsresult>
        normalizePrecedingWhiteSpacesResultOrError =
            [&]() MOZ_CAN_RUN_SCRIPT -> Result<EditorDOMPoint, nsresult> {
      if (precedingLineBreak.IsHTMLBRElement() ||
          precedingLineBreak.IsPreformattedLineBreakAtStartOfText()) {
        Result<EditorDOMPoint, nsresult> ret =
            WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesBefore(
                mHTMLEditor, precedingLineBreak.To<EditorDOMPoint>(), {});
        NS_WARNING_ASSERTION(
            ret.isOk(),
            "WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesBefore() failed");
        return ret;
      }
      Result<EditorDOMPoint, nsresult> ret =
          WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesToSplitAt(
              mHTMLEditor, precedingLineBreak.To<EditorDOMPoint>(), {});
      NS_WARNING_ASSERTION(
          ret.isOk(),
          "WhiteSpaceVisibilityKeeper::NormalizeWhiteSpacesToSplitAt() failed");
      return ret;
    }();
    if (NS_WARN_IF(normalizePrecedingWhiteSpacesResultOrError.isErr())) {
      return normalizePrecedingWhiteSpacesResultOrError.propagateErr();
    }
  }
  if (NS_WARN_IF(!pointToSplit.IsInContentNodeAndValidInComposedDoc()) ||
      NS_WARN_IF(!pointToSplit.GetContainer()->IsInclusiveDescendantOf(
          &aBlockElementToSplit)) ||
      NS_WARN_IF(!precedingLineBreak.IsDeletableFromComposedDoc())) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  {
    AutoTrackDOMPoint trackPointToSplit(mHTMLEditor.RangeUpdaterRef(),
                                        &pointToSplit);
    Result<EditorDOMPoint, nsresult> deleteInvisibleLineBreakResult =
        mHTMLEditor.DeleteLineBreakWithTransaction(
            precedingLineBreak, nsIEditor::eNoStrip, aBlockElementToSplit);
    if (MOZ_UNLIKELY(deleteInvisibleLineBreakResult.isErr())) {
      NS_WARNING("HTMLEditor::DeleteLineBreakWithTransaction() failed");
      return deleteInvisibleLineBreakResult.propagateErr();
    }
  }
  if (NS_WARN_IF(!pointToSplit.IsInContentNodeAndValidInComposedDoc()) ||
      NS_WARN_IF(!pointToSplit.GetContainer()->IsInclusiveDescendantOf(
          &aBlockElementToSplit))) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  return pointToSplit;
}

Result<EditorDOMPoint, nsresult> HTMLEditor::AutoInsertParagraphHandler::
    MaybeInsertFollowingBRElementToPreserveRightBlock(
        const Element& aBlockElementToSplit,
        const EditorDOMPoint& aPointToSplit) {
  MOZ_ASSERT(HTMLEditUtils::IsSplittableNode(aBlockElementToSplit));
  MOZ_ASSERT(aPointToSplit.ContainerAs<nsIContent>()->IsInclusiveDescendantOf(
      &aBlockElementToSplit));

  const Element* const closestContainerElement =
      HTMLEditUtils::GetInclusiveAncestorElement(
          *aPointToSplit.ContainerAs<nsIContent>(),
          HTMLEditUtils::ClosestContainerElementOrVoidAncestorLimiter,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          &aBlockElementToSplit);
  MOZ_ASSERT(closestContainerElement);
  MOZ_ASSERT(HTMLEditUtils::IsSplittableNode(*closestContainerElement));

  // If we're at end of the paragraph and there are some inline container
  // elements, we want to preserve the inline containers to preserve their
  // styles.
  Maybe<EditorLineBreak> unnecessaryLineBreak;
  const EditorDOMPoint pointToInsertFollowingBRElement =
      [&]() MOZ_NEVER_INLINE_DEBUG {
        const WSScanResult nextVisibleThing =
            WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                {}, aPointToSplit, &aBlockElementToSplit);
        if (nextVisibleThing.ReachedBRElement() ||
            nextVisibleThing.ReachedPreformattedLineBreak()) {
          // If it's followed by a line break in the closest ancestor container
          // element, we can use it.
          if ((nextVisibleThing.ReachedBRElement() &&
               nextVisibleThing.BRElementPtr()->GetParentNode() ==
                   closestContainerElement) ||
              (nextVisibleThing.ReachedPreformattedLineBreak() &&
               nextVisibleThing.TextPtr()->GetParentNode() ==
                   closestContainerElement)) {
            return EditorDOMPoint();
          }
          const WSScanResult nextVisibleThingAfterLineBreak =
              WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
                  {},
                  nextVisibleThing
                      .PointAfterReachedContent<EditorRawDOMPoint>(),
                  &aBlockElementToSplit);
          // If the line break is visible, we don't need to insert a padding
          // <br> element for the right paragraph because it'll have some
          // visible content.
          if (!nextVisibleThingAfterLineBreak.ReachedCurrentBlockBoundary()) {
            return EditorDOMPoint();
          }
        }
        // If it's not directly followed by current block boundary, we don't
        // need to insert a padding <br> element for the right paragraph because
        // it'll have some visible content.
        else if (!nextVisibleThing.ReachedCurrentBlockBoundary()) {
          return EditorDOMPoint();
        }
        // We want to insert a padding <br> into the closest ancestor container
        // element to preserve the style provided by it.
        EditorDOMPoint candidatePoint = aPointToSplit;
        for (; candidatePoint.GetContainer() != closestContainerElement;
             candidatePoint = candidatePoint.AfterContainer()) {
          MOZ_ASSERT(candidatePoint.GetContainer() != &aBlockElementToSplit);
        }
        // If we reached invisible line break which is not in the closest
        // container element, we don't want it anymore once we put invisible
        // <br> element into the closest container element.
        if (nextVisibleThing.ReachedBRElement()) {
          unnecessaryLineBreak.emplace(*nextVisibleThing.BRElementPtr());
        } else if (nextVisibleThing.ReachedPreformattedLineBreak()) {
          unnecessaryLineBreak.emplace(
              nextVisibleThing.CreateEditorLineBreak<EditorLineBreak>());
        }
        return candidatePoint;
      }();

  if (unnecessaryLineBreak) {
    Result<EditorDOMPoint, nsresult> deleteLineBreakResultOrError =
        mHTMLEditor.DeleteLineBreakWithTransaction(
            *unnecessaryLineBreak, nsIEditor::eNoStrip, aBlockElementToSplit);
    if (MOZ_UNLIKELY(deleteLineBreakResultOrError.isErr())) {
      NS_WARNING("HTMLEditor::DeleteLineBreakWithTransaction() failed");
      return deleteLineBreakResultOrError.propagateErr();
    }
    if (NS_WARN_IF(!aPointToSplit.IsSetAndValidInComposedDoc())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
    if (pointToInsertFollowingBRElement.IsSet() &&
        (NS_WARN_IF(!pointToInsertFollowingBRElement
                         .IsInContentNodeAndValidInComposedDoc()) ||
         NS_WARN_IF(!pointToInsertFollowingBRElement.GetContainer()
                         ->IsInclusiveDescendantOf(&aBlockElementToSplit)))) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }
  EditorDOMPoint pointToSplit(aPointToSplit);
  if (pointToInsertFollowingBRElement.IsSet()) {
    Maybe<AutoTrackDOMPoint> trackPointToSplit;
    if (pointToSplit.GetContainer() ==
        pointToInsertFollowingBRElement.GetContainer()) {
      trackPointToSplit.emplace(mHTMLEditor.RangeUpdaterRef(), &pointToSplit);
    }
    Result<CreateElementResult, nsresult> insertPaddingBRElementResultOrError =
        mHTMLEditor.InsertBRElement(
            WithTransaction::Yes,
            // XXX We don't want to expose the <br> for IME, but the plaintext
            // serializer requires this. See bug 1385905.
            BRElementType::Normal, pointToInsertFollowingBRElement);
    if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
      return insertPaddingBRElementResultOrError.propagateErr();
    }
    insertPaddingBRElementResultOrError.unwrap().IgnoreCaretPointSuggestion();
  }
  if (NS_WARN_IF(!pointToSplit.IsInContentNodeAndValidInComposedDoc()) ||
      NS_WARN_IF(!pointToSplit.GetContainer()->IsInclusiveDescendantOf(
          &aBlockElementToSplit))) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  if (mHTMLEditor.GetDefaultParagraphSeparator() != ParagraphSeparator::br) {
    return pointToSplit;
  }
  // If we're in the legacy mode, we don't want the right paragraph start with
  // an empty line.  So, if the right paragraph now starts with 2 <br> elements,
  // remove the second one.  (The first one is in the closest container element,
  // so, we want to keep it.)
  const WSScanResult nextVisibleThing =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {}, pointToSplit, &aBlockElementToSplit);
  if (!nextVisibleThing.ReachedBRElement()) {
    return pointToSplit;
  }
  const WSScanResult nextVisibleThingAfterFirstBRElement =
      WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
          {}, nextVisibleThing.PointAfterReachedContent<EditorRawDOMPoint>(),
          &aBlockElementToSplit);
  if (!nextVisibleThingAfterFirstBRElement.ReachedBRElement()) {
    return pointToSplit;
  }
  nsresult rv = mHTMLEditor.DeleteNodeWithTransaction(
      MOZ_KnownLive(*nextVisibleThingAfterFirstBRElement.BRElementPtr()));
  if (NS_FAILED(rv)) {
    NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
    return Err(rv);
  }
  if (NS_WARN_IF(!pointToSplit.IsInContentNodeAndValidInComposedDoc()) ||
      NS_WARN_IF(!pointToSplit.GetContainer()->IsInclusiveDescendantOf(
          &aBlockElementToSplit))) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  return pointToSplit;
}

Result<SplitNodeResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::SplitParagraphWithTransaction(
    Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit) {
  // First, maybe the split point follows an invisible <br>.  E.g., when
  // `<p><a href=foo>foo[]<br></a></p>`,
  // GetBetterSplitPointToAvoidToContinueLink() adjusted the split point as
  // `<p><a href=foo>foo<br></a>{}</p>`.  Then, we shouldn't insert another
  // <br> to end of the left <p> to make the last line visible.  Even though we
  // need to insert an invisible <br> element later, let's delete the invisible
  // line break first to make this method simpler.
  Result<EditorDOMPoint, nsresult> deleteInvisibleLineBreakResultOrError =
      EnsureNoInvisibleLineBreakBeforePointToSplit(aBlockElementToSplit,
                                                   aPointToSplit);
  if (MOZ_UNLIKELY(deleteInvisibleLineBreakResultOrError.isErr())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::SplitParagraphWithTransaction() failed");
    return deleteInvisibleLineBreakResultOrError.propagateErr();
  }
  EditorDOMPoint pointToSplit = deleteInvisibleLineBreakResultOrError.unwrap();
  MOZ_ASSERT(pointToSplit.IsInContentNodeAndValidInComposedDoc());
  MOZ_ASSERT(pointToSplit.GetContainer()->IsInclusiveDescendantOf(
      &aBlockElementToSplit));

  // Then, we need to keep the visibility of the surrounding collapsible
  // white-spaces at the split point.
  Result<EditorDOMPoint, nsresult> preparationResult =
      WhiteSpaceVisibilityKeeper::PrepareToSplitBlockElement(
          mHTMLEditor, pointToSplit, aBlockElementToSplit);
  if (MOZ_UNLIKELY(preparationResult.isErr())) {
    NS_WARNING(
        "WhiteSpaceVisibilityKeeper::PrepareToSplitBlockElement() failed");
    return preparationResult.propagateErr();
  }
  pointToSplit = preparationResult.unwrap();
  MOZ_ASSERT(pointToSplit.IsInContentNodeAndValidInComposedDoc());
  MOZ_ASSERT(pointToSplit.GetContainer()->IsInclusiveDescendantOf(
      &aBlockElementToSplit));

  // Next, if there are some inline elements which we will split and we're
  // splitting the deepest one at end of it, we need to put invisible <br>
  // before splitting to preserve the cloned inline elements in the new
  // paragraph.
  {
    Result<EditorDOMPoint, nsresult> insertPaddingBRElementResultOrError =
        MaybeInsertFollowingBRElementToPreserveRightBlock(aBlockElementToSplit,
                                                          pointToSplit);
    if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
      NS_WARNING(
          "AutoInsertParagraphHandler::"
          "MaybeInsertFollowingBRElementToPreserveRightBlock() failed");
      return insertPaddingBRElementResultOrError.propagateErr();
    }
    pointToSplit = insertPaddingBRElementResultOrError.unwrap();
    if (NS_WARN_IF(!pointToSplit.IsInContentNodeAndValidInComposedDoc()) ||
        NS_WARN_IF(!pointToSplit.GetContainer()->IsInclusiveDescendantOf(
            &aBlockElementToSplit))) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }
  }

  // Then, split current paragraph.
  const RefPtr<Element> deepestContainerElementToSplit =
      HTMLEditUtils::GetInclusiveAncestorElement(
          *pointToSplit.ContainerAs<nsIContent>(),
          HTMLEditUtils::ClosestContainerElementOrVoidAncestorLimiter,
          BlockInlineCheck::UseComputedDisplayOutsideStyle,
          &aBlockElementToSplit);
  if (NS_WARN_IF(!deepestContainerElementToSplit)) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  Result<SplitNodeResult, nsresult> splitDivOrPResultOrError =
      mHTMLEditor.SplitNodeDeepWithTransaction(
          aBlockElementToSplit, pointToSplit,
          SplitAtEdges::eAllowToCreateEmptyContainer);
  if (MOZ_UNLIKELY(splitDivOrPResultOrError.isErr())) {
    NS_WARNING("HTMLEditor::SplitNodeDeepWithTransaction() failed");
    return splitDivOrPResultOrError;
  }
  SplitNodeResult splitDivOrPResult = splitDivOrPResultOrError.unwrap();
  if (MOZ_UNLIKELY(!splitDivOrPResult.DidSplit())) {
    NS_WARNING(
        "HTMLEditor::SplitNodeDeepWithTransaction() didn't split any nodes");
    return splitDivOrPResult;
  }

  // We'll compute caret suggestion later.  So the simple result is not needed.
  splitDivOrPResult.IgnoreCaretPointSuggestion();

  auto* const leftDivOrParagraphElement =
      splitDivOrPResult.GetPreviousContentAs<Element>();
  MOZ_ASSERT(leftDivOrParagraphElement,
             "SplitNodeResult::GetPreviousContent() should return something if "
             "DidSplit() returns true");
  auto* const rightDivOrParagraphElement =
      splitDivOrPResult.GetNextContentAs<Element>();
  MOZ_ASSERT(rightDivOrParagraphElement,
             "SplitNodeResult::GetNextContent() should return something if "
             "DidSplit() returns true");

  // Remove ID attribute on the paragraph from the right node.
  // MOZ_KnownLive(rightDivOrParagraphElement) because it's grabbed by
  // splitDivOrPResult.
  nsresult rv = mHTMLEditor.RemoveAttributeWithTransaction(
      MOZ_KnownLive(*rightDivOrParagraphElement), *nsGkAtoms::id);
  if (NS_FAILED(rv)) {
    NS_WARNING(
        "EditorBase::RemoveAttributeWithTransaction(nsGkAtoms::id) failed");
    return Err(rv);
  }

  // Finally, we need to ensure that both paragraphs are visible even if they
  // are empty.  Note that we need to use padding <br> element for the empty
  // last line as usual because it won't appear as a line break when serialized
  // by ContentEventHandler.  Thus, if we were using normal <br> elements,
  // disappearing following line break of composition string would make IME
  // confused.
  if (NS_WARN_IF(!deepestContainerElementToSplit->IsInclusiveDescendantOf(
          leftDivOrParagraphElement))) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }
  const EditorDOMPoint pointToInsertBRElement = [&]() MOZ_NEVER_INLINE_DEBUG {
    // If we split the paragraph immediately after a block boundary or a line
    // break, we need to put a padding <br> to make an empty line.
    const WSScanResult prevVisibleThing =
        WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary(
            {}, EditorRawDOMPoint::AtEndOf(*deepestContainerElementToSplit),
            leftDivOrParagraphElement);
    if (prevVisibleThing.ReachedLineBoundary()) {
      return EditorDOMPoint::AtEndOf(*deepestContainerElementToSplit);
    }
    // If we split a descendant element and it's empty, we need to put a padding
    // <br> element into it to preserve the style of the element.
    if (deepestContainerElementToSplit == leftDivOrParagraphElement) {
      return EditorDOMPoint();
    }
    const WSScanResult nextVisibleThing =
        WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
            {}, EditorRawDOMPoint(deepestContainerElementToSplit, 0),
            leftDivOrParagraphElement);
    return nextVisibleThing.ReachedCurrentBlockBoundary()
               ? EditorDOMPoint::AtEndOf(*deepestContainerElementToSplit)
               : EditorDOMPoint();
  }();
  if (pointToInsertBRElement.IsSet()) {
    Result<CreateElementResult, nsresult> insertPaddingBRElementResultOrError =
        mHTMLEditor.InsertBRElement(
            WithTransaction::Yes,
            // XXX We don't want to expose the <br> for IME, but the plaintext
            // serializer requires this. See bug 1385905.
            BRElementType::Normal, pointToInsertBRElement);
    if (MOZ_UNLIKELY(insertPaddingBRElementResultOrError.isErr())) {
      return insertPaddingBRElementResultOrError.propagateErr();
    }
    insertPaddingBRElementResultOrError.unwrap().IgnoreCaretPointSuggestion();
  }

  // The right paragraph should not be empty because
  // MaybeInsertFollowingBRElementToPreserveRightBlock() should've already put a
  // padding <br> before splitting the paragraph.
  if (NS_WARN_IF(HTMLEditUtils::IsEmptyNode(
          *rightDivOrParagraphElement,
          {EmptyCheckOption::TreatSingleBRElementAsVisible,
           EmptyCheckOption::TreatListItemAsVisible,
           EmptyCheckOption::TreatTableCellAsVisible}))) {
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  // Let's put caret at start of the first leaf container.
  nsIContent* child = HTMLEditUtils::GetFirstLeafContent(
      *rightDivOrParagraphElement, {LeafNodeOption::TreatChildBlockAsLeafNode},
      BlockInlineCheck::UseComputedDisplayStyle);
  if (MOZ_UNLIKELY(!child)) {
    return SplitNodeResult(std::move(splitDivOrPResult),
                           EditorDOMPoint(rightDivOrParagraphElement, 0u));
  }

  return child->IsText() || HTMLEditUtils::IsContainerNode(*child)
             ? SplitNodeResult(std::move(splitDivOrPResult),
                               EditorDOMPoint(child, 0u))
             : SplitNodeResult(std::move(splitDivOrPResult),
                               EditorDOMPoint(child));
}

Result<CreateLineBreakResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::InsertBRElementIfEmptyBlockElement(
    Element& aMaybeBlockElement,
    InsertBRElementIntoEmptyBlock aInsertBRElementIntoEmptyBlock,
    BlockInlineCheck aBlockInlineCheck) {
  if (!HTMLEditUtils::IsBlockElement(aMaybeBlockElement, aBlockInlineCheck)) {
    return CreateLineBreakResult::NotHandled();
  }

  if (!HTMLEditUtils::IsEmptyNode(
          aMaybeBlockElement,
          {EmptyCheckOption::TreatSingleBRElementAsVisible})) {
    return CreateLineBreakResult::NotHandled();
  }

  // XXX: Probably, we should use
  //      InsertPaddingBRElementForEmptyLastLineWithTransaction here, and
  //      if there are some empty inline container, we should put the <br>
  //      into the last one.
  Result<CreateLineBreakResult, nsresult> insertBRElementResultOrError =
      mHTMLEditor.InsertLineBreak(
          WithTransaction::Yes, LineBreakType::BRElement,
          aInsertBRElementIntoEmptyBlock == InsertBRElementIntoEmptyBlock::Start
              ? EditorDOMPoint(&aMaybeBlockElement, 0u)
              : EditorDOMPoint::AtEndOf(aMaybeBlockElement));
  NS_WARNING_ASSERTION(insertBRElementResultOrError.isOk(),
                       "HTMLEditor::InsertLineBreak(WithTransaction::Yes, "
                       "LineBreakType::BRElement) failed");
  return insertBRElementResultOrError;
}

// static
Element* HTMLEditor::AutoInsertParagraphHandler::
    GetDeepestFirstChildInlineContainerElement(Element& aBlockElement) {
  // XXX Should we ignore invisible children like empty Text, Comment, etc?
  Element* result = nullptr;
  for (Element* maybeDeepestInlineContainer =
           Element::FromNodeOrNull(aBlockElement.GetFirstChild());
       maybeDeepestInlineContainer &&
       HTMLEditUtils::IsInlineContent(
           *maybeDeepestInlineContainer,
           BlockInlineCheck::UseComputedDisplayStyle) &&
       HTMLEditUtils::IsContainerNode(*maybeDeepestInlineContainer);
       // FIXME: There may be visible node before first element child, so, here
       // is obviously wrong.
       maybeDeepestInlineContainer =
           maybeDeepestInlineContainer->GetFirstElementChild()) {
    result = maybeDeepestInlineContainer;
  }
  return result;
}

Result<InsertParagraphResult, nsresult>
HTMLEditor::AutoInsertParagraphHandler::HandleInListItemElement(
    Element& aListItemElement, const EditorDOMPoint& aPointToSplit) {
  MOZ_ASSERT(HTMLEditUtils::IsListItemElement(aListItemElement));

  // If aListItemElement is empty, then we want to outdent its content.
  if (&mEditingHost != aListItemElement.GetParentElement() &&
      HTMLEditUtils::IsEmptyBlockElement(
          aListItemElement,
          {EmptyCheckOption::TreatNonEditableContentAsInvisible},
          BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
    RefPtr<Element> leftListElement = aListItemElement.GetParentElement();
    // If the given list item element is not the last list item element of
    // its parent nor not followed by sub list elements, split the parent
    // before it.
    if (!HTMLEditUtils::IsLastChild(
            aListItemElement, {LeafNodeOption::IgnoreNonEditableNode},
            BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
      Result<SplitNodeResult, nsresult> splitListItemParentResult =
          mHTMLEditor.SplitNodeWithTransaction(
              EditorDOMPoint(&aListItemElement));
      if (MOZ_UNLIKELY(splitListItemParentResult.isErr())) {
        NS_WARNING("HTMLEditor::SplitNodeWithTransaction() failed");
        return splitListItemParentResult.propagateErr();
      }
      SplitNodeResult unwrappedSplitListItemParentResult =
          splitListItemParentResult.unwrap();
      if (MOZ_UNLIKELY(!unwrappedSplitListItemParentResult.DidSplit())) {
        NS_WARNING(
            "HTMLEditor::SplitNodeWithTransaction() didn't split the parent of "
            "aListItemElement");
        MOZ_ASSERT(
            !unwrappedSplitListItemParentResult.HasCaretPointSuggestion());
        return Err(NS_ERROR_FAILURE);
      }
      unwrappedSplitListItemParentResult.IgnoreCaretPointSuggestion();
      leftListElement =
          unwrappedSplitListItemParentResult.GetPreviousContentAs<Element>();
      MOZ_DIAGNOSTIC_ASSERT(leftListElement);
    }

    auto afterLeftListElement = EditorDOMPoint::After(leftListElement);
    if (MOZ_UNLIKELY(!afterLeftListElement.IsInContentNode())) {
      return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
    }

    // If aListItemElement is in an invalid sub-list element, move it into
    // the grand parent list element in order to outdent.
    if (HTMLEditUtils::IsListElement(
            *afterLeftListElement.ContainerAs<nsIContent>())) {
      Result<MoveNodeResult, nsresult> moveListItemElementResult =
          mHTMLEditor.MoveNodeWithTransaction(aListItemElement,
                                              afterLeftListElement);
      if (MOZ_UNLIKELY(moveListItemElementResult.isErr())) {
        NS_WARNING("HTMLEditor::MoveNodeWithTransaction() failed");
        return moveListItemElementResult.propagateErr();
      }
      moveListItemElementResult.inspect().IgnoreCaretPointSuggestion();
      return InsertParagraphResult(aListItemElement,
                                   EditorDOMPoint(&aListItemElement, 0u));
    }

    // Otherwise, replace the empty aListItemElement with a new paragraph.
    nsresult rv = mHTMLEditor.DeleteNodeWithTransaction(aListItemElement);
    if (NS_FAILED(rv)) {
      NS_WARNING("EditorBase::DeleteNodeWithTransaction() failed");
      return Err(rv);
    }
    nsStaticAtom& newParagraphTagName =
        &mDefaultParagraphSeparatorTagName == nsGkAtoms::br
            ? *nsGkAtoms::p
            : mDefaultParagraphSeparatorTagName;
    // MOZ_KnownLive(newParagraphTagName) because it's available until shutdown.
    Result<CreateElementResult, nsresult> createNewParagraphElementResult =
        mHTMLEditor.CreateAndInsertElement(
            WithTransaction::Yes, MOZ_KnownLive(newParagraphTagName),
            afterLeftListElement, HTMLEditor::InsertNewBRElement);
    if (MOZ_UNLIKELY(createNewParagraphElementResult.isErr())) {
      NS_WARNING(
          "HTMLEditor::CreateAndInsertElement(WithTransaction::Yes) failed");
      return createNewParagraphElementResult.propagateErr();
    }
    createNewParagraphElementResult.inspect().IgnoreCaretPointSuggestion();
    MOZ_ASSERT(createNewParagraphElementResult.inspect().GetNewNode());
    EditorDOMPoint pointToPutCaret(
        createNewParagraphElementResult.inspect().GetNewNode(), 0u);
    return InsertParagraphResult(
        *createNewParagraphElementResult.inspect().GetNewNode(),
        std::move(pointToPutCaret));
  }

  const EditorDOMPoint pointToSplit =
      GetBetterPointToSplitParagraph(aListItemElement, aPointToSplit);
  MOZ_ASSERT(pointToSplit.IsInContentNodeAndValidInComposedDoc());

  // If insertParagraph at end of <dt> or <dd>, we should put opposite type list
  // item without copying the style of end of aListItemElement.
  // FIXME: Chrome does not do this.  So, we should stop doing this at least on
  // Firefox later.
  if (aListItemElement.IsAnyOfHTMLElements(nsGkAtoms::dt, nsGkAtoms::dd) &&
      SplitPointIsEndOfSplittingBlock(aListItemElement, pointToSplit,
                                      IgnoreBlockBoundaries::Yes) &&
      // However, don't do that if we're handling it in empty list item.
      !SplitPointIsStartOfSplittingBlock(aListItemElement, pointToSplit,
                                         IgnoreBlockBoundaries::Yes)) {
    nsStaticAtom& oppositeTypeListItemTag =
        aListItemElement.IsHTMLElement(nsGkAtoms::dt) ? *nsGkAtoms::dd
                                                      : *nsGkAtoms::dt;
    // MOZ_KnownLive(oppositeTypeListItemTag) because it's available
    // until shutdown.
    Result<CreateElementResult, nsresult>
        insertOppositeTypeListItemResultOrError =
            mHTMLEditor.CreateAndInsertElement(
                WithTransaction::Yes, MOZ_KnownLive(oppositeTypeListItemTag),
                EditorDOMPoint::After(aListItemElement),
                HTMLEditor::InsertNewBRElement);
    if (MOZ_UNLIKELY(insertOppositeTypeListItemResultOrError.isErr())) {
      NS_WARNING(
          "HTMLEditor::CreateAndInsertElement(WithTransaction::Yes) failed");
      return insertOppositeTypeListItemResultOrError.propagateErr();
    }
    CreateElementResult insertOppositeTypeListItemResult =
        insertOppositeTypeListItemResultOrError.unwrap();
    insertOppositeTypeListItemResult.IgnoreCaretPointSuggestion();
    RefPtr<Element> oppositeTypeListItemElement =
        insertOppositeTypeListItemResult.UnwrapNewNode();
    EditorDOMPoint startOfOppositeTypeListItem(oppositeTypeListItemElement, 0u);
    MOZ_ASSERT(oppositeTypeListItemElement);
    return InsertParagraphResult(std::move(oppositeTypeListItemElement),
                                 std::move(startOfOppositeTypeListItem));
  }

  // If aListItemElement has some content or aListItemElement is empty but it's
  // a child of editing host, we want a new list item at the same list level.
  // First, sort out white-spaces.
  Result<SplitNodeResult, nsresult> splitListItemResultOrError =
      SplitParagraphWithTransaction(aListItemElement, pointToSplit);
  if (MOZ_UNLIKELY(splitListItemResultOrError.isErr())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::SplitParagraphWithTransaction() failed");
    return splitListItemResultOrError.propagateErr();
  }
  SplitNodeResult splitListItemElement = splitListItemResultOrError.unwrap();
  EditorDOMPoint pointToPutCaret = splitListItemElement.UnwrapCaretPoint();
  if (MOZ_UNLIKELY(!aListItemElement.GetParent())) {
    NS_WARNING("Somebody disconnected the target listitem from the parent");
    return Err(NS_ERROR_EDITOR_UNEXPECTED_DOM_TREE);
  }

  // If aListItemElement is not replaced, we should not do anything anymore.
  if (MOZ_UNLIKELY(!splitListItemElement.DidSplit()) ||
      NS_WARN_IF(!splitListItemElement.GetNewContentAs<Element>()) ||
      NS_WARN_IF(!splitListItemElement.GetOriginalContentAs<Element>())) {
    NS_WARNING(
        "AutoInsertParagraphHandler::SplitParagraphWithTransaction() didn't "
        "split the listitem");
    return Err(NS_ERROR_FAILURE);
  }
  auto* const rightListItemElement =
      splitListItemElement.GetNextContentAs<Element>();
  return InsertParagraphResult(*rightListItemElement,
                               std::move(pointToPutCaret));
}

// static
bool HTMLEditor::AutoInsertParagraphHandler::SplitPointIsStartOfSplittingBlock(
    const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit,
    IgnoreBlockBoundaries aIgnoreBlockBoundaries) {
  EditorRawDOMPoint pointToSplit = aPointToSplit.To<EditorRawDOMPoint>();
  while (true) {
    const WSScanResult prevVisibleThing =
        WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundary({}, pointToSplit);
    if (!prevVisibleThing.ReachedCurrentBlockBoundary()) {
      return false;
    }
    if (prevVisibleThing.ElementPtr() == &aBlockElementToSplit) {
      return true;
    }
    if (!static_cast<bool>(aIgnoreBlockBoundaries)) {
      return false;
    }
    pointToSplit = pointToSplit.ParentPoint();
  }
}

// static
bool HTMLEditor::AutoInsertParagraphHandler::SplitPointIsEndOfSplittingBlock(
    const Element& aBlockElementToSplit, const EditorDOMPoint& aPointToSplit,
    IgnoreBlockBoundaries aIgnoreBlockBoundaries) {
  bool maybeFollowedByInvisibleBRElement = true;
  EditorRawDOMPoint pointToSplit = aPointToSplit.To<EditorRawDOMPoint>();
  while (true) {
    WSScanResult nextVisibleThing =
        WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
            {}, pointToSplit, &aBlockElementToSplit);
    if (maybeFollowedByInvisibleBRElement &&
        (nextVisibleThing.ReachedBRElement() ||
         nextVisibleThing.ReachedPreformattedLineBreak())) {
      nextVisibleThing =
          WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundary(
              {},
              nextVisibleThing.PointAfterReachedContent<EditorRawDOMPoint>(),
              &aBlockElementToSplit);
    }
    if (!nextVisibleThing.ReachedCurrentBlockBoundary()) {
      return false;
    }
    if (nextVisibleThing.ElementPtr() == &aBlockElementToSplit) {
      return true;
    }
    if (!static_cast<bool>(aIgnoreBlockBoundaries)) {
      return false;
    }
    pointToSplit = pointToSplit.AfterContainer();
    // <br> element after other block boundary creates an empty line so that
    // it's always visible.
    maybeFollowedByInvisibleBRElement = false;
  }
}

}  // namespace mozilla

/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WSRunScanner.h"

#include "EditorDOMPoint.h"
#include "ErrorList.h"
#include "HTMLEditor.h"
#include "HTMLEditUtils.h"

#include "mozilla/Assertions.h"
#include "mozilla/Casting.h"  // for AssertedCast
#include "mozilla/dom/Comment.h"

#include "nsDebug.h"
#include "nsError.h"
#include "nsIContent.h"
#include "nsIContentInlines.h"
#include "nsRange.h"

namespace mozilla {

using namespace dom;

/******************************************************************************
 * mozilla::WSScanResult
 ******************************************************************************/

void WSScanResult::AssertIfInvalidData(const WSRunScanner& aScanner) const {
#ifdef DEBUG
  MOZ_ASSERT(mReason == WSType::UnexpectedError ||
             mReason == WSType::InUncomposedDoc ||
             mReason == WSType::NonCollapsibleCharacters ||
             mReason == WSType::CollapsibleWhiteSpaces ||
             mReason == WSType::BRElement ||
             mReason == WSType::PreformattedLineBreak ||
             mReason == WSType::EmptyInlineContainerElement ||
             mReason == WSType::SpecialContent ||
             mReason == WSType::CurrentBlockBoundary ||
             mReason == WSType::OtherBlockBoundary ||
             mReason == WSType::InlineEditingHostBoundary);
  MOZ_ASSERT_IF(mReason == WSType::UnexpectedError, !mContent);
  MOZ_ASSERT_IF(mReason != WSType::UnexpectedError, mContent);
  MOZ_ASSERT_IF(mReason == WSType::InUncomposedDoc,
                !mContent->IsInComposedDoc());
  MOZ_ASSERT_IF(mContent && !mContent->IsInComposedDoc(),
                mReason == WSType::InUncomposedDoc);
  MOZ_ASSERT_IF(mReason == WSType::NonCollapsibleCharacters ||
                    mReason == WSType::CollapsibleWhiteSpaces ||
                    mReason == WSType::PreformattedLineBreak,
                mContent->IsText());
  MOZ_ASSERT_IF(mReason == WSType::NonCollapsibleCharacters ||
                    mReason == WSType::CollapsibleWhiteSpaces ||
                    mReason == WSType::PreformattedLineBreak,
                mOffset.isSome());
  MOZ_ASSERT_IF(mReason == WSType::NonCollapsibleCharacters ||
                    mReason == WSType::CollapsibleWhiteSpaces ||
                    mReason == WSType::PreformattedLineBreak,
                mContent->AsText()->TextDataLength() > 0);
  MOZ_ASSERT_IF(mDirection == ScanDirection::Backward &&
                    (mReason == WSType::NonCollapsibleCharacters ||
                     mReason == WSType::CollapsibleWhiteSpaces ||
                     mReason == WSType::PreformattedLineBreak),
                *mOffset > 0);
  MOZ_ASSERT_IF(mDirection == ScanDirection::Forward &&
                    (mReason == WSType::NonCollapsibleCharacters ||
                     mReason == WSType::CollapsibleWhiteSpaces ||
                     mReason == WSType::PreformattedLineBreak),
                *mOffset < mContent->AsText()->TextDataLength());
  MOZ_ASSERT_IF(mReason == WSType::BRElement,
                mContent->IsHTMLElement(nsGkAtoms::br));
  MOZ_ASSERT_IF(mReason == WSType::PreformattedLineBreak,
                EditorUtils::IsNewLinePreformatted(*mContent));
  auto MaybeNonVoidEmptyInlineContainerElement = [&]() {
    return HTMLEditUtils::IsInlineContent(
               *mContent,
               aScanner.ReferredHTMLDefaultStyle()
                   ? BlockInlineCheck::UseHTMLDefaultStyle
                   : BlockInlineCheck::UseComputedDisplayOutsideStyle) &&
           HTMLEditUtils::IsContainerNode(*mContent) &&
           !HTMLEditUtils::IsReplacedElement(*mContent->AsElement());
  };
  MOZ_ASSERT_IF(mReason == WSType::EmptyInlineContainerElement,
                MaybeNonVoidEmptyInlineContainerElement());
  MOZ_ASSERT_IF(
      mReason == WSType::SpecialContent,
      (mContent->IsComment() || mContent->IsProcessingInstruction()) ||
          (mContent->IsText() && !mContent->IsEditable()) ||
          (mContent->IsElement() && !mContent->IsHTMLElement(nsGkAtoms::br) &&
           !HTMLEditUtils::IsBlockElement(
               *mContent,
               aScanner.ReferredHTMLDefaultStyle()
                   ? BlockInlineCheck::UseHTMLDefaultStyle
                   : BlockInlineCheck::UseComputedDisplayOutsideStyle) &&
           !(mContent->IsEditable() &&
             MaybeNonVoidEmptyInlineContainerElement())));
  MOZ_ASSERT_IF(
      mReason == WSType::OtherBlockBoundary,
      HTMLEditUtils::IsBlockElement(
          *mContent, aScanner.ReferredHTMLDefaultStyle()
                         ? BlockInlineCheck::UseHTMLDefaultStyle
                         : BlockInlineCheck::UseComputedDisplayOutsideStyle));
  MOZ_ASSERT_IF(mReason == WSType::CurrentBlockBoundary, mContent->IsElement());
  MOZ_ASSERT_IF(mReason == WSType::CurrentBlockBoundary &&
                    aScanner.ScanOptions().contains(
                        WSRunScanner::Option::OnlyEditableNodes),
                mContent->IsEditable());
  MOZ_ASSERT_IF(
      mReason == WSType::CurrentBlockBoundary,
      HTMLEditUtils::IsBlockElement(
          *mContent, aScanner.ReferredHTMLDefaultStyle()
                         ? BlockInlineCheck::UseHTMLDefaultStyle
                         : BlockInlineCheck::UseComputedDisplayStyle));
  MOZ_ASSERT_IF(mReason == WSType::InlineEditingHostBoundary,
                mContent->IsElement());
  MOZ_ASSERT_IF(mReason == WSType::InlineEditingHostBoundary &&
                    aScanner.ScanOptions().contains(
                        WSRunScanner::Option::OnlyEditableNodes),
                mContent->IsEditable());
  MOZ_ASSERT_IF(
      mReason == WSType::InlineEditingHostBoundary,
      !HTMLEditUtils::IsBlockElement(
          *mContent, aScanner.ReferredHTMLDefaultStyle()
                         ? BlockInlineCheck::UseHTMLDefaultStyle
                         : BlockInlineCheck::UseComputedDisplayStyle));
  MOZ_ASSERT_IF(mReason == WSType::InlineEditingHostBoundary,
                !mContent->GetParentElement() ||
                    !mContent->GetParentElement()->IsEditable());
#endif  // #ifdef DEBUG
}

/******************************************************************************
 * mozilla::WSRunScanner
 ******************************************************************************/

template WSScanResult WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPoint& aPoint) const;
template WSScanResult WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom(
    const EditorRawDOMPoint& aPoint) const;
template WSScanResult WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPointInText& aPoint) const;
template WSScanResult WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom(
    const EditorRawDOMPointInText& aPoint) const;
template WSScanResult
WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPoint& aPoint) const;
template WSScanResult
WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
    const EditorRawDOMPoint& aPoint) const;
template WSScanResult
WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPointInText& aPoint) const;
template WSScanResult
WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
    const EditorRawDOMPointInText& aPoint) const;
template EditorDOMPoint WSRunScanner::GetAfterLastVisiblePoint(Options, Text&,
                                                               const Element*);
template EditorRawDOMPoint WSRunScanner::GetAfterLastVisiblePoint(
    Options, Text&, const Element*);
template EditorDOMPoint WSRunScanner::GetFirstVisiblePoint(Options, Text&,
                                                           const Element*);
template EditorRawDOMPoint WSRunScanner::GetFirstVisiblePoint(Options, Text&,
                                                              const Element*);

template <typename PT, typename CT>
WSScanResult WSRunScanner::ScanPreviousVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPointBase<PT, CT>& aPoint) const {
  MOZ_ASSERT(aPoint.IsSet());
  MOZ_ASSERT(aPoint.IsInComposedDoc());

  if (MOZ_UNLIKELY(!aPoint.IsSet())) {
    return WSScanResult::Error();
  }

  // We may not be able to check editable state in uncomposed tree as expected.
  // For example, only some descendants in an editing host is temporarily
  // removed from the tree, they are not editable unless nested contenteditable
  // attribute is set to "true".
  if (MOZ_UNLIKELY(!aPoint.IsInComposedDoc())) {
    return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                        *aPoint.template ContainerAs<nsIContent>(),
                        WSType::InUncomposedDoc);
  }

  if (!TextFragmentDataAtStartRef().IsInitialized()) {
    return WSScanResult::Error();
  }

  // If the range has visible text and start of the visible text is before
  // aPoint, return previous character in the text.
  const VisibleWhiteSpacesData& visibleWhiteSpaces =
      TextFragmentDataAtStartRef().VisibleWhiteSpacesDataRef();
  if (visibleWhiteSpaces.IsInitialized() &&
      visibleWhiteSpaces.StartRef().IsBefore(aPoint)) {
    // If the visible things are not editable, we shouldn't scan "editable"
    // things now.  Whether keep scanning editable things or not should be
    // considered by the caller.
    if (ScanOptions().contains(Option::OnlyEditableNodes) &&
        aPoint.GetChild() &&
        !HTMLEditUtils::IsSimplyEditableNode((*aPoint.GetChild()))) {
      return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                          *aPoint.GetChild(), WSType::SpecialContent);
    }
    const auto atPreviousChar =
        GetPreviousCharPoint<EditorRawDOMPointInText>(aPoint);
    // When it's a non-empty text node, return it.
    if (atPreviousChar.IsSet() && !atPreviousChar.IsContainerEmpty()) {
      MOZ_ASSERT(!atPreviousChar.IsEndOfContainer());
      return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                          atPreviousChar.template NextPoint<EditorDOMPoint>(),
                          atPreviousChar.IsCharCollapsibleASCIISpaceOrNBSP()
                              ? WSType::CollapsibleWhiteSpaces
                          : atPreviousChar.IsCharPreformattedNewLine()
                              ? WSType::PreformattedLineBreak
                              : WSType::NonCollapsibleCharacters);
    }
  }

  if (NS_WARN_IF(TextFragmentDataAtStartRef().StartRawReason() ==
                 WSType::UnexpectedError)) {
    return WSScanResult::Error();
  }

  MOZ_ASSERT_IF(!ScanOptions().contains(Option::StopAtComment),
                !Comment::FromNodeOrNull(
                    TextFragmentDataAtStartRef().GetStartReasonContent()));
  switch (TextFragmentDataAtStartRef().StartRawReason()) {
    case WSType::CollapsibleWhiteSpaces:
    case WSType::NonCollapsibleCharacters:
    case WSType::PreformattedLineBreak:
      MOZ_ASSERT(TextFragmentDataAtStartRef().StartRef().IsSet());
      // XXX: If we find the character at last of a text node and we started
      // scanning from following text node of it, some callers may work with the
      // point in the following text node instead of end of the found text node.
      return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                          TextFragmentDataAtStartRef().StartRef(),
                          TextFragmentDataAtStartRef().StartRawReason());
    default:
      break;
  }

  // Otherwise, return the start of the range.
  if (TextFragmentDataAtStartRef().GetStartReasonContent() !=
      TextFragmentDataAtStartRef().StartRef().GetContainer()) {
    if (NS_WARN_IF(!TextFragmentDataAtStartRef().GetStartReasonContent())) {
      return WSScanResult::Error();
    }
    // In this case, TextFragmentDataAtStartRef().StartRef().Offset() is not
    // meaningful.
    return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                        *TextFragmentDataAtStartRef().GetStartReasonContent(),
                        TextFragmentDataAtStartRef().StartRawReason());
  }
  if (NS_WARN_IF(!TextFragmentDataAtStartRef().StartRef().IsSet())) {
    return WSScanResult::Error();
  }
  return WSScanResult(*this, WSScanResult::ScanDirection::Backward,
                      TextFragmentDataAtStartRef().StartRef(),
                      TextFragmentDataAtStartRef().StartRawReason());
}

template <typename PT, typename CT>
WSScanResult WSRunScanner::ScanInclusiveNextVisibleNodeOrBlockBoundaryFrom(
    const EditorDOMPointBase<PT, CT>& aPoint) const {
  MOZ_ASSERT(aPoint.IsSet());
  MOZ_ASSERT(aPoint.IsInComposedDoc());

  if (MOZ_UNLIKELY(!aPoint.IsSet())) {
    return WSScanResult::Error();
  }

  // We may not be able to check editable state in uncomposed tree as expected.
  // For example, only some descendants in an editing host is temporarily
  // removed from the tree, they are not editable unless nested contenteditable
  // attribute is set to "true".
  if (MOZ_UNLIKELY(!aPoint.IsInComposedDoc())) {
    return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                        *aPoint.template ContainerAs<nsIContent>(),
                        WSType::InUncomposedDoc);
  }

  if (!TextFragmentDataAtStartRef().IsInitialized()) {
    return WSScanResult::Error();
  }

  // If the range has visible text and aPoint equals or is before the end of the
  // visible text, return inclusive next character in the text.
  const VisibleWhiteSpacesData& visibleWhiteSpaces =
      TextFragmentDataAtStartRef().VisibleWhiteSpacesDataRef();
  if (visibleWhiteSpaces.IsInitialized() &&
      aPoint.EqualsOrIsBefore(visibleWhiteSpaces.EndRef())) {
    // If the visible things are not editable, we shouldn't scan "editable"
    // things now.  Whether keep scanning editable things or not should be
    // considered by the caller.
    if (ScanOptions().contains(Option::OnlyEditableNodes) &&
        aPoint.GetChild() &&
        !HTMLEditUtils::IsSimplyEditableNode(*aPoint.GetChild())) {
      return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                          *aPoint.GetChild(), WSType::SpecialContent);
    }
    const auto atNextChar = GetInclusiveNextCharPoint<EditorDOMPoint>(aPoint);
    // When it's a non-empty text node, return it.
    if (atNextChar.IsSet() && !atNextChar.IsContainerEmpty()) {
      return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                          atNextChar,
                          !atNextChar.IsEndOfContainer() &&
                                  atNextChar.IsCharCollapsibleASCIISpaceOrNBSP()
                              ? WSType::CollapsibleWhiteSpaces
                          : !atNextChar.IsEndOfContainer() &&
                                  atNextChar.IsCharPreformattedNewLine()
                              ? WSType::PreformattedLineBreak
                              : WSType::NonCollapsibleCharacters);
    }
  }

  if (NS_WARN_IF(TextFragmentDataAtStartRef().EndRawReason() ==
                 WSType::UnexpectedError)) {
    return WSScanResult::Error();
  }

  MOZ_ASSERT_IF(!ScanOptions().contains(Option::StopAtComment),
                !Comment::FromNodeOrNull(
                    TextFragmentDataAtStartRef().GetEndReasonContent()));
  switch (TextFragmentDataAtStartRef().EndRawReason()) {
    case WSType::CollapsibleWhiteSpaces:
    case WSType::NonCollapsibleCharacters:
    case WSType::PreformattedLineBreak:
      MOZ_ASSERT(TextFragmentDataAtStartRef().StartRef().IsSet());
      // XXX: If we find the character at start of a text node and we
      // started scanning from preceding text node of it, some callers may want
      // to work with the point at end of the preceding text node instead of
      // start of the found text node.
      return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                          TextFragmentDataAtStartRef().EndRef(),
                          TextFragmentDataAtStartRef().EndRawReason());
    default:
      break;
  }

  // Otherwise, return the end of the range.
  if (TextFragmentDataAtStartRef().GetEndReasonContent() !=
      TextFragmentDataAtStartRef().EndRef().GetContainer()) {
    if (NS_WARN_IF(!TextFragmentDataAtStartRef().GetEndReasonContent())) {
      return WSScanResult::Error();
    }
    // In this case, TextFragmentDataAtStartRef().EndRef().Offset() is not
    // meaningful.
    return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                        *TextFragmentDataAtStartRef().GetEndReasonContent(),
                        TextFragmentDataAtStartRef().EndRawReason());
  }
  if (NS_WARN_IF(!TextFragmentDataAtStartRef().EndRef().IsSet())) {
    return WSScanResult::Error();
  }
  return WSScanResult(*this, WSScanResult::ScanDirection::Forward,
                      TextFragmentDataAtStartRef().EndRef(),
                      TextFragmentDataAtStartRef().EndRawReason());
}

// static
template <typename EditorDOMPointType>
EditorDOMPointType WSRunScanner::GetAfterLastVisiblePoint(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    Text& aTextNode, const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  EditorDOMPoint atLastCharOfTextNode(
      &aTextNode, AssertedCast<uint32_t>(std::max<int64_t>(
                      static_cast<int64_t>(aTextNode.Length()) - 1, 0)));
  if (!atLastCharOfTextNode.IsContainerEmpty() &&
      !atLastCharOfTextNode.IsCharCollapsibleASCIISpace()) {
    return EditorDOMPointType::AtEndOf(aTextNode);
  }
  const TextFragmentData textFragmentData(aOptions, atLastCharOfTextNode,
                                          aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentData.IsInitialized())) {
    return EditorDOMPointType();  // TODO: Make here return error with Err.
  }
  const EditorDOMRange& invisibleWhiteSpaceRange =
      textFragmentData.InvisibleTrailingWhiteSpaceRangeRef();
  if (!invisibleWhiteSpaceRange.IsPositioned() ||
      invisibleWhiteSpaceRange.Collapsed()) {
    return EditorDOMPointType::AtEndOf(aTextNode);
  }
  return invisibleWhiteSpaceRange.StartRef().To<EditorDOMPointType>();
}

// static
template <typename EditorDOMPointType>
EditorDOMPointType WSRunScanner::GetFirstVisiblePoint(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    Text& aTextNode, const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  EditorDOMPoint atStartOfTextNode(&aTextNode, 0);
  if (!atStartOfTextNode.IsContainerEmpty() &&
      !atStartOfTextNode.IsCharCollapsibleASCIISpace()) {
    return atStartOfTextNode.To<EditorDOMPointType>();
  }
  const TextFragmentData textFragmentData(aOptions, atStartOfTextNode,
                                          aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentData.IsInitialized())) {
    return EditorDOMPointType();  // TODO: Make here return error with Err.
  }
  const EditorDOMRange& invisibleWhiteSpaceRange =
      textFragmentData.InvisibleLeadingWhiteSpaceRangeRef();
  if (!invisibleWhiteSpaceRange.IsPositioned() ||
      invisibleWhiteSpaceRange.Collapsed()) {
    return atStartOfTextNode.To<EditorDOMPointType>();
  }
  return invisibleWhiteSpaceRange.EndRef().To<EditorDOMPointType>();
}

/*****************************************************************************
 * Implementation for new white-space normalizer
 *****************************************************************************/

// static
EditorDOMRangeInTexts
WSRunScanner::ComputeRangeInTextNodesContainingInvisibleWhiteSpaces(
    const TextFragmentData& aStart, const TextFragmentData& aEnd) {
  MOZ_ASSERT(aStart.ScanOptions() == aEnd.ScanOptions());

  // Corresponding to handling invisible white-spaces part of
  // `TextFragmentData::GetReplaceRangeDataAtEndOfDeletionRange()` and
  // `TextFragmentData::GetReplaceRangeDataAtStartOfDeletionRange()`

  MOZ_ASSERT(aStart.ScanStartRef().IsSetAndValid());
  MOZ_ASSERT(aEnd.ScanStartRef().IsSetAndValid());
  MOZ_ASSERT(aStart.ScanStartRef().EqualsOrIsBefore(aEnd.ScanStartRef()));
  MOZ_ASSERT(aStart.ScanStartRef().IsInTextNode());
  MOZ_ASSERT(aEnd.ScanStartRef().IsInTextNode());

  // XXX `GetReplaceRangeDataAtEndOfDeletionRange()` and
  //     `GetReplaceRangeDataAtStartOfDeletionRange()` use
  //     `GetNewInvisibleLeadingWhiteSpaceRangeIfSplittingAt()` and
  //     `GetNewInvisibleTrailingWhiteSpaceRangeIfSplittingAt()`.
  //     However, they are really odd as mentioned with "XXX" comments
  //     in them.  For the new white-space normalizer, we need to treat
  //     invisible white-spaces stricter because the legacy path handles
  //     white-spaces multiple times (e.g., calling `HTMLEditor::
  //     DeleteNodeIfInvisibleAndEditableTextNode()` later) and that hides
  //     the bug, but in the new path, we should stop doing same things
  //     multiple times for both performance and footprint.  Therefore,
  //     even though the result might be different in some edge cases,
  //     we should use clean path for now.  Perhaps, we should fix the odd
  //     cases before shipping `beforeinput` event in release channel.

  const EditorDOMRange& invisibleLeadingWhiteSpaceRange =
      aStart.InvisibleLeadingWhiteSpaceRangeRef();
  const EditorDOMRange& invisibleTrailingWhiteSpaceRange =
      aEnd.InvisibleTrailingWhiteSpaceRangeRef();
  const bool hasInvisibleLeadingWhiteSpaces =
      invisibleLeadingWhiteSpaceRange.IsPositioned() &&
      !invisibleLeadingWhiteSpaceRange.Collapsed();
  const bool hasInvisibleTrailingWhiteSpaces =
      invisibleLeadingWhiteSpaceRange != invisibleTrailingWhiteSpaceRange &&
      invisibleTrailingWhiteSpaceRange.IsPositioned() &&
      !invisibleTrailingWhiteSpaceRange.Collapsed();

  EditorDOMRangeInTexts result(aStart.ScanStartRef().AsInText(),
                               aEnd.ScanStartRef().AsInText());
  MOZ_ASSERT(result.IsPositionedAndValid());
  if (!hasInvisibleLeadingWhiteSpaces && !hasInvisibleTrailingWhiteSpaces) {
    return result;
  }

  MOZ_ASSERT_IF(
      hasInvisibleLeadingWhiteSpaces && hasInvisibleTrailingWhiteSpaces,
      invisibleLeadingWhiteSpaceRange.StartRef().IsBefore(
          invisibleTrailingWhiteSpaceRange.StartRef()));
  const EditorDOMPoint& aroundFirstInvisibleWhiteSpace =
      hasInvisibleLeadingWhiteSpaces
          ? invisibleLeadingWhiteSpaceRange.StartRef()
          : invisibleTrailingWhiteSpaceRange.StartRef();
  if (aroundFirstInvisibleWhiteSpace.IsBefore(result.StartRef())) {
    if (aroundFirstInvisibleWhiteSpace.IsInTextNode()) {
      result.SetStart(aroundFirstInvisibleWhiteSpace.AsInText());
      MOZ_ASSERT(result.IsPositionedAndValid());
    } else {
      const auto atFirstInvisibleWhiteSpace =
          hasInvisibleLeadingWhiteSpaces
              ? aStart.GetInclusiveNextCharPoint<EditorDOMPointInText>(
                    aroundFirstInvisibleWhiteSpace,
                    ShouldIgnoreNonEditableSiblingsOrDescendants(
                        aStart.ScanOptions()))
              : aEnd.GetInclusiveNextCharPoint<EditorDOMPointInText>(
                    aroundFirstInvisibleWhiteSpace,
                    ShouldIgnoreNonEditableSiblingsOrDescendants(
                        aEnd.ScanOptions()));
      MOZ_ASSERT(atFirstInvisibleWhiteSpace.IsSet());
      MOZ_ASSERT(
          atFirstInvisibleWhiteSpace.EqualsOrIsBefore(result.StartRef()));
      result.SetStart(atFirstInvisibleWhiteSpace);
      MOZ_ASSERT(result.IsPositionedAndValid());
    }
  }
  MOZ_ASSERT_IF(
      hasInvisibleLeadingWhiteSpaces && hasInvisibleTrailingWhiteSpaces,
      invisibleLeadingWhiteSpaceRange.EndRef().IsBefore(
          invisibleTrailingWhiteSpaceRange.EndRef()));
  const EditorDOMPoint& afterLastInvisibleWhiteSpace =
      hasInvisibleTrailingWhiteSpaces
          ? invisibleTrailingWhiteSpaceRange.EndRef()
          : invisibleLeadingWhiteSpaceRange.EndRef();
  if (afterLastInvisibleWhiteSpace.EqualsOrIsBefore(result.EndRef())) {
    MOZ_ASSERT(result.IsPositionedAndValid());
    return result;
  }
  if (afterLastInvisibleWhiteSpace.IsInTextNode()) {
    result.SetEnd(afterLastInvisibleWhiteSpace.AsInText());
    MOZ_ASSERT(result.IsPositionedAndValid());
    return result;
  }
  const auto atLastInvisibleWhiteSpace =
      hasInvisibleTrailingWhiteSpaces
          ? aEnd.GetPreviousCharPoint<EditorDOMPointInText>(
                afterLastInvisibleWhiteSpace,
                ShouldIgnoreNonEditableSiblingsOrDescendants(
                    aEnd.ScanOptions()))
          : aStart.GetPreviousCharPoint<EditorDOMPointInText>(
                afterLastInvisibleWhiteSpace,
                ShouldIgnoreNonEditableSiblingsOrDescendants(
                    aStart.ScanOptions()));
  MOZ_ASSERT(atLastInvisibleWhiteSpace.IsSet());
  MOZ_ASSERT(atLastInvisibleWhiteSpace.IsContainerEmpty() ||
             atLastInvisibleWhiteSpace.IsAtLastContent());
  MOZ_ASSERT(result.EndRef().EqualsOrIsBefore(atLastInvisibleWhiteSpace));
  result.SetEnd(atLastInvisibleWhiteSpace.IsEndOfContainer()
                    ? atLastInvisibleWhiteSpace
                    : atLastInvisibleWhiteSpace.NextPoint());
  MOZ_ASSERT(result.IsPositionedAndValid());
  return result;
}

// static
Result<EditorDOMRangeInTexts, nsresult>
WSRunScanner::GetRangeInTextNodesToBackspaceFrom(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    const EditorDOMPoint& aPoint,
    const Element* aAncestorLimiter /* = nullptr */) {
  // Corresponding to computing delete range part of
  // `WhiteSpaceVisibilityKeeper::DeletePreviousWhiteSpace()`
  MOZ_ASSERT(aPoint.IsSetAndValid());
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  const TextFragmentData textFragmentDataAtCaret(aOptions, aPoint,
                                                 aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtCaret.IsInitialized())) {
    return Err(NS_ERROR_FAILURE);
  }
  auto atPreviousChar =
      textFragmentDataAtCaret.GetPreviousCharPoint<EditorDOMPointInText>(
          aPoint, ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
  if (!atPreviousChar.IsSet()) {
    return EditorDOMRangeInTexts();  // There is no content in the block.
  }

  // XXX When previous char point is in an empty text node, we do nothing,
  //     but this must look odd from point of user view.  We should delete
  //     something before aPoint.
  if (atPreviousChar.IsEndOfContainer()) {
    return EditorDOMRangeInTexts();
  }

  // Extend delete range if previous char is a low surrogate following
  // a high surrogate.
  EditorDOMPointInText atNextChar = atPreviousChar.NextPoint();
  if (!atPreviousChar.IsStartOfContainer()) {
    if (atPreviousChar.IsCharLowSurrogateFollowingHighSurrogate()) {
      atPreviousChar = atPreviousChar.PreviousPoint();
    }
    // If caret is in middle of a surrogate pair, delete the surrogate pair
    // (blink-compat).
    else if (atPreviousChar.IsCharHighSurrogateFollowedByLowSurrogate()) {
      atNextChar = atNextChar.NextPoint();
    }
  }

  // If previous char is an collapsible white-spaces, delete all adjacent
  // white-spaces which are collapsed together.
  EditorDOMRangeInTexts rangeToDelete;
  if (atPreviousChar.IsCharCollapsibleASCIISpace() ||
      atPreviousChar.IsCharPreformattedNewLineCollapsedWithWhiteSpaces()) {
    const auto startToDelete =
        textFragmentDataAtCaret
            .GetFirstASCIIWhiteSpacePointCollapsedTo<EditorDOMPointInText>(
                atPreviousChar, nsIEditor::ePrevious,
                ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
    if (!startToDelete.IsSet()) {
      NS_WARNING(
          "WSRunScanner::GetFirstASCIIWhiteSpacePointCollapsedTo() failed");
      return Err(NS_ERROR_FAILURE);
    }
    const auto endToDelete =
        textFragmentDataAtCaret
            .GetEndOfCollapsibleASCIIWhiteSpaces<EditorDOMPointInText>(
                atPreviousChar, nsIEditor::ePrevious,
                ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
    if (!endToDelete.IsSet()) {
      NS_WARNING("WSRunScanner::GetEndOfCollapsibleASCIIWhiteSpaces() failed");
      return Err(NS_ERROR_FAILURE);
    }
    rangeToDelete = EditorDOMRangeInTexts(startToDelete, endToDelete);
  }
  // if previous char is not a collapsible white-space, remove it.
  else {
    rangeToDelete = EditorDOMRangeInTexts(atPreviousChar, atNextChar);
  }

  // If there is no removable and visible content, we should do nothing.
  if (rangeToDelete.Collapsed()) {
    return EditorDOMRangeInTexts();
  }

  // And also delete invisible white-spaces if they become visible.
  const TextFragmentData textFragmentDataAtStart =
      rangeToDelete.StartRef() != aPoint
          ? TextFragmentData(aOptions, rangeToDelete.StartRef(),
                             aAncestorLimiter)
          : textFragmentDataAtCaret;
  const TextFragmentData textFragmentDataAtEnd =
      rangeToDelete.EndRef() != aPoint
          ? TextFragmentData(aOptions, rangeToDelete.EndRef(), aAncestorLimiter)
          : textFragmentDataAtCaret;
  if (NS_WARN_IF(!textFragmentDataAtStart.IsInitialized()) ||
      NS_WARN_IF(!textFragmentDataAtEnd.IsInitialized())) {
    return Err(NS_ERROR_FAILURE);
  }
  EditorDOMRangeInTexts extendedRangeToDelete =
      WSRunScanner::ComputeRangeInTextNodesContainingInvisibleWhiteSpaces(
          textFragmentDataAtStart, textFragmentDataAtEnd);
  MOZ_ASSERT(extendedRangeToDelete.IsPositionedAndValid());
  return extendedRangeToDelete.IsPositioned() ? extendedRangeToDelete
                                              : rangeToDelete;
}

// static
Result<EditorDOMRangeInTexts, nsresult>
WSRunScanner::GetRangeInTextNodesToForwardDeleteFrom(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    const EditorDOMPoint& aPoint,
    const Element* aAncestorLimiter /* = nullptr */) {
  // Corresponding to computing delete range part of
  // `WhiteSpaceVisibilityKeeper::DeleteInclusiveNextWhiteSpace()`
  MOZ_ASSERT(aPoint.IsSetAndValid());
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  const TextFragmentData textFragmentDataAtCaret(aOptions, aPoint,
                                                 aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtCaret.IsInitialized())) {
    return Err(NS_ERROR_FAILURE);
  }
  auto atCaret =
      textFragmentDataAtCaret.GetInclusiveNextCharPoint<EditorDOMPointInText>(
          aPoint, ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
  if (!atCaret.IsSet()) {
    return EditorDOMRangeInTexts();  // There is no content in the block.
  }
  // If caret is in middle of a surrogate pair, we should remove next
  // character (blink-compat).
  if (!atCaret.IsEndOfContainer() &&
      atCaret.IsCharLowSurrogateFollowingHighSurrogate()) {
    atCaret = atCaret.NextPoint();
  }

  // XXX When next char point is in an empty text node, we do nothing,
  //     but this must look odd from point of user view.  We should delete
  //     something after aPoint.
  if (atCaret.IsEndOfContainer()) {
    return EditorDOMRangeInTexts();
  }

  // Extend delete range if previous char is a low surrogate following
  // a high surrogate.
  EditorDOMPointInText atNextChar = atCaret.NextPoint();
  if (atCaret.IsCharHighSurrogateFollowedByLowSurrogate()) {
    atNextChar = atNextChar.NextPoint();
  }

  // If next char is a collapsible white-space, delete all adjacent white-spaces
  // which are collapsed together.
  EditorDOMRangeInTexts rangeToDelete;
  if (atCaret.IsCharCollapsibleASCIISpace() ||
      atCaret.IsCharPreformattedNewLineCollapsedWithWhiteSpaces()) {
    const auto startToDelete =
        textFragmentDataAtCaret
            .GetFirstASCIIWhiteSpacePointCollapsedTo<EditorDOMPointInText>(
                atCaret, nsIEditor::eNext,
                ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
    if (!startToDelete.IsSet()) {
      NS_WARNING(
          "WSRunScanner::GetFirstASCIIWhiteSpacePointCollapsedTo() failed");
      return Err(NS_ERROR_FAILURE);
    }
    const EditorDOMPointInText endToDelete =
        textFragmentDataAtCaret
            .GetEndOfCollapsibleASCIIWhiteSpaces<EditorDOMPointInText>(
                atCaret, nsIEditor::eNext,
                ShouldIgnoreNonEditableSiblingsOrDescendants(aOptions));
    if (!endToDelete.IsSet()) {
      NS_WARNING("WSRunScanner::GetEndOfCollapsibleASCIIWhiteSpaces() failed");
      return Err(NS_ERROR_FAILURE);
    }
    rangeToDelete = EditorDOMRangeInTexts(startToDelete, endToDelete);
  }
  // if next char is not a collapsible white-space, remove it.
  else {
    rangeToDelete = EditorDOMRangeInTexts(atCaret, atNextChar);
  }

  // If there is no removable and visible content, we should do nothing.
  if (rangeToDelete.Collapsed()) {
    return EditorDOMRangeInTexts();
  }

  // And also delete invisible white-spaces if they become visible.
  const TextFragmentData textFragmentDataAtStart =
      rangeToDelete.StartRef() != aPoint
          ? TextFragmentData(aOptions, rangeToDelete.StartRef(),
                             aAncestorLimiter)
          : textFragmentDataAtCaret;
  const TextFragmentData textFragmentDataAtEnd =
      rangeToDelete.EndRef() != aPoint
          ? TextFragmentData(aOptions, rangeToDelete.EndRef(), aAncestorLimiter)
          : textFragmentDataAtCaret;
  if (NS_WARN_IF(!textFragmentDataAtStart.IsInitialized()) ||
      NS_WARN_IF(!textFragmentDataAtEnd.IsInitialized())) {
    return Err(NS_ERROR_FAILURE);
  }
  EditorDOMRangeInTexts extendedRangeToDelete =
      WSRunScanner::ComputeRangeInTextNodesContainingInvisibleWhiteSpaces(
          textFragmentDataAtStart, textFragmentDataAtEnd);
  MOZ_ASSERT(extendedRangeToDelete.IsPositionedAndValid());
  return extendedRangeToDelete.IsPositioned() ? extendedRangeToDelete
                                              : rangeToDelete;
}

// static
EditorDOMRange WSRunScanner::GetRangesForDeletingAtomicContent(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    const nsIContent& aAtomicContent,
    const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  if (aAtomicContent.IsHTMLElement(nsGkAtoms::br)) {
    // Preceding white-spaces should be preserved, but the following
    // white-spaces should be invisible around `<br>` element.
    const TextFragmentData textFragmentDataAfterBRElement(
        aOptions, EditorDOMPoint::After(aAtomicContent), aAncestorLimiter);
    if (NS_WARN_IF(!textFragmentDataAfterBRElement.IsInitialized())) {
      return EditorDOMRange();  // TODO: Make here return error with Err.
    }
    const EditorDOMRangeInTexts followingInvisibleWhiteSpaces =
        textFragmentDataAfterBRElement.GetNonCollapsedRangeInTexts(
            textFragmentDataAfterBRElement
                .InvisibleLeadingWhiteSpaceRangeRef());
    return followingInvisibleWhiteSpaces.IsPositioned() &&
                   !followingInvisibleWhiteSpaces.Collapsed()
               ? EditorDOMRange(
                     EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
                     followingInvisibleWhiteSpaces.EndRef())
               : EditorDOMRange(
                     EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
                     EditorDOMPoint::After(aAtomicContent));
  }

  if (!HTMLEditUtils::IsBlockElement(
          aAtomicContent, BlockInlineCheck::UseComputedDisplayOutsideStyle)) {
    // Both preceding and following white-spaces around it should be preserved
    // around inline elements like `<img>`.
    return EditorDOMRange(
        EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
        EditorDOMPoint::After(aAtomicContent));
  }

  // Both preceding and following white-spaces can be invisible around a
  // block element.
  const TextFragmentData textFragmentDataBeforeAtomicContent(
      aOptions, EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
      aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataBeforeAtomicContent.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  const EditorDOMRangeInTexts precedingInvisibleWhiteSpaces =
      textFragmentDataBeforeAtomicContent.GetNonCollapsedRangeInTexts(
          textFragmentDataBeforeAtomicContent
              .InvisibleTrailingWhiteSpaceRangeRef());
  const TextFragmentData textFragmentDataAfterAtomicContent(
      aOptions, EditorDOMPoint::After(aAtomicContent), aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAfterAtomicContent.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  const EditorDOMRangeInTexts followingInvisibleWhiteSpaces =
      textFragmentDataAfterAtomicContent.GetNonCollapsedRangeInTexts(
          textFragmentDataAfterAtomicContent
              .InvisibleLeadingWhiteSpaceRangeRef());
  if (precedingInvisibleWhiteSpaces.StartRef().IsSet() &&
      followingInvisibleWhiteSpaces.EndRef().IsSet()) {
    return EditorDOMRange(precedingInvisibleWhiteSpaces.StartRef(),
                          followingInvisibleWhiteSpaces.EndRef());
  }
  if (precedingInvisibleWhiteSpaces.StartRef().IsSet()) {
    return EditorDOMRange(precedingInvisibleWhiteSpaces.StartRef(),
                          EditorDOMPoint::After(aAtomicContent));
  }
  if (followingInvisibleWhiteSpaces.EndRef().IsSet()) {
    return EditorDOMRange(
        EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
        followingInvisibleWhiteSpaces.EndRef());
  }
  return EditorDOMRange(
      EditorDOMPoint(const_cast<nsIContent*>(&aAtomicContent)),
      EditorDOMPoint::After(aAtomicContent));
}

// static
EditorDOMRange WSRunScanner::GetRangeForDeletingBlockElementBoundaries(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    const Element& aLeftBlockElement, const Element& aRightBlockElement,
    const EditorDOMPoint& aPointContainingTheOtherBlock,
    const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(&aLeftBlockElement != &aRightBlockElement);
  MOZ_ASSERT_IF(
      aPointContainingTheOtherBlock.IsSet(),
      aPointContainingTheOtherBlock.GetContainer() == &aLeftBlockElement ||
          aPointContainingTheOtherBlock.GetContainer() == &aRightBlockElement);
  MOZ_ASSERT_IF(
      aPointContainingTheOtherBlock.GetContainer() == &aLeftBlockElement,
      aRightBlockElement.IsInclusiveDescendantOf(
          aPointContainingTheOtherBlock.GetChild()));
  MOZ_ASSERT_IF(
      aPointContainingTheOtherBlock.GetContainer() == &aRightBlockElement,
      aLeftBlockElement.IsInclusiveDescendantOf(
          aPointContainingTheOtherBlock.GetChild()));
  MOZ_ASSERT_IF(
      !aPointContainingTheOtherBlock.IsSet(),
      !aRightBlockElement.IsInclusiveDescendantOf(&aLeftBlockElement));
  MOZ_ASSERT_IF(
      !aPointContainingTheOtherBlock.IsSet(),
      !aLeftBlockElement.IsInclusiveDescendantOf(&aRightBlockElement));
  MOZ_ASSERT_IF(!aPointContainingTheOtherBlock.IsSet(),
                EditorRawDOMPoint(const_cast<Element*>(&aLeftBlockElement))
                    .IsBefore(EditorRawDOMPoint(
                        const_cast<Element*>(&aRightBlockElement))));
  MOZ_ASSERT_IF(aAncestorLimiter,
                aLeftBlockElement.IsInclusiveDescendantOf(aAncestorLimiter));
  MOZ_ASSERT_IF(aAncestorLimiter,
                aRightBlockElement.IsInclusiveDescendantOf(aAncestorLimiter));
  MOZ_ASSERT_IF(aOptions.contains(Option::OnlyEditableNodes),
                const_cast<Element&>(aLeftBlockElement).GetEditingHost() ==
                    const_cast<Element&>(aRightBlockElement).GetEditingHost());
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  EditorDOMRange range;
  // Include trailing invisible white-spaces in aLeftBlockElement.
  const TextFragmentData textFragmentDataAtEndOfLeftBlockElement(
      aOptions,
      aPointContainingTheOtherBlock.GetContainer() == &aLeftBlockElement
          ? aPointContainingTheOtherBlock
          : EditorDOMPoint::AtEndOf(const_cast<Element&>(aLeftBlockElement)),
      aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtEndOfLeftBlockElement.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  if (textFragmentDataAtEndOfLeftBlockElement.StartsFromInvisibleBRElement()) {
    // If the left block element ends with an invisible `<br>` element,
    // it'll be deleted (and it means there is no invisible trailing
    // white-spaces).  Therefore, the range should start from the invisible
    // `<br>` element.
    range.SetStart(EditorDOMPoint(
        textFragmentDataAtEndOfLeftBlockElement.StartReasonBRElementPtr()));
  } else {
    const EditorDOMRange& trailingWhiteSpaceRange =
        textFragmentDataAtEndOfLeftBlockElement
            .InvisibleTrailingWhiteSpaceRangeRef();
    if (trailingWhiteSpaceRange.StartRef().IsSet()) {
      range.SetStart(trailingWhiteSpaceRange.StartRef());
    } else {
      range.SetStart(textFragmentDataAtEndOfLeftBlockElement.ScanStartRef());
    }
  }
  // Include leading invisible white-spaces in aRightBlockElement.
  const TextFragmentData textFragmentDataAtStartOfRightBlockElement(
      aOptions,
      aPointContainingTheOtherBlock.GetContainer() == &aRightBlockElement &&
              !aPointContainingTheOtherBlock.IsEndOfContainer()
          ? aPointContainingTheOtherBlock.NextPoint()
          : EditorDOMPoint(const_cast<Element*>(&aRightBlockElement), 0u),
      aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtStartOfRightBlockElement.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  const EditorDOMRange& leadingWhiteSpaceRange =
      textFragmentDataAtStartOfRightBlockElement
          .InvisibleLeadingWhiteSpaceRangeRef();
  if (leadingWhiteSpaceRange.EndRef().IsSet()) {
    range.SetEnd(leadingWhiteSpaceRange.EndRef());
  } else {
    range.SetEnd(textFragmentDataAtStartOfRightBlockElement.ScanStartRef());
  }
  return range;
}

// static
EditorDOMRange
WSRunScanner::GetRangeContainingInvisibleWhiteSpacesAtRangeBoundaries(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    const EditorDOMRange& aRange,
    const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(aRange.IsPositionedAndValid());
  MOZ_ASSERT(aRange.EndRef().IsSetAndValid());
  MOZ_ASSERT(aRange.StartRef().IsSetAndValid());
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  EditorDOMRange result;
  const TextFragmentData textFragmentDataAtStart(aOptions, aRange.StartRef(),
                                                 aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtStart.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  const EditorDOMRangeInTexts invisibleLeadingWhiteSpacesAtStart =
      textFragmentDataAtStart.GetNonCollapsedRangeInTexts(
          textFragmentDataAtStart.InvisibleLeadingWhiteSpaceRangeRef());
  if (invisibleLeadingWhiteSpacesAtStart.IsPositioned() &&
      !invisibleLeadingWhiteSpacesAtStart.Collapsed()) {
    result.SetStart(invisibleLeadingWhiteSpacesAtStart.StartRef());
  } else {
    const EditorDOMRangeInTexts invisibleTrailingWhiteSpacesAtStart =
        textFragmentDataAtStart.GetNonCollapsedRangeInTexts(
            textFragmentDataAtStart.InvisibleTrailingWhiteSpaceRangeRef());
    if (invisibleTrailingWhiteSpacesAtStart.IsPositioned() &&
        !invisibleTrailingWhiteSpacesAtStart.Collapsed()) {
      MOZ_ASSERT(
          invisibleTrailingWhiteSpacesAtStart.StartRef().EqualsOrIsBefore(
              aRange.StartRef()));
      result.SetStart(invisibleTrailingWhiteSpacesAtStart.StartRef());
    }
    // If there is no invisible white-space and the line starts with a
    // text node, shrink the range to start of the text node.
    else if (!aRange.StartRef().IsInTextNode() &&
             (textFragmentDataAtStart.StartsFromBlockBoundary() ||
              textFragmentDataAtStart.StartsFromInlineEditingHostBoundary()) &&
             textFragmentDataAtStart.EndRef().IsInTextNode()) {
      result.SetStart(textFragmentDataAtStart.EndRef());
    }
  }
  if (!result.StartRef().IsSet()) {
    result.SetStart(aRange.StartRef());
  }

  const TextFragmentData textFragmentDataAtEnd(aOptions, aRange.EndRef(),
                                               aAncestorLimiter);
  if (NS_WARN_IF(!textFragmentDataAtEnd.IsInitialized())) {
    return EditorDOMRange();  // TODO: Make here return error with Err.
  }
  const EditorDOMRangeInTexts invisibleLeadingWhiteSpacesAtEnd =
      textFragmentDataAtEnd.GetNonCollapsedRangeInTexts(
          textFragmentDataAtEnd.InvisibleTrailingWhiteSpaceRangeRef());
  if (invisibleLeadingWhiteSpacesAtEnd.IsPositioned() &&
      !invisibleLeadingWhiteSpacesAtEnd.Collapsed()) {
    result.SetEnd(invisibleLeadingWhiteSpacesAtEnd.EndRef());
  } else {
    const EditorDOMRangeInTexts invisibleLeadingWhiteSpacesAtEnd =
        textFragmentDataAtEnd.GetNonCollapsedRangeInTexts(
            textFragmentDataAtEnd.InvisibleLeadingWhiteSpaceRangeRef());
    if (invisibleLeadingWhiteSpacesAtEnd.IsPositioned() &&
        !invisibleLeadingWhiteSpacesAtEnd.Collapsed()) {
      MOZ_ASSERT(aRange.EndRef().EqualsOrIsBefore(
          invisibleLeadingWhiteSpacesAtEnd.EndRef()));
      result.SetEnd(invisibleLeadingWhiteSpacesAtEnd.EndRef());
    }
    // If there is no invisible white-space and the line ends with a text
    // node, shrink the range to end of the text node.
    else if (!aRange.EndRef().IsInTextNode() &&
             (textFragmentDataAtEnd.EndsByBlockBoundary() ||
              textFragmentDataAtEnd.EndsByInlineEditingHostBoundary()) &&
             textFragmentDataAtEnd.StartRef().IsInTextNode()) {
      result.SetEnd(EditorDOMPoint::AtEndOf(
          *textFragmentDataAtEnd.StartRef().ContainerAs<Text>()));
    }
  }
  if (!result.EndRef().IsSet()) {
    result.SetEnd(aRange.EndRef());
  }
  MOZ_ASSERT(result.IsPositionedAndValid());
  return result;
}

/******************************************************************************
 * Utilities for other things.
 ******************************************************************************/

// static
Result<bool, nsresult>
WSRunScanner::ShrinkRangeIfStartsFromOrEndsAfterAtomicContent(
    Options aOptions,  // NOLINT(performance-unnecessary-value-param)
    nsRange& aRange, const Element* aAncestorLimiter /* = nullptr */) {
  MOZ_ASSERT(aRange.IsPositioned());
  MOZ_ASSERT(!aRange.IsInAnySelection(),
             "Changing range in selection may cause running script");
  MOZ_ASSERT(!aOptions.contains(Option::ReferHTMLDefaultStyle));

  if (NS_WARN_IF(!aRange.GetStartContainer()) ||
      NS_WARN_IF(!aRange.GetEndContainer())) {
    return Err(NS_ERROR_FAILURE);
  }

  if (!aRange.GetStartContainer()->IsContent() ||
      !aRange.GetEndContainer()->IsContent()) {
    return false;
  }

  // If the range crosses a block boundary, we should do nothing for now
  // because it hits a bug of inserting a padding `<br>` element after
  // joining the blocks.
  if (HTMLEditUtils::GetInclusiveAncestorElement(
          *aRange.GetStartContainer()->AsContent(),
          aOptions.contains(Option::OnlyEditableNodes)
              ? HTMLEditUtils::ClosestEditableBlockElementExceptHRElement
              : HTMLEditUtils::ClosestBlockElementExceptHRElement,
          BlockInlineCheck::UseComputedDisplayStyle) !=
      HTMLEditUtils::GetInclusiveAncestorElement(
          *aRange.GetEndContainer()->AsContent(),
          aOptions.contains(Option::OnlyEditableNodes)
              ? HTMLEditUtils::ClosestEditableBlockElementExceptHRElement
              : HTMLEditUtils::ClosestBlockElementExceptHRElement,
          BlockInlineCheck::UseComputedDisplayStyle)) {
    return false;
  }

  nsIContent* startContent = nullptr;
  if (aRange.GetStartContainer() && aRange.GetStartContainer()->IsText() &&
      aRange.GetStartContainer()->AsText()->Length() == aRange.StartOffset()) {
    // If next content is a visible `<br>` element, special inline content
    // (e.g., `<img>`, non-editable text node, etc) or a block level void
    // element like `<hr>`, the range should start with it.
    const TextFragmentData textFragmentDataAtStart(
        aOptions, EditorRawDOMPoint(aRange.StartRef()), aAncestorLimiter);
    if (NS_WARN_IF(!textFragmentDataAtStart.IsInitialized())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (textFragmentDataAtStart.EndsByVisibleBRElement()) {
      startContent = textFragmentDataAtStart.EndReasonBRElementPtr();
    } else if (textFragmentDataAtStart.EndsBySpecialContent() ||
               textFragmentDataAtStart.EndsByEmptyInlineContainerElement() ||
               (textFragmentDataAtStart.EndsByOtherBlockElement() &&
                !HTMLEditUtils::IsContainerNode(
                    *textFragmentDataAtStart
                         .EndReasonOtherBlockElementPtr()))) {
      startContent = textFragmentDataAtStart.GetEndReasonContent();
    }
  }

  nsIContent* endContent = nullptr;
  if (aRange.GetEndContainer() && aRange.GetEndContainer()->IsText() &&
      !aRange.EndOffset()) {
    // If previous content is a visible `<br>` element, special inline content
    // (e.g., `<img>`, non-editable text node, etc) or a block level void
    // element like `<hr>`, the range should end after it.
    const TextFragmentData textFragmentDataAtEnd(
        aOptions, EditorRawDOMPoint(aRange.EndRef()), aAncestorLimiter);
    if (NS_WARN_IF(!textFragmentDataAtEnd.IsInitialized())) {
      return Err(NS_ERROR_FAILURE);
    }
    if (textFragmentDataAtEnd.StartsFromVisibleBRElement()) {
      endContent = textFragmentDataAtEnd.StartReasonBRElementPtr();
    } else if (textFragmentDataAtEnd.StartsFromSpecialContent() ||
               textFragmentDataAtEnd.EndsByEmptyInlineContainerElement() ||
               (textFragmentDataAtEnd.StartsFromOtherBlockElement() &&
                !HTMLEditUtils::IsContainerNode(
                    *textFragmentDataAtEnd
                         .StartReasonOtherBlockElementPtr()))) {
      endContent = textFragmentDataAtEnd.GetStartReasonContent();
    }
  }

  if (!startContent && !endContent) {
    return false;
  }

  nsresult rv = aRange.SetStartAndEnd(
      startContent ? RangeBoundary::FromChild(*startContent)
                   : aRange.StartRef(),
      endContent ? RangeBoundary::After(*endContent) : aRange.EndRef());
  if (NS_FAILED(rv)) {
    NS_WARNING("nsRange::SetStartAndEnd() failed");
    return Err(rv);
  }
  return true;
}

}  // namespace mozilla

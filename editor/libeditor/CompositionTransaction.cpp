/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CompositionTransaction.h"

#include "mozilla/EditorBase.h"  // mEditorBase
#include "mozilla/Logging.h"
#include "mozilla/SelectionState.h"   // RangeUpdater
#include "mozilla/TextComposition.h"  // TextComposition
#include "mozilla/TextEditor.h"       // TextEditor
#include "mozilla/ToString.h"
#include "mozilla/dom/Selection.h"   // local var
#include "mozilla/dom/Text.h"        // mTextNode
#include "nsAString.h"               // params
#include "nsDebug.h"                 // for NS_ASSERTION, etc
#include "nsError.h"                 // for NS_SUCCEEDED, NS_FAILED, etc
#include "nsRange.h"                 // local var
#include "nsISelectionController.h"  // for nsISelectionController constants
#include "nsQueryObject.h"           // for do_QueryObject

namespace mozilla {

using namespace dom;

// static
already_AddRefed<CompositionTransaction> CompositionTransaction::Create(
    EditorBase& aEditorBase, const nsAString& aStringToInsert,
    const EditorDOMPointInText& aPointToInsert) {
  MOZ_ASSERT(aPointToInsert.IsSetAndValid());

  TextComposition* composition = aEditorBase.GetComposition();
  MOZ_RELEASE_ASSERT(composition);
  // XXX Actually, we get different text node and offset from editor in some
  //     cases.  If composition stores text node, we should use it and offset
  //     in it.
  EditorDOMPointInText pointToInsert;
  if (Text* textNode = composition->GetContainerTextNode()) {
    pointToInsert.Set(textNode, composition->ClampedStartOffsetInTextNode());
  } else {
    pointToInsert = aPointToInsert;
  }
  RefPtr<CompositionTransaction> transaction =
      aEditorBase.IsTextEditor()
          ? new CompositionTransaction(aEditorBase, aStringToInsert,
                                       pointToInsert)
          : new CompositionInTextNodeTransaction(aEditorBase, aStringToInsert,
                                                 pointToInsert);
  return transaction.forget();
}

CompositionTransaction::CompositionTransaction(
    EditorBase& aEditorBase, const nsAString& aStringToInsert,
    const EditorDOMPointInText& aPointToInsert)
    : mOffset(aPointToInsert.Offset()),
      mReplaceOffset(
          aEditorBase.GetComposition()->StartOffsetMaybeInFollowingTextNode()),
      mReplaceLength(
          aEditorBase.GetComposition()->LengthMaybeInFollowingTextNode()),
      mRanges(aEditorBase.GetComposition()->GetRanges()),
      mStringToInsert(aStringToInsert),
      mEditorBase(&aEditorBase),
      mFixed(false) {
  MOZ_ASSERT(aPointToInsert.ContainerAs<Text>()->TextDataLength() >= mOffset);
}

std::ostream& operator<<(std::ostream& aStream,
                         const CompositionTransaction& aTransaction) {
  const auto* transactionForHTMLEditor =
      aTransaction.GetAsCompositionInTextNodeTransaction();
  if (transactionForHTMLEditor) {
    return aStream << *transactionForHTMLEditor;
  }
  aStream << "{ mOffset=" << aTransaction.mOffset
          << ", mReplaceLength=" << aTransaction.mReplaceLength
          << ", mRanges={ Length()=" << aTransaction.mRanges->Length() << " }"
          << ", mStringToInsert=\""
          << NS_ConvertUTF16toUTF8(aTransaction.mStringToInsert).get() << "\""
          << ", mEditorBase=" << aTransaction.mEditorBase.get() << " }";
  return aStream;
}

NS_IMPL_CYCLE_COLLECTION_WEAK_PTR_INHERITED(CompositionTransaction,
                                            EditTransactionBase, mEditorBase)
// mRangeList can't lead to cycles

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CompositionTransaction)
NS_INTERFACE_MAP_END_INHERITING(EditTransactionBase)
NS_IMPL_ADDREF_INHERITED(CompositionTransaction, EditTransactionBase)
NS_IMPL_RELEASE_INHERITED(CompositionTransaction, EditTransactionBase)

Text* CompositionTransaction::GetTextNode() const {
  if (MOZ_UNLIKELY(!mEditorBase)) {
    return nullptr;
  }
  if (TextEditor* const textEditor = mEditorBase->GetAsTextEditor()) {
    return textEditor->GetTextNode();
  }
  MOZ_ASSERT(GetAsCompositionInTextNodeTransaction());
  return GetAsCompositionInTextNodeTransaction()->mTextNode;
}

NS_IMETHODIMP CompositionTransaction::DoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p CompositionTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  RefPtr<Text> textNode = GetTextNode();
  if (NS_WARN_IF(!textNode)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  uint32_t offsetInTextNode = mOffset;

  // Fail before making any changes if there's no selection controller
  if (NS_WARN_IF(!mEditorBase->GetSelectionController())) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  const OwningNonNull<EditorBase> editorBase = *mEditorBase;

  // Advance caret: This requires the presentation shell to get the selection.
  if (mReplaceLength == 0) {
    IgnoredErrorResult error;
    editorBase->DoInsertText(*textNode, mOffset, mStringToInsert, error);
    if (error.Failed()) {
      NS_WARNING("EditorBase::DoInsertText() failed");
      return error.StealNSResult();
    }
    editorBase->RangeUpdaterRef().SelAdjInsertText(*textNode, mOffset,
                                                   mStringToInsert.Length());
  } else {
    // If composition string is split to multiple text nodes, we should put
    // whole new composition string to the first text node and remove the
    // composition string in the following nodes.
    // TODO: This should be handled by `TextComposition` because this assumes
    //       that composition string has never touched by JS.  However, it
    //       would occur if the web app is a corroboration software which
    //       multiple users can modify anyware in an editor.
    const auto [replaceStartInFirstText, replaceableLengthInFirstText] =
        [&]() MOZ_NEVER_INLINE_DEBUG -> std::pair<uint32_t, uint32_t> {
      // TextEditor always works with a single `Text` which cannot be split by
      // the app. Therefore, we can just clamp the range into the `Text`.
      if (mReplaceOffset <= textNode->TextDataLength() ||
          mEditorBase->IsTextEditor()) [[likely]] {
        const uint32_t lengthInFirstText =
            std::min(mReplaceLength,
                     static_cast<uint32_t>(std::max<int64_t>(
                         textNode->TextDataLength() - mReplaceOffset, 0)));
        return {std::min(mReplaceOffset, textNode->TextDataLength()),
                lengthInFirstText};
      }
      // If the editor is an HTMLEditor, we're CompositionInTextNodeTransaction
      // and its mTextNode may not have the composition string already. If the
      // range is still in the following `Text`, we should adjust the range in
      // the following `Text`.
      Text* compositionStartTextNode = textNode;
      uint32_t startOffsetOfCompositionStartTextNode = 0;
      uint32_t endOffsetOfCompositionStartTextNode =
          compositionStartTextNode->TextDataLength();
      for (RefPtr<Text> text =
               Text::FromNodeOrNull(compositionStartTextNode->GetNextSibling());
           text; text = Text::FromNodeOrNull(
                     compositionStartTextNode->GetNextSibling())) {
        compositionStartTextNode = text;
        startOffsetOfCompositionStartTextNode =
            endOffsetOfCompositionStartTextNode;
        endOffsetOfCompositionStartTextNode +=
            compositionStartTextNode->TextDataLength();
        if (mReplaceOffset <= endOffsetOfCompositionStartTextNode) [[likely]] {
          break;
        }
      }
      textNode = compositionStartTextNode;
      offsetInTextNode = mReplaceOffset - startOffsetOfCompositionStartTextNode;
      const uint32_t replaceEndOffset = mReplaceOffset + mReplaceLength;
      const uint32_t replaceEndOffsetInCompositionStartTextNode =
          std::min(replaceEndOffset - startOffsetOfCompositionStartTextNode,
                   endOffsetOfCompositionStartTextNode);
      return {offsetInTextNode,
              replaceEndOffsetInCompositionStartTextNode - offsetInTextNode};
    }();
    IgnoredErrorResult error;
    // FIXME: If mStringToInsert is empty string and mOffset is 0 in HTMLEditor,
    // we should delete the `Text` instead. See bug 2019186.
    editorBase->DoReplaceText(*textNode, replaceStartInFirstText,
                              replaceableLengthInFirstText, mStringToInsert,
                              error);
    if (error.Failed()) [[unlikely]] {
      NS_WARNING("EditorBase::DoReplaceText() failed");
      return error.StealNSResult();
    }

    // Don't use RangeUpdaterRef().SelAdjReplaceText() here because undoing
    // this transaction will remove whole composition string.  Therefore,
    // selection should be restored at start of composition string.
    // XXX Perhaps, this is a bug of our selection management at undoing.
    editorBase->RangeUpdaterRef().SelAdjDeleteText(
        *textNode, replaceStartInFirstText, replaceableLengthInFirstText);
    // But some ranges which after the composition string should be restored
    // as-is.
    editorBase->RangeUpdaterRef().SelAdjInsertText(
        *textNode, replaceStartInFirstText, mStringToInsert.Length());

    if (replaceableLengthInFirstText < mReplaceLength) {
      // XXX Perhaps, scanning following sibling text nodes with composition
      //     string length which we know is wrong because there may be
      //     non-empty text nodes which are inserted by JS.  Instead, we
      //     should remove all text in the ranges of IME selections.
      uint32_t remainingLength = mReplaceLength - replaceableLengthInFirstText;
      IgnoredErrorResult ignoredError;
      for (RefPtr<Text> text = Text::FromNodeOrNull(textNode->GetNextSibling());
           text && remainingLength;
           text = Text::FromNodeOrNull(text->GetNextSibling())) {
        const uint32_t deletableLengthInText =
            std::min(text->TextDataLength(), remainingLength);
        // FIXME: We should delete the Text when all of its data is deleted
        // now and we're working for HTMLEditor, see bug 2019186.
        editorBase->DoDeleteText(*text, 0, deletableLengthInText, ignoredError);
        NS_WARNING_ASSERTION(!ignoredError.Failed(),
                             "EditorBase::DoDeleteText() failed, but ignored");
        ignoredError.SuppressException();
        editorBase->RangeUpdaterRef().SelAdjDeleteText(*text, 0,
                                                       deletableLengthInText);
        remainingLength -= deletableLengthInText;
      }
    }
  }

  nsresult rv = SetSelectionForRanges(*textNode, offsetInTextNode);
  NS_WARNING_ASSERTION(
      NS_SUCCEEDED(rv),
      "CompositionTransaction::SetSelectionForRanges() failed");

  if (TextComposition* composition = editorBase->GetComposition()) {
    composition->OnUpdateCompositionInEditor(mStringToInsert, *textNode,
                                             offsetInTextNode);
  }

  if (GetTextNode() != textNode) [[unlikely]] {
    MOZ_ASSERT(editorBase->IsHTMLEditor());
    UpdateTextNodeAndOffset(*textNode, offsetInTextNode);
  }

  return rv;
}

NS_IMETHODIMP CompositionTransaction::UndoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p CompositionTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  const RefPtr<Text> textNode = GetTextNode();
  if (NS_WARN_IF(!textNode)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  IgnoredErrorResult error;
  editorBase->DoDeleteText(*textNode, mOffset, mStringToInsert.Length(), error);
  if (MOZ_UNLIKELY(error.Failed())) {
    NS_WARNING("EditorBase::DoDeleteText() failed");
    return error.StealNSResult();
  }

  // set the selection to the insertion point where the string was removed
  editorBase->CollapseSelectionTo(EditorRawDOMPoint(textNode, mOffset), error);
  NS_ASSERTION(!error.Failed(), "EditorBase::CollapseSelectionTo() failed");
  return error.StealNSResult();
}

NS_IMETHODIMP CompositionTransaction::RedoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p CompositionTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));
  return DoTransaction();
}

NS_IMETHODIMP CompositionTransaction::Merge(nsITransaction* aOtherTransaction,
                                            bool* aDidMerge) {
  MOZ_LOG(GetLogModule(), LogLevel::Debug,
          ("%p CompositionTransaction::%s(aOtherTransaction=%p) this=%s", this,
           __FUNCTION__, aOtherTransaction, ToString(*this).c_str()));

  if (NS_WARN_IF(!aOtherTransaction) || NS_WARN_IF(!aDidMerge)) {
    return NS_ERROR_INVALID_ARG;
  }
  *aDidMerge = false;

  // Check to make sure we aren't fixed, if we are then nothing gets merged.
  if (mFixed) {
    MOZ_LOG(GetLogModule(), LogLevel::Debug,
            ("%p CompositionTransaction::%s returned false due to fixed", this,
             __FUNCTION__));
    return NS_OK;
  }

  RefPtr<EditTransactionBase> otherTransactionBase =
      aOtherTransaction->GetAsEditTransactionBase();
  if (!otherTransactionBase) {
    MOZ_LOG(GetLogModule(), LogLevel::Debug,
            ("%p CompositionTransaction::%s returned false due to not edit "
             "transaction",
             this, __FUNCTION__));
    return NS_OK;
  }

  // If aTransaction is another CompositionTransaction then merge it
  CompositionTransaction* otherCompositionTransaction =
      otherTransactionBase->GetAsCompositionTransaction();
  if (!otherCompositionTransaction) {
    return NS_OK;
  }

  // We merge the next IME transaction by adopting its insert string.
  mStringToInsert = otherCompositionTransaction->mStringToInsert;
  mRanges = otherCompositionTransaction->mRanges;
  *aDidMerge = true;
  MOZ_LOG(GetLogModule(), LogLevel::Debug,
          ("%p CompositionTransaction::%s returned true", this, __FUNCTION__));
  return NS_OK;
}

void CompositionTransaction::MarkFixed() { mFixed = true; }

/* ============ private methods ================== */

nsresult CompositionTransaction::SetSelectionForRanges(Text& aText,
                                                       uint32_t aOffset) {
  if (NS_WARN_IF(!mEditorBase)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  RefPtr<TextRangeArray> ranges = mRanges;
  nsresult rv = SetIMESelection(editorBase, &aText, aOffset,
                                mStringToInsert.Length(), ranges);
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "CompositionTransaction::SetIMESelection() failed");
  return rv;
}

// static
nsresult CompositionTransaction::SetIMESelection(
    EditorBase& aEditorBase, Text* aTextNode, uint32_t aOffsetInNode,
    uint32_t aLengthOfCompositionString, const TextRangeArray* aRanges) {
  RefPtr<Selection> selection = aEditorBase.GetSelection();
  if (NS_WARN_IF(!selection)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  SelectionBatcher selectionBatcher(selection, __FUNCTION__);

  // First, remove all selections of IME composition.
  static const RawSelectionType kIMESelections[] = {
      nsISelectionController::SELECTION_IME_RAWINPUT,
      nsISelectionController::SELECTION_IME_SELECTEDRAWTEXT,
      nsISelectionController::SELECTION_IME_CONVERTEDTEXT,
      nsISelectionController::SELECTION_IME_SELECTEDCONVERTEDTEXT};

  nsCOMPtr<nsISelectionController> selectionController =
      aEditorBase.GetSelectionController();
  if (NS_WARN_IF(!selectionController)) {
    return NS_ERROR_NOT_INITIALIZED;
  }

  IgnoredErrorResult ignoredError;
  for (short IMESelection : kIMESelections) {
    RefPtr<Selection> selectionOfIME =
        selectionController->GetSelection(IMESelection);
    if (!selectionOfIME) {
      NS_WARNING("nsISelectionController::GetSelection() failed");
      continue;
    }
    selectionOfIME->RemoveAllRanges(ignoredError);
    NS_WARNING_ASSERTION(!ignoredError.Failed(),
                         "Selection::RemoveAllRanges() failed, but ignored");
    ignoredError.SuppressException();
  }

  // Set caret position and selection of IME composition with TextRangeArray.
  bool setCaret = false;
  uint32_t countOfRanges = aRanges ? aRanges->Length() : 0;

#ifdef DEBUG
  // Bounds-checking on debug builds
  uint32_t maxOffset = aTextNode->Length();
#endif

  // NOTE: composition string may be truncated when it's committed and
  //       maxlength attribute value doesn't allow input of all text of this
  //       composition.
  nsresult rv = NS_OK;
  for (uint32_t i = 0; i < countOfRanges; ++i) {
    const TextRange& textRange = aRanges->ElementAt(i);

    // Caret needs special handling since its length may be 0 and if it's not
    // specified explicitly, we need to handle it ourselves later.
    if (textRange.mRangeType == TextRangeType::eCaret) {
      NS_ASSERTION(!setCaret, "The ranges already has caret position");
      NS_ASSERTION(!textRange.Length(),
                   "EditorBase doesn't support wide caret");
      CheckedUint32 caretOffset(aOffsetInNode);
      caretOffset +=
          std::min(textRange.mStartOffset, aLengthOfCompositionString);
      MOZ_ASSERT(caretOffset.isValid());
      MOZ_ASSERT(caretOffset.value() <= maxOffset);
      rv = selection->CollapseInLimiter(aTextNode, caretOffset.value());
      NS_WARNING_ASSERTION(
          NS_SUCCEEDED(rv),
          "Selection::CollapseInLimiter() failed, but might be ignored");
      setCaret = setCaret || NS_SUCCEEDED(rv);
      if (!setCaret) {
        continue;
      }
      // If caret range is specified explicitly, we should show the caret if
      // it should be so.
      aEditorBase.HideCaret(false);
      continue;
    }

    // If the clause length is 0, it should be a bug.
    if (!textRange.Length()) {
      NS_WARNING("Any clauses must not be empty");
      continue;
    }

    RefPtr<nsRange> clauseRange;
    CheckedUint32 startOffset = aOffsetInNode;
    startOffset += std::min(textRange.mStartOffset, aLengthOfCompositionString);
    MOZ_ASSERT(startOffset.isValid());
    MOZ_ASSERT(startOffset.value() <= maxOffset);
    CheckedUint32 endOffset = aOffsetInNode;
    endOffset += std::min(textRange.mEndOffset, aLengthOfCompositionString);
    MOZ_ASSERT(endOffset.isValid());
    MOZ_ASSERT(endOffset.value() >= startOffset.value());
    MOZ_ASSERT(endOffset.value() <= maxOffset);
    clauseRange = nsRange::Create(aTextNode, startOffset.value(), aTextNode,
                                  endOffset.value(), IgnoreErrors());
    if (!clauseRange) {
      NS_WARNING("nsRange::Create() failed, but might be ignored");
      break;
    }

    // Set the range of the clause to selection.
    RefPtr<Selection> selectionOfIME = selectionController->GetSelection(
        ToRawSelectionType(textRange.mRangeType));
    if (!selectionOfIME) {
      NS_WARNING(
          "nsISelectionController::GetSelection() failed, but might be "
          "ignored");
      break;
    }

    IgnoredErrorResult ignoredError;
    selectionOfIME->AddRangeAndSelectFramesAndNotifyListeners(*clauseRange,
                                                              ignoredError);
    if (ignoredError.Failed()) {
      NS_WARNING(
          "Selection::AddRangeAndSelectFramesAndNotifyListeners() failed, but "
          "might be ignored");
      break;
    }

    // Set the style of the clause.
    rv = selectionOfIME->SetTextRangeStyle(clauseRange, textRange.mRangeStyle);
    if (NS_FAILED(rv)) {
      NS_WARNING("Selection::SetTextRangeStyle() failed, but might be ignored");
      break;  // but this is unexpected...
    }
  }

  // If the ranges doesn't include explicit caret position, let's set the
  // caret to the end of composition string.
  if (!setCaret) {
    CheckedUint32 caretOffset = aOffsetInNode;
    caretOffset += aLengthOfCompositionString;
    MOZ_ASSERT(caretOffset.isValid());
    MOZ_ASSERT(caretOffset.value() <= maxOffset);
    rv = selection->CollapseInLimiter(aTextNode, caretOffset.value());
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "Selection::CollapseInLimiter() failed");

    // If caret range isn't specified explicitly, we should hide the caret.
    // Hiding the caret benefits a Windows build (see bug 555642 comment #6).
    // However, when there is no range, we should keep showing caret.
    if (countOfRanges) {
      aEditorBase.HideCaret(true);
    }
  }

  return rv;
}

/******************************************************************************
 * mozilla::CompositionInTextNodeTransaction
 ******************************************************************************/

CompositionInTextNodeTransaction::CompositionInTextNodeTransaction(
    EditorBase& aEditorBase, const nsAString& aStringToInsert,
    const EditorDOMPointInText& aPointToInsert)
    : CompositionTransaction(aEditorBase, aStringToInsert, aPointToInsert),
      mTextNode(aPointToInsert.ContainerAs<Text>()) {
  MOZ_ASSERT(aEditorBase.IsHTMLEditor());
}

std::ostream& operator<<(std::ostream& aStream,
                         const CompositionInTextNodeTransaction& aTransaction) {
  aStream << "{ mTextNode=" << aTransaction.mTextNode.get();
  if (aTransaction.mTextNode) {
    aStream << " (" << *aTransaction.mTextNode << ")";
  }
  aStream << ", mOffset=" << aTransaction.mOffset
          << ", mReplaceLength=" << aTransaction.mReplaceLength
          << ", mRanges={ Length()=" << aTransaction.mRanges->Length() << " }"
          << ", mStringToInsert=\""
          << NS_ConvertUTF16toUTF8(aTransaction.mStringToInsert).get() << "\""
          << ", mEditorBase=" << aTransaction.mEditorBase.get() << " }";
  return aStream;
}

NS_IMPL_CYCLE_COLLECTION_INHERITED(CompositionInTextNodeTransaction,
                                   CompositionTransaction, mTextNode)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CompositionInTextNodeTransaction)
NS_INTERFACE_MAP_END_INHERITING(CompositionTransaction)
NS_IMPL_ADDREF_INHERITED(CompositionInTextNodeTransaction,
                         CompositionTransaction)
NS_IMPL_RELEASE_INHERITED(CompositionInTextNodeTransaction,
                          CompositionTransaction)

}  // namespace mozilla

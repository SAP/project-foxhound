/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CompositionTransaction_h
#define CompositionTransaction_h

#include "EditTransactionBase.h"  // base class

#include "EditorForwards.h"

#include "mozilla/WeakPtr.h"
#include "mozilla/dom/Text.h"
#include "nsCycleCollectionParticipant.h"  // various macros
#include "nsString.h"                      // mStringToInsert

namespace mozilla {
class TextComposition;
class TextRangeArray;

/**
 * CompositionTransaction stores all edit for a composition, i.e.,
 * from compositionstart event to compositionend event.  E.g., inserting a
 * composition string, modifying the composition string or its IME selection
 * ranges and commit or cancel the composition.
 */
class CompositionTransaction : public EditTransactionBase,
                               public SupportsWeakPtr {
 protected:
  CompositionTransaction(EditorBase& aEditorBase,
                         const nsAString& aStringToInsert,
                         const EditorDOMPointInText& aPointToInsert);

 public:
  /**
   * Creates a composition transaction.  aEditorBase must not return from
   * GetComposition() while calling this method.  Note that this method will
   * update text node information of aEditorBase.mComposition.
   *
   * @param aEditorBase         The editor which has composition.
   * @param aStringToInsert     The new composition string to insert.  This may
   *                            be different from actual composition string.
   *                            E.g., password editor can hide the character
   *                            with a different character.
   * @param aPointToInsert      The insertion point.
   */
  static already_AddRefed<CompositionTransaction> Create(
      EditorBase& aEditorBase, const nsAString& aStringToInsert,
      const EditorDOMPointInText& aPointToInsert);

  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CompositionTransaction,
                                           EditTransactionBase)

  NS_DECL_ISUPPORTS_INHERITED

  NS_DECL_EDITTRANSACTIONBASE
  NS_DECL_EDITTRANSACTIONBASE_GETASMETHODS_OVERRIDE(CompositionTransaction)

  MOZ_CAN_RUN_SCRIPT NS_IMETHOD RedoTransaction() override;
  NS_IMETHOD Merge(nsITransaction* aOtherTransaction, bool* aDidMerge) override;

  dom::Text* GetTextNode() const;

  void MarkFixed();

  MOZ_CAN_RUN_SCRIPT static nsresult SetIMESelection(
      EditorBase& aEditorBase, dom::Text* aTextNode, uint32_t aOffsetInNode,
      uint32_t aLengthOfCompositionString, const TextRangeArray* aRanges);

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const CompositionTransaction& aTransaction);

 protected:
  virtual ~CompositionTransaction() = default;

  virtual void UpdateTextNodeAndOffset(dom::Text& aText, uint32_t aOffset) {
    MOZ_DIAGNOSTIC_ASSERT(GetTextNode() == &aText,
                          "If mEditorBase is a TextEditor, we should work only "
                          "with the single Text");
    mOffset = aOffset;
  }

  MOZ_CAN_RUN_SCRIPT nsresult SetSelectionForRanges(dom::Text& aText,
                                                    uint32_t aOffset);

  // The offsets in the `Text` node where the insertion should be placed.
  uint32_t mOffset;
  // The replace range in the original `Text` even if it's split and shrunken.
  uint32_t mReplaceOffset;
  uint32_t mReplaceLength;

  // The range list.
  RefPtr<TextRangeArray> mRanges;

  // The text to insert into the text node at mOffset.
  nsString mStringToInsert;

  // The editor, which is used to get the selection controller.
  RefPtr<EditorBase> mEditorBase;

  bool mFixed;
};

/**
 * Private class for CompositionTransaction when it needs to handle a
 * transaction of `HTMLEditor`.
 */
class CompositionInTextNodeTransaction final : CompositionTransaction {
 public:
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CompositionInTextNodeTransaction,
                                           CompositionTransaction)
  NS_DECL_ISUPPORTS_INHERITED

  friend std::ostream& operator<<(
      std::ostream& aStream,
      const CompositionInTextNodeTransaction& aTransaction);

 private:
  NS_DECL_EDITTRANSACTIONBASE_GETASMETHODS_OVERRIDE(
      CompositionInTextNodeTransaction)

  CompositionInTextNodeTransaction(EditorBase& aEditorBase,
                                   const nsAString& aStringToInsert,
                                   const EditorDOMPointInText& aPointToInsert);
  virtual ~CompositionInTextNodeTransaction() = default;

  // The text element to operate upon.
  RefPtr<dom::Text> mTextNode;

  void UpdateTextNodeAndOffset(dom::Text& aText, uint32_t aOffset) final {
    mTextNode = &aText;
    CompositionTransaction::UpdateTextNodeAndOffset(aText, aOffset);
  }

  friend class CompositionTransaction;
};

}  // namespace mozilla

#endif  // #ifndef CompositionTransaction_h

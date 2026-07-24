/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MoveNodeTransaction_h
#define MoveNodeTransaction_h

#include "EditTransactionBase.h"  // for EditTransactionBase, etc.

#include "EditorDOMPoint.h"
#include "EditorForwards.h"
#include "SelectionState.h"

#include "nsCOMPtr.h"  // for nsCOMPtr
#include "nsCycleCollectionParticipant.h"
#include "nsIContent.h"       // for nsIContent
#include "nsISupportsImpl.h"  // for NS_DECL_ISUPPORTS_INHERITED

namespace mozilla {

class MoveNodeTransactionBase : public EditTransactionBase {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(MoveNodeTransactionBase,
                                           EditTransactionBase)
  NS_DECL_EDITTRANSACTIONBASE_GETASMETHODS_OVERRIDE(MoveNodeTransactionBase)

  virtual EditorRawDOMPoint SuggestPointToPutCaret() const = 0;
  virtual EditorRawDOMPoint SuggestNextInsertionPoint() const = 0;

 protected:
  MoveNodeTransactionBase(HTMLEditor& aHTMLEditor,
                          nsIContent& aLastContentToMove,
                          const EditorRawDOMPoint& aPointToInsert);

  virtual ~MoveNodeTransactionBase() = default;

  [[nodiscard]] EditorRawDOMPoint SuggestPointToPutCaret(
      nsIContent* aLastMoveContent) const {
    if (MOZ_UNLIKELY(!mContainer || !aLastMoveContent)) {
      return EditorRawDOMPoint();
    }
    return EditorRawDOMPoint::After(*aLastMoveContent);
  }

  [[nodiscard]] EditorRawDOMPoint SuggestNextInsertionPoint(
      nsIContent* aLastMoveContent) const {
    if (MOZ_UNLIKELY(!mContainer)) {
      return EditorRawDOMPoint();
    }
    if (!mReference) {
      return EditorRawDOMPoint::AtEndOf(*aLastMoveContent);
    }
    if (MOZ_UNLIKELY(mReference->GetParentNode() != mContainer)) {
      if (MOZ_LIKELY(aLastMoveContent->GetParentNode() == mContainer)) {
        return EditorRawDOMPoint(aLastMoveContent).NextPoint();
      }
      return EditorRawDOMPoint::AtEndOf(mContainer);
    }
    return EditorRawDOMPoint(mReference);
  }

  // mContainer is new container of mContentToInsert after (re-)doing the
  // transaction.
  nsCOMPtr<nsINode> mContainer;

  // mReference is the child content where mContentToMove should be or was
  // inserted into the mContainer.  This is typically the next sibling of
  // mContentToMove after moving.
  nsCOMPtr<nsIContent> mReference;

  // mOldContainer is the original container of mContentToMove before moving.
  nsCOMPtr<nsINode> mOldContainer;

  // mOldNextSibling is the next sibling of mCOntentToMove before moving.
  nsCOMPtr<nsIContent> mOldNextSibling;

  // The editor for this transaction.
  RefPtr<HTMLEditor> mHTMLEditor;
};

/**
 * A transaction that moves a content node to a specified point.
 */
class MoveNodeTransaction final : public MoveNodeTransactionBase {
 protected:
  template <typename PT, typename CT>
  MoveNodeTransaction(HTMLEditor& aHTMLEditor, nsIContent& aContentToMove,
                      const EditorDOMPointBase<PT, CT>& aPointToInsert);

 public:
  /**
   * Create a transaction for moving aContentToMove before the child at
   * aPointToInsert.
   *
   * @param aHTMLEditor         The editor which manages the transaction.
   * @param aContentToMove      The node to be moved.
   * @param aPointToInsert      The insertion point of aContentToMove.
   * @return                    A MoveNodeTransaction which was initialized
   *                            with the arguments.
   */
  template <typename PT, typename CT>
  static already_AddRefed<MoveNodeTransaction> MaybeCreate(
      HTMLEditor& aHTMLEditor, nsIContent& aContentToMove,
      const EditorDOMPointBase<PT, CT>& aPointToInsert);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(MoveNodeTransaction,
                                           MoveNodeTransactionBase)

  NS_DECL_EDITTRANSACTIONBASE
  NS_DECL_EDITTRANSACTIONBASE_GETASMETHODS_OVERRIDE(MoveNodeTransaction)

  MOZ_CAN_RUN_SCRIPT NS_IMETHOD RedoTransaction() final;

  /**
   * SuggestPointToPutCaret() suggests a point after doing or redoing the
   * transaction.
   */
  EditorRawDOMPoint SuggestPointToPutCaret() const final {
    return MoveNodeTransactionBase::SuggestPointToPutCaret(mContentToMove);
  }

  /**
   * Suggest next insertion point if the caller wants to move another content
   * node around the insertion point.
   */
  EditorRawDOMPoint SuggestNextInsertionPoint() const final {
    return MoveNodeTransactionBase::SuggestNextInsertionPoint(mContentToMove);
  }

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const MoveNodeTransaction& aTransaction);

 protected:
  virtual ~MoveNodeTransaction() = default;

  MOZ_CAN_RUN_SCRIPT nsresult DoTransactionInternal();

  // The content which will be or was moved from mOldContainer to mContainer.
  nsCOMPtr<nsIContent> mContentToMove;
};

/**
 * A transaction that moves multiple siblings once.
 */
class MoveSiblingsTransaction final : public MoveNodeTransactionBase {
 protected:
  template <typename PT, typename CT>
  MoveSiblingsTransaction(HTMLEditor& aHTMLEditor,
                          nsIContent& aFirstContentToMove,
                          nsIContent& aLastContentToMove,
                          uint32_t aNumberOfSiblings,
                          const EditorDOMPointBase<PT, CT>& aPointToInsert);

 public:
  /**
   * Create a transaction for moving aContentToMove before the child at
   * aPointToInsert.
   *
   * @param aHTMLEditor         The editor which manages the transaction.
   * @param aFirstContentToMove The first node to be moved.
   * @param aLastContentToMove  The last node to be moved.  Its parent node
   *                            should be the parent of aFirstContentToMove and
   *                            a following sibling of aFirstContentToMove.
   * @param aNumberOfSiblings   The number of siblings to move.
   * @param aPointToInsert      The insertion point of aContentToMove.
   * @return                    A MoveSiblingsTransaction which was initialized
   *                            with the arguments.
   */
  template <typename PT, typename CT>
  static already_AddRefed<MoveSiblingsTransaction> MaybeCreate(
      HTMLEditor& aHTMLEditor, nsIContent& aFirstContentToMove,
      nsIContent& aLastContentToMove,
      const EditorDOMPointBase<PT, CT>& aPointToInsert);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(MoveSiblingsTransaction,
                                           MoveNodeTransactionBase)

  NS_DECL_EDITTRANSACTIONBASE
  NS_DECL_EDITTRANSACTIONBASE_GETASMETHODS_OVERRIDE(MoveSiblingsTransaction)

  MOZ_CAN_RUN_SCRIPT NS_IMETHOD RedoTransaction() override;

  /**
   * SuggestPointToPutCaret() suggests a point after doing or redoing the
   * transaction.
   */
  EditorRawDOMPoint SuggestPointToPutCaret() const final {
    return MoveNodeTransactionBase::SuggestPointToPutCaret(
        GetLastMovedContent());
  }

  /**
   * Suggest next insertion point if the caller wants to move another content
   * node around the insertion point.
   */
  EditorRawDOMPoint SuggestNextInsertionPoint() const final {
    return MoveNodeTransactionBase::SuggestNextInsertionPoint(
        GetLastMovedContent());
  }

  const nsTArray<OwningNonNull<nsIContent>>& TargetSiblings() const {
    return mSiblingsToMove;
  }

  [[nodiscard]] nsIContent* GetFirstMovedContent() const;
  [[nodiscard]] nsIContent* GetLastMovedContent() const;

  friend std::ostream& operator<<(std::ostream& aStream,
                                  const MoveSiblingsTransaction& aTransaction);

 protected:
  virtual ~MoveSiblingsTransaction() = default;

  MOZ_CAN_RUN_SCRIPT nsresult DoTransactionInternal();

  [[nodiscard]] bool IsSiblingsToMoveValid() const {
    for (const auto& content : mSiblingsToMove) {
      if (MOZ_UNLIKELY(!content.isInitialized())) {
        return false;
      }
    }
    return true;
  }

  /**
   * Remove all aClonedSiblingsToMove from the DOM.  aClonedSiblingsToMove must
   * be a clone of mSiblingsToMove in the stack.
   */
  MOZ_CAN_RUN_SCRIPT void RemoveAllSiblingsToMove(
      HTMLEditor& aHTMLEditor,
      const nsTArray<OwningNonNull<nsIContent>>& aClonedSiblingsToMove,
      AutoMoveNodeSelNotify& aNotifier) const;

  /**
   * Insert all disconnected aClonedSiblingsToMove to before aReferenceNode or
   * end of aParentNode.  Before calling this, RemoveAllSiblingsToMove()
   * should've already been called.
   */
  MOZ_CAN_RUN_SCRIPT nsresult InsertAllSiblingsToMove(
      HTMLEditor& aHTMLEditor,
      const nsTArray<OwningNonNull<nsIContent>>& aClonedSiblingsToMove,
      nsINode& aParentNode, nsIContent* aReferenceNode,
      AutoMoveNodeSelNotify& aNotifier) const;

  // The content which will be or was moved from mOldContainer to mContainer.
  AutoTArray<OwningNonNull<nsIContent>, 2> mSiblingsToMove;

  // At undoing, this is set to true and at redoing, this is set to false.
  bool mDone = false;
};

}  // namespace mozilla

#endif  // #ifndef MoveNodeTransaction_h

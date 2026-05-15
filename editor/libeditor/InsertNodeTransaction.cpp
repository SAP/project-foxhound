/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "InsertNodeTransaction.h"

#include "EditorBase.h"           // for EditorBase
#include "EditorDOMAPIWrapper.h"  // For AutoNodeAPIWrapper
#include "EditorDOMPoint.h"       // for EditorDOMPoint
#include "HTMLEditor.h"           // for HTMLEditor
#include "TextEditor.h"           // for TextEditor

#include "mozilla/Logging.h"
#include "mozilla/ToString.h"

#include "nsAString.h"
#include "nsDebug.h"          // for NS_WARNING, etc.
#include "nsError.h"          // for NS_ERROR_NULL_POINTER, etc.
#include "nsIContent.h"       // for nsIContent
#include "nsReadableUtils.h"  // for ToNewCString
#include "nsString.h"         // for nsString

namespace mozilla {

using namespace dom;

template already_AddRefed<InsertNodeTransaction> InsertNodeTransaction::Create(
    EditorBase& aEditorBase, nsIContent& aContentToInsert,
    const EditorDOMPoint& aPointToInsert);
template already_AddRefed<InsertNodeTransaction> InsertNodeTransaction::Create(
    EditorBase& aEditorBase, nsIContent& aContentToInsert,
    const EditorRawDOMPoint& aPointToInsert);

// static
template <typename PT, typename CT>
already_AddRefed<InsertNodeTransaction> InsertNodeTransaction::Create(
    EditorBase& aEditorBase, nsIContent& aContentToInsert,
    const EditorDOMPointBase<PT, CT>& aPointToInsert) {
  RefPtr<InsertNodeTransaction> transaction =
      new InsertNodeTransaction(aEditorBase, aContentToInsert, aPointToInsert);
  return transaction.forget();
}

template <typename PT, typename CT>
InsertNodeTransaction::InsertNodeTransaction(
    EditorBase& aEditorBase, nsIContent& aContentToInsert,
    const EditorDOMPointBase<PT, CT>& aPointToInsert)
    : mContentToInsert(&aContentToInsert),
      mPointToInsert(aPointToInsert.template To<EditorDOMPoint>()),
      mEditorBase(&aEditorBase) {
  MOZ_ASSERT(mPointToInsert.IsSetAndValid());
  // Ensure mPointToInsert stores child at offset.
  (void)mPointToInsert.GetChild();
}

std::ostream& operator<<(std::ostream& aStream,
                         const InsertNodeTransaction& aTransaction) {
  aStream << "{ mContentToInsert=" << aTransaction.mContentToInsert.get();
  if (aTransaction.mContentToInsert) {
    if (aTransaction.mContentToInsert->IsText()) {
      nsAutoString data;
      aTransaction.mContentToInsert->AsText()->GetData(data);
      aStream << " (#text \"" << NS_ConvertUTF16toUTF8(data).get() << "\")";
    } else {
      aStream << " (" << *aTransaction.mContentToInsert << ")";
    }
  }
  aStream << ", mPointToInsert=" << aTransaction.mPointToInsert
          << ", mEditorBase=" << aTransaction.mEditorBase.get() << " }";
  return aStream;
}

NS_IMPL_CYCLE_COLLECTION_INHERITED(InsertNodeTransaction, EditTransactionBase,
                                   mEditorBase, mContentToInsert,
                                   mPointToInsert)

NS_IMPL_ADDREF_INHERITED(InsertNodeTransaction, EditTransactionBase)
NS_IMPL_RELEASE_INHERITED(InsertNodeTransaction, EditTransactionBase)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(InsertNodeTransaction)
NS_INTERFACE_MAP_END_INHERITING(EditTransactionBase)

NS_IMETHODIMP InsertNodeTransaction::DoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p InsertNodeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase) || NS_WARN_IF(!mContentToInsert) ||
      NS_WARN_IF(!mPointToInsert.IsSet())) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  MOZ_ASSERT_IF(mEditorBase->IsTextEditor(), !mContentToInsert->IsText());

  if (!mPointToInsert.IsSetAndValid()) {
    // It seems that DOM tree has been changed after first DoTransaction()
    // and current RedoTranaction() call.
    if (mPointToInsert.GetChild()) {
      EditorDOMPoint newPointToInsert(mPointToInsert.GetChild());
      if (!newPointToInsert.IsSet()) {
        // The insertion point has been removed from the DOM tree.
        // In this case, we should append the node to the container instead.
        newPointToInsert.SetToEndOf(mPointToInsert.GetContainer());
        if (NS_WARN_IF(!newPointToInsert.IsSet())) {
          return NS_ERROR_FAILURE;
        }
      }
      mPointToInsert = newPointToInsert;
    } else {
      mPointToInsert.SetToEndOf(mPointToInsert.GetContainer());
      if (NS_WARN_IF(!mPointToInsert.IsSet())) {
        return NS_ERROR_FAILURE;
      }
    }
  }

  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  const OwningNonNull<nsIContent> contentToInsert = *mContentToInsert;
  const OwningNonNull<nsINode> container = *mPointToInsert.GetContainer();
  const nsCOMPtr<nsIContent> refChild = mPointToInsert.GetChild();
  if (contentToInsert->IsElement()) {
    nsresult rv = editorBase->MarkElementDirty(
        MOZ_KnownLive(*contentToInsert->AsElement()));
    if (NS_WARN_IF(rv == NS_ERROR_EDITOR_DESTROYED)) {
      return EditorBase::ToGenericNSResult(rv);
    }
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "EditorBase::MarkElementDirty() failed, but ignored");
  }

  AutoNodeAPIWrapper nodeWrapper(editorBase, container);
  nsresult rv = nodeWrapper.InsertBefore(contentToInsert, refChild);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoNodeAPIWrapper::InsertBefore() failed");
    return rv;
  }
  NS_WARNING_ASSERTION(nodeWrapper.IsExpectedResult(),
                       "Inserting a node caused other mutations, but ignored");
  return NS_OK;
}

NS_IMETHODIMP InsertNodeTransaction::UndoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p InsertNodeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase) || NS_WARN_IF(!mContentToInsert) ||
      NS_WARN_IF(!mPointToInsert.IsSet())) {
    return NS_ERROR_NOT_INITIALIZED;
  }
  // XXX If the inserted node has been moved to different container node or
  //     just removed from the DOM tree, this always fails.
  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  const OwningNonNull<nsINode> container = *mPointToInsert.GetContainer();
  const OwningNonNull<nsIContent> contentToInsert = *mContentToInsert;
  AutoNodeAPIWrapper nodeWrapper(editorBase, container);
  nsresult rv = nodeWrapper.RemoveChild(contentToInsert);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoNodeAPIWrapper::RemoveChild() failed");
    return rv;
  }
  NS_WARNING_ASSERTION(nodeWrapper.IsExpectedResult(),
                       "Removing a node caused other mutations, but ignored");
  return NS_OK;
}

NS_IMETHODIMP InsertNodeTransaction::RedoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p InsertNodeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));
  nsresult rv = DoTransaction();
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    NS_WARNING("InsertNodeTransaction::RedoTransaction() failed");
    return rv;
  }

  if (!mEditorBase->AllowsTransactionsToChangeSelection()) {
    return NS_OK;
  }

  OwningNonNull<EditorBase> editorBase(*mEditorBase);
  rv = editorBase->CollapseSelectionTo(
      SuggestPointToPutCaret<EditorRawDOMPoint>());
  NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                       "EditorBase::CollapseSelectionTo() failed, but ignored");
  return NS_OK;
}

}  // namespace mozilla

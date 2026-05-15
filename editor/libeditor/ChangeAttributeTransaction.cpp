/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ChangeAttributeTransaction.h"

#include "EditorDOMAPIWrapper.h"

#include "mozilla/Logging.h"
#include "mozilla/ToString.h"
#include "mozilla/dom/Element.h"  // for Element

#include "nsAString.h"
#include "nsError.h"  // for NS_ERROR_NOT_INITIALIZED, etc.

namespace mozilla {

using namespace dom;

// static
already_AddRefed<ChangeAttributeTransaction> ChangeAttributeTransaction::Create(
    EditorBase& aEditorBase, Element& aElement, nsAtom& aAttribute,
    const nsAString& aValue) {
  RefPtr<ChangeAttributeTransaction> transaction =
      new ChangeAttributeTransaction(aEditorBase, aElement, aAttribute,
                                     &aValue);
  return transaction.forget();
}

// static
already_AddRefed<ChangeAttributeTransaction>
ChangeAttributeTransaction::CreateToRemove(EditorBase& aEditorBase,
                                           Element& aElement,
                                           nsAtom& aAttribute) {
  RefPtr<ChangeAttributeTransaction> transaction =
      new ChangeAttributeTransaction(aEditorBase, aElement, aAttribute,
                                     nullptr);
  return transaction.forget();
}

ChangeAttributeTransaction::ChangeAttributeTransaction(EditorBase& aEditorBase,
                                                       Element& aElement,
                                                       nsAtom& aAttribute,
                                                       const nsAString* aValue)
    : EditTransactionBase(),
      mEditorBase(&aEditorBase),
      mElement(&aElement),
      mAttribute(&aAttribute),
      mValue(aValue ? *aValue : u""_ns),
      mRemoveAttribute(!aValue),
      mAttributeWasSet(false) {}

std::ostream& operator<<(std::ostream& aStream,
                         const ChangeAttributeTransaction& aTransaction) {
  aStream << "{ mElement=" << aTransaction.mElement.get();
  if (aTransaction.mElement) {
    aStream << " (" << *aTransaction.mElement << ")";
  }
  aStream << ", mAttribute=" << nsAtomCString(aTransaction.mAttribute).get()
          << ", mValue=\"" << NS_ConvertUTF16toUTF8(aTransaction.mValue).get()
          << "\", mUndoValue=\""
          << NS_ConvertUTF16toUTF8(aTransaction.mUndoValue).get()
          << "\", mRemoveAttribute="
          << (aTransaction.mRemoveAttribute ? "true" : "false")
          << ", mAttributeWasSet="
          << (aTransaction.mAttributeWasSet ? "true" : "false")
          << ", mEditorBase=" << aTransaction.mEditorBase.get() << " }";
  return aStream;
}

NS_IMPL_CYCLE_COLLECTION_INHERITED(ChangeAttributeTransaction,
                                   EditTransactionBase, mEditorBase, mElement)

NS_IMPL_ADDREF_INHERITED(ChangeAttributeTransaction, EditTransactionBase)
NS_IMPL_RELEASE_INHERITED(ChangeAttributeTransaction, EditTransactionBase)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ChangeAttributeTransaction)
NS_INTERFACE_MAP_END_INHERITING(EditTransactionBase)

NS_IMETHODIMP ChangeAttributeTransaction::DoTransaction() {
  MOZ_ASSERT(mEditorBase);

  // Need to get the current value of the attribute and save it, and set
  // mAttributeWasSet
  mAttributeWasSet = mElement->GetAttr(mAttribute, mUndoValue);

  // XXX: hack until attribute-was-set code is implemented
  if (!mUndoValue.IsEmpty()) {
    mAttributeWasSet = true;
  }
  // XXX: end hack

  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p ChangeAttributeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  const OwningNonNull<Element> element = *mElement;
  // Now set the attribute to the new value
  if (mRemoveAttribute) {
    AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
    nsresult rv = elementWrapper.UnsetAttr(MOZ_KnownLive(mAttribute), true);
    if (NS_FAILED(rv)) {
      NS_WARNING("AutoElementAttrAPIWrapper::UnsetAttr() failed");
      return rv;
    }
    NS_WARNING_ASSERTION(
        elementWrapper.IsExpectedResult(EmptyString()),
        "Removing attribute caused other mutations, but ignored");
    return NS_OK;
  }

  AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
  nsresult rv = elementWrapper.SetAttr(MOZ_KnownLive(mAttribute), mValue, true);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoElementAttrAPIWrapper::SetAttr() failed");
    return rv;
  }
  NS_WARNING_ASSERTION(elementWrapper.IsExpectedResult(mValue),
                       "Setting attribute caused other mutations, but ignored");
  return rv;
}

NS_IMETHODIMP ChangeAttributeTransaction::UndoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p ChangeAttributeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase) || NS_WARN_IF(!mElement)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  const OwningNonNull<Element> element = *mElement;
  if (mAttributeWasSet) {
    AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
    nsresult rv =
        elementWrapper.SetAttr(MOZ_KnownLive(mAttribute), mUndoValue, true);
    if (NS_FAILED(rv)) {
      NS_WARNING("AutoElementAttrAPIWrapper::SetAttr() failed");
      return rv;
    }
    NS_WARNING_ASSERTION(
        elementWrapper.IsExpectedResult(mUndoValue),
        "Setting attribute caused other mutations, but ignored");
    return NS_OK;
  }
  AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
  nsresult rv = elementWrapper.UnsetAttr(MOZ_KnownLive(mAttribute), true);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoElementAttrAPIWrapper::UnsetAttr() failed");
    return rv;
  }
  NS_WARNING_ASSERTION(
      elementWrapper.IsExpectedResult(EmptyString()),
      "Removing attribute caused other mutations, but ignored");
  return NS_OK;
}

NS_IMETHODIMP ChangeAttributeTransaction::RedoTransaction() {
  MOZ_LOG(GetLogModule(), LogLevel::Info,
          ("%p ChangeAttributeTransaction::%s this=%s", this, __FUNCTION__,
           ToString(*this).c_str()));

  if (NS_WARN_IF(!mEditorBase) || NS_WARN_IF(!mElement)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  const OwningNonNull<EditorBase> editorBase = *mEditorBase;
  const OwningNonNull<Element> element = *mElement;
  if (mRemoveAttribute) {
    AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
    nsresult rv = elementWrapper.UnsetAttr(MOZ_KnownLive(mAttribute), true);
    if (NS_FAILED(rv)) {
      NS_WARNING("AutoElementAttrAPIWrapper::UnsetAttr() failed");
      return rv;
    }
    NS_WARNING_ASSERTION(
        elementWrapper.IsExpectedResult(EmptyString()),
        "Removing attribute caused other mutations, but ignored");
    return NS_OK;
  }

  AutoElementAttrAPIWrapper elementWrapper(editorBase, element);
  nsresult rv = elementWrapper.SetAttr(MOZ_KnownLive(mAttribute), mValue, true);
  if (NS_FAILED(rv)) {
    NS_WARNING("AutoElementAttrAPIWrapper::SetAttr() failed");
    return rv;
  }
  NS_WARNING_ASSERTION(elementWrapper.IsExpectedResult(mValue),
                       "Setting attribute caused other mutations, but ignored");
  return NS_OK;
}

}  // namespace mozilla

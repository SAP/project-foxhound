/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/IDBRecord.h"

#include "IDBObjectStore.h"
#include "IndexedDatabaseInlines.h"
#include "mozilla/dom/IDBRecordBinding.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION(IDBRecord)

IDBRecord::IDBRecord(indexedDB::Key aKey,
                     indexedDB::StructuredCloneReadInfoChild&& aValue)
    : mRawKey(std::move(aKey)),
      mRawValue(std::move(aValue)),
      mPrimaryKeyAndKeyEqual(true) {}

IDBRecord::IDBRecord(indexedDB::Key aKey, indexedDB::Key aPrimaryKey,
                     indexedDB::StructuredCloneReadInfoChild&& aValue)
    : mRawKey(std::move(aKey)),
      mRawPrimaryKey(std::move(aPrimaryKey)),
      mRawValue(std::move(aValue)),
      mPrimaryKeyAndKeyEqual(false) {}

bool IDBRecord::WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto,
                           JS::MutableHandle<JSObject*> aReflector) {
  return IDBRecord_Binding::Wrap(aCx, this, aGivenProto, aReflector);
}

void IDBRecord::GetKey(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal,
                       ErrorResult& aRv) {
  MOZ_ASSERT(!mRawKey.IsUnset());
  nsresult rv = mRawKey.ToJSVal(aCx, aRetVal);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    aRv.Throw(rv);
    return;
  }
  // Clear key to save a bit of memory, since this attribute is [Cached] in
  // webidl.
  // Since key is also used when calling getPrimaryKey if record is coming
  // from an object store (mPrimaryKeyAndKeyEqual == true), make sure to keep
  // it alive in case getPrimaryKey hasn't been called (and cached) yet.
  if (!mPrimaryKeyAndKeyEqual ||
      (mPrimaryKeyAndKeyEqual && mGetPrimaryKeyCalled)) {
    mRawKey.Unset();
  }
  mGetKeyCalled = true;
}

void IDBRecord::GetPrimaryKey(JSContext* aCx,
                              JS::MutableHandle<JS::Value> aRetVal,
                              ErrorResult& aRv) {
  indexedDB::Key& key = mPrimaryKeyAndKeyEqual ? mRawKey : mRawPrimaryKey;
  MOZ_ASSERT(!key.IsUnset());
  nsresult rv = key.ToJSVal(aCx, aRetVal);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    aRv.Throw(rv);
    return;
  }
  // Clear key.
  if (!mPrimaryKeyAndKeyEqual || (mPrimaryKeyAndKeyEqual && mGetKeyCalled)) {
    key.Unset();
  }
  mGetPrimaryKeyCalled = true;
}

void IDBRecord::GetValue(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal,
                         ErrorResult& aRv) {
  if (!IDBObjectStore::DeserializeValue(aCx, std::move(mRawValue), aRetVal)) {
    aRv.Throw(NS_ERROR_DOM_DATA_CLONE_ERR);
  }
}

}  // namespace mozilla::dom

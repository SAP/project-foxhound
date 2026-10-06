/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_INDEXEDDB_IDBRECORD_H_
#define DOM_INDEXEDDB_IDBRECORD_H_

#include "IndexedDatabase.h"
#include "js/TypeDecls.h"
#include "mozilla/dom/indexedDB/Key.h"
#include "nsCycleCollectionParticipant.h"

namespace mozilla {
class ErrorResult;
}

namespace mozilla::dom {

class IDBRecord final {
 public:
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(IDBRecord)
  NS_DECL_CYCLE_COLLECTION_NATIVE_CLASS(IDBRecord)

  // For object store records: key and primaryKey are the same value.
  IDBRecord(indexedDB::Key aKey,
            indexedDB::StructuredCloneReadInfoChild&& aValue);

  // For index records: key and primaryKey are distinct values.
  IDBRecord(indexedDB::Key aKey, indexedDB::Key aPrimaryKey,
            indexedDB::StructuredCloneReadInfoChild&& aValue);

  bool WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto,
                  JS::MutableHandle<JSObject*> aReflector);

  void GetKey(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal,
              ErrorResult& aRv);

  void GetPrimaryKey(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal,
                     ErrorResult& aRv);

  void GetValue(JSContext* aCx, JS::MutableHandle<JS::Value> aRetVal,
                ErrorResult& aRv);

 private:
  ~IDBRecord() = default;

  indexedDB::Key mRawKey;
  // Unset() for object store records, where key and primaryKey are the same
  // value.
  indexedDB::Key mRawPrimaryKey;
  indexedDB::StructuredCloneReadInfoChild mRawValue;

  // True for IDBObjectStore records, where primary key and key are the same
  // value. False for IDBIndex records.
  const bool mPrimaryKeyAndKeyEqual : 1;
  bool mGetKeyCalled : 1 = false;
  bool mGetPrimaryKeyCalled : 1 = false;
};

}  // namespace mozilla::dom

#endif  // DOM_INDEXEDDB_IDBRECORD_H_

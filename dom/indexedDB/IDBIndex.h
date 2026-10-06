/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_idbindex_h_
#define mozilla_dom_idbindex_h_

#include "js/RootingAPI.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/IDBCursorBinding.h"
#include "mozilla/dom/indexedDB/PBackgroundIDBSharedTypes.h"
#include "nsCycleCollectionParticipant.h"
#include "nsISupports.h"
#include "nsTArrayForwardDeclare.h"
#include "nsWrapperCache.h"

class nsIGlobalObject;

namespace mozilla {

class ErrorResult;

namespace dom {

struct IDBGetAllOptions;
class IDBObjectStore;
class IDBRequest;
template <typename>
class Sequence;

namespace indexedDB {
class KeyPath;
}  // namespace indexedDB

class IDBIndex final : public nsISupports, public nsWrapperCache {
  // TODO: This could be made const if Bug 1575173 is resolved. It is
  // initialized in the constructor and never modified/cleared.
  RefPtr<IDBObjectStore> mObjectStore;

  JS::Heap<JS::Value> mCachedKeyPath;

  // This normally points to the IndexMetadata owned by the parent IDBDatabase
  // object. However, if this index is part of a versionchange transaction and
  // it gets deleted then the metadata is copied into mDeletedMetadata and
  // mMetadata is set to point at mDeletedMetadata.
  const indexedDB::IndexMetadata* mMetadata;
  UniquePtr<indexedDB::IndexMetadata> mDeletedMetadata;

  const int64_t mId;
  bool mRooted;

 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS_FINAL
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(IDBIndex)

  [[nodiscard]] static RefPtr<IDBIndex> Create(
      IDBObjectStore* aObjectStore, const indexedDB::IndexMetadata& aMetadata);

  int64_t Id() const {
    AssertIsOnOwningThread();

    return mId;
  }

  const nsString& Name() const;

  bool Unique() const;

  bool MultiEntry() const;

  bool LocaleAware() const;

  const indexedDB::KeyPath& GetKeyPath() const;

  void GetLocale(nsString& aLocale) const;

  const nsCString& Locale() const;

  bool IsAutoLocale() const;

  IDBObjectStore* ObjectStore() const {
    AssertIsOnOwningThread();
    return mObjectStore;
  }

  nsIGlobalObject* GetParentObject() const;

  void GetName(nsString& aName) const { aName = Name(); }

  void SetName(const nsAString& aName, ErrorResult& aRv);

  void GetKeyPath(JSContext* aCx, JS::MutableHandle<JS::Value> aResult,
                  ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> OpenCursor(JSContext* aCx,
                                              JS::Handle<JS::Value> aRange,
                                              IDBCursorDirection aDirection,
                                              ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> OpenKeyCursor(JSContext* aCx,
                                                 JS::Handle<JS::Value> aRange,
                                                 IDBCursorDirection aDirection,
                                                 ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> Get(JSContext* aCx,
                                       JS::Handle<JS::Value> aKey,
                                       ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> GetKey(JSContext* aCx,
                                          JS::Handle<JS::Value> aKey,
                                          ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> Count(JSContext* aCx,
                                         JS::Handle<JS::Value> aKey,
                                         ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> GetAll(JSContext* aCx,
                                          JS::Handle<JS::Value> aQueryOrOptions,
                                          const Optional<uint32_t>& aLimit,
                                          ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> GetAllKeys(JSContext* aCx,
                                              JS::Handle<JS::Value> aKey,
                                              const Optional<uint32_t>& aLimit,
                                              ErrorResult& aRv);

  [[nodiscard]] RefPtr<IDBRequest> GetAllRecords(
      JSContext* aCx, const IDBGetAllOptions& aOptions, ErrorResult& aRv);

  void RefreshMetadata(bool aMayDelete);

  void NoteDeletion();

  bool IsDeleted() const {
    AssertIsOnOwningThread();

    return !!mDeletedMetadata;
  }

  void AssertIsOnOwningThread() const
#ifdef DEBUG
      ;
#else
  {
  }
#endif

  // nsWrapperCache
  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

 private:
  IDBIndex(IDBObjectStore* aObjectStore,
           const indexedDB::IndexMetadata* aMetadata);

  ~IDBIndex();

  [[nodiscard]] RefPtr<IDBRequest> GetInternal(bool aKeyOnly, JSContext* aCx,
                                               JS::Handle<JS::Value> aKey,
                                               ErrorResult& aRv);

  enum class GetRequestType : uint8_t {
    Value,   // getAll
    Key,     // getAllKeys
    Record,  // getAllRecords
  };

  // Common function for GetAll functions (GetAll, GetAllKeys, GetAllRecords).
  // Takes a parsing function as a parameter, because the parsing is different
  // for GetAll/GetAllKeys and GetAllRecords. And we can't pass a GetAllOptions
  // object directly because the parsing needs to happen after performing some
  // initial checks (connection still active, ...)
  template <typename ParseFn>
  [[nodiscard]] RefPtr<IDBRequest> GetAllInternal(
      GetRequestType aType, JSContext* aCx, const ParseFn& aParseOptionsFn,
      ErrorResult& aRv);

  // Build a request for the corresponding type
  indexedDB::RequestParams CreateRequestParams(
      GetRequestType aType, const indexedDB::GetAllOptions& aOptions);

  [[nodiscard]] RefPtr<IDBRequest> OpenCursorInternal(
      bool aKeysOnly, JSContext* aCx, JS::Handle<JS::Value> aRange,
      IDBCursorDirection aDirection, ErrorResult& aRv);
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_idbindex_h_

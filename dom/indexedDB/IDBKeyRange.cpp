/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IDBKeyRange.h"

#include "IDBTransaction.h"
#include "Key.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/HoldDropJSObjects.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/IDBKeyRangeBinding.h"
#include "mozilla/dom/indexedDB/PBackgroundIDBSharedTypes.h"

namespace mozilla::dom {

using namespace mozilla::dom::indexedDB;

namespace {

void GetKeyFromJSVal(JSContext* aCx, JS::Handle<JS::Value> aVal, Key& aKey,
                     ErrorResult& aRv, IDBTransaction* aTransaction = nullptr) {
  auto result = aKey.SetFromJSVal(aCx, aVal, aTransaction);
  if (result.isErr()) {
    aRv = result.unwrapErr().ExtractErrorResult(
        InvalidMapsTo<NS_ERROR_DOM_INDEXEDDB_DATA_ERR>);
    return;
  }

  if (aKey.IsUnset()) {
    aRv.Throw(NS_ERROR_DOM_INDEXEDDB_DATA_ERR);
  }
}

}  // namespace

IDBKeyRange::IDBKeyRange(bool aLowerOpen, bool aUpperOpen, bool aIsOnly)
    : mCachedLowerVal(JS::UndefinedValue()),
      mCachedUpperVal(JS::UndefinedValue()),
      mLowerOpen(aLowerOpen),
      mUpperOpen(aUpperOpen),
      mIsOnly(aIsOnly),
      mHaveCachedLowerVal(false),
      mHaveCachedUpperVal(false),
      mRooted(false) {
  AssertIsOnOwningThread();
}

IDBKeyRange::~IDBKeyRange() { DropJSObjects(); }

// static
void IDBKeyRange::FromJSVal(JSContext* aCx, JS::Handle<JS::Value> aVal,
                            RefPtr<IDBKeyRange>* aKeyRange, ErrorResult& aRv,
                            IDBTransaction* aTransaction) {
  MOZ_ASSERT_IF(!aCx, aVal.isUndefined());
  MOZ_ASSERT(aKeyRange);

  auto result = FromJSVal(aCx, aVal, aKeyRange, aTransaction);
  if (result.isErr()) {
    aRv = result.unwrapErr().ExtractErrorResult(
        InvalidMapsTo<NS_ERROR_DOM_INDEXEDDB_DATA_ERR>);
  }
}

// Implements the following algorithm:
// https://w3c.github.io/IndexedDB/#convert-a-value-to-a-key-range
// Note: check for "null disallowed flag" (step 2) is performed by the caller
// (check if the aKeyRange result is null)
// static
IDBResult<Ok, IDBSpecialValue::InvalidType, IDBSpecialValue::InvalidValue>
IDBKeyRange::FromJSVal(JSContext* aCx, JS::Handle<JS::Value> aVal,
                       RefPtr<IDBKeyRange>* aKeyRange,
                       IDBTransaction* aTransaction) {
  MOZ_ASSERT(aKeyRange);

  RefPtr<IDBKeyRange> keyRange;

  if (aVal.isNullOrUndefined()) {
    // undefined and null returns no IDBKeyRange.
    *aKeyRange = std::move(keyRange);
    return Ok();
  }

  JS::Rooted<JSObject*> obj(aCx, aVal.isObject() ? &aVal.toObject() : nullptr);

  // Unwrap an IDBKeyRange object if possible.
  if (obj && NS_SUCCEEDED(UNWRAP_OBJECT(IDBKeyRange, obj, keyRange))) {
    MOZ_ASSERT(keyRange);
    *aKeyRange = std::move(keyRange);
    return Ok();
  }

  keyRange = new IDBKeyRange(false, false, true);
  auto result = keyRange->Lower().SetFromJSVal(aCx, aVal, aTransaction);
  if (result.isOk()) {
    *aKeyRange = std::move(keyRange);
  }
  return result;
}

// static
RefPtr<IDBKeyRange> IDBKeyRange::FromSerialized(
    const SerializedKeyRange& aKeyRange) {
  RefPtr<IDBKeyRange> keyRange = new IDBKeyRange(
      aKeyRange.lowerOpen(), aKeyRange.upperOpen(), aKeyRange.isOnly());
  keyRange->Lower() = aKeyRange.lower();
  if (!keyRange->IsOnly()) {
    keyRange->Upper() = aKeyRange.upper();
  }
  return keyRange;
}

void IDBKeyRange::ToSerialized(SerializedKeyRange& aKeyRange) const {
  aKeyRange.lowerOpen() = LowerOpen();
  aKeyRange.upperOpen() = UpperOpen();
  aKeyRange.isOnly() = IsOnly();

  aKeyRange.lower() = Lower();
  if (!IsOnly()) {
    aKeyRange.upper() = Upper();
  }
}

NS_IMPL_CYCLE_COLLECTION_CLASS(IDBKeyRange)

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(IDBKeyRange)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(IDBKeyRange)
  NS_IMPL_CYCLE_COLLECTION_TRACE_JS_MEMBER_CALLBACK(mCachedLowerVal)
  NS_IMPL_CYCLE_COLLECTION_TRACE_JS_MEMBER_CALLBACK(mCachedUpperVal)
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(IDBKeyRange)
  tmp->DropJSObjects();
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

void IDBKeyRange::DropJSObjects() {
  if (!mRooted) {
    return;
  }
  mHaveCachedLowerVal = false;
  mHaveCachedUpperVal = false;
  mRooted = false;
  mozilla::DropJSObjects(this);
}

bool IDBKeyRange::WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto,
                             JS::MutableHandle<JSObject*> aReflector) {
  return IDBKeyRange_Binding::Wrap(aCx, this, aGivenProto, aReflector);
}

void IDBKeyRange::GetLower(JSContext* aCx, JS::MutableHandle<JS::Value> aResult,
                           ErrorResult& aRv) {
  AssertIsOnOwningThread();

  if (!mHaveCachedLowerVal) {
    if (!mRooted) {
      mozilla::HoldJSObjects(this);
      mRooted = true;
    }

    aRv = Lower().ToJSVal(aCx, mCachedLowerVal);
    if (aRv.Failed()) {
      return;
    }

    mHaveCachedLowerVal = true;
  }

  aResult.set(mCachedLowerVal);
}

void IDBKeyRange::GetUpper(JSContext* aCx, JS::MutableHandle<JS::Value> aResult,
                           ErrorResult& aRv) {
  AssertIsOnOwningThread();

  if (!mHaveCachedUpperVal) {
    if (!mRooted) {
      mozilla::HoldJSObjects(this);
      mRooted = true;
    }

    aRv = Upper().ToJSVal(aCx, mCachedUpperVal);
    if (aRv.Failed()) {
      return;
    }

    mHaveCachedUpperVal = true;
  }

  aResult.set(mCachedUpperVal);
}

bool IDBKeyRange::Includes(JSContext* aCx, JS::Handle<JS::Value> aValue,
                           ErrorResult& aRv) const {
  Key key;
  GetKeyFromJSVal(aCx, aValue, key, aRv);
  if (aRv.Failed()) {
    return false;
  }

  MOZ_ASSERT(!(Lower().IsUnset() && Upper().IsUnset()));
  MOZ_ASSERT_IF(IsOnly(), !Lower().IsUnset() && !LowerOpen() &&
                              Lower() == Upper() && LowerOpen() == UpperOpen());

  if (!Lower().IsUnset()) {
    switch (Key::CompareKeys(Lower(), key)) {
      case 1:
        return false;
      case 0:
        // Identical keys.
        return !LowerOpen();
      case -1:
        if (IsOnly()) {
          return false;
        }
        break;
      default:
        MOZ_CRASH();
    }
  }

  if (!Upper().IsUnset()) {
    switch (Key::CompareKeys(key, Upper())) {
      case 1:
        return false;
      case 0:
        // Identical keys.
        return !UpperOpen();
      case -1:
        break;
    }
  }

  return true;
}

// static
RefPtr<IDBKeyRange> IDBKeyRange::Only(const GlobalObject& aGlobal,
                                      JS::Handle<JS::Value> aValue,
                                      ErrorResult& aRv) {
  RefPtr<IDBKeyRange> keyRange = new IDBKeyRange(false, false, true);

  GetKeyFromJSVal(aGlobal.Context(), aValue, keyRange->Lower(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  return keyRange;
}

// static
RefPtr<IDBKeyRange> IDBKeyRange::LowerBound(const GlobalObject& aGlobal,
                                            JS::Handle<JS::Value> aValue,
                                            bool aOpen, ErrorResult& aRv) {
  RefPtr<IDBKeyRange> keyRange = new IDBKeyRange(aOpen, true, false);

  GetKeyFromJSVal(aGlobal.Context(), aValue, keyRange->Lower(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  return keyRange;
}

// static
RefPtr<IDBKeyRange> IDBKeyRange::UpperBound(const GlobalObject& aGlobal,
                                            JS::Handle<JS::Value> aValue,
                                            bool aOpen, ErrorResult& aRv) {
  RefPtr<IDBKeyRange> keyRange = new IDBKeyRange(true, aOpen, false);

  GetKeyFromJSVal(aGlobal.Context(), aValue, keyRange->Upper(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  return keyRange;
}

// static
RefPtr<IDBKeyRange> IDBKeyRange::Bound(const GlobalObject& aGlobal,
                                       JS::Handle<JS::Value> aLower,
                                       JS::Handle<JS::Value> aUpper,
                                       bool aLowerOpen, bool aUpperOpen,
                                       ErrorResult& aRv) {
  RefPtr<IDBKeyRange> keyRange = new IDBKeyRange(aLowerOpen, aUpperOpen, false);

  GetKeyFromJSVal(aGlobal.Context(), aLower, keyRange->Lower(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  GetKeyFromJSVal(aGlobal.Context(), aUpper, keyRange->Upper(), aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  if (keyRange->Lower() > keyRange->Upper() ||
      (keyRange->Lower() == keyRange->Upper() && (aLowerOpen || aUpperOpen))) {
    aRv.Throw(NS_ERROR_DOM_INDEXEDDB_DATA_ERR);
    return nullptr;
  }

  return keyRange;
}

}  // namespace mozilla::dom

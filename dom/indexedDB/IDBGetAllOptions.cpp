/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IDBGetAllOptions.h"

#include "IDBKeyRange.h"
#include "IDBResult.h"
#include "mozilla/dom/IDBCursorBinding.h"
#include "mozilla/dom/IDBIndexBinding.h"
#include "mozilla/dom/RootedDictionary.h"

namespace mozilla::dom {

using namespace mozilla::dom::indexedDB;

Result<indexedDB::GetAllOptions, ErrorResult> GetAllOptionsFromQueryOrOptions(
    JSContext* aCx, JS::Handle<JS::Value> aQueryOrOptions,
    const Optional<uint32_t>& aLimit, IDBTransaction* aTransaction) {
  // Check if the first argument is a key range, or an IDBGetAllOptions
  // https://w3c.github.io/IndexedDB/#create-request-to-retrieve-multiple-items
  // "8. If running is a potentially valid key range with queryOrOptions is
  // true, then:"
  // "1. Set range to the result of converting a value to a key range with
  // queryOrOptions. Rethrow any exceptions."
  // Note: we do only one conversion. We first need it for the check "is a
  // potentially valid key".
  // Then there is no need to do the conversion again ("converting a value to
  // a key range") since already have that result.
  // See https://github.com/w3c/IndexedDB/issues/497
  RefPtr<IDBKeyRange> keyRange;
  uint32_t limit = 0;
  IDBCursorDirection direction = IDBCursorDirection::Next;
  auto keyRangeResult =
      IDBKeyRange::FromJSVal(aCx, aQueryOrOptions, &keyRange, aTransaction);
  if (keyRangeResult.isOk()) {
    if (aLimit.WasPassed()) {
      limit = aLimit.Value();
    }
  } else {
    if (!keyRangeResult.inspectErr().Is(SpecialValues::InvalidType)) {
      // https://w3c.github.io/IndexedDB/#is-a-potentially-valid-key-range
      // "3. If key is "invalid type" return false."
      // This means in this case, we don't run the steps 8 & 9/"else" of:
      // https://w3c.github.io/IndexedDB/#create-a-request-to-retrieve-multiple-items
      return Err(keyRangeResult.unwrapErr().ExtractErrorResult(
          InvalidMapsTo<NS_ERROR_DOM_INDEXEDDB_DATA_ERR>));
    }
    // "9. Else: Set range to the result of converting a value to a key range
    // with queryOrOptions["query"]. Rethrow any exceptions."
    // InvalidType means the value is not a key type, so assume aQueryOrOptions
    // is in IDBGetAllOptions format.
    RootedDictionary<IDBGetAllOptions> options(aCx);
    if (NS_WARN_IF(!options.Init(aCx, aQueryOrOptions))) {
      ErrorResult rv;
      rv.StealExceptionFromJSContext(aCx);
      if (!rv.Failed()) {
        rv.Throw(NS_ERROR_DOM_INDEXEDDB_DATA_ERR);
      }
      return Err(std::move(rv));
    }
    JS::Rooted<JS::Value> keyVal(aCx, options.mQuery);
    ErrorResult rv;
    IDBKeyRange::FromJSVal(aCx, keyVal, &keyRange, rv, aTransaction);
    if (NS_WARN_IF(rv.Failed())) {
      return Err(std::move(rv));
    }
    // Use "count" from IDBGetAllOptions
    if (options.mCount.WasPassed()) {
      limit = options.mCount.Value();
    }
    direction = options.mDirection;
  }

  Maybe<SerializedKeyRange> optionalKeyRange;
  if (keyRange) {
    SerializedKeyRange serializedKeyRange;
    keyRange->ToSerialized(serializedKeyRange);
    optionalKeyRange.emplace(serializedKeyRange);
  }

  return GetAllOptions{std::move(optionalKeyRange), limit, direction};
}

Result<indexedDB::GetAllOptions, ErrorResult> GetAllOptionsFromArg(
    JSContext* aCx, const IDBGetAllOptions& aOptions,
    IDBTransaction* aTransaction) {
  RefPtr<IDBKeyRange> keyRange;
  JS::Rooted<JS::Value> keyVal(aCx, aOptions.mQuery);
  ErrorResult rv;
  IDBKeyRange::FromJSVal(aCx, keyVal, &keyRange, rv, aTransaction);
  if (NS_WARN_IF(rv.Failed())) {
    return Err(std::move(rv));
  }

  Maybe<SerializedKeyRange> optionalKeyRange;
  if (keyRange) {
    SerializedKeyRange serializedKeyRange;
    keyRange->ToSerialized(serializedKeyRange);
    optionalKeyRange.emplace(serializedKeyRange);
  }

  const uint32_t limit =
      aOptions.mCount.WasPassed() ? aOptions.mCount.Value() : 0;
  return GetAllOptions{std::move(optionalKeyRange), limit, aOptions.mDirection};
}

}  // namespace mozilla::dom

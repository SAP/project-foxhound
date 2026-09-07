/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_indexeddb_idbresult_h_
#define mozilla_dom_indexeddb_idbresult_h_

#include <type_traits>
#include <utility>

#include "mozilla/ErrorResult.h"
#include "mozilla/ResultVariant.h"
#include "mozilla/Variant.h"

namespace mozilla::dom::indexedDB {

// IDBSpecialValue represents three special return values, distinct from any
// other value, used in several places in the IndexedDB spec.
enum class IDBSpecialValue { Failure, InvalidType, InvalidValue };

namespace detail {

template <IDBSpecialValue Value>
using SpecialConstant = std::integral_constant<IDBSpecialValue, Value>;
using FailureType = SpecialConstant<IDBSpecialValue::Failure>;
using InvalidTypeType = SpecialConstant<IDBSpecialValue::InvalidType>;
using InvalidValueType = SpecialConstant<IDBSpecialValue::InvalidValue>;
struct ExceptionType final {};
}  // namespace detail

// Put these in a subnamespace to avoid conflicts from the combination of 1.
// using namespace mozilla::dom::indexedDB; in cpp files, 2. the unified build
// and 3. mozilla::dom::Exception
namespace SpecialValues {
constexpr const detail::FailureType Failure;
constexpr const detail::InvalidTypeType InvalidType;
constexpr const detail::InvalidValueType InvalidValue;
constexpr const detail::ExceptionType Exception;
}  // namespace SpecialValues

namespace detail {
template <IDBSpecialValue... Elements>
struct IsSortedSet;

template <IDBSpecialValue First, IDBSpecialValue Second,
          IDBSpecialValue... Rest>
struct IsSortedSet<First, Second, Rest...>
    : std::conjunction<IsSortedSet<First, Second>,
                       IsSortedSet<Second, Rest...>> {};

template <IDBSpecialValue First, IDBSpecialValue Second>
struct IsSortedSet<First, Second> : std::bool_constant<(First < Second)> {};

template <IDBSpecialValue First>
struct IsSortedSet<First> : std::true_type {};

template <>
struct IsSortedSet<> : std::true_type {};

template <IDBSpecialValue... S>
class IDBError {
  // This assertion ensures that permutations of the set of possible special
  // values don't create distinct types.
  static_assert(IsSortedSet<S...>::value,
                "special value list must be sorted and unique");

  template <IDBSpecialValue... U>
  friend class IDBError;

 public:
  MOZ_IMPLICIT IDBError(nsresult aRv) : mVariant(ErrorResult{aRv}) {}

  IDBError(ExceptionType, ErrorResult&& aErrorResult)
      : mVariant(std::move(aErrorResult)) {}

  template <IDBSpecialValue Special>
  MOZ_IMPLICIT IDBError(SpecialConstant<Special>)
      : mVariant(SpecialConstant<Special>{}) {}

  IDBError(IDBError&&) = default;
  IDBError& operator=(IDBError&&) = default;

  // Construct an IDBResult from another IDBResult whose set of possible special
  // values is a subset of this one's.
  template <IDBSpecialValue... U>
  MOZ_IMPLICIT IDBError(IDBError<U...>&& aOther)
      : mVariant(aOther.mVariant.match(
            [](auto& aVariant) { return VariantType{std::move(aVariant)}; })) {}

  bool Is(ExceptionType) const { return mVariant.template is<ErrorResult>(); }

  template <IDBSpecialValue Special>
  bool Is(SpecialConstant<Special>) const {
    return mVariant.template is<SpecialConstant<Special>>();
  }

  ErrorResult& AsException() { return mVariant.template as<ErrorResult>(); }

  template <typename SpecialValueMappers>
  ErrorResult ExtractErrorResult(SpecialValueMappers aSpecialValueMappers) {
    return mVariant.match(
        [](ErrorResult& aException) { return std::move(aException); },
        [aSpecialValueMappers](const SpecialConstant<S>& aSpecialValue) {
          return ErrorResult{aSpecialValueMappers(aSpecialValue)};
        }...);
  }

 protected:
  using VariantType = Variant<ErrorResult, SpecialConstant<S>...>;

  VariantType mVariant;
};
}  // namespace detail

// Represents a return value of an IndexedDB algorithm. T is the type of the
// regular return value, while S is a list of special values that can be
// returned by the particular algorithm.
template <typename T, IDBSpecialValue... S>
using IDBResult = Result<T, detail::IDBError<S...>>;

template <nsresult E>
inline constexpr auto InvalidMapsTo = [](auto) { return E; };

inline detail::IDBError<> IDBException(nsresult aRv) {
  return {SpecialValues::Exception, ErrorResult{aRv}};
}

template <IDBSpecialValue Special>
detail::IDBError<Special> IDBError(detail::SpecialConstant<Special> aResult) {
  return {aResult};
}

}  // namespace mozilla::dom::indexedDB

#endif  // mozilla_dom_indexeddb_idbresult_h_

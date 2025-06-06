/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * Modifications Copyright SAP SE. 2019-2021.  All rights reserved.
 */

#ifndef nsTLiteralString_h
#define nsTLiteralString_h

#include "nsTStringRepr.h"
#include "mozilla/StaticString.h"

/**
 * nsTLiteralString_CharT
 *
 * Stores a null-terminated, immutable sequence of characters.
 *
 * nsTString-lookalike that restricts its string value to a literal character
 * sequence. Can be implicitly cast to const nsTString& (the const is
 * essential, since this class's data are not writable). The data are assumed
 * to be static (permanent) and therefore, as an optimization, this class
 * does not have a destructor.
 */
template <typename T>
class nsTLiteralString : public mozilla::detail::nsTStringRepr<T> {
 public:
  typedef nsTLiteralString<T> self_type;

#ifdef __clang__
  // bindgen w/ clang 3.9 at least chokes on a typedef, but using is okay.
  using typename mozilla::detail::nsTStringRepr<T>::base_string_type;
#else
  // On the other hand msvc chokes on the using statement. It seems others
  // don't care either way so we lump them in here.
  typedef typename mozilla::detail::nsTStringRepr<T>::base_string_type
      base_string_type;
#endif

  typedef typename base_string_type::char_type char_type;
  typedef typename base_string_type::size_type size_type;
  typedef typename base_string_type::DataFlags DataFlags;
  typedef typename base_string_type::ClassFlags ClassFlags;

 public:
  /**
   * constructor
   */

  /**
   * Foxhound:
   *
   * In order to ensure that nsLiteralStrings can be used in constexpr
   * expressions, we need to explicitly define the nsTLiteralString constructor
   * to call the nsTStringRepr base class constructor. This will create an object
   * with StringTaint() constructor, which is a constexpr (as ranges_ = nullptr)
   *
   * Note this means we can't have literals which are tainted: the class is only
   * a valid constexpr for the StringTaint() constructor, all other constructors
   * create a pointer on the stack, which is not available at compile time.
   *
   * This is OK for nsLiteralStrings as they are all created at compile time and
   * are constant, so will never be tainted.
   */
  constexpr nsTLiteralString(const nsTLiteralString& aStr)
    : base_string_type(aStr.mData, aStr.mLength, aStr.mDataFlags, aStr.mClassFlags) {}

  template <size_type N>
  explicit constexpr nsTLiteralString(const char_type (&aStr)[N])
      : nsTLiteralString(aStr, N - 1) {}


  /**
   * For compatibility with existing code that requires const ns[C]String*.
   * Use sparingly. If possible, rewrite code to use const ns[C]String&
   * and the implicit cast will just work.
   */
  const nsTString<T>& AsString() const MOZ_LIFETIME_BOUND {
    return *reinterpret_cast<const nsTString<T>*>(this);
  }

  operator const nsTString<T>&() const MOZ_LIFETIME_BOUND { return AsString(); }

  template <typename N, typename Dummy>
  struct raw_type {
    typedef N* type;
  };

#ifdef MOZ_USE_CHAR16_WRAPPER
  template <typename Dummy>
  struct raw_type<char16_t, Dummy> {
    typedef char16ptr_t type;
  };
#endif

  /**
   * Prohibit get() on temporaries as in "x"_ns.get().
   * These should be written as just "x", using a string literal directly.
   */
  constexpr const typename raw_type<T, int>::type get() const&& = delete;
  constexpr const typename raw_type<T, int>::type get() const& {
    return this->mData;
  }

// At least older gcc versions do not accept these friend declarations,
// complaining about an "invalid argument list" here, but not where the actual
// operators are defined or used. We make the supposed-to-be-private constructor
// public when building with gcc, relying on the default clang builds to fail if
// any non-private use of that constructor would get into the codebase.
#if defined(__clang__)
 private:
  friend constexpr auto operator"" _ns(const char* aStr, std::size_t aLen);
  friend constexpr auto operator"" _ns(const char16_t* aStr, std::size_t aLen);
#else
 public:
#endif
  // Only for use by operator""
  constexpr nsTLiteralString(const char_type* aStr, size_t aLen)
      : base_string_type(const_cast<char_type*>(aStr), aLen,
                         DataFlags::TERMINATED | DataFlags::LITERAL,
                         ClassFlags::NULL_TERMINATED) {}

 public:
  // NOT TO BE IMPLEMENTED
  template <size_type N>
  nsTLiteralString(char_type (&aStr)[N]) = delete;

  nsTLiteralString& operator=(const nsTLiteralString&) = delete;
};

extern template class nsTLiteralString<char>;
extern template class nsTLiteralString<char16_t>;

namespace mozilla {
constexpr MOZ_IMPLICIT StaticString::StaticString(nsLiteralCString const& str)
    : mStr(str.get()) {}
}  // namespace mozilla

#endif

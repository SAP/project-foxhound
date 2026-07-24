/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "builtin/intl/LocaleNegotiation.h"

#include "mozilla/Assertions.h"
#include "mozilla/EnumeratedRange.h"
#include "mozilla/intl/Calendar.h"
#include "mozilla/intl/Collator.h"
#include "mozilla/intl/Locale.h"
#include "mozilla/intl/NumberingSystem.h"
#include "mozilla/Maybe.h"
#include "mozilla/Range.h"

#include <algorithm>
#include <array>
#include <iterator>
#include <stddef.h>
#include <utility>

#include "builtin/Array.h"
#include "builtin/intl/CommonFunctions.h"
#include "builtin/intl/FormatBuffer.h"
#include "builtin/intl/NumberingSystemsGenerated.h"
#include "builtin/intl/ParameterNegotiation.h"
#include "builtin/intl/SharedIntlData.h"
#include "builtin/intl/StringAsciiChars.h"
#include "js/Conversions.h"
#include "js/Result.h"
#include "util/StringBuilder.h"
#include "vm/ArrayObject.h"
#include "vm/GlobalObject.h"
#include "vm/JSContext.h"
#include "vm/PlainObject.h"
#include "vm/Realm.h"
#include "vm/StringType.h"

#include "vm/NativeObject-inl.h"
#include "vm/ObjectOperations-inl.h"

using namespace js;
using namespace js::intl;

static constexpr auto UnicodeExtensionKeyNames() {
  mozilla::EnumeratedArray<UnicodeExtensionKey, const char*> names;
  names[UnicodeExtensionKey::Calendar] = "ca";
  names[UnicodeExtensionKey::Collation] = "co";
  names[UnicodeExtensionKey::CollationCaseFirst] = "kf";
  names[UnicodeExtensionKey::CollationNumeric] = "kn";
  names[UnicodeExtensionKey::HourCycle] = "hc";
  names[UnicodeExtensionKey::NumberingSystem] = "nu";
  return names;
}

template <typename CharT>
static mozilla::Maybe<UnicodeExtensionKey> ToUnicodeExtensionKey(
    std::basic_string_view<CharT> subtag) {
  MOZ_ASSERT(subtag.length() == 2);

  static constexpr auto names = UnicodeExtensionKeyNames();
  for (auto key : mozilla::MakeInclusiveEnumeratedRange(
           mozilla::MaxEnumValue<UnicodeExtensionKey>::value)) {
    const auto* name = names[key];
    if (name[0] == subtag[0] && name[1] == subtag[1]) {
      return mozilla::Some(key);
    }
  }
  return mozilla::Nothing();
}

static bool AssertCanonicalLocaleWithoutUnicodeExtension(
    JSContext* cx, Handle<JSLinearString*> locale) {
#ifdef DEBUG
  MOZ_ASSERT(StringIsAscii(locale), "language tags are ASCII-only");

  // |locale| is a structurally valid language tag.
  mozilla::intl::Locale tag;

  using ParserError = mozilla::intl::LocaleParser::ParserError;
  mozilla::Result<mozilla::Ok, ParserError> parse_result = Ok();
  {
    StringAsciiChars chars(locale);
    if (!chars.init(cx)) {
      return false;
    }

    parse_result = mozilla::intl::LocaleParser::TryParse(chars, tag);
  }

  if (parse_result.isErr()) {
    MOZ_ASSERT(parse_result.unwrapErr() == ParserError::OutOfMemory,
               "locale is a structurally valid language tag");

    ReportInternalError(cx);
    return false;
  }

  MOZ_ASSERT(!tag.GetUnicodeExtension(),
             "locale must contain no Unicode extensions");

  if (auto result = tag.Canonicalize(); result.isErr()) {
    MOZ_ASSERT(result.unwrapErr() !=
               mozilla::intl::Locale::CanonicalizationError::DuplicateVariant);
    ReportInternalError(cx);
    return false;
  }

  FormatBuffer<char, INITIAL_CHAR_BUFFER_SIZE> buffer(cx);
  if (auto result = tag.ToString(buffer); result.isErr()) {
    ReportInternalError(cx, result.unwrapErr());
    return false;
  }

  MOZ_ASSERT(StringEqualsAscii(locale, buffer.data(), buffer.length()),
             "locale is a canonicalized language tag");
#endif
  return true;
}

static bool SameOrParentLocale(const JSLinearString* locale,
                               const JSLinearString* otherLocale) {
  // Return true if |locale| is the same locale as |otherLocale|.
  if (locale->length() == otherLocale->length()) {
    return EqualStrings(locale, otherLocale);
  }

  // Also return true if |locale| is the parent locale of |otherLocale|.
  if (locale->length() < otherLocale->length()) {
    return HasSubstringAt(otherLocale, locale, 0) &&
           otherLocale->latin1OrTwoByteChar(locale->length()) == '-';
  }

  return false;
}

/**
 * 9.2.2 BestAvailableLocale ( availableLocales, locale )
 *
 * Compares a BCP 47 language tag against the locales in availableLocales and
 * returns the best available match. Uses the fallback mechanism of RFC 4647,
 * section 3.4.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.2.
 * Spec: RFC 4647, section 3.4.
 */
static JS::Result<JSLinearString*> BestAvailableLocale(
    JSContext* cx, AvailableLocaleKind availableLocales,
    Handle<JSLinearString*> locale, Handle<JSLinearString*> defaultLocale) {
  // In the spec, [[availableLocales]] is formally a list of all available
  // locales. But in our implementation, it's an *incomplete* list, not
  // necessarily including the default locale (and all locales implied by it,
  // e.g. "de" implied by "de-CH"), if that locale isn't in every
  // [[availableLocales]] list (because that locale is supported through
  // fallback, e.g. "de-CH" supported through "de").
  //
  // If we're considering the default locale, augment the spec loop with
  // additional checks to also test whether the current prefix is a prefix of
  // the default locale.

  auto& sharedIntlData = cx->runtime()->sharedIntlData.ref();

  auto findLast = [](const auto* chars, size_t length) {
    auto rbegin = std::make_reverse_iterator(chars + length);
    auto rend = std::make_reverse_iterator(chars);
    auto p = std::find(rbegin, rend, '-');

    // |dist(chars, p.base())| is equal to |dist(p, rend)|, pick whichever you
    // find easier to reason about when using reserve iterators.
    ptrdiff_t r = std::distance(chars, p.base());
    MOZ_ASSERT(r == std::distance(p, rend));

    // But always subtract one to convert from the reverse iterator result to
    // the correspoding forward iterator value, because reserve iterators point
    // to one element past the forward iterator value.
    return r - 1;
  };

  if (!AssertCanonicalLocaleWithoutUnicodeExtension(cx, locale)) {
    return cx->alreadyReportedError();
  }

  // Step 1.
  Rooted<JSLinearString*> candidate(cx, locale);

  // Step 2.
  while (true) {
    // Step 2.a.
    bool supported = false;
    if (!sharedIntlData.isAvailableLocale(cx, availableLocales, candidate,
                                          &supported)) {
      return cx->alreadyReportedError();
    }
    if (supported) {
      return candidate.get();
    }

    if (defaultLocale && SameOrParentLocale(candidate, defaultLocale)) {
      return candidate.get();
    }

    // Step 2.b.
    ptrdiff_t pos;
    if (candidate->hasLatin1Chars()) {
      JS::AutoCheckCannotGC nogc;
      pos = findLast(candidate->latin1Chars(nogc), candidate->length());
    } else {
      JS::AutoCheckCannotGC nogc;
      pos = findLast(candidate->twoByteChars(nogc), candidate->length());
    }

    if (pos < 0) {
      return nullptr;
    }

    // Step 2.c.
    size_t length = size_t(pos);
    if (length >= 2 && candidate->latin1OrTwoByteChar(length - 2) == '-') {
      length -= 2;
    }

    // Step 2.d.
    candidate = NewDependentString(cx, candidate, 0, length);
    if (!candidate) {
      return cx->alreadyReportedError();
    }
  }
}

// 9.2.2 BestAvailableLocale ( availableLocales, locale )
//
// Carries an additional third argument in our implementation to provide the
// default locale. See the doc-comment in the header file.
bool js::intl::BestAvailableLocale(JSContext* cx,
                                   AvailableLocaleKind availableLocales,
                                   Handle<JSLinearString*> locale,
                                   Handle<JSLinearString*> defaultLocale,
                                   MutableHandle<JSLinearString*> result) {
  JSLinearString* res;
  JS_TRY_VAR_OR_RETURN_FALSE(
      cx, res,
      BestAvailableLocale(cx, availableLocales, locale, defaultLocale));
  if (res) {
    result.set(res);
  } else {
    result.set(nullptr);
  }
  return true;
}

template <typename CharT>
static size_t BaseNameLength(mozilla::Range<const CharT> locale) {
  // Search for the start of the first singleton subtag.
  for (size_t i = 0; i < locale.length(); i++) {
    if (locale[i] == '-') {
      MOZ_RELEASE_ASSERT(i + 2 < locale.length(), "invalid locale");
      if (locale[i + 2] == '-') {
        return i;
      }
    }
  }
  return locale.length();
}

static size_t BaseNameLength(JSLinearString* locale) {
  JS::AutoCheckCannotGC nogc;
  if (locale->hasLatin1Chars()) {
    return BaseNameLength(locale->latin1Range(nogc));
  }
  return BaseNameLength(locale->twoByteRange(nogc));
}

/**
 * Returns the subset of requestedLocales for which availableLocales has a
 * matching (possibly fallback) locale. Locales appear in the same order in the
 * returned list as in the input list.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.7.
 * Spec: ECMAScript Internationalization API Specification, 9.2.8.
 */
static bool LookupSupportedLocales(
    JSContext* cx, AvailableLocaleKind availableLocales,
    Handle<LocalesList> requestedLocales,
    MutableHandle<LocalesList> supportedLocales) {
  // Step 1.
  MOZ_ASSERT(supportedLocales.empty());

  Rooted<JSLinearString*> defaultLocale(
      cx, cx->global()->globalIntlData().defaultLocale(cx));
  if (!defaultLocale) {
    return false;
  }

  // Step 2.
  Rooted<JSLinearString*> noExtensionsLocale(cx);
  Rooted<JSLinearString*> availableLocale(cx);
  for (size_t i = 0; i < requestedLocales.length(); i++) {
    auto locale = requestedLocales[i];

    // Step 2.a.
    //
    // Use the base name to ignore any extension sequences.
    noExtensionsLocale =
        NewDependentString(cx, locale, 0, BaseNameLength(locale));
    if (!noExtensionsLocale) {
      return false;
    }

    // Step 2.b.
    JSLinearString* availableLocale;
    JS_TRY_VAR_OR_RETURN_FALSE(
        cx, availableLocale,
        BestAvailableLocale(cx, availableLocales, noExtensionsLocale,
                            defaultLocale));

    // Step 2.c.
    if (availableLocale) {
      if (!supportedLocales.append(locale)) {
        return false;
      }
    }
  }

  // Step 3.
  return true;
}

/**
 * Returns the subset of requestedLocales for which availableLocales has a
 * matching (possibly fallback) locale. Locales appear in the same order in the
 * returned list as in the input list.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.9.
 */
static bool SupportedLocales(JSContext* cx,
                             AvailableLocaleKind availableLocales,
                             Handle<LocalesList> requestedLocales,
                             Handle<Value> options,
                             MutableHandle<LocalesList> supportedLocales) {
  // Step 1.
  if (!options.isUndefined()) {
    // Step 1.a.
    Rooted<JSObject*> obj(cx, ToObject(cx, options));
    if (!obj) {
      return false;
    }

    // Step 1.b.
    LocaleMatcher localeMatcher;
    if (!GetLocaleMatcherOption(cx, obj, JSMSG_INVALID_LOCALE_MATCHER,
                                &localeMatcher)) {
      return false;
    }
  }

  // Steps 2-5.
  //
  // We don't yet support anything better than the lookup matcher.
  return LookupSupportedLocales(cx, availableLocales, requestedLocales,
                                supportedLocales);
}

/**
 * Returns the start and end indices of a "Unicode locale extension sequence",
 * which the specification defines as: "any substring of a language tag that
 * starts with a separator '-' and the singleton 'u' and includes the maximum
 * sequence of following non-singleton subtags and their preceding '-'
 * separators."
 *
 * Alternatively, this may be defined as: the components of a language tag that
 * match the `unicode_locale_extensions` production in UTS 35.
 *
 * Spec: ECMAScript Internationalization API Specification, 6.2.1.
 */
template <typename CharT>
static std::pair<size_t, size_t> FindUnicodeExtensionSequence(
    mozilla::Range<const CharT> locale) {
  // Return early if the locale string is too small to hold any Unicode
  // extension sequences. (This is the common case, so handle it first.)
  //
  // Smallest language subtag has two characters.
  // Smallest Unicode extension sequence has five characters
  if (locale.length() < (2 + 5)) {
    return {};
  }

  // Search for the start of a Unicode extension sequence.
  //
  // Begin searching after the smallest possible language subtag, namely
  // |2alpha|. End searching once the remaining characters can't fit the
  // smallest possible Unicode extension sequence, namely |"-u-" 2alphanum|.
  // Note the reduced end-limit means indexing inside the loop is always
  // in-range.
  size_t start = 0;
  for (size_t i = 2; i <= locale.length() - 5; i++) {
    // Search for "-u-" marking the start of a Unicode extension sequence.
    if (locale[i] == '-' && locale[i + 1] == 'u' && locale[i + 2] == '-') {
      start = i;
      break;
    }

    // And search for "-x-" marking the start of any privateuse component to
    // handle the case when "-u-" was only found within a privateuse subtag.
    if (locale[i] == '-' && locale[i + 1] == 'x' && locale[i + 2] == '-') {
      break;
    }
  }

  // Return if no Unicode extension sequence was found.
  if (start == 0) {
    return {};
  }

  // Search for the start of the next singleton or privateuse subtag.
  //
  // Begin searching after the smallest possible Unicode locale extension
  // sequence, namely |"-u-" 2alphanum|. End searching once the remaining
  // characters can't fit the smallest possible privateuse subtag, namely
  // |"-x-" alphanum|. Note the reduced end-limit means indexing inside the loop
  // is always in-range.
  for (size_t i = start + 5; i <= locale.length() - 4; i++) {
    if (locale[i] != '-') {
      continue;
    }
    if (locale[i + 2] == '-') {
      return {start, i};
    }

    // Skip over (i + 1) and (i + 2) because we've just verified they aren't
    // "-", so the next possible delimiter can only be at (i + 3).
    i += 2;
  }

  // If no singleton or privateuse subtag was found, the Unicode extension
  // sequence extends until the end of the string.
  return {start, locale.length()};
}

static auto FindUnicodeExtensionSequence(const JSLinearString* locale) {
  JS::AutoCheckCannotGC nogc;
  if (locale->hasLatin1Chars()) {
    return FindUnicodeExtensionSequence(locale->latin1Range(nogc));
  }
  return FindUnicodeExtensionSequence(locale->twoByteRange(nogc));
}

void js::intl::LookupMatcherResult::trace(JSTracer* trc) {
  TraceNullableRoot(trc, &locale_, "LookupMatcherResult::locale");
  TraceNullableRoot(trc, &extension_, "LookupMatcherResult::extension");
}

/**
 * LookupMatchingLocaleByPrefix ( availableLocales, requestedLocales )
 */
bool js::intl::LookupMatcher(JSContext* cx,
                             AvailableLocaleKind availableLocales,
                             Handle<ArrayObject*> locales,
                             MutableHandle<LookupMatcherResult> result) {
  MOZ_RELEASE_ASSERT(IsPackedArray(locales));

  Rooted<JSLinearString*> defaultLocale(
      cx, cx->global()->globalIntlData().defaultLocale(cx));
  if (!defaultLocale) {
    return false;
  }

  // Step 1. (Not applicable)

  // Step 2.
  Rooted<JSLinearString*> locale(cx);
  Rooted<JSLinearString*> noExtensionsLocale(cx);
  Rooted<JSLinearString*> availableLocale(cx);
  for (size_t i = 0, length = locales->length(); i < length; i++) {
    locale = locales->getDenseElement(i).toString()->ensureLinear(cx);
    if (!locale) {
      return false;
    }

    // Step 2.a.
    //
    // Use the base name to ignore any extension sequences.
    noExtensionsLocale =
        NewDependentString(cx, locale, 0, BaseNameLength(locale));
    if (!noExtensionsLocale) {
      return false;
    }

    // Step 2.b.
    JS_TRY_VAR_OR_RETURN_FALSE(
        cx, availableLocale,
        BestAvailableLocale(cx, availableLocales, noExtensionsLocale,
                            defaultLocale));

    // Step 2.c.
    if (availableLocale) {
      // Step 2.c.i. (Not applicable)

      // Step 2.c.ii.
      //
      // Search for Unicode extension sequences if |locale| contains any
      // extension subtags.
      JSLinearString* extension = nullptr;
      if (locale->length() > noExtensionsLocale->length()) {
        auto [startOfUnicodeExtensions, endOfUnicodeExtensions] =
            FindUnicodeExtensionSequence(locale);

        // Extract the Unicode extension sequence of |locale|.
        if (startOfUnicodeExtensions) {
          MOZ_ASSERT(startOfUnicodeExtensions < endOfUnicodeExtensions);
          MOZ_ASSERT(endOfUnicodeExtensions <= locale->length());

          extension = NewDependentString(
              cx, locale, startOfUnicodeExtensions,
              endOfUnicodeExtensions - startOfUnicodeExtensions);
          if (!extension) {
            return false;
          }
        }
      }

      // Step 2.c.iii.
      result.set({availableLocale, extension});
      return true;
    }
  }

  // Steps 3-5.
  result.set({defaultLocale, nullptr});
  return true;
}

void js::intl::LocaleOptions::trace(JSTracer* trc) {
  for (auto& extension : extensions_) {
    TraceNullableRoot(trc, &extension, "LocaleOptions::extension");
  }
}

JSLinearString* js::intl::ResolvedLocale::toLocale(JSContext* cx) const {
  if (keywords_.isEmpty()) {
    return dataLocale_;
  }

  JSStringBuilder sb(cx);
  if (!sb.append(dataLocale_)) {
    return nullptr;
  }
  if (!sb.append("-u")) {
    return nullptr;
  }
  for (auto key : keywords_) {
    static constexpr auto names = UnicodeExtensionKeyNames();

    if (!sb.append('-') || !sb.append(names[key], 2)) {
      return nullptr;
    }

    auto* extension = extensions_[key];
    MOZ_ASSERT(extension);

    if (!extension->empty() && !StringEqualsLiteral(extension, "true")) {
      if (!sb.append('-') || !sb.append(extension)) {
        return nullptr;
      }
    }
  }
  return sb.finishString();
}

void js::intl::ResolvedLocale::trace(JSTracer* trc) {
  TraceNullableRoot(trc, &dataLocale_, "ResolvedLocale::dataLocale");
  for (auto& extension : extensions_) {
    TraceNullableRoot(trc, &extension, "ResolvedLocale::extension");
  }
}

/**
 * Unicode extension keywords found by UnicodeExtensionComponents.
 */
class UnicodeExtensionKeywords {
  // Start position and length of a Unicode extension keyword.
  using Value = std::pair<size_t, size_t>;

  mozilla::EnumeratedArray<UnicodeExtensionKey, Value> keywords;

 public:
  /**
   * Return `true` if the Unicode extension |key| is present.
   */
  bool has(UnicodeExtensionKey key) const { return keywords[key].first > 0; }

  /**
   * Get the Unicode extension for the argument |key|.
   */
  const auto& get(UnicodeExtensionKey key) const { return keywords[key]; }

  /**
   * Get a mutable reference to the Unicode extension for the argument |key|.
   */
  auto& get(UnicodeExtensionKey key) { return keywords[key]; }
};

/**
 * UnicodeExtensionComponents ( extension )
 */
template <typename CharT>
static auto UnicodeExtensionComponents(
    std::basic_string_view<CharT> extension) {
  // Step 1.
  MOZ_ASSERT(std::all_of(extension.begin(), extension.end(), [](auto ch) {
    return mozilla::IsAscii(ch) && !mozilla::IsAsciiUppercaseAlpha(ch);
  }));

  // Step 2.
  MOZ_ASSERT(extension.length() >= 5);
  MOZ_ASSERT(extension[0] == '-');
  MOZ_ASSERT(extension[1] == 'u');
  MOZ_ASSERT(extension[2] == '-');

  // Step 3. (Not applicable in our implementation.)

  // Step 4.
  UnicodeExtensionKeywords keywords{};

  // Step 5.
  mozilla::Maybe<UnicodeExtensionKey> key{};

  // Steps 6-8.
  for (size_t k = 3; k < extension.length();) {
    // Step 8.a.
    size_t e = extension.find('-', k);

    // Step 8.b.
    size_t len = (e == extension.npos ? extension.length() : e) - k;

    // Step 8.c.
    auto subtag = extension.substr(k, len);

    // Steps 8.d-e.
    MOZ_ASSERT(len >= 2);

    // Steps 8.f-i
    if (len == 2) {
      key = ToUnicodeExtensionKey(subtag);

      if (key && !keywords.has(*key)) {
        // Record keyword start position.
        keywords.get(*key) = {k + 3, 0};
      } else {
        // Ignore duplicate or irrelevant keywords.
        key = mozilla::Nothing();
      }
    } else if (key) {
      // Update keyword length.
      auto& keyword = keywords.get(*key);
      if (keyword.second == 0) {
        keyword.second = len;
      } else {
        keyword.second += 1 + len;
      }
    }

    // Step 8.j.
    k = k + len + 1;
  }

  // Step 9.
  return keywords;
}

/**
 * UnicodeExtensionComponents ( extension )
 */
static auto UnicodeExtensionComponents(const JSLinearString* extension) {
  MOZ_ASSERT(StringIsAscii(extension));

  JS::AutoCheckCannotGC nogc;

  if (extension->hasLatin1Chars()) {
    const auto* chars = extension->latin1Chars(nogc);
    std::string_view sv{reinterpret_cast<const char*>(chars),
                        extension->length()};
    return UnicodeExtensionComponents(sv);
  }

  const auto* chars = extension->twoByteChars(nogc);
  std::u16string_view sv{chars, extension->length()};
  return UnicodeExtensionComponents(sv);
}

/**
 * Return `true` in |result| iff `string` is a supported calendar for the
 * requested locale. Otherwise set |result| to `false`.
 */
static bool IsSupportedCalendar(JSContext* cx, Handle<JSLinearString*> loc,
                                Handle<JSLinearString*> string, bool* result) {
  MOZ_ASSERT(StringIsAscii(string));

  auto locale = EncodeLocale(cx, loc);
  if (!locale) {
    return false;
  }

  auto keywords =
      mozilla::intl::Calendar::GetBcp47KeywordValuesForLocale(locale.get());
  if (keywords.isErr()) {
    ReportInternalError(cx, keywords.unwrapErr());
    return false;
  }

  for (auto keyword : keywords.unwrap()) {
    if (keyword.isErr()) {
      ReportInternalError(cx);
      return false;
    }
    auto calendar = keyword.unwrap();

    if (StringEqualsAscii(string, calendar.data(), calendar.size())) {
      *result = true;
      return true;
    }
  }

  *result = false;
  return true;
}

/**
 * Return `true` in |result| iff `string` is a supported collation for the
 * requested locale. Otherwise set |result| to `false`.
 */
static bool IsSupportedCollation(JSContext* cx, Handle<JSLinearString*> loc,
                                 Handle<JSLinearString*> string, bool* result) {
  MOZ_ASSERT(StringIsAscii(string));

  auto locale = EncodeLocale(cx, loc);
  if (!locale) {
    return false;
  }

  auto keywords =
      mozilla::intl::Collator::GetBcp47KeywordValuesForLocale(locale.get());
  if (keywords.isErr()) {
    ReportInternalError(cx, keywords.unwrapErr());
    return false;
  }

  for (auto keyword : keywords.unwrap()) {
    if (keyword.isErr()) {
      ReportInternalError(cx);
      return false;
    }
    auto collation = keyword.unwrap();

    // Per ECMA-402, 10.2.3, we don't include standard and search:
    //
    // The values "standard" and "search" must not be used as elements in any
    // [[SortLocaleData]].[[<locale>]].[[co]] and
    // [[SearchLocaleData]].[[<locale>]].[[co]] List.
    static constexpr auto standard = mozilla::MakeStringSpan("standard");
    static constexpr auto search = mozilla::MakeStringSpan("search");
    if (collation == standard || collation == search) {
      continue;
    }

    if (StringEqualsAscii(string, collation.data(), collation.size())) {
      *result = true;
      return true;
    }
  }

  *result = false;
  return true;
}

/**
 * Return `true` in |result| iff `string` is a supported collation "case first"
 * value. Otherwise set |result| to `false`.
 */
template <typename CharT>
static bool IsSupportedCollationCaseFirst(mozilla::Range<const CharT> string) {
  // [[CaseFirst]] is one of the String values "upper", "lower", or "false".
  static constexpr auto caseFirst = std::to_array<std::string_view>({
      "false",
      "lower",
      "upper",
  });

  return std::any_of(caseFirst.begin(), caseFirst.end(), [&](const auto& a) {
    return a.length() == string.length() &&
           EqualChars(a.data(), string.begin().get(), a.length());
  });
}

static bool IsSupportedCollationCaseFirst(const JSLinearString* string) {
  MOZ_ASSERT(StringIsAscii(string));

  JS::AutoCheckCannotGC nogc;
  if (string->hasLatin1Chars()) {
    return IsSupportedCollationCaseFirst(string->latin1Range(nogc));
  }
  return IsSupportedCollationCaseFirst(string->twoByteRange(nogc));
}

/**
 * Return `true` in |result| iff `string` is a supported collation "numeric"
 * value. Otherwise set |result| to `false`.
 */
template <typename CharT>
static bool IsSupportedCollationNumeric(mozilla::Range<const CharT> string) {
  // [[Numeric]] is a Boolean value. (We use the string representation here.)
  static constexpr auto numeric = std::to_array<std::string_view>({
      "false",
      "true",
  });

  return std::any_of(numeric.begin(), numeric.end(), [&](const auto& a) {
    return a.length() == string.length() &&
           EqualChars(a.data(), string.begin().get(), a.length());
  });
}

static bool IsSupportedCollationNumeric(const JSLinearString* string) {
  MOZ_ASSERT(StringIsAscii(string));

  JS::AutoCheckCannotGC nogc;
  if (string->hasLatin1Chars()) {
    return IsSupportedCollationNumeric(string->latin1Range(nogc));
  }
  return IsSupportedCollationNumeric(string->twoByteRange(nogc));
}

/**
 * Return `true` in |result| iff `string` is a supported hour cycle value.
 * Otherwise set |result| to `false`.
 */
template <typename CharT>
static bool IsSupportedHourCycle(mozilla::Range<const CharT> string) {
  // [[LocaleData]].[[<locale>]].[[hc]] must be « null, "h11", "h12", "h23",
  // "h24" ».
  //
  // The `null` case is handled in the caller.
  static constexpr auto hourCycles = std::to_array<std::string_view>({
      "h11",
      "h12",
      "h23",
      "h24",
  });

  return std::any_of(hourCycles.begin(), hourCycles.end(), [&](const auto& a) {
    return a.length() == string.length() &&
           EqualChars(a.data(), string.begin().get(), a.length());
  });
}

static bool IsSupportedHourCycle(const JSLinearString* string) {
  // The hour cycle value can be `null`.
  if (!string) {
    return true;
  }
  MOZ_ASSERT(StringIsAscii(string));

  JS::AutoCheckCannotGC nogc;
  if (string->hasLatin1Chars()) {
    return IsSupportedHourCycle(string->latin1Range(nogc));
  }
  return IsSupportedHourCycle(string->twoByteRange(nogc));
}

/**
 * Return `true` in |result| iff `string` is a supported numbering system.
 * Otherwise set |result| to `false`.
 */
template <typename CharT>
static bool IsSupportedNumberingSystem(std::basic_string_view<CharT> string) {
  // ICU doesn't have an API to determine the set of numbering systems supported
  // for a locale; it generally pretends that any numbering system can be used
  // with any locale. Supporting a decimal numbering system (where only the
  // digits are replaced) is easy, so we offer them all here. Algorithmic
  // numbering systems are typically tied to one locale, so for lack of
  // information we don't offer them.

  // Sorted list of allowed decimal numbering systems.
  static constexpr auto numberingSystems = std::to_array<std::string_view>(
      {NUMBERING_SYSTEMS_WITH_SIMPLE_DIGIT_MAPPINGS});

  return std::binary_search(numberingSystems.begin(), numberingSystems.end(),
                            string, [](const auto& a, const auto& b) {
                              return CompareChars(a.data(), a.length(),
                                                  b.data(), b.length()) < 0;
                            });
}

static bool IsSupportedNumberingSystem(const JSLinearString* string) {
  MOZ_ASSERT(StringIsAscii(string));

  JS::AutoCheckCannotGC nogc;

  if (string->hasLatin1Chars()) {
    const auto* chars = string->latin1Chars(nogc);
    std::string_view sv{reinterpret_cast<const char*>(chars), string->length()};
    return IsSupportedNumberingSystem(sv);
  }

  const auto* chars = string->twoByteChars(nogc);
  std::u16string_view sv{chars, string->length()};
  return IsSupportedNumberingSystem(sv);
}

/**
 * Return the default calendar of a locale.
 */
static JSLinearString* DefaultCalendar(JSContext* cx,
                                       Handle<JSLinearString*> loc) {
  auto locale = EncodeLocale(cx, loc);
  if (!locale) {
    return nullptr;
  }

  auto calendar = mozilla::intl::Calendar::TryCreate(locale.get());
  if (calendar.isErr()) {
    ReportInternalError(cx, calendar.unwrapErr());
    return nullptr;
  }

  auto type = calendar.unwrap()->GetBcp47Type();
  if (type.isErr()) {
    ReportInternalError(cx, type.unwrapErr());
    return nullptr;
  }

  return NewStringCopy<CanGC>(cx, type.unwrap());
}

/**
 * Return the default collation of a locale.
 */
static JSLinearString* DefaultCollationCaseFirst(
    JSContext* cx, Handle<JSLinearString*> locale) {
  // If |locale| is the default locale (e.g. da-DK), but only supported through
  // a fallback (da), we need to get the actual locale before we can call
  // |sharedIntlData.isUpperCaseFirst|.
  Rooted<JSLinearString*> actualLocale(cx);
  if (!BestAvailableLocale(cx, AvailableLocaleKind::Collator, locale, nullptr,
                           &actualLocale)) {
    return nullptr;
  }

  auto& sharedIntlData = cx->runtime()->sharedIntlData.ref();

  bool isUpperFirst;
  if (!sharedIntlData.isUpperCaseFirst(cx, actualLocale, &isUpperFirst)) {
    return nullptr;
  }

  if (isUpperFirst) {
    return cx->names().upper;
  }
  return cx->names().false_;
}

/**
 * Return the default numbering system of a locale.
 */
static JSLinearString* DefaultNumberingSystem(JSContext* cx,
                                              Handle<JSLinearString*> loc) {
  auto locale = EncodeLocale(cx, loc);
  if (!locale) {
    return nullptr;
  }

  auto numberingSystem =
      mozilla::intl::NumberingSystem::TryCreate(locale.get());
  if (numberingSystem.isErr()) {
    ReportInternalError(cx, numberingSystem.unwrapErr());
    return nullptr;
  }

  auto name = numberingSystem.inspect()->GetName();
  if (name.isErr()) {
    ReportInternalError(cx, name.unwrapErr());
    return nullptr;
  }

  return NewStringCopy<CanGC>(cx, name.unwrap());
}

/**
 * Check if a locale supports the requested value for a Unicode extension key.
 */
static bool IsSupported(JSContext* cx, LocaleData localeData,
                        Handle<JSLinearString*> locale, UnicodeExtensionKey key,
                        Handle<JSLinearString*> value, bool* result) {
  switch (key) {
    case UnicodeExtensionKey::Calendar: {
      return IsSupportedCalendar(cx, locale, value, result);
    }
    case UnicodeExtensionKey::Collation: {
      // Search collations can't use a different collation.
      if (localeData == LocaleData::CollatorSearch) {
        *result = false;
        return true;
      }
      return IsSupportedCollation(cx, locale, value, result);
    }
    case UnicodeExtensionKey::CollationCaseFirst: {
      *result = IsSupportedCollationCaseFirst(value);
      return true;
    }
    case UnicodeExtensionKey::CollationNumeric: {
      *result = IsSupportedCollationNumeric(value);
      return true;
    }
    case UnicodeExtensionKey::HourCycle: {
      *result = IsSupportedHourCycle(value);
      return true;
    }
    case UnicodeExtensionKey::NumberingSystem: {
      *result = IsSupportedNumberingSystem(value);
      return true;
    }
  }
  MOZ_CRASH("invalid Unicode extension key");
}

/**
 * Return the locale-specific default value for a Unicode extension key.
 */
static bool DefaultValue(JSContext* cx, LocaleData localeData,
                         Handle<JSLinearString*> locale,
                         UnicodeExtensionKey key,
                         MutableHandle<JSLinearString*> result) {
  switch (key) {
    case UnicodeExtensionKey::Calendar: {
      auto* ca = DefaultCalendar(cx, locale);
      if (!ca) {
        return false;
      }
      result.set(ca);
      return true;
    }
    case UnicodeExtensionKey::Collation: {
      // The first element of the collations array must be |null| per ES2017
      // Intl, 10.2.3 Internal Slots.
      result.set(nullptr);
      return true;
    }
    case UnicodeExtensionKey::CollationCaseFirst: {
      // Case first defaults to "false" for all search collations.
      if (localeData == LocaleData::CollatorSearch) {
        result.set(cx->names().false_);
        return true;
      }

      auto* kf = DefaultCollationCaseFirst(cx, locale);
      if (!kf) {
        return false;
      }
      result.set(kf);
      return true;
    }
    case UnicodeExtensionKey::CollationNumeric: {
      // Numeric defaults to "false" for all locales.
      result.set(cx->names().false_);
      return true;
    }
    case UnicodeExtensionKey::HourCycle: {
      // The first element of [[LocaleData]].[[<locale>]].[[hc]] is |null|.
      result.set(nullptr);
      return true;
    }
    case UnicodeExtensionKey::NumberingSystem: {
      auto* nu = DefaultNumberingSystem(cx, locale);
      if (!nu) {
        return false;
      }
      result.set(nu);
      return true;
    }
  }
  MOZ_CRASH("invalid Unicode extension key");
}

/**
 * ResolveLocale ( availableLocales, requestedLocales, options,
 * relevantExtensionKeys, localeData )
 */
bool js::intl::ResolveLocale(
    JSContext* cx, AvailableLocaleKind availableLocales,
    Handle<ArrayObject*> requestedLocales, Handle<LocaleOptions> options,
    mozilla::EnumSet<UnicodeExtensionKey> relevantExtensionKeys,
    LocaleData localeData, JS::MutableHandle<ResolvedLocale> result) {
  // Steps 1-4.
  //
  // BestFitMatcher not implemented in this implementation.
  Rooted<LookupMatcherResult> match(cx);
  if (!LookupMatcher(cx, availableLocales, requestedLocales, &match)) {
    return false;
  }

  // Step 5.
  auto foundLocale = match.locale();

  // Steps 6-7. (Not applicable in our implementation.)

  // Step 8.
  result.set(ResolvedLocale{});

  // Step 9. (Not applicable in our implementation.)

  // Steps 10-11.
  UnicodeExtensionKeywords keywords{};
  if (match.extension()) {
    keywords = UnicodeExtensionComponents(match.extension());
  }

  // Step 12.
  mozilla::EnumSet<UnicodeExtensionKey> supportedKeywords = {};

  // Step 13.
  Rooted<mozilla::Maybe<JSLinearString*>> extensionValue(cx);
  Rooted<JSLinearString*> keywordsValue(cx);
  Rooted<JSLinearString*> optionsValue(cx);
  Rooted<JSLinearString*> defaultValue(cx);
  for (auto key : relevantExtensionKeys) {
    // Steps 13.a-b. (Not applicable in our implementation.)
    extensionValue = mozilla::Nothing();

    // Steps 13.c-d. (Moved below)

    // Step 13.e.
    bool isSupportedKeyword = false;

    // Step 13.f.
    if (keywords.has(key)) {
      // Step 13.f.i.
      auto [start, length] = keywords.get(key);

      // Step 13.f.ii.
      if (length > 0) {
        MOZ_ASSERT(start + length <= match.extension()->length());

        keywordsValue =
            NewDependentString(cx, match.extension(), start, length);
        if (!keywordsValue) {
          return false;
        }
      } else {
        keywordsValue = cx->names().true_;
      }

      // Steps 13.f.iii-iv. (Moved below)
    }

    // Steps 13.g-k.
    //
    // Options override all.
    if (options.hasUnicodeExtension(key)) {
      // Step 13.g. (Not applicable in our implementation.)

      // Step 13.h.
      optionsValue = options.getUnicodeExtension(key);

      // Step 13.i. (Not applicable)

      // Step 13.j.
      //
      // String options are already canonicalized in our implementation.

      // Step 13.j.iii.i.
      //
      // No currently supported options value is an empty string.
      MOZ_ASSERT_IF(optionsValue, !optionsValue->empty());

      bool supported;
      if (!IsSupported(cx, localeData, foundLocale, key, optionsValue,
                       &supported)) {
        return false;
      }

      if (supported) {
        extensionValue = mozilla::Some(optionsValue.get());

        if (optionsValue && keywords.has(key)) {
          MOZ_ASSERT(keywordsValue && !keywordsValue->empty());
          isSupportedKeyword = EqualStrings(keywordsValue, optionsValue);
        }
      }
    }

    // Steps 13.f.iii-iv.
    //
    // Locale tag may override.
    if (extensionValue.isNothing() && keywords.has(key)) {
      MOZ_ASSERT(keywordsValue && !keywordsValue->empty());

      bool supported;
      if (!IsSupported(cx, localeData, foundLocale, key, keywordsValue,
                       &supported)) {
        return false;
      }

      if (supported) {
        extensionValue = mozilla::Some(keywordsValue.get());
        isSupportedKeyword = true;
      }
    }

    // Locale data provides default value.
    if (extensionValue.isNothing()) {
      // Step 13.c. (Reordered)
      if (!DefaultValue(cx, localeData, foundLocale, key, &defaultValue)) {
        return false;
      }
      extensionValue = mozilla::Some(defaultValue.get());

      // Step 13.d. (Not applicable in our implementation.)
    }

    // Step 13.l.
    if (isSupportedKeyword) {
      supportedKeywords += key;
    }

    // Step 13.m.
    result.setUnicodeExtension(key, *extensionValue);
  }

  // Step 14.
  result.setUnicodeKeywords(supportedKeywords);

  // Step 15.
  result.setDataLocale(foundLocale);

  // Step 16.
  return true;
}

ArrayObject* js::intl::LocalesListToArray(JSContext* cx,
                                          Handle<LocalesList> locales) {
  auto* array = NewDenseFullyAllocatedArray(cx, locales.length());
  if (!array) {
    return nullptr;
  }
  array->setDenseInitializedLength(locales.length());

  for (size_t i = 0; i < locales.length(); i++) {
    array->initDenseElement(i, StringValue(locales[i]));
  }
  return array;
}

ArrayObject* js::intl::SupportedLocalesOf(JSContext* cx,
                                          AvailableLocaleKind availableLocales,
                                          Handle<Value> locales,
                                          Handle<Value> options) {
  Rooted<LocalesList> requestedLocales(cx, cx);
  if (!CanonicalizeLocaleList(cx, locales, &requestedLocales)) {
    return nullptr;
  }

  Rooted<LocalesList> supportedLocales(cx, cx);
  if (!SupportedLocales(cx, availableLocales, requestedLocales, options,
                        &supportedLocales)) {
    return nullptr;
  }

  return LocalesListToArray(cx, supportedLocales);
}

/**
 * Certain old, commonly-used language tags that lack a script, are expected to
 * nonetheless imply one. This object maps these old-style tags to modern
 * equivalents.
 */
struct OldStyleLanguageTagMapping {
  std::string_view oldStyle;
  std::string_view modernStyle;

  // Provide a constructor to catch missing initializers in the mappings array.
  constexpr OldStyleLanguageTagMapping(std::string_view oldStyle,
                                       std::string_view modernStyle)
      : oldStyle(oldStyle), modernStyle(modernStyle) {}
};

static constexpr OldStyleLanguageTagMapping oldStyleLanguageTagMappings[] = {
    {"pa-PK", "pa-Arab-PK"}, {"zh-CN", "zh-Hans-CN"}, {"zh-HK", "zh-Hant-HK"},
    {"zh-SG", "zh-Hans-SG"}, {"zh-TW", "zh-Hant-TW"},
};

static std::string_view AddImplicitScriptToLocale(std::string_view locale) {
  for (const auto& [oldStyle, modernStyle] : oldStyleLanguageTagMappings) {
    if (locale == oldStyle) {
      return modernStyle;
    }
  }
  return {};
}

JSLinearString* js::intl::ComputeDefaultLocale(JSContext* cx) {
  const char* locale = cx->realm()->getLocale();
  if (!locale) {
    ReportOutOfMemory(cx);
    return nullptr;
  }

  auto span = mozilla::MakeStringSpan(locale);

  mozilla::intl::Locale tag;
  bool canParseLocale =
      mozilla::intl::LocaleParser::TryParse(span, tag).isOk() &&
      tag.Canonicalize().isOk();

  Rooted<JSLinearString*> candidate(cx);
  if (!canParseLocale) {
    candidate = NewStringCopy<CanGC>(cx, LastDitchLocale());
    if (!candidate) {
      return nullptr;
    }
  } else {
    // The default locale must be in [[AvailableLocales]], and that list must
    // not contain any locales with Unicode extension sequences, so remove any
    // present in the candidate.
    tag.ClearUnicodeExtension();

    FormatBuffer<char, INITIAL_CHAR_BUFFER_SIZE> buffer(cx);
    if (auto result = tag.ToString(buffer); result.isErr()) {
      ReportInternalError(cx, result.unwrapErr());
      return nullptr;
    }

    // Certain old-style language tags lack a script code, but in current usage
    // they *would* include a script code. Map these over to modern forms.
    auto modernStyle =
        AddImplicitScriptToLocale({buffer.data(), buffer.length()});
    if (modernStyle.empty()) {
      candidate = buffer.toAsciiString(cx);
    } else {
      candidate = NewStringCopy<CanGC>(cx, modernStyle);
    }
    if (!candidate) {
      return nullptr;
    }
  }

  // 9.1 Internal slots of Service Constructors
  //
  // - [[AvailableLocales]] is a List [...]. The list must include the value
  //   returned by the DefaultLocale abstract operation (6.2.4), [...].
  //
  // That implies we must ignore any candidate which isn't supported by all
  // Intl service constructors.

  Rooted<JSLinearString*> supportedCollator(cx);
  JS_TRY_VAR_OR_RETURN_NULL(
      cx, supportedCollator,
      BestAvailableLocale(cx, AvailableLocaleKind::Collator, candidate,
                          nullptr));

  Rooted<JSLinearString*> supportedDateTimeFormat(cx);
  JS_TRY_VAR_OR_RETURN_NULL(
      cx, supportedDateTimeFormat,
      BestAvailableLocale(cx, AvailableLocaleKind::DateTimeFormat, candidate,
                          nullptr));

#ifdef DEBUG
  // Note: We don't test the supported locales of the remaining Intl service
  // constructors, because the set of supported locales is exactly equal to
  // the set of supported locales of Intl.DateTimeFormat.
  for (auto kind : {
           AvailableLocaleKind::DisplayNames,
           AvailableLocaleKind::DurationFormat,
           AvailableLocaleKind::ListFormat,
           AvailableLocaleKind::NumberFormat,
           AvailableLocaleKind::PluralRules,
           AvailableLocaleKind::RelativeTimeFormat,
           AvailableLocaleKind::Segmenter,
       }) {
    JSLinearString* supported;
    JS_TRY_VAR_OR_RETURN_NULL(
        cx, supported, BestAvailableLocale(cx, kind, candidate, nullptr));

    MOZ_ASSERT(!!supported == !!supportedDateTimeFormat);
    MOZ_ASSERT_IF(supported, EqualStrings(supported, supportedDateTimeFormat));
  }
#endif

  // Accept the candidate locale if it is supported by all Intl service
  // constructors.
  if (supportedCollator && supportedDateTimeFormat) {
    // Use the actually supported locale instead of the candidate locale. For
    // example when the candidate locale "en-US-posix" is supported through
    // "en-US", use "en-US" as the default locale.
    //
    // Also prefer the supported locale with more subtags. For example when
    // requesting "de-CH" and Intl.DateTimeFormat supports "de-CH", but
    // Intl.Collator only "de", still return "de-CH" as the result.
    if (SameOrParentLocale(supportedCollator, supportedDateTimeFormat)) {
      return supportedDateTimeFormat;
    }
    return supportedCollator;
  }

  // Return the last ditch locale if the candidate locale isn't supported.
  return NewStringCopy<CanGC>(cx, LastDitchLocale());
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "gtest/gtest.h"

#include "mozilla/intl/String.h"
#include "mozilla/Span.h"
#include "mozilla/TextUtils.h"
#include "mozilla/Try.h"

#include <algorithm>

#include "TestBuffer.h"

namespace mozilla::intl {

static Result<std::u16string_view, ICUError> ToLocaleLowerCase(
    const char* aLocale, const char16_t* aString,
    TestBuffer<char16_t>& aBuffer) {
  aBuffer.clear();

  MOZ_TRY(String::ToLocaleLowerCase(aLocale, MakeStringSpan(aString), aBuffer));

  return aBuffer.get_string_view();
}

static Result<std::u16string_view, ICUError> ToLocaleUpperCase(
    const char* aLocale, const char16_t* aString,
    TestBuffer<char16_t>& aBuffer) {
  aBuffer.clear();

  MOZ_TRY(String::ToLocaleUpperCase(aLocale, MakeStringSpan(aString), aBuffer));

  return aBuffer.get_string_view();
}

TEST(IntlString, ToLocaleLowerCase)
{
  TestBuffer<char16_t> buf;

  ASSERT_EQ(ToLocaleLowerCase("en", u"test", buf).unwrap(), u"test");
  ASSERT_EQ(ToLocaleLowerCase("en", u"TEST", buf).unwrap(), u"test");

  // Turkish dotless i.
  ASSERT_EQ(ToLocaleLowerCase("tr", u"I", buf).unwrap(), u"ı");
  ASSERT_EQ(ToLocaleLowerCase("tr", u"İ", buf).unwrap(), u"i");
  ASSERT_EQ(ToLocaleLowerCase("tr", u"I\u0307", buf).unwrap(), u"i");
}

TEST(IntlString, ToLocaleUpperCase)
{
  TestBuffer<char16_t> buf;

  ASSERT_EQ(ToLocaleUpperCase("en", u"test", buf).unwrap(), u"TEST");
  ASSERT_EQ(ToLocaleUpperCase("en", u"TEST", buf).unwrap(), u"TEST");

  // Turkish dotless i.
  ASSERT_EQ(ToLocaleUpperCase("tr", u"i", buf).unwrap(), u"İ");
  ASSERT_EQ(ToLocaleUpperCase("tr", u"ı", buf).unwrap(), u"I");

  // Output can be longer than the input string.
  ASSERT_EQ(ToLocaleUpperCase("en", u"Größenmaßstäbe", buf).unwrap(),
            u"GRÖSSENMASSSTÄBE");
}

TEST(IntlString, ComposePairNFC)
{
  // Pair of base characters do not compose
  ASSERT_EQ(String::ComposePairNFC(U'a', U'b'), U'\0');
  // Base letter + accent
  ASSERT_EQ(String::ComposePairNFC(U'a', U'\u0308'), U'ä');
  // Accented letter + a further accent
  ASSERT_EQ(String::ComposePairNFC(U'ä', U'\u0304'), U'ǟ');
  // Accented letter + a further accent, but doubly-accented form is not
  // available
  ASSERT_EQ(String::ComposePairNFC(U'ä', U'\u0301'), U'\0');
  // These do not compose because although U+0344 has the decomposition <0308,
  // 0301> (see below), it also has the Full_Composition_Exclusion property.
  ASSERT_EQ(String::ComposePairNFC(U'\u0308', U'\u0301'), U'\0');
  // Supplementary-plane letter + accent
  ASSERT_EQ(String::ComposePairNFC(U'\U00011099', U'\U000110BA'),
            U'\U0001109A');
}

TEST(IntlString, IsCased)
{
  ASSERT_TRUE(String::IsCased(U'a'));
  ASSERT_FALSE(String::IsCased(U'0'));
}

TEST(IntlString, IsCaseIgnorable)
{
  ASSERT_FALSE(String::IsCaseIgnorable(U'a'));
  ASSERT_TRUE(String::IsCaseIgnorable(U'.'));
}

TEST(IntlString, GetUnicodeVersion)
{
  auto version = String::GetUnicodeVersion();

  ASSERT_TRUE(std::all_of(version.begin(), version.end(), [](char ch) {
    return IsAsciiDigit(ch) || ch == '.';
  }));
}

}  // namespace mozilla::intl

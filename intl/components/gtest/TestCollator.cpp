/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "gtest/gtest.h"

#include <string_view>
#include "mozilla/intl/Collator.h"
#include "mozilla/Span.h"
#include "TestBuffer.h"

namespace mozilla::intl {

TEST(IntlCollator, CompareUTF16)
{
  // Do some light string comparisons to ensure everything is wired up
  // correctly. This is not doing extensive correctness testing.
  CollatorOptions options{};
  auto result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  auto collator = result.unwrap();
  TestBuffer<uint8_t> bufferA;
  TestBuffer<uint8_t> bufferB;

  ASSERT_EQ(collator->CompareUTF16(u"aaa", u"bbb"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"bbb", u"aaa"), 1);
  ASSERT_EQ(collator->CompareUTF16(u"aaa", u"aaa"), 0);
  ASSERT_EQ(collator->CompareUTF16(u"👍", u"👎"), -1);
}

TEST(IntlCollator, SetOptionsSensitivity)
{
  CollatorOptions options{};
  options.sensitivity = CollatorSensitivity::Base;

  // Test the ECMA 402 sensitivity behavior per:
  // https://tc39.es/ecma402/#sec-collator-CompareUTF16
  auto result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  auto collator = result.unwrap();

  TestBuffer<uint8_t> bufferA;
  TestBuffer<uint8_t> bufferB;
  ASSERT_EQ(collator->CompareUTF16(u"a", u"b"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"á"), 0);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"A"), 0);

  options.sensitivity = CollatorSensitivity::Accent;
  result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  collator = result.unwrap();
  ASSERT_EQ(collator->CompareUTF16(u"a", u"b"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"á"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"A"), 0);

  options.sensitivity = CollatorSensitivity::Case;
  result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  collator = result.unwrap();
  ASSERT_EQ(collator->CompareUTF16(u"a", u"b"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"á"), 0);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"A"), -1);

  options.sensitivity = CollatorSensitivity::Variant;
  result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  collator = result.unwrap();
  ASSERT_EQ(collator->CompareUTF16(u"a", u"b"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"á"), -1);
  ASSERT_EQ(collator->CompareUTF16(u"a", u"A"), -1);
}

TEST(IntlCollator, LocaleSensitiveCollations)
{
  UniquePtr<Collator> collator = nullptr;
  TestBuffer<uint8_t> bufferA;
  TestBuffer<uint8_t> bufferB;

  auto changeLocale = [&](const char* locale) {
    CollatorOptions options{};
    options.sensitivity = CollatorSensitivity::Base;
    auto result = Collator::TryCreate(mozilla::MakeStringSpan(locale), options);
    ASSERT_TRUE(result.isOk());
    collator = result.unwrap();
  };

  // Swedish treats "Ö" as a separate character, which sorts after "Z".
  changeLocale("en-US");
  ASSERT_EQ(collator->CompareUTF16(u"Österreich", u"Västervik"), -1);
  changeLocale("sv-SE");
  ASSERT_EQ(collator->CompareUTF16(u"Österreich", u"Västervik"), 1);

  // Country names in their respective scripts.
  auto china = MakeStringSpan(u"中国");
  auto japan = MakeStringSpan(u"日本");
  auto korea = MakeStringSpan(u"한국");

  changeLocale("en-US");
  ASSERT_EQ(collator->CompareUTF16(china, japan), -1);
  ASSERT_EQ(collator->CompareUTF16(china, korea), 1);
  changeLocale("zh");
  ASSERT_EQ(collator->CompareUTF16(china, japan), 1);
  ASSERT_EQ(collator->CompareUTF16(china, korea), -1);
  changeLocale("ja");
  ASSERT_EQ(collator->CompareUTF16(china, japan), -1);
  ASSERT_EQ(collator->CompareUTF16(china, korea), -1);
  changeLocale("ko");
  ASSERT_EQ(collator->CompareUTF16(china, japan), 1);
  ASSERT_EQ(collator->CompareUTF16(china, korea), -1);
}

TEST(IntlCollator, IgnorePunctuation)
{
  TestBuffer<uint8_t> bufferA;
  TestBuffer<uint8_t> bufferB;

  CollatorOptions options{};
  options.ignorePunctuation = CollatorIgnorePunctuation::On;

  auto result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  auto collator = result.unwrap();

  ASSERT_EQ(collator->CompareUTF16(u"aa", u".bb"), -1);

  options.ignorePunctuation = CollatorIgnorePunctuation::Off;
  result = Collator::TryCreate(mozilla::MakeStringSpan("en-US"), options);
  ASSERT_TRUE(result.isOk());
  collator = result.unwrap();

  ASSERT_EQ(collator->CompareUTF16(u"aa", u".bb"), 1);
}

TEST(IntlCollator, IsSupportedCollation)
{
  // Since this list is dependent on ICU, and may change between upgrades, only
  // test a subset of the keywords.
  auto german = MakeStringSpan("de");
  auto standard = MakeStringSpan("standard");
  auto search = MakeStringSpan("search");
  auto eor = MakeStringSpan("eor");
  auto phonebk = MakeStringSpan("phonebk");      // Valid BCP 47.
  auto phonebook = MakeStringSpan("phonebook");  // Not valid BCP 47.
  bool hasStandard = Collator::IsSupportedCollation(german, standard);
  bool hasSearch = Collator::IsSupportedCollation(german, search);
  bool hasEor = Collator::IsSupportedCollation(german, eor);
  bool hasPhonebk = Collator::IsSupportedCollation(german, phonebk);
  bool hasPhonebook = Collator::IsSupportedCollation(german, phonebook);

  ASSERT_FALSE(hasStandard);  // Special excluded item
  ASSERT_FALSE(hasSearch);    // Special excluded item
  ASSERT_TRUE(hasEor);
  ASSERT_TRUE(hasPhonebk);
  ASSERT_FALSE(hasPhonebook);  // Not valid BCP 47.
}

TEST(IntlCollator, GetBcp47KeywordValues)
{
  auto extensions = Collator::GetBcp47KeywordValues();

  // Since this list is dependent on ICU, and may change between upgrades, only
  // test a subset of the keywords.
  auto standard = MakeStringSpan("standard");
  auto search = MakeStringSpan("search");
  auto phonebk = MakeStringSpan("phonebk");      // Valid BCP 47.
  auto phonebook = MakeStringSpan("phonebook");  // Not valid BCP 47.
  bool hasStandard = false;
  bool hasSearch = false;
  bool hasPhonebk = false;
  bool hasPhonebook = false;

  for (auto extension : extensions) {
    hasStandard |= extension == standard;
    hasSearch |= extension == search;
    hasPhonebk |= extension == phonebk;
    hasPhonebook |= extension == phonebook;
  }

  ASSERT_FALSE(hasStandard);  // Excluded from reporting
  ASSERT_FALSE(hasSearch);    // Excluded from reporting
  ASSERT_TRUE(hasPhonebk);

  ASSERT_FALSE(hasPhonebook);  // Not valid BCP 47.
}

TEST(IntlCollator, GetAvailableLocales)
{
  using namespace std::literals;

  int32_t english = 0;
  int32_t german = 0;
  int32_t chinese = 0;

  // Since this list is dependent on ICU, and may change between upgrades, only
  // test a subset of the available locales.
  for (mozilla::Span<const char> locale : Collator::GetAvailableLocales()) {
    if (locale == mozilla::MakeStringSpan("en")) {
      english++;
    } else if (locale == mozilla::MakeStringSpan("de")) {
      german++;
    } else if (locale == mozilla::MakeStringSpan("zh")) {
      chinese++;
    }
  }

  // Each locale should be found exactly once.
  ASSERT_EQ(english, 1);
  ASSERT_EQ(german, 1);
  ASSERT_EQ(chinese, 1);
}

}  // namespace mozilla::intl

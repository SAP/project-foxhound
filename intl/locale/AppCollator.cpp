/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/intl/AppCollator.h"
#include "mozilla/intl/LocaleService.h"
#include "nsString.h"

extern "C" {
void mozilla_app_collator_glue_initialize(const nsACString* locale);
int mozilla_app_collator_glue_install_sqlite3_collation_callbacks(sqlite3* aDB);
int32_t mozilla_app_collator_compare_utf8(const char* left, size_t left_len,
                                          const char* right, size_t right_len);
int32_t mozilla_app_collator_compare_utf16(const char16_t* left,
                                           size_t left_len,
                                           const char16_t* right,
                                           size_t right_len);
int32_t mozilla_app_collator_compare_base_utf8(const char* left,
                                               size_t left_len,
                                               const char* right,
                                               size_t right_len);
int32_t mozilla_app_collator_compare_base_utf16(const char16_t* left,
                                                size_t left_len,
                                                const char16_t* right,
                                                size_t right_len);
}

using namespace mozilla::intl;

// static
void AppCollator::Initialize() {
  nsAutoCStringN<32> appLocale;
  mozilla::intl::LocaleService::GetInstance()->GetAppLocaleAsBCP47(appLocale);
  mozilla_app_collator_glue_initialize(&appLocale);
}

// static
int AppCollator::InstallCallbacks(sqlite3* aDB) {
  return mozilla_app_collator_glue_install_sqlite3_collation_callbacks(aDB);
}

// static
int32_t AppCollator::Compare(mozilla::Span<const char> aLeft,
                             mozilla::Span<const char> aRight) {
  return mozilla_app_collator_compare_utf8(aLeft.Elements(), aLeft.Length(),
                                           aRight.Elements(), aRight.Length());
}

// static
int32_t AppCollator::Compare(mozilla::Span<const char16_t> aLeft,
                             mozilla::Span<const char16_t> aRight) {
  return mozilla_app_collator_compare_utf16(aLeft.Elements(), aLeft.Length(),
                                            aRight.Elements(), aRight.Length());
}

// static
int32_t AppCollator::CompareBase(mozilla::Span<const char> aLeft,
                                 mozilla::Span<const char> aRight) {
  return mozilla_app_collator_compare_base_utf8(
      aLeft.Elements(), aLeft.Length(), aRight.Elements(), aRight.Length());
}

// static
int32_t AppCollator::CompareBase(mozilla::Span<const char16_t> aLeft,
                                 mozilla::Span<const char16_t> aRight) {
  return mozilla_app_collator_compare_base_utf16(
      aLeft.Elements(), aLeft.Length(), aRight.Elements(), aRight.Length());
}

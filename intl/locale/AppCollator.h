/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_intl_AppCollator_h
#define mozilla_intl_AppCollator_h

#include "sqlite3.h"
#include "mozilla/Span.h"

namespace mozilla::intl {

/**
 * Compare strings for sorting in a manner culturally appropriate
 * for the UI locale of Firefox.
 *
 * DO NOT USE for Web-exposed comparisons even when the configuration
 * appears to match the need in order to separate UI and Web for
 * spoofEnglish purposes.
 */
class AppCollator {
 public:
  /**
   * Call once at process startup.
   */
  static void Initialize();

  /**
   * Installs mozStorage-appropriate collation callbacks to an
   * sqlite database.
   *
   * Returns SQLITE_OK on success and the status returned by
   * the failed attempt to install callbacks.
   */
  static int InstallCallbacks(sqlite3* aDB);

  /**
   * Compare UTF-16 on the variant sensitivity / tertiary level
   * that gives a consistent order to strings that have
   * user-visible differences (if base characters are equal,
   * accents and case break ties).
   *
   * This corresponds to the defaults of the `Intl.Collator` API.
   *
   * Unpaired surrogates are treated as the REPLACEMENT CHARACTER.
   *
   * Returns -1 for left less than right, 0 for equal, and 1 for
   * left greater than right.
   */
  static int32_t Compare(mozilla::Span<const char16_t> aLeft,
                         mozilla::Span<const char16_t> aRight);

  /**
   * Compare UTF-8 on the variant sensitivity / tertiary level
   * that gives a consistent order to strings that have
   * user-visible differences (if base characters are equal,
   * accents and case break ties).
   *
   * This corresponds to the defaults of the `Intl.Collator` API.
   *
   * UTF-8 errors are handled according to the Encoding Standard.
   *
   * Returns -1 for left less than right, 0 for equal, and 1 for
   * left greater than right.
   */
  static int32_t Compare(mozilla::Span<const char> aLeft,
                         mozilla::Span<const char> aRight);

  /**
   * Compare UTF-16 on the base sensitivity / primary level that ignores
   * case and accents.
   *
   * It's most likely a bad idea to use this, and you should use
   * Compare() instead!
   *
   * This method is provided for compatibility with past
   * Firefox/Thunderbird behavior that seems to have arisen from the
   * characterization of comparison options in a legacy Windows
   * collation API.
   *
   * Ignoring case and accents means that the order of strings that
   * only differ in case or accents can be inconsistent. If strings
   * that compare equal but actually differ in case or accents aren't
   * sorted according to some other field that is considered more
   * meaningful than case and accents in a larger structure, the order
   * of strings that differ only in case or accents ends up depending
   * on some implementation detail that isn't meaningful to the user,
   * such as the input order to the sorting function.
   *
   * Unpaired surrogates are treated as the REPLACEMENT CHARACTER.
   *
   * Returns -1 for left less than right, 0 for equal, and 1 for
   * left greater than right.
   */
  static int32_t CompareBase(mozilla::Span<const char16_t> aLeft,
                             mozilla::Span<const char16_t> aRight);

  /**
   * Compare UTF-8 on the base sensitivity / primary level that ignores
   * case and accents.
   *
   * It's most likely a bad idea to use this, and you should use
   * Compare() instead!
   *
   * This method is provided for compatibility with past
   * Firefox/Thunderbird behavior that seems to have arisen from the
   * characterization of comparison options in a legacy Windows
   * collation API.
   *
   * Ignoring case and accents means that the order of strings that
   * only differ in case or accents can be inconsistent. If strings
   * that compare equal but actually differ in case or accents aren't
   * sorted according to some other field that is considered more
   * meaningful than case and accents in a larger structure, the order
   * of strings that differ only in case or accents ends up depending
   * on some implementation detail that isn't meaningful to the user,
   * such as the input order to the sorting function.
   *
   * UTF-8 errors are handled according to the Encoding Standard.
   *
   * Returns -1 for left less than right, 0 for equal, and 1 for
   * left greater than right.
   */
  static int32_t CompareBase(mozilla::Span<const char> aLeft,
                             mozilla::Span<const char> aRight);
};

};  // namespace mozilla::intl

#endif  // mozilla_intl_AppCollator_h

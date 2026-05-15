/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_intl_locale_MozLocaleBindings_h
#define mozilla_intl_locale_MozLocaleBindings_h

#include "mozilla/intl/unic_langid_ffi_generated.h"
#include "mozilla/intl/fluent_langneg_ffi_generated.h"

namespace std {

template <>
struct default_delete<mozilla::intl::ffi::LanguageIdentifier> {
 public:
  void operator()(mozilla::intl::ffi::LanguageIdentifier* aPtr) const {
    unic_langid_destroy(aPtr);
  }
};

}  // namespace std

#endif

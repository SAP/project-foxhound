/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <locale.h>
#include "mozilla/LookAndFeel.h"
#include "mozilla/intl/Locale.h"
#include "OSPreferences.h"

#include "nsServiceManagerUtils.h"

using namespace mozilla;
using namespace mozilla::intl;

OSPreferences::OSPreferences() = default;

bool OSPreferences::ReadSystemLocales(nsTArray<nsCString>& aLocaleList) {
  MOZ_ASSERT(aLocaleList.IsEmpty());

  nsAutoCString defaultLang(Locale::GetDefaultLocale());

  if (CanonicalizeLanguageTag(defaultLang)) {
    aLocaleList.AppendElement(defaultLang);
    return true;
  }
  return false;
}

bool OSPreferences::ReadRegionalPrefsLocales(nsTArray<nsCString>& aLocaleList) {
  MOZ_ASSERT(aLocaleList.IsEmpty());

  // For now we're just taking the LC_TIME from POSIX environment for all
  // regional preferences.
  nsAutoCString localeStr(setlocale(LC_TIME, nullptr));

  if (CanonicalizeLanguageTag(localeStr)) {
    aLocaleList.AppendElement(localeStr);
    return true;
  }

  return false;
}

/**
 * Since Gtk does not provide a way to customize or format date/time patterns,
 * we're reusing ICU data here, but we do modify it according to the only
 * setting Gtk gives us - hourCycle.
 *
 * This means that for gtk we will return a pattern from ICU altered to
 * represent h12/h24 hour cycle if the user modified the default value.
 *
 * In short, this should work like this:
 *
 *  * gtk defaults, pl: 24h
 *  * gtk defaults, en: 12h
 *
 *  * gtk 12h, pl: 12h
 *  * gtk 12h, en: 12h
 *
 *  * gtk 24h, pl: 24h
 *  * gtk 12h, en: 12h
 */
bool OSPreferences::ReadDateTimePattern(DateTimeFormatStyle aDateStyle,
                                        DateTimeFormatStyle aTimeStyle,
                                        const nsACString& aLocale,
                                        nsACString& aRetVal) {
  nsAutoCString skeleton;
  if (!GetDateTimeSkeletonForStyle(aDateStyle, aTimeStyle, aLocale, skeleton)) {
    return false;
  }

  // Customize the skeleton if necessary to reflect user's 12/24hr pref
  int hourCycle = LookAndFeel::GetInt(LookAndFeel::IntID::HourCycle);
  if (hourCycle == 12 || hourCycle == 24) {
    OverrideSkeletonHourCycle(hourCycle == 24, skeleton);
  }

  if (!GetPatternForSkeleton(skeleton, aLocale, aRetVal)) {
    return false;
  }

  return true;
}

void OSPreferences::RemoveObservers() {}

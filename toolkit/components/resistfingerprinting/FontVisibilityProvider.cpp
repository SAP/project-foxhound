/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "FontVisibilityProvider.h"

#include "gfxTypes.h"
#include "gfxFontEntry.h"
#include "gfxPlatformFontList.h"

#include "SharedFontList.h"
#include "nsPresContext.h"
#include "nsRFPService.h"

#include "mozilla/StaticPrefs_layout.h"
#include "mozilla/ContentBlockingAllowList.h"

#include "mozilla/dom/OffscreenCanvas.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/OffscreenCanvas.h"

using namespace mozilla;

void FontVisibilityProvider::ReportBlockedFontFamily(
    const gfxFontFamily& aFamily) const {
  nsCString msg;
  FormatBlockedFontFamilyMessage(msg, aFamily.Name(), aFamily.Visibility());
  ReportBlockedFontFamily(msg);
}

void FontVisibilityProvider::ReportBlockedFontFamily(
    const fontlist::Family& aFamily) const {
  auto* fontList = gfxPlatformFontList::PlatformFontList()->SharedFontList();
  const nsCString& name = aFamily.DisplayName().AsString(fontList);
  nsCString msg;
  FormatBlockedFontFamilyMessage(msg, name, aFamily.Visibility());
  ReportBlockedFontFamily(msg);
}

void FontVisibilityProvider::FormatBlockedFontFamilyMessage(
    nsCString& aMsg, const nsCString& aFamily,
    FontVisibility aVisibility) const {
  aMsg.AppendPrintf(
      "Request for font \"%s\" blocked at visibility level %d (requires "
      "%d)\n",
      aFamily.get(), int(GetFontVisibility()), int(aVisibility));
}

FontVisibility FontVisibilityProvider::ComputeFontVisibility() const {
  /*
   * Expected behavior in order of precedence:
   *  1  If offscreen canvas, attempt to inherit the visibility
   *  2  Chrome Rules give User Level (3)
   *  3  RFP gives Highest Level (1 aka Base)
   *  4  An RFPTarget of Base gives Base Level (1)
   *  5  An RFPTarget of LangPack gives LangPack Level (2)
   *  6  The value of the Standard Font Visibility Pref
   *
   * If the ETP toggle is disabled (aka
   * ContentBlockingAllowList::Check is true), it will only override 4-6,
   * not rules 2 or 3.
   */

  // Rule 1: If the visibility should be inherited, return that value.
  if (Maybe<FontVisibility> maybeVis = MaybeInheritFontVisibility()) {
    return *maybeVis;
  }

  // Rule 2: Allow all font access for privileged contexts, including
  // chrome and devtools contexts.
  if (IsChrome()) {
    return FontVisibility::User;
  }

  // Is this a private browsing context?
  bool isPrivate = IsPrivateBrowsing();

  int32_t level;
  // Rule 4
  if (ShouldResistFingerprinting(RFPTarget::FontVisibilityBaseSystem)) {
    // Rule 3: Check RFP pref
    // This is inside Rule 4 in case this document is exempted from RFP.
    // But if it is not exempted, and RFP is enabled, we return immediately
    // to prevent the override below from occurring.
    if (nsRFPService::IsRFPPrefEnabled(isPrivate)) {
      return FontVisibility::Base;
    }

    level = int32_t(FontVisibility::Base);
  }
  // Rule 5
  else if (ShouldResistFingerprinting(RFPTarget::FontVisibilityLangPack)) {
    level = int32_t(FontVisibility::LangPack);
  }
  // Rule 6
  else {
    level = StaticPrefs::layout_css_font_visibility();
  }

  nsICookieJarSettings* cookieJarSettings = GetCookieJarSettings();

  // Override Rules 4-6 Only: Determine if the user has exempted the
  // domain from tracking protections, if so, use the default value.
  if (level != StaticPrefs::layout_css_font_visibility() &&
      ContentBlockingAllowList::Check(cookieJarSettings)) {
    level = StaticPrefs::layout_css_font_visibility();
  }

  // Clamp result to the valid range of levels.
  level = std::clamp(level, int32_t(FontVisibility::Base),
                     int32_t(FontVisibility::User));

  return FontVisibility(level);
}

/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsIDNService_h__
#define nsIDNService_h__

#include "nsIIDNService.h"

#include "mozilla/RWLock.h"
#include "mozilla/intl/UnicodeScriptCodes.h"
#include "mozilla/net/IDNBlocklistUtils.h"
#include "mozilla/Span.h"

class nsIPrefBranch;

//-----------------------------------------------------------------------------
// nsIDNService
//-----------------------------------------------------------------------------

namespace mozilla::net {
enum ScriptCombo : int32_t;
}

class nsIDNService final : public nsIIDNService {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIIDNSERVICE

  nsIDNService();

  nsresult Init();

 protected:
  virtual ~nsIDNService();

 private:
  void prefsChanged(const char* pref);

  static void PrefChanged(const char* aPref, void* aSelf) {
    auto* self = static_cast<nsIDNService*>(aSelf);
    self->prefsChanged(aPref);
  }

 public:
  /**
   * Determine whether a label is considered safe to display to the user
   * according to the algorithm defined in UTR 39 and the profile
   * selected in mRestrictionProfile.
   *
   * For the ASCII-only profile, returns false for all labels containing
   * non-ASCII characters.
   *
   * For the other profiles, returns false for labels containing any of
   * the following:
   *
   *  Characters in scripts other than the "recommended scripts" and
   *   "aspirational scripts" defined in
   *   http://www.unicode.org/reports/tr31/#Table_Recommended_Scripts
   *   and http://www.unicode.org/reports/tr31/#Aspirational_Use_Scripts
   *  This includes codepoints that are not defined as Unicode
   *   characters
   *
   *  Illegal combinations of scripts (@see illegalScriptCombo)
   *
   *  Numbers from more than one different numbering system
   *
   *  Sequences of the same non-spacing mark
   *
   *  Both simplified-only and traditional-only Chinese characters
   *   XXX this test was disabled by bug 857481
   */
  bool IsLabelSafe(mozilla::Span<const char32_t> aLabel,
                   mozilla::Span<const char32_t> aTLD) MOZ_EXCLUDES(mLock);

 private:
  /**
   * Restriction-level Detection profiles defined in UTR 39
   * http://www.unicode.org/reports/tr39/#Restriction_Level_Detection,
   * and selected by the pref network.IDN.restriction_profile
   */
  enum restrictionProfile {
    eASCIIOnlyProfile,
    eHighlyRestrictiveProfile,
    eModeratelyRestrictiveProfile
  };

  /**
   * Determine whether a combination of scripts in a single label is
   * permitted according to the algorithm defined in UTR 39 and the
   * profile selected in mRestrictionProfile.
   *
   * For the "Highly restrictive" profile, all characters in each
   * identifier must be from a single script, or from the combinations:
   *  Latin + Han + Hiragana + Katakana;
   *  Latin + Han + Bopomofo; or
   *  Latin + Han + Hangul
   *
   * For the "Moderately restrictive" profile, Latin is also allowed
   *  with other scripts except Cyrillic and Greek
   */
  bool illegalScriptCombo(restrictionProfile profile,
                          mozilla::intl::Script script,
                          mozilla::net::ScriptCombo& savedScript);

  // We use this rwlock to guard access to:
  // |mIDNBlocklist|, |mRestrictionProfile|
  mozilla::RWLock mLock{"nsIDNService"};

  // guarded by mLock
  nsTArray<mozilla::net::BlocklistRange> mIDNBlocklist MOZ_GUARDED_BY(mLock);

  // guarded by mLock;
  restrictionProfile mRestrictionProfile MOZ_GUARDED_BY(mLock){
      eASCIIOnlyProfile};
};

extern "C" MOZ_EXPORT bool mozilla_net_is_label_safe(const char32_t* aLabel,
                                                     size_t aLabelLen,
                                                     const char32_t* aTld,
                                                     size_t aTldLen);

#endif  // nsIDNService_h__

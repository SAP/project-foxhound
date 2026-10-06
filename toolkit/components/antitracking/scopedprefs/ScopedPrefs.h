/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef mozilla_ScopedPrefs_h_
#define mozilla_ScopedPrefs_h_

#include "nsIScopedPrefs.h"
#include "nsTHashMap.h"

namespace mozilla::dom {
class BrowsingContext;
}
class nsIChannel;

namespace mozilla {

class ScopedPrefs final : public nsIScopedPrefs {
  NS_DECL_ISUPPORTS
  NS_DECL_NSISCOPEDPREFS

 public:
  // infallible function for C++ that falls back static_prefs in error case,
  // but asserts that a valid pref value got passed
  static bool BoolPrefScoped(const nsIScopedPrefs::Pref aPref,
                             nsIChannel* aChannel);

 private:
  virtual ~ScopedPrefs() = default;

  static nsresult GetBoolPrefScopedInternal(const nsIScopedPrefs::Pref aPref,
                                            nsIChannel* aChannel, bool* aValue);
  // fallback function that relies on pref service that never fails
  static nsresult GetBoolPrefFallback(const nsIScopedPrefs::Pref aPref,
                                      bool aIsPrivate, bool* aValue);
  static nsresult GetTopSite(nsIChannel* aChannel, nsACString& aOutSite);
  static nsresult GetTopSite(dom::BrowsingContext* aBc, nsACString& aOutSite);

  // Sites -> Overrides per pref
  nsTHashMap<nsCStringHashKey, bool>
      mBoolPrefValue[nsIScopedPrefs::NUM_SCOPED_BOOL_PREFS]{};
};

}  // namespace mozilla

#endif  // mozilla_ScopedPrefs_h_

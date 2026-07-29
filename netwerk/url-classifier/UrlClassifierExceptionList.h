/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_UrlClassifierExceptionList_h
#define mozilla_UrlClassifierExceptionList_h

#include "nsHashKeys.h"
#include "nsTHashMap.h"
#include "nsIUrlClassifierExceptionList.h"
#include "nsISupports.h"
#include "nsTArray.h"
#include "nsString.h"

namespace mozilla::net {

/**
 * @see nsIUrlClassifierExceptionList
 */
class UrlClassifierExceptionList final : public nsIUrlClassifierExceptionList {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIURLCLASSIFIEREXCEPTIONLIST

  UrlClassifierExceptionList() = default;

 private:
  ~UrlClassifierExceptionList() = default;

  // A list of exception entries
  using ExceptionEntryArray =
      nsTArray<RefPtr<nsIUrlClassifierExceptionListEntry>>;

  // Helper method to check if any exception in the array matches the given
  // load.
  static bool ExceptionListMatchesLoad(ExceptionEntryArray* aExceptions,
                                       nsIURI* aURI, nsIURI* aTopLevelURI,
                                       bool aIsPrivateBrowsing);

  // Helper method to extract the schemeless site from a URL pattern.
  NS_IMETHODIMP GetSchemelessSiteFromUrlPattern(const nsACString& aUrlPattern,
                                                nsACString& aSite);

  // The feature this exception list is for, e.g. "tracking-protection".
  nsCString mFeature;

  // A hash map to store the (top level) site-specific exception entries.
  // The hash map key is the top level (schemeless) site.
  nsTHashMap<nsCStringHashKey, ExceptionEntryArray> mExceptions;

  // A map of exception list entries which apply across all top level sites.
  // The hash map key is the (schemeless) site of the load to be checked.
  nsTHashMap<nsCStringHashKey, ExceptionEntryArray> mGlobalExceptions;
};

}  // namespace mozilla::net

#endif

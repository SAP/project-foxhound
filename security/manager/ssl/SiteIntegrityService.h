/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SiteIntegrityService_h
#define SiteIntegrityService_h

#include "mozilla/OriginAttributes.h"
#include "nsISiteIntegrityService.h"
#include "nsCOMPtr.h"
#include "nsIDataStorage.h"

namespace mozilla {

class SiteIntegrityService : public nsISiteIntegrityService {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSISITEINTEGRITYSERVICE

  SiteIntegrityService() = default;
  nsresult Init();

  // TODO(Bug 2017653): Add site clearing support for this, similar to
  // SiteSecurityService.

 protected:
  virtual ~SiteIntegrityService();

 private:
  nsresult GetStorageKeyFromURI(nsIURI* aURI,
                                const OriginAttributes& aOriginAttributes,
                                nsACString& outStorageKey,
                                nsIDataStorage::DataType* outStorageType);

  nsCOMPtr<nsIDataStorage> mDataStorage;
};

}  // namespace mozilla

#endif  //  SiteIntegrityService_h

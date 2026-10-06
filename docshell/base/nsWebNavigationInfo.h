/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsWebNavigationInfo_h_
#define nsWebNavigationInfo_h_

#include "nsIWebNavigationInfo.h"
#include "nsCOMPtr.h"
#include "nsICategoryManager.h"
#include "nsStringFwd.h"

class nsWebNavigationInfo final : public nsIWebNavigationInfo {
 public:
  nsWebNavigationInfo() = default;

  NS_DECL_ISUPPORTS

  NS_DECL_NSIWEBNAVIGATIONINFO

  static uint32_t IsTypeSupported(const nsACString& aType);

 private:
  ~nsWebNavigationInfo() = default;

  // Check whether aType is supported, and returns an nsIWebNavigationInfo
  // constant.
  static uint32_t IsTypeSupportedInternal(const nsCString& aType);
};

#endif  // nsWebNavigationInfo_h_

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsUrlClassifierTestUtils_h_
#define nsUrlClassifierTestUtils_h_

#include "nsIUrlClassifierTestUtils.h"

class nsUrlClassifierTestUtils final : public nsIUrlClassifierTestUtils {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIURLCLASSIFIERTESTUTILS

  static already_AddRefed<nsUrlClassifierTestUtils> GetXPCOMSingleton();

 private:
  nsUrlClassifierTestUtils() = default;
  ~nsUrlClassifierTestUtils() = default;
};

#endif  // nsUrlClassifierTestUtils_h_

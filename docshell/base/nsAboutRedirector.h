/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsAboutRedirector_h_
#define nsAboutRedirector_h_

#include "nsIAboutModule.h"

class nsAboutRedirector : public nsIAboutModule {
 public:
  NS_DECL_ISUPPORTS

  NS_DECL_NSIABOUTMODULE

  nsAboutRedirector() = default;

  static nsresult Create(REFNSIID aIID, void** aResult);

 protected:
  virtual ~nsAboutRedirector() = default;
};

#endif  // nsAboutRedirector_h_

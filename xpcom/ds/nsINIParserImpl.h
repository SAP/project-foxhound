/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsINIParserImpl_h_
#define nsINIParserImpl_h_

#include "nsIINIParser.h"

#define NS_INIPARSERFACTORY_CONTRACTID "@mozilla.org/xpcom/ini-parser-factory;1"

class nsINIParserFactory final : public nsIINIParserFactory {
  ~nsINIParserFactory() = default;

 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIINIPARSERFACTORY
};

#endif  // nsINIParserImpl_h_

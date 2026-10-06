/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLKIT_MOZAPPS_EXTENSIONS_ADDONCONTENTPOLICY_H_
#define TOOLKIT_MOZAPPS_EXTENSIONS_ADDONCONTENTPOLICY_H_

#include "nsIAddonPolicyService.h"

class AddonContentPolicy : public nsIAddonContentPolicy {
 protected:
  virtual ~AddonContentPolicy();

 public:
  AddonContentPolicy();

  NS_DECL_ISUPPORTS
  NS_DECL_NSIADDONCONTENTPOLICY
};

#endif  // TOOLKIT_MOZAPPS_EXTENSIONS_ADDONCONTENTPOLICY_H_

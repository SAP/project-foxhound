/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FuzzySecurityInfo_h_
#define FuzzySecurityInfo_h_

#include "nsCOMPtr.h"
#include "nsITransportSecurityInfo.h"

namespace mozilla {
namespace net {

class FuzzySecurityInfo final : public nsITransportSecurityInfo {
 public:
  FuzzySecurityInfo();

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSITRANSPORTSECURITYINFO

 protected:
  virtual ~FuzzySecurityInfo();
};  // class FuzzySecurityInfo

}  // namespace net
}  // namespace mozilla

#endif  // FuzzySecurityInfo_h_

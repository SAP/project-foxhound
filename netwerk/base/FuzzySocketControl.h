/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FuzzySocketControl_h_
#define FuzzySocketControl_h_

#include "nsITLSSocketControl.h"

namespace mozilla {
namespace net {

class FuzzySocketControl final : public nsITLSSocketControl {
 public:
  FuzzySocketControl();

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSITLSSOCKETCONTROL

 protected:
  virtual ~FuzzySocketControl();
};  // class FuzzySocketControl

}  // namespace net
}  // namespace mozilla

#endif  // FuzzySocketControl_h_

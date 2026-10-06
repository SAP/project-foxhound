/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_CrashReport_h
#define mozilla_dom_CrashReport_h

#include "nsCOMPtr.h"

class nsIPrincipal;

namespace mozilla::dom {

class CrashReport {
 public:
  static bool Deliver(nsIPrincipal* aPrincipal, bool aIsOOM);
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_CrashReport_h

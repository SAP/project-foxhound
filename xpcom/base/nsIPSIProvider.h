/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsIPSIProvider_h_
#define nsIPSIProvider_h_

#include "nsISupports.h"

namespace mozilla {
struct PSIInfo;
}

// Interface to get PSI (Pressure Stall Information) data
#define NS_IPSIPROVIDER_IID \
  {0x3c2ba80c, 0x6603, 0x4edb, {0xb5, 0x0b, 0xab, 0x6c, 0x76, 0x98, 0x57, 0xc5}}

class nsIPSIProvider : public nsISupports {
 public:
  NS_INLINE_DECL_STATIC_IID(NS_IPSIPROVIDER_IID)

  NS_IMETHOD GetCachedPSIInfo(mozilla::PSIInfo& aResult) = 0;
  virtual void StartNonOOMPSISampling() = 0;
};

#endif  // nsIPSIProvider_h_

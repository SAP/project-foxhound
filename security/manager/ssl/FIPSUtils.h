/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FIPSUtils_h
#define FIPSUtils_h

#include "nsIFIPSUtils.h"

namespace mozilla {
namespace psm {

class FIPSUtils : public nsIFIPSUtils {
 public:
  FIPSUtils() = default;

  NS_DECL_ISUPPORTS
  NS_DECL_NSIFIPSUTILS

 protected:
  virtual ~FIPSUtils() = default;
};

}  // namespace psm
}  // namespace mozilla

#endif  // FIPSUtils_h

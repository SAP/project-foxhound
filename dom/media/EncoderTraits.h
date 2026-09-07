/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef EncoderTraits_h_
#define EncoderTraits_h_

#include "PEMFactory.h"
#include "mozilla/dom/EncoderTypes.h"

namespace mozilla::EncoderSupport {

template <typename T>
bool Supports(const RefPtr<T>& aEncoderConfigInternal) {
  RefPtr<PEMFactory> factory = new PEMFactory();
  EncoderConfig config = aEncoderConfigInternal->ToEncoderConfig();
  return !factory->Supports(config).isEmpty();
}

}  // namespace mozilla::EncoderSupport

#endif

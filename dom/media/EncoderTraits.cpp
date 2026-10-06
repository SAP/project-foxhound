/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PEMFactory.h"

namespace mozilla::EncodeTraits {

// Returns true if it is possible to encode to a particular configuration, false
// otherwise.
bool Supports(const EncoderConfig& aConfig) {
  RefPtr<PEMFactory> pem = new PEMFactory();
  return pem->Supports(aConfig);
}
}  // namespace mozilla::EncodeTraits

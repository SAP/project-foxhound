/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_COMMONMETADATAARRAYFWD_H_
#define DOM_QUOTA_COMMONMETADATAARRAYFWD_H_

#include "nsTArrayForwardDeclare.h"

namespace mozilla::dom::quota {

struct OriginUsageMetadata;

using OriginUsageMetadataArray = nsTArray<OriginUsageMetadata>;

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_COMMONMETADATAARRAYFWD_H_

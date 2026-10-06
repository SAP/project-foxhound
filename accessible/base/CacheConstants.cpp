/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CacheConstants.h"
#include "nsAccessibilityService.h"

namespace mozilla::a11y {

// Get the set of cache domains required by the given cache domains, which will
// always be equal to or a superset of the given set of cache domains.
uint64_t GetCacheDomainSuperset(uint64_t aCacheDomains) {
  uint64_t allNecessaryDomains = aCacheDomains;
  if (aCacheDomains & CacheDomain::TextOffsetAttributes) {
    allNecessaryDomains |= CacheDomain::Text;
  }
  if (aCacheDomains & CacheDomain::TextBounds) {
    allNecessaryDomains |= CacheDomain::Text;
    allNecessaryDomains |= CacheDomain::Bounds;
  }
  MOZ_ASSERT((allNecessaryDomains & aCacheDomains) == aCacheDomains,
             "Return value is not a superset of the input.");
  return allNecessaryDomains;
}

bool DomainsAreActive(uint64_t aRequiredCacheDomains) {
  const uint64_t activeCacheDomains =
      nsAccessibilityService::GetActiveCacheDomains();
  const bool allRequiredDomainsAreActive =
      (aRequiredCacheDomains & ~activeCacheDomains) == 0;
  return allRequiredDomainsAreActive;
}

}  // namespace mozilla::a11y

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const SitePolicyUtils = {
  isAllowedForURI(manager, sitePolicies, feature, uri) {
    // The first site policy that matches the domain and includes a setting
    // for the feature wins.
    for (let policies of sitePolicies) {
      if (
        policies.exceptions.matches(uri) ||
        // This is necessary to correctly match moz-nullprincipal URIs.
        policies.exceptions.matchesAllWebUrls
      ) {
        continue;
      }

      if (
        !policies.match.matches(uri) &&
        // This is necessary to correctly match moz-nullprincipal URIs.
        !policies.match.matchesAllWebUrls
      ) {
        continue;
      }

      if (feature in policies.features) {
        return policies.features[feature];
      }
    }

    // No site specific setting, fall back to the global setting.
    return manager.isAllowed(feature);
  },
};

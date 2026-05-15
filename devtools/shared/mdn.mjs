/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Get a URLSearchParams instance with the proper utm_* parameters
 *
 * @param {string} utmMedium: value for the "utm_medium" parameter
 * @returns {URLSearchParams}
 */
export function getMdnLinkParams(utmMedium) {
  return new URLSearchParams({
    utm_source: "devtools",
    utm_medium: utmMedium,
    utm_campaign: "default",
  });
}

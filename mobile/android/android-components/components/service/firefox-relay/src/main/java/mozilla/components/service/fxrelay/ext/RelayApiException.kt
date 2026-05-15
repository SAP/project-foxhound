/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.ext

import mozilla.appservices.relay.RelayApiException

/**
 * API error code indicating the free tier limit has been reached.
 */
const val API_CODE_FREE_TIER_LIMIT = "free_tier_limit"

/**
 * Returns true if this exception indicates the free tier limit was reached.
 */
internal fun RelayApiException.freeLimitReached(): Boolean {
    return this is RelayApiException.Api && code == API_CODE_FREE_TIER_LIMIT
}

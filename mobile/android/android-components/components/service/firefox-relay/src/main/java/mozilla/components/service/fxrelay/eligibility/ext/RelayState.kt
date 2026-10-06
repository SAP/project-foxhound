/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.ext

import mozilla.components.service.fxrelay.eligibility.FETCH_TIMEOUT_MS
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.NO_ENTITLEMENT_CHECK_YET_MS
import mozilla.components.service.fxrelay.eligibility.RelayState
import mozilla.components.support.base.log.logger.Logger

private val logger = Logger("RelayState")

/**
 * Determines if the relay entitlement status should be checked.
 *
 * @param timeout Time-to-live for entitlement checks in milliseconds.
 * @return True if the user is logged in and the TTL has expired, or if there hasn't been any
 * entitlement checks yet, false otherwise.
 */
internal fun RelayState.shouldCheckStatus(timeout: Long = FETCH_TIMEOUT_MS): Boolean {
    val loggedIn = eligibilityState !is Ineligible.FirefoxAccountNotLoggedIn
    val lastCheck = lastEntitlementCheckMs
    val now = System.currentTimeMillis()
    val ttlExpired = lastCheck == NO_ENTITLEMENT_CHECK_YET_MS || now - lastCheck >= timeout

    logger.info("Should Check Status user logged in: $loggedIn, TTL expired: $ttlExpired.")

    return loggedIn && ttlExpired
}

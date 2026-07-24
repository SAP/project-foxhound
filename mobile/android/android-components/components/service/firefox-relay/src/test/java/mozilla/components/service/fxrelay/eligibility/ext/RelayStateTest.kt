/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.ext

import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.FETCH_TIMEOUT_MS
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.NO_ENTITLEMENT_CHECK_YET_MS
import mozilla.components.service.fxrelay.eligibility.RelayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RelayStateTest {

    @Test
    fun `GIVEN user not logged in WHEN shouldCheckStatus is called THEN returns false`() {
        val state = RelayState(
            eligibilityState = Ineligible.FirefoxAccountNotLoggedIn,
            lastEntitlementCheckMs = NO_ENTITLEMENT_CHECK_YET_MS,
        )

        val result = state.shouldCheckStatus()

        assertFalse(result)
    }

    @Test
    fun `GIVEN logged in user never checked WHEN shouldCheckStatus is called THEN returns true`() {
        val state = RelayState(
            eligibilityState = Ineligible.NoRelay,
            lastEntitlementCheckMs = NO_ENTITLEMENT_CHECK_YET_MS,
        )

        val result = state.shouldCheckStatus()

        assertTrue(result)
    }

    @Test
    fun `GIVEN logged in user with expired TTL WHEN shouldCheckStatus is called THEN returns true`() {
        val oldTimestamp = System.currentTimeMillis() - FETCH_TIMEOUT_MS - 1000L
        val state = RelayState(
            eligibilityState = Eligible.Premium,
            lastEntitlementCheckMs = oldTimestamp,
        )

        val result = state.shouldCheckStatus()

        assertTrue(result)
    }

    @Test
    fun `GIVEN logged in user with recent check WHEN shouldCheckStatus is called THEN returns false`() {
        val recentTimestamp = System.currentTimeMillis() - 1000L
        val state = RelayState(
            eligibilityState = Eligible.Free(totalMasksUsed = 5),
            lastEntitlementCheckMs = recentTimestamp,
        )

        val result = state.shouldCheckStatus()

        assertFalse(result)
    }
}

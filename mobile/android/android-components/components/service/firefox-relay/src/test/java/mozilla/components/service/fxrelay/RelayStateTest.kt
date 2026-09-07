/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay

import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.NO_ENTITLEMENT_CHECK_YET_MS
import mozilla.components.service.fxrelay.eligibility.RelayState
import org.junit.Assert.assertEquals
import org.junit.Test

class RelayStateTest {

    @Test
    fun `GIVEN default RelayState WHEN constructed THEN FirefoxAccountNotLoggedIn AND timestamp is unset`() {
        val state = RelayState()

        assertEquals(Ineligible.FirefoxAccountNotLoggedIn, state.eligibilityState)
        assertEquals(NO_ENTITLEMENT_CHECK_YET_MS, state.lastEntitlementCheckMs)
    }
}

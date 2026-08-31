/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay

import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.NO_ENTITLEMENT_CHECK_YET_MS
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayState
import mozilla.components.service.fxrelay.eligibility.relayEligibilityReducer
import org.junit.Assert.assertEquals
import org.junit.Test

class RelayEligibilityStoreTest {

    @Test
    fun `GIVEN RelayEligibilityStore WHEN dispatching AccountChanged THEN reducer updates state`() {
        val initialState = RelayState(
            eligibilityState = Ineligible.FirefoxAccountNotLoggedIn,
            lastEntitlementCheckMs = 0L,
        )

        val store = RelayEligibilityStore(
            initialState = initialState,
            reducer = ::relayEligibilityReducer,
        )

        assertEquals(initialState, store.state)

        store.dispatch(RelayEligibilityAction.AccountLoginStatusChanged(isLoggedIn = true))

        val newState = store.state
        assertEquals(Ineligible.NoRelay, newState.eligibilityState)
        assertEquals(NO_ENTITLEMENT_CHECK_YET_MS, newState.lastEntitlementCheckMs)
    }
}

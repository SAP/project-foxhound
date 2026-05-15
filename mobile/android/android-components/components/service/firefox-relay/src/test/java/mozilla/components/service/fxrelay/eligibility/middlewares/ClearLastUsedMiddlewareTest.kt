/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.middlewares

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.service.fxrelay.EmailMask
import mozilla.components.service.fxrelay.MaskSource
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayPlanTier
import mozilla.components.service.fxrelay.eligibility.RelayState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class ClearLastUsedMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var store: RelayEligibilityStore

    @Before
    fun setup() {
        store = RelayEligibilityStore(
            initialState = RelayState(
                eligibilityState = Eligible.Free(totalMasksUsed = 5),
            ),
            middleware = listOf(ClearLastUsedMiddleware()),
        )
    }

    @Test
    fun `GIVEN non-null emailMask WHEN UpdateLastUsed dispatched THEN lastUsed is cleared`() =
        runTest(testDispatcher) {
            val mask = EmailMask("test@relay.firefox.com", MaskSource.GENERATED)

            store.dispatch(RelayEligibilityAction.UpdateLastUsed(mask))
            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(store.state.lastUsed)
        }

    @Test
    fun `GIVEN null emailMask WHEN UpdateLastUsed dispatched THEN lastUsed remains null`() =
        runTest(testDispatcher) {
            store.dispatch(RelayEligibilityAction.UpdateLastUsed(null))
            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(store.state.lastUsed)
        }

    @Test
    fun `GIVEN other action WHEN dispatched THEN action passes through normally`() =
        runTest(testDispatcher) {
            val action = RelayEligibilityAction.RelayStatusResult(
                fetchSucceeded = true,
                relayPlanTier = RelayPlanTier.PREMIUM,
                totalMasksUsed = 0,
                lastCheckedMs = System.currentTimeMillis(),
            )

            store.dispatch(action)
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(Eligible.Premium, store.state.eligibilityState)
        }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.relay

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.Settings
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayPlanTier
import mozilla.components.service.fxrelay.eligibility.RelayState
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.verify

class EmailMaskEngineUpdaterTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var engineSettings: Settings
    private lateinit var engine: Engine

    @Before
    fun setup() {
        engineSettings = mock()
        engine = mock {
            whenever(settings).thenReturn(engineSettings)
        }
    }

    @Test
    fun `WHEN relay store is ineligible THEN engine relay mode is disabled`() = runTest(testDispatcher) {
        val store = RelayEligibilityStore()
        val updater = EmailMaskEngineUpdater(engine, store, testDispatcher)

        updater.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSettings).firefoxRelay = Engine.FirefoxRelayMode.DISABLED
    }

    @Test
    fun `WHEN relay store is eligible for free plan THEN engine relay mode is enabled`() = runTest(testDispatcher) {
        val store = RelayEligibilityStore(
            initialState = RelayState(eligibilityState = Eligible.Free(5)),
        )
        val updater = EmailMaskEngineUpdater(engine, store, testDispatcher)

        updater.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSettings).firefoxRelay = Engine.FirefoxRelayMode.ENABLED
    }

    @Test
    fun `WHEN relay eligibility changes to free plan THEN engine relay mode changes to enabled`() = runTest(testDispatcher) {
        val store = RelayEligibilityStore()
        val updater = EmailMaskEngineUpdater(engine, store, testDispatcher)

        updater.start()

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSettings).firefoxRelay = Engine.FirefoxRelayMode.DISABLED

        store.dispatch(
            RelayEligibilityAction.RelayStatusResult(
                fetchSucceeded = true,
                relayPlanTier = RelayPlanTier.FREE,
                totalMasksUsed = 5,
                lastCheckedMs = 123L,
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSettings).firefoxRelay = Engine.FirefoxRelayMode.ENABLED
    }
}

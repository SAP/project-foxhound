/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.relay

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.service.fxrelay.EmailMask
import mozilla.components.service.fxrelay.MaskSource
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

class EmailMaskInfoPrompterTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var appStore: AppStore
    private val errorMessages = ErrorMessages(
        maxMasksReached = "Max masks reached",
        errorRetrievingMasks = "Error retrieving masks",
    )

    @Before
    fun setup() {
        appStore = AppStore()
    }

    @Test
    fun `GIVEN free user with FREE_TIER_LIMIT mask WHEN lastUsed updates THEN shows max masks reached snackbar`() =
        runTest(testDispatcher) {
            val mask = EmailMask("test@relay.firefox.com", MaskSource.FREE_TIER_LIMIT)
            val relayStore = RelayEligibilityStore(
                initialState = RelayState(
                    eligibilityState = Eligible.Free(totalMasksUsed = 5),
                ),
            )
            val prompter = EmailMaskInfoPrompter(relayStore, appStore, errorMessages, testDispatcher)

            prompter.start()
            testDispatcher.scheduler.advanceUntilIdle()

            relayStore.dispatch(
                RelayEligibilityAction.UpdateLastUsed(mask),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            val snackbarState = appStore.state.snackbarState
            assertTrue(snackbarState is SnackbarState.ShowSnackbar)
            assertEquals(errorMessages.maxMasksReached, (snackbarState as SnackbarState.ShowSnackbar).title)
        }

    @Test
    fun `GIVEN free user with GENERATED mask WHEN lastUsed updates THEN no snackbar shown`() =
        runTest(testDispatcher) {
            val mask = EmailMask("test@relay.firefox.com", MaskSource.GENERATED)
            val relayStore = RelayEligibilityStore(
                initialState = RelayState(
                    eligibilityState = Eligible.Free(totalMasksUsed = 5),
                ),
            )
            val prompter = EmailMaskInfoPrompter(relayStore, appStore, errorMessages, testDispatcher)

            prompter.start()
            testDispatcher.scheduler.advanceUntilIdle()

            relayStore.dispatch(
                RelayEligibilityAction.UpdateLastUsed(mask),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(appStore.state.snackbarState is SnackbarState.None)
        }

    @Test
    fun `GIVEN ineligible user WHEN lastUsed updates THEN shows error retrieving masks snackbar`() =
        runTest(testDispatcher) {
            val mask = EmailMask("test@relay.firefox.com", MaskSource.GENERATED)
            val relayStore = RelayEligibilityStore(
                initialState = RelayState(
                    eligibilityState = Ineligible.FirefoxAccountNotLoggedIn,
                ),
            )
            val prompter = EmailMaskInfoPrompter(relayStore, appStore, errorMessages, testDispatcher)

            prompter.start()
            testDispatcher.scheduler.advanceUntilIdle()

            relayStore.dispatch(
                RelayEligibilityAction.UpdateLastUsed(mask),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            val snackbarState = appStore.state.snackbarState
            assertTrue(snackbarState is SnackbarState.ShowSnackbar)
            assertEquals(
                errorMessages.errorRetrievingMasks,
                (snackbarState as SnackbarState.ShowSnackbar).title,
            )
        }

    @Test
    fun `GIVEN premium user WHEN lastUsed updates THEN no snackbar shown`() =
        runTest(testDispatcher) {
            val mask = EmailMask("test@relay.firefox.com", MaskSource.GENERATED)
            val relayStore = RelayEligibilityStore(
                initialState = RelayState(
                    eligibilityState = Eligible.Premium,
                ),
            )
            val prompter = EmailMaskInfoPrompter(relayStore, appStore, errorMessages, testDispatcher)

            prompter.start()
            testDispatcher.scheduler.advanceUntilIdle()

            relayStore.dispatch(
                RelayEligibilityAction.UpdateLastUsed(mask),
            )
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(appStore.state.snackbarState is SnackbarState.None)
        }

    @Test
    fun `GIVEN fromSource with FREE_TIER_LIMIT WHEN called THEN returns maxMasksReached`() {
        val result = errorMessages.fromSource(MaskSource.FREE_TIER_LIMIT)

        assertEquals(errorMessages.maxMasksReached, result)
    }

    @Test
    fun `GIVEN fromSource with GENERATED WHEN called THEN returns null`() {
        val result = errorMessages.fromSource(MaskSource.GENERATED)

        assertNull(result)
    }

    @Test
    fun `GIVEN fromSource with null WHEN called THEN returns null`() {
        val result = errorMessages.fromSource(null)

        assertNull(result)
    }
}

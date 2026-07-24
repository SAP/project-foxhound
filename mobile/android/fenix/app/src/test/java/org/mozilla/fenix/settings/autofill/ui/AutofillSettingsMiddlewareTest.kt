/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.dataprotect.SecureAbove22Preferences
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.sync.autofill.AutofillCreditCardsAddressesStorage
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AutofillSettingsMiddlewareTest {

    private lateinit var securePrefs: SecureAbove22Preferences
    private lateinit var autofillSettingsStorage: AutofillCreditCardsAddressesStorage
    private lateinit var accountManager: FxaAccountManager
    private lateinit var updateSaveFillStatus: (String, Boolean) -> Unit
    private lateinit var updateSyncStatusAcrossDevices: (String, Boolean) -> Unit
    private lateinit var goToScreen: (String) -> Unit
    private lateinit var exitAutofillSettings: () -> Unit

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        securePrefs = SecureAbove22Preferences(testContext, "autofill", forceInsecure = true)
        autofillSettingsStorage =
            AutofillCreditCardsAddressesStorage(testContext, lazy { securePrefs })
        accountManager = mock()
        updateSaveFillStatus = { _, _ -> }
        updateSyncStatusAcrossDevices = { _, _ -> }
        goToScreen = { }
        exitAutofillSettings = { }
    }

    @Test
    fun `GIVEN no addresses in storage WHEN store is initialized THEN list of addresses will be empty`() =
        runTest(testDispatcher) {
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(0, store.state.addresses.size)
        }

    @Test
    fun `GIVEN no credit cards in storage WHEN store is initialized THEN list of credit cards will be empty`() =
        runTest(testDispatcher) {
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            testDispatcher.scheduler.advanceUntilIdle()

            assertEquals(0, store.state.creditCards.size)
        }

    @Test
    fun `WHEN back is clicked THEN exit autofill settings`() =
        runTest(testDispatcher) {
            var exited = false
            exitAutofillSettings = { exited = true }
            val middleware = buildMiddleware()
            val store = middleware.makeStore()

            store.dispatch(AutofillSettingsBackClicked)
            testDispatcher.scheduler.advanceUntilIdle()

            assertTrue(exited)
        }

    @Test
    fun `GIVEN an autofill settings store WHEN save fill addresses option is changed THEN save the new value`() =
        runTest(testDispatcher) {
            var newSaveFillAddressesOption = false
            updateSaveFillStatus = { _, newOption ->
                newSaveFillAddressesOption = newOption
            }
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            store.dispatch(ChangeAddressSaveFillPreference(true))
            testDispatcher.scheduler.advanceUntilIdle()
            assertTrue(newSaveFillAddressesOption)
        }

    @Test
    fun `GIVEN an autofill settings store WHEN save fill credit cards option is changed THEN save the new value`() =
        runTest(testDispatcher) {
            var newSaveFillCreditCardsOption = true
            updateSaveFillStatus = { _, newOption ->
                newSaveFillCreditCardsOption = newOption
            }
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            store.dispatch(ChangeCardSaveFillPreference(false))
            testDispatcher.scheduler.advanceUntilIdle()
            assertFalse(newSaveFillCreditCardsOption)
        }

    @Test
    fun `GIVEN an autofill settings store WHEN sync addresses option is changed THEN save the new value`() =
        runTest(testDispatcher) {
            var newSyncAddressesOption = false
            updateSyncStatusAcrossDevices = { _, newOption ->
                newSyncAddressesOption = newOption
            }
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            store.dispatch(UpdateAddressesSyncStatus(true))
            testDispatcher.scheduler.advanceUntilIdle()
            assertTrue(newSyncAddressesOption)
        }

    @Test
    fun `GIVEN an autofill settings store WHEN sync credit cards option is changed THEN save the new value`() =
        runTest(testDispatcher) {
            var newSyncCreditCardsOption = true
            updateSyncStatusAcrossDevices = { _, newOption ->
                newSyncCreditCardsOption = newOption
            }
            val middleware = buildMiddleware()
            val store = middleware.makeStore()
            store.dispatch(UpdateCreditCardsSyncStatus(false))
            testDispatcher.scheduler.advanceUntilIdle()
            assertFalse(newSyncCreditCardsOption)
        }

    private fun buildMiddleware() = AutofillSettingsMiddleware(
        autofillSettingsStorage = autofillSettingsStorage,
        accountManager = accountManager,
        updateSaveFillStatus = updateSaveFillStatus,
        updateSyncStatusAcrossDevices = updateSyncStatusAcrossDevices,
        goToScreen = goToScreen,
        exitAutofillSettings = exitAutofillSettings,
        ioDispatcher = testDispatcher,
    )

    private fun AutofillSettingsMiddleware.makeStore(
        initialState: AutofillSettingsState = AutofillSettingsState.default,
    ) = AutofillSettingsStore(
        initialState = initialState,
        middleware = listOf(this),
    )
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.sync.autofill.AutofillCreditCardsAddressesStorage
import org.mozilla.fenix.settings.autofill.AutofillScreenDestination
import org.mozilla.fenix.settings.logins.ui.LoginsAction

/**
 * A middleware for handling side-effects in response to [LoginsAction]s.
 *
 * @param autofillSettingsStorage Storage layer for reading and writing addresses/cards.
 * @param accountManager The account manager that offers information on account auth state.
 * @param updateSaveFillStatus Invoked when changing the save fill status option for addresses or cards.
 * @param updateSyncStatusAcrossDevices Invoked when changing the sync status option for addresses or cards.
 * @param goToScreen Invoked when navigating to another screen.
 * @param exitAutofillSettings Invoked when back is clicked while the navController's backstack is empty.
 * @param ioDispatcher Coroutine dispatcher for IO operations.
 */
internal class AutofillSettingsMiddleware(
    private val autofillSettingsStorage: AutofillCreditCardsAddressesStorage,
    private val accountManager: FxaAccountManager,
    private val updateSaveFillStatus: (String, Boolean) -> Unit,
    private val updateSyncStatusAcrossDevices: (String, Boolean) -> Unit,
    private val goToScreen: (String) -> Unit,
    private val exitAutofillSettings: () -> Unit,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : Middleware<AutofillSettingsState, AutofillSettingsAction> {

    private val scope = CoroutineScope(ioDispatcher)
    private lateinit var observer: AccountObserver

    override fun invoke(
        store: Store<AutofillSettingsState, AutofillSettingsAction>,
        next: (AutofillSettingsAction) -> Unit,
        action: AutofillSettingsAction,
    ) {
        next(action)

        when (action) {
            is InitializeAddressesAndCreditCards -> {
                store.registerObserverForAccountChanges(accountManager)
                store.loadAddressesAndCreditCards()
            }
            is AddAddressClicked -> {
                goToScreen(AutofillScreenDestination.ADD_ADDRESS)
            }
            is AddCardClicked -> {
                goToScreen(AutofillScreenDestination.ADD_CREDIT_CARD)
            }
            is AutofillSettingsBackClicked -> {
                exitAutofillSettings()
            }
            is ChangeAddressSaveFillPreference -> {
                updateSaveFillStatus(AutofillScreenDestination.ADDRESS, action.isChecked)
            }
            is ChangeCardSaveFillPreference -> {
                updateSaveFillStatus(AutofillScreenDestination.CREDIT_CARD, action.isChecked)
            }
            is SyncAddressesAcrossDevicesClicked -> {
                goToScreen(AutofillScreenDestination.SYNC_SIGN_IN)
            }
            is SyncCardsAcrossDevicesClicked -> {
                goToScreen(AutofillScreenDestination.SYNC_SIGN_IN)
            }
            is UpdateAddressesSyncStatus -> {
                updateSyncStatusAcrossDevices(AutofillScreenDestination.ADDRESS, action.newStatus)
            }
            is UpdateCreditCardsSyncStatus -> {
                updateSyncStatusAcrossDevices(
                    AutofillScreenDestination.CREDIT_CARD,
                    action.newStatus,
                )
            }
            is ManageAddressesClicked -> {
                goToScreen(AutofillScreenDestination.MANAGE_ADDRESSES)
            }
            is ManageCreditCardsClicked -> {
                goToScreen(AutofillScreenDestination.MANAGE_CREDIT_CARDS)
            }
            is ViewDisposed -> {
                accountManager.unregister(observer)
            }
            is UpdateAddresses,
            is UpdateCreditCards,
            is AccountAuthenticationAction.Authenticated,
            is AccountAuthenticationAction.Failed,
            is AccountAuthenticationAction.NotAuthenticated,
                -> Unit
        }
    }

    private fun Store<AutofillSettingsState, AutofillSettingsAction>.loadAddressesAndCreditCards() =
        scope.launch {
            val addresses = autofillSettingsStorage.getAllAddresses()
            val creditCards = autofillSettingsStorage.getAllCreditCards()

            dispatch(UpdateAddresses(addresses = addresses))
            dispatch(UpdateCreditCards(creditCards = creditCards))
        }

    private fun Store<AutofillSettingsState, AutofillSettingsAction>.registerObserverForAccountChanges(
        accountManager: FxaAccountManager,
    ) =
        scope.launch {
            observer = object : AccountObserver {
                override fun onAuthenticated(account: OAuthAccount, authType: AuthType) {
                    dispatch(AccountAuthenticationAction.Authenticated)
                }

                override fun onLoggedOut() {
                    dispatch(AccountAuthenticationAction.NotAuthenticated)
                }

                override fun onAuthenticationProblems() {
                    dispatch(AccountAuthenticationAction.Failed)
                }
            }

            accountManager.register(observer)
        }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

/**
 * Function for reducing a new autofill settings state based on the received action.
 */
internal fun autofillSettingsReducer(state: AutofillSettingsState, action: AutofillSettingsAction) =
    when (action) {
        is UpdateAddresses -> {
            state.copy(
                addresses = action.addresses,
            )
        }

        is UpdateCreditCards -> {
            state.copy(
                creditCards = action.creditCards,
            )
        }

        is AutofillSettingsBackClicked -> {
            state.copy(
                addresses = listOf(),
                creditCards = listOf(),
            )
        }

        is ChangeAddressSaveFillPreference -> {
            state.copy(saveFillAddresses = action.isChecked)
        }

        is ChangeCardSaveFillPreference -> {
            state.copy(saveFillCards = action.isChecked)
        }

        is AccountAuthenticationAction.Authenticated -> {
            state.copy(accountAuthState = AccountAuthState.Authenticated)
        }

        is AccountAuthenticationAction.Failed -> {
            state.copy(accountAuthState = AccountAuthState.NeedsReauthentication)
        }

        is AccountAuthenticationAction.NotAuthenticated -> {
            state.copy(accountAuthState = AccountAuthState.LoggedOut)
        }

        is UpdateAddressesSyncStatus -> {
            state.copy(syncAddresses = action.newStatus)
        }

        is UpdateCreditCardsSyncStatus -> {
            state.copy(syncCreditCards = action.newStatus)
        }

        ViewDisposed,
        is InitializeAddressesAndCreditCards, AddAddressClicked, AddCardClicked, SyncAddressesAcrossDevicesClicked,
        SyncCardsAcrossDevicesClicked, ManageAddressesClicked, ManageCreditCardsClicked,
            -> state
    }

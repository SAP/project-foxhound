/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.CreditCard
import mozilla.components.lib.state.Action

/**
 * Actions relating to the AutofillSettings screen.
 */
internal sealed interface AutofillSettingsAction : Action
internal data object ViewDisposed : AutofillSettingsAction
internal data object InitializeAddressesAndCreditCards : AutofillSettingsAction
internal data class UpdateAddresses(val addresses: List<Address>) : AutofillSettingsAction
internal data object AddAddressClicked : AutofillSettingsAction
internal data class ChangeAddressSaveFillPreference(val isChecked: Boolean) : AutofillSettingsAction
internal data object SyncAddressesAcrossDevicesClicked : AutofillSettingsAction
internal data class UpdateCreditCards(val creditCards: List<CreditCard>) : AutofillSettingsAction
internal data object AddCardClicked : AutofillSettingsAction
internal data object SyncCardsAcrossDevicesClicked : AutofillSettingsAction
internal data class ChangeCardSaveFillPreference(val isChecked: Boolean) : AutofillSettingsAction
internal data object ManageAddressesClicked : AutofillSettingsAction
internal data object ManageCreditCardsClicked : AutofillSettingsAction
internal data object AutofillSettingsBackClicked : AutofillSettingsAction

internal sealed class AccountAuthenticationAction : AutofillSettingsAction {
    data object Authenticated : AccountAuthenticationAction()
    data object NotAuthenticated : AccountAuthenticationAction()
    data object Failed : AccountAuthenticationAction()
}

internal data class UpdateAddressesSyncStatus(val newStatus: Boolean) : AutofillSettingsAction
internal data class UpdateCreditCardsSyncStatus(val newStatus: Boolean) : AutofillSettingsAction

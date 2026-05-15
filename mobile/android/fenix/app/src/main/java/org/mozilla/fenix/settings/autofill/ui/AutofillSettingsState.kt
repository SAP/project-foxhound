/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.CreditCard
import mozilla.components.lib.state.State

/**
 * Represents the state of the autofill settings screen.
 *
 * @property addresses The list of [Address]es to display in the address list.
 * @property creditCards The list of [CreditCard]s to display in the credit card list.
 * @property saveFillAddresses True if the option of saving and filling addresses info is enabled.
 * @property saveFillCards True if the option of saving and filling cards info is enabled.
 * @property accountAuthState The account authentication state.
 * @property syncAddresses True if the option of syncing addresses across devices is enabled.
 * @property syncCreditCards True if the option of syncing credit cards across devices is enabled.
 */
internal data class AutofillSettingsState(
    val addresses: List<Address>,
    val creditCards: List<CreditCard>,
    val saveFillAddresses: Boolean,
    val saveFillCards: Boolean,
    val accountAuthState: AccountAuthState,
    val syncAddresses: Boolean,
    val syncCreditCards: Boolean,
) : State {
    companion object {
        val default: AutofillSettingsState = AutofillSettingsState(
            addresses = listOf(),
            creditCards = listOf(),
            saveFillAddresses = false,
            saveFillCards = false,
            accountAuthState = AccountAuthState.LoggedOut,
            syncAddresses = false,
            syncCreditCards = false,
        )
    }
}

internal sealed class AccountAuthState {
    data object LoggedOut : AccountAuthState()
    data object Authenticated : AccountAuthState()
    data object NeedsReauthentication : AccountAuthState()
}

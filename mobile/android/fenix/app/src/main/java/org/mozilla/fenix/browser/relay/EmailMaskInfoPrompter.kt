/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.relay

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChangedBy
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.service.fxrelay.MaskSource
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayState
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction

/**
 * Error messages displayed to the user when email mask operations fail.
 *
 * @property maxMasksReached Message shown when a free user has reached their mask limit.
 * @property errorRetrievingMasks Message shown when mask retrieval fails due to FxA or Relay RP errors.
 */
data class ErrorMessages(
    val maxMasksReached: String,
    val errorRetrievingMasks: String,
) {
    /**
     * Returns the appropriate error message based on the email mask source.
     *
     * @param source The source from where the email originated.
     * @return The error message to display, or null if no error should be shown.
     */
    fun fromSource(source: MaskSource?): String? {
        return when (source) {
            MaskSource.FREE_TIER_LIMIT -> maxMasksReached
            MaskSource.GENERATED, null -> null
        }
    }
}

/**
 * Monitors [RelayEligibilityStore] state changes and displays informational snackbars to the user via [AppStore].
 *
 * @param store The Relay eligibility store to observe for state changes.
 * @param appStore The app store used to dispatch snackbar actions.
 * @param errorMessages Localized error messages to display in snackbars.
 * @param mainDispatcher the dispatcher to run asynchronous work on.
 */
class EmailMaskInfoPrompter(
    private val store: RelayEligibilityStore,
    private val appStore: AppStore,
    private val errorMessages: ErrorMessages,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<RelayState>(store, mainDispatcher) {
    override suspend fun onState(flow: Flow<RelayState>) {
        flow.distinctUntilChangedBy { it.lastUsed }
            .collect { state ->
                if (state.lastUsed == null) {
                    return@collect
                }
                processStateForSnackbar(state)
            }
    }

    private fun processStateForSnackbar(state: RelayState) {
        when (state.eligibilityState) {
            is Eligible.Free -> {
                val errorMessage = errorMessages.fromSource(state.lastUsed?.source)
                errorMessage?.let {
                    appStore.dispatch(AppAction.SnackbarAction.ShowSnackbar(it))
                }
            }

            is Ineligible -> {
                // We've somehow offered an email mask prompt to the user and one or a combination of:
                //  - the FxA is in an invalid state.
                //  - the Relay service is returning an error we cannot handle.
                appStore.dispatch(AppAction.SnackbarAction.ShowSnackbar(errorMessages.errorRetrievingMasks))
            }

            Eligible.Premium -> {
                // no-op
            }
        }
    }
}

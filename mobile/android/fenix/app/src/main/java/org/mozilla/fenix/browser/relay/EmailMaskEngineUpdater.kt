/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.relay

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.mapLatest
import mozilla.components.concept.engine.Engine
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayState

/**
 * Update the settings to propagate email mask detection to the engine PromptDelegate APIs.
 *
 * @param engine the [Engine] for updating the relevant setting.
 * @param store the [RelayEligibilityStore] instance that holds the eligibility status for the attached account.
 * @param mainDispatcher the dispatcher to run asynchronous work on.
 */
class EmailMaskEngineUpdater(
    private val engine: Engine,
    store: RelayEligibilityStore,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<RelayState>(store, mainDispatcher) {

    @OptIn(ExperimentalCoroutinesApi::class) // mapLatest
    override suspend fun onState(flow: Flow<RelayState>) {
        flow.mapLatest { it.eligibilityState }
            .collect { state ->
                val mode = when (state) {
                    is Eligible -> Engine.FirefoxRelayMode.ENABLED
                    is Ineligible -> Engine.FirefoxRelayMode.DISABLED
                }
                engine.settings.firefoxRelay = mode
            }
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.relay

import mozilla.components.concept.engine.Engine
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxrelay.EmailMask
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayFeature
import mozilla.components.support.base.feature.LifecycleAwareFeature
import org.mozilla.fenix.components.AppStore

/**
 * A wrapper class for features that relate to the Firefox Relay email masking service.
 *
 * @param engine The browser engine for autofill integration.
 * @param store The Relay eligibility store for feature state.
 * @param appStore The application store for user preferences.
 * @param accountManager The FxA account manager for authentication.
 * @param errorMessages The error messages for display.
 */
class RelayFeatureIntegration(
    private val engine: Engine,
    private val store: RelayEligibilityStore,
    private val appStore: AppStore,
    private val accountManager: FxaAccountManager,
    private val errorMessages: ErrorMessages,
) : LifecycleAwareFeature {
    private var isStarted = false

    private val relayFeature by lazy {
        RelayFeature(
            accountManager = accountManager,
            store = store,
        )
    }
    private val emailMaskEngineUpdater by lazy {
        EmailMaskEngineUpdater(engine, store)
    }
    private val emailMaskInfoPrompter by lazy {
        EmailMaskInfoPrompter(store, appStore, errorMessages)
    }

    override fun start() {
        if (isStarted) {
            return
        }
        isStarted = true

        relayFeature.start()
        emailMaskEngineUpdater.start()
        emailMaskInfoPrompter.start()
    }

    override fun stop() {
        if (!isStarted) {
            return
        }
        isStarted = false

        relayFeature.stop()
        emailMaskEngineUpdater.stop()
        emailMaskInfoPrompter.stop()
    }

    /**
     * Creates a new email mask with the specified data, otherwise, falls back to using an existing one.
     *
     * @param generatedFor The website for which the address is generated.
     * @param description The description of the email mask.
     *
     * @return the newly created email mask or `null` if the operation fails.
     */
    suspend fun getOrCreateNewMask(generatedFor: String, description: String): EmailMask? =
        relayFeature.getOrCreateNewMask(generatedFor, description)
}

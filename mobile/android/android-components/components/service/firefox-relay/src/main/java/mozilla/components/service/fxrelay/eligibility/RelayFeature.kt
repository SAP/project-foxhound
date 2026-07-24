/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.concept.sync.Profile
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxrelay.EmailMask
import mozilla.components.service.fxrelay.FxRelay
import mozilla.components.service.fxrelay.FxRelayImpl
import mozilla.components.service.fxrelay.RelayAccountDetails
import mozilla.components.service.fxrelay.eligibility.ext.relayClient
import mozilla.components.service.fxrelay.eligibility.ext.shouldCheckStatus
import mozilla.components.support.base.feature.LifecycleAwareFeature
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.kotlinx.coroutines.flow.ifAnyChanged

internal const val FETCH_TIMEOUT_MS: Long = 10_000L

/**
 * Feature for accessing Firefox Relay service.
 */
class RelayFeature(
    private val accountManager: FxaAccountManager,
    private val store: RelayEligibilityStore,
    private val fetchTimeoutMs: Long = FETCH_TIMEOUT_MS,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : LifecycleAwareFeature {

    private val logger = Logger("RelayEligibilityFeature")

    private var scope: CoroutineScope? = null
    private val accountObserver = RelayAccountObserver()
    private var fxRelay: FxRelay? = null

    override fun start() {
        if (scope != null) {
            logger.debug("RelayFeature already started, ignoring duplicate start() call")
            return
        }

        logger.debug("Starting RelayFeature")
        accountManager.register(accountObserver)

        val authenticatedAccount = accountManager.authenticatedAccount()
        val isLoggedIn = authenticatedAccount != null
        store.dispatch(RelayEligibilityAction.AccountLoginStatusChanged(isLoggedIn))

        if (authenticatedAccount != null) {
            fxRelay = FxRelayImpl(authenticatedAccount)
        }

        scope = store.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.ifAnyChanged { arrayOf(it.eligibilityState) }
                .collect { state -> checkRelayStatus(state) }
        }
    }

    override fun stop() {
        if (scope == null) {
            logger.debug("RelayFeature already stopped, ignoring duplicate stop() call")
            return
        }

        logger.debug("Stopping RelayFeature")
        accountManager.unregister(accountObserver)
        scope?.cancel().also { scope = null }
    }

    private suspend fun checkRelayStatus(state: RelayState) {
        logger.debug("Request to check for relay status..")
        val shouldCheck = state.shouldCheckStatus(fetchTimeoutMs)
        if (!shouldCheck) {
            logger.info("Check status conditions not satisfied.")
            return
        }

        val existingClient = accountManager.authenticatedAccount()?.relayClient() != null
        if (!existingClient) {
            logger.info("Account does not have an existing relay service.")
            return
        }

        val relayDetails: RelayAccountDetails? = fxRelay?.fetchAccountDetails()
        logger.info("Updating Relay account state..")

        store.dispatch(
            RelayEligibilityAction.RelayStatusResult(
                fetchSucceeded = relayDetails != null,
                relayPlanTier = relayDetails?.relayPlanTier,
                totalMasksUsed = relayDetails?.totalMasksUsed ?: 0,
                lastCheckedMs = System.currentTimeMillis(),
            ),
        )

        if (fxRelay == null) {
            logger.debug("A status check is due but there is no FxRelay instance.")
        }
    }

    /**
     * Fetches a list of email masks for a Relay user.
     *
     * @return a list of email masks or `null` if the operation fails.
     */
    suspend fun fetchEmailMasks(): List<EmailMask>? {
        return fxRelay?.fetchEmailMasks()
    }

    /**
     * Tries to create a new email mask and falls back to using a randomly selected existing one.
     *
     * @return an email masks or `null` if the operation fails.
     */
    suspend fun getOrCreateNewMask(generatedFor: String, description: String): EmailMask? {
        val mask = fxRelay?.createEmailMask(generatedFor, description)
        store.dispatch(RelayEligibilityAction.UpdateLastUsed(mask))
        return mask
    }

    private inner class RelayAccountObserver : AccountObserver {
        override fun onAuthenticated(account: OAuthAccount, authType: AuthType) {
            store.dispatch(RelayEligibilityAction.AccountLoginStatusChanged(true))
            fxRelay = FxRelayImpl(account)
        }

        override fun onProfileUpdated(profile: Profile) {
            store.dispatch(RelayEligibilityAction.AccountProfileUpdated)
        }

        override fun onLoggedOut() {
            store.dispatch(RelayEligibilityAction.AccountLoginStatusChanged(false))
            fxRelay = null
        }
    }
}

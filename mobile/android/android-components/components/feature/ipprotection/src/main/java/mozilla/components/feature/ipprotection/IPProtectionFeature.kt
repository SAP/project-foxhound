/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package mozilla.components.feature.ipprotection

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.appservices.fxaclient.FxaException
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.ipprotection.IPProtectionDelegate
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.IPProtectionFxaAuthFlow.Companion.SCOPE_IPPROTECTION
import mozilla.components.feature.ipprotection.store.IPProtectionAction
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.InternalAction
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.EligibilityStatus
import mozilla.components.lib.state.ext.flow
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.manager.SCOPE_PROFILE
import mozilla.components.support.base.log.logger.Logger

/**
 * Feature that coordinates the IP protection proxy service. It observes [IPProtectionStore] for
 * eligibility and account state changes, registers with the [Engine] and forwards
 * activate/deactivate requests back to the [Engine].
 *
 * See [IPProtectionFxaAuthFlow] and [IPProtectionStorageSynchronizer] helpers that complement
 * this feature.
 *
 * Call [initialize] once at startup to begin observing. The feature manages its own lifecycle
 * internally and does not need to be stopped.
 *
 * @param store [IPProtectionStore] that holds the feature state.
 * @param engine [Engine] used to register the IP protection delegate and obtain the handler.
 * @param accountManager [FxaAccountManager] used to supply FxA tokens to the proxy service.
 * @param mainDispatcher [CoroutineDispatcher] on which state observations and engine calls run.
 */
class IPProtectionFeature(
    private val store: IPProtectionStore,
    private val engine: Engine,
    private val accountManager: FxaAccountManager,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) {
    private val logger = Logger("IPP:Feature")
    private val mainScope = CoroutineScope(mainDispatcher)
    private var handler: IPProtectionHandler? = null

    /**
     * Starts observing eligibility and account state. Must be called once at application startup.
     */
    fun initialize() {
        mainScope.launch {
            observeEligibilityAndService(store, mainDispatcher)
        }
        mainScope.launch {
            observeAccount(store, mainDispatcher)
        }
    }

    private fun observeEligibilityAndService(
        store: IPProtectionStore,
        mainDispatcher: CoroutineDispatcher,
    ) {
        store.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.map { Triple(it.eligibilityStatus, it.serviceStatus, it.accountState.status) }
                .distinctUntilChanged()
                // We use `collectLatest` only because of the nested `observeToggle` that
                // should be canceled on new observation.
                .collectLatest { (eligibilityStatus, serviceStatus, accountStatus) ->
                    when (eligibilityStatus) {
                        EligibilityStatus.Eligible -> {
                            if (serviceStatus == ServiceState.Uninitialized) {
                                logger.info("Registering and initializing with IPProtectionController.")
                                registerAndInit()
                            }

                            // When the app starts with an already signed-in user, the account state
                            // is likely to be ready faster than the service, so we should notify
                            // a ready account state after initializing the handler.
                            if (serviceStatus == ServiceState.Unauthenticated &&
                                accountStatus == AccountStatus.Authenticated
                            ) {
                                handler?.notifyAccountStatus(true)
                            }
                            observeToggle()
                        }

                        EligibilityStatus.Ineligible,
                        EligibilityStatus.UnsupportedRegion,
                            -> {
                            uninit()
                        }

                        EligibilityStatus.Unknown -> {
                            // no-op, initializing
                        }
                    }
                }
        }
    }

    private fun observeAccount(store: IPProtectionStore, mainDispatcher: CoroutineDispatcher) {
        store.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.distinctUntilChangedBy { it.accountState.status }
                .collect { state ->
                    when (state.accountState.status) {
                        AccountStatus.AuthFailed,
                        AccountStatus.Uninitialized,
                            -> {
                            handler?.notifyAccountStatus(false)
                        }

                        AccountStatus.Authenticated -> {
                            handler?.notifyAccountStatus(true)
                        }

                        AccountStatus.AwaitingEnrollment -> {
                            handler?.enroll { enrollInfo ->
                                store.dispatch(
                                    InternalAction.FinishingEnrollment(
                                        success = enrollInfo.isEnrolledAndEntitled,
                                    ),
                                )
                            }
                        }

                        AccountStatus.TryAgain -> {
                            handler?.notifyAccountStatus(true)
                        }

                        AccountStatus.WarmingUp,
                        AccountStatus.NeedsAuthentication,
                        AccountStatus.RequestingAuthentication,
                        AccountStatus.NeedsAuthorization,
                        AccountStatus.RequestingAuthorization,
                        AccountStatus.AwaitingAuthentication,
                        AccountStatus.AwaitingAuthorization,
                        AccountStatus.EnrolledAndEntitled,
                            -> {
                            // no-op when we are in transient states.
                        }
                    }
                }
        }
    }

    private suspend fun registerAndInit() = withContext(Dispatchers.Main) {
        handler = engine.registerIPProtectionDelegate(
            object : IPProtectionDelegate {
                override fun onStateChanged(info: IPProtectionHandler.StateInfo) {
                    store.dispatch(IPProtectionAction.EngineStateChanged(info))
                }
            },
        )
        handler?.run {
            setAuthProvider(
                object : IPProtectionHandler.AuthProvider {
                    override fun getToken(onComplete: (String?) -> Unit) {
                        mainScope.launch {
                            try {
                                val tokenInfo = accountManager.authenticatedAccount()
                                    ?.getAccessToken("$SCOPE_PROFILE $SCOPE_IPPROTECTION")
                                onComplete(tokenInfo?.token)
                            } catch (e: FxaException.Forbidden) {
                                logger.error(
                                    "We don't have a scope that gives us an token. Moving to needs authorization.",
                                    e,
                                )
                                store.dispatch(IPProtectionAction.AccountStateChanged(AccountStatus.NeedsAuthorization))
                                onComplete(null)
                            }
                        }
                    }
                },
            )
            // Initialization needs to be done ASAP whether we are using the service or not to avoid start-up delays.
            // We do need to register our listeners first to avoid dropping a message because,
            // as a side effect, the init call triggers `IPProtectionController#onServiceStateChanged`
            // that can trigger the account manager that leads to `AuthProvider#getToken`.
            init()
        }
    }

    private suspend fun uninit() = withContext(Dispatchers.Main) {
        handler?.uninit()
    }

    private suspend fun observeToggle() = withContext(Dispatchers.Main) {
        // Dedupe over the nullable so `true -> null -> true` reads as two edges, not one.
        store.flow()
            .map { it.activate }
            .distinctUntilChanged()
            .filterNotNull()
            .collect { activate ->
                val onResult: (Throwable?) -> Unit = { err ->
                    if (err != null) {
                        store.dispatch(IPProtectionAction.ToggleFailed)
                    }
                }
                if (activate) {
                    handler?.activate(onResult)
                } else {
                    handler?.deactivate(onResult)
                }
            }
    }
}

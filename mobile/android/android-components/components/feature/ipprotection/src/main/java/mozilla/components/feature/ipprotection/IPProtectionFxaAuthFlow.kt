/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.concept.sync.FxAEntryPoint
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.InternalAction
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import mozilla.components.lib.state.helpers.AbstractBinding
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.manager.SCOPE_PROFILE
import mozilla.components.service.fxa.manager.SCOPE_SYNC

/**
 * Lifecycle observer that drives the FxA authentication and authorization flows required by IP
 * protection by observing the [IPProtectionStore] for [AccountStatus.RequestingAuthentication]
 * and [AccountStatus.RequestingAuthorization] states
 *
 * @param accountManager [FxaAccountManager] used to begin the OAuth authentication flow.
 * @param store [IPProtectionStore] whose account state is observed to trigger auth flows.
 * @param entrypoint the [FxAEntryPoint] for the auth flow.
 * @param onAuthRequested Callback invoked with the OAuth URL and a completion callback once the
 * URL is ready. The caller is responsible for presenting the URL to the user (e.g. a Custom Tab)
 * and invoking the completion callback when the flow finishes.
 * @param dispatcher [CoroutineDispatcher] on which store observations run.
 */
class IPProtectionFxaAuthFlow(
    private val accountManager: FxaAccountManager,
    private val store: IPProtectionStore,
    private val entrypoint: FxAEntryPoint,
    private val onAuthRequested: (String, AuthCompletionCallback) -> Unit,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<IPProtectionState>(store, dispatcher) {
    override suspend fun onState(flow: Flow<IPProtectionState>) {
        flow.map { it.accountState.status }
            .distinctUntilChanged()
            .collect { status ->
                if (status == AccountStatus.RequestingAuthorization) {
                    val url = accountManager.beginAuthentication(
                        pairingUrl = null,
                        entrypoint = entrypoint,
                        authScopes = setOf(SCOPE_IPPROTECTION, SCOPE_PROFILE),
                        service = "vpn", // This gives us the passwordless authorization flow.
                    )

                    // FIXME(IPP) add some account auth failure notification here.
                    if (url == null) {
                        return@collect
                    }

                    val notifyOnComplete = true

                    onAuthRequested(url, notifyOnComplete)
                    store.dispatch(InternalAction.AwaitingAuth(AccountStatus.AwaitingAuthorization))
                } else if (status == AccountStatus.RequestingAuthentication) {
                    // If we're the first service that needs to authenticate the account, we need to
                    // request all the scopes needed for the device, which includes sync and session.
                    //
                    // After bug 1977876, there should be no distinction between authenticate/authorize.
                    val url = accountManager.beginAuthentication(
                        pairingUrl = null,
                        entrypoint = entrypoint,
                        authScopes = setOf(SCOPE_IPPROTECTION, SCOPE_PROFILE, SCOPE_SYNC),
                        // We don't get passwordles-login here for authentication,
                        // we send this for FxA consistency.
                        service = "vpn",
                    )

                    // FIXME(IPP) add some account auth failure notification here.
                    if (url == null) {
                        return@collect
                    }

                    val notifyOnComplete = true

                    onAuthRequested(url, notifyOnComplete)
                    store.dispatch(InternalAction.AwaitingAuth(AccountStatus.AwaitingAuthentication))
                }
            }
    }

    companion object {

        /**
         * The scope needed for access to the IP Protection service.
         *
         * N.B: The guardian backend also requires [SCOPE_PROFILE] when requesting.
         */
        const val SCOPE_IPPROTECTION = "https://identity.mozilla.com/apps/vpn"

        /**
         * Whether the notify if the auth was successful.
         *
         * N.B: This was originally a callback when the auth flow is completed, whether successful or not.
         * See comment in AuthCustomTabActivity.
         */
        typealias AuthCompletionCallback = Boolean

        /**
         * Intent key for knowing if a complete notification needs to be sent.
         */
        const val INTENT_ON_COMPLETE = "OnCompleteAction"
    }
}

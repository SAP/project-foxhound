/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthFlowError
import mozilla.components.feature.ipprotection.IPProtectionFxaAuthFlow.Companion.SCOPE_IPPROTECTION
import mozilla.components.feature.ipprotection.store.IPProtectionAction
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.InternalAction
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.service.fxa.manager.AccountState
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.store.SyncStore

/**
 * A system that collects state from an [FxaAccountManager] and [IPProtectionEligibilityStorage] and
 * forwards it to the [IPProtectionStore].
 *
 * This helper is a convenience for [IPProtectionFeature] that needs to react to multiple data sources
 * in combination, so forwarding them to one location, allows the Store to be the single-source-of-truth
 * for the feature.
 *
 */
class IPProtectionStorageSynchronizer(
    val storage: IPProtectionEligibilityStorage,
    val store: IPProtectionStore,
    val syncStore: SyncStore,
    val lazyAccountManager: Lazy<FxaAccountManager>,
) {
    private val storageStoreSync by lazy { StorageStoreSync(storage, store) }
    private val fxaAccountStoreSync by lazy { FxaAccountStoreSync(syncStore, store, lazyAccountManager) }

    /**
     * Initialize the sync.
     */
    fun initialize() {
        storageStoreSync.initialize()
        fxaAccountStoreSync.initialize()
        lazyAccountManager.value.register(fxaAccountStoreSync)
    }
}

internal class StorageStoreSync(
    private val storage: IPProtectionEligibilityStorage,
    private val store: IPProtectionStore,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    fun initialize() {
        CoroutineScope(dispatcher).launch {
            storage
                .eligibilityStatus
                .distinctUntilChanged()
                .collect { store.dispatch(IPProtectionAction.EligibilityChanged(it)) }
        }
        storage.init()
    }
}

internal class FxaAccountStoreSync(
    private val syncStore: SyncStore,
    private val ipProtectionStore: IPProtectionStore,
    private val lazyAccountManager: Lazy<FxaAccountManager>,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : AccountObserver {
    fun initialize() {
        CoroutineScope(dispatcher).launch {
            syncStore.stateFlow
                .map { it.accountState }
                .distinctUntilChanged()
                .collect { state ->
                    val mappedState = when (state) {
                        AccountState.Authenticated -> {
                            if (lazyAccountManager.value.containsScope(SCOPE_IPPROTECTION)) {
                                AccountStatus.Authenticated
                            } else {
                                AccountStatus.NeedsAuthorization
                            }
                        }
                        AccountState.AuthenticationProblem -> AccountStatus.NeedsAuthentication
                        AccountState.NotAuthenticated -> AccountStatus.Uninitialized
                        AccountState.Unknown,
                        is AccountState.Authenticating,
                            -> AccountStatus.WarmingUp
                    }
                    ipProtectionStore.dispatch(InternalAction.AccountManagerStateChanged(mappedState))
                }
        }
    }

    // The SyncStore gives us flow observers so we can get the initial state even if we missed it. However, auth flow
    // errors are missing so we need to observe the FxaAccountManager directly.
    // This should be safe to do because an AuthFlowError happens late enough in an app when the observer is already
    // registered because it's a user interaction.
    override fun onFlowError(error: AuthFlowError) {
        ipProtectionStore.dispatch(InternalAction.AccountManagerStateChanged(AccountStatus.AuthFailed))
    }
}

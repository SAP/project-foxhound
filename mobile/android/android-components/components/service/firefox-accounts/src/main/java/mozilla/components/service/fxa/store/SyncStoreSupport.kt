/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.store

import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthFlowError
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.ConstellationState
import mozilla.components.concept.sync.DeviceConstellationObserver
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.concept.sync.Profile
import mozilla.components.service.fxa.manager.AccountState
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.sync.SyncStatusObserver

/**
 * Connections an [FxaAccountManager] with a [SyncStore], so that updates to Sync
 * state can be observed.
 *
 * @param store The [SyncStore] to publish state updates based on [fxaAccountManager] observations.
 * @param fxaAccountManager Account manager that is used to interact with Sync backends.
 * @param lifecycleOwner The lifecycle owner that will tie to the when account manager observations.
 * Recommended that this be an Application or at minimum a persistent Activity.
 * @param autoPause Whether the account manager observations will stop between onPause and onResume.
 * @param ioDispatcher Dispatcher used for background operations.
 * @param mainDispatcher Dispatcher used for main thread operations.
 */
class SyncStoreSupport(
    private val store: SyncStore,
    private val fxaAccountManager: Lazy<FxaAccountManager>,
    private val lifecycleOwner: LifecycleOwner = ProcessLifecycleOwner.get(),
    private val autoPause: Boolean = false,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) {
    /**
     * Initialize the integration. This will cause it to register itself as an observer
     * of the [FxaAccountManager] and begin dispatching [SyncStore] updates.
     */
    fun initialize() {
        val accountManager = fxaAccountManager.value
        accountManager.registerForSyncEvents(
            AccountSyncObserver(store),
            owner = lifecycleOwner,
            autoPause = autoPause,
        )

        val accountObserver = FxaAccountObserver(
            store,
            ConstellationObserver(store),
            lifecycleOwner,
            autoPause,
            ioDispatcher,
            mainDispatcher,
        )
        accountManager.register(accountObserver, owner = lifecycleOwner, autoPause = autoPause)
    }
}

/**
 * Maps various [SyncStatusObserver] callbacks to [SyncAction] dispatches.
 *
 * @param store The [SyncStore] that updates will be dispatched to.
 */
internal class AccountSyncObserver(private val store: SyncStore) : SyncStatusObserver {
    override fun onStarted() {
        store.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Started))
    }

    override fun onIdle() {
        store.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Idle))
    }

    override fun onError(error: Exception?) {
        store.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.Error))
    }
}

/**
 * Maps various [AccountObserver] callbacks to [SyncAction] dispatches.
 *
 * @param store The [SyncStore] that updates will be dispatched to.
 * @param deviceConstellationObserver Will be registered as an observer to any constellations
 * received in [AccountObserver.onAuthenticated].
 * @param lifecycleOwner The lifecycle owner that will tie to the when account manager observations.
 * @param autoPause Whether the account manager observations will stop between onPause and onResume.
 * @param ioDispatcher Dispatcher used for background operations.
 * @param mainDispatcher Dispatcher used for main thread operations.
 */
internal class FxaAccountObserver(
    private val store: SyncStore,
    private val deviceConstellationObserver: DeviceConstellationObserver,
    private val lifecycleOwner: LifecycleOwner,
    private val autoPause: Boolean,
    ioDispatcher: CoroutineDispatcher,
    private val mainDispatcher: CoroutineDispatcher,
) : AccountObserver {

    private val scope = CoroutineScope(ioDispatcher + SupervisorJob())

    override fun onAuthenticated(account: OAuthAccount, authType: AuthType) {
        scope.launch(mainDispatcher) {
            account.deviceConstellation().registerDeviceObserver(
                deviceConstellationObserver,
                owner = lifecycleOwner,
                autoPause = autoPause,
            )
        }
        scope.launch {
            val syncAccount = account.getProfile()?.toAccount(account) ?: return@launch
            store.dispatch(SyncAction.UpdateAccount(syncAccount))
            store.dispatch(SyncAction.UpdateAccountState(AccountState.Authenticated))
        }
    }

    override fun onAuthenticationProblems() {
        store.dispatch(SyncAction.UpdateAccountState(accountState = AccountState.AuthenticationProblem))
    }

    override fun onLoggedOut() {
        store.dispatch(SyncAction.UpdateSyncStatus(SyncStatus.LoggedOut))
        store.dispatch(SyncAction.UpdateAccount(null))
        store.dispatch(SyncAction.UpdateAccountState(accountState = AccountState.NotAuthenticated))
    }

    override fun onFlowError(error: AuthFlowError) {
        store.dispatch(SyncAction.UpdateAccount(account = null))
        store.dispatch(SyncAction.UpdateAccountState(accountState = AccountState.NotAuthenticated))
    }

    override fun onProfileUpdated(profile: Profile) {
        val currentAccount = store.state.account ?: return
        val updatedAccount = currentAccount.copy(
            uid = profile.uid,
            email = profile.email,
            avatar = profile.avatar,
            displayName = profile.displayName,
        )
        store.dispatch(SyncAction.UpdateAccount(updatedAccount))
    }
}

/**
 * Maps various [DeviceConstellationObserver] callbacks to [SyncAction] dispatches.
 *
 * @param store The [SyncStore] that updates will be dispatched to.
 */
internal class ConstellationObserver(private val store: SyncStore) : DeviceConstellationObserver {
    override fun onDevicesUpdate(constellation: ConstellationState) {
        store.dispatch(SyncAction.UpdateDeviceConstellation(constellation))
    }
}

// Could be refactored to use a context receiver once 1.6.2 upgrade lands
private fun Profile.toAccount(oAuthAccount: OAuthAccount): Account =
    Account(
        uid = uid,
        email = email,
        avatar = avatar,
        displayName = displayName,
        currentDeviceId = oAuthAccount.getCurrentDeviceId(),
        sessionToken = oAuthAccount.getSessionToken(),
    )

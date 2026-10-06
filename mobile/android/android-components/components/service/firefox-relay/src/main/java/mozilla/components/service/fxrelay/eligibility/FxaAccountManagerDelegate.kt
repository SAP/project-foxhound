/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility

import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.service.fxa.manager.FxaAccountManager

/**
 * Exposes the subset of [FxaAccountManager] needed by [RelayFeature].
 */
interface FxaAccountManagerDelegate {
    /**
     * Registers an observer to get notified about changes.
     *
     * @param observer the observer to register.
     */
    fun register(observer: AccountObserver)

    /**
     * Unregisters an observer.
     *
     * @param observer the observer to unregister.
     */
    fun unregister(observer: AccountObserver)

    /**
     * Get the [OAuthAccount] instance if it's not disconnected.
     * Returned [OAuthAccount] may need to be re-authenticated; consumers are expected to check [accountNeedsReauth].
     */
    fun authenticatedAccount(): OAuthAccount?

    /**
     * Get the [OAuthAccount] instance if it's connected.
     */
    fun connectedAccount(): OAuthAccount?
}

/**
 * Wraps [FxaAccountManager] to implement [FxaAccountManagerDelegate].
 */
class DefaultFxaAccountManagerDelegate(
    private val accountManager: FxaAccountManager,
) : FxaAccountManagerDelegate {
    override fun register(observer: AccountObserver) = accountManager.register(observer)
    override fun unregister(observer: AccountObserver) = accountManager.unregister(observer)
    override fun authenticatedAccount() = accountManager.authenticatedAccount()
    override fun connectedAccount() = accountManager.connectedAccount()
}

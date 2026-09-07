/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection.auth.fxa

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.InternalAction

/**
 * An [android.app.Activity] authentication observer for notifying if our auth flow was completed or interrupted.
 *
 * N.B: This is no where close to perfect because we need to know when an authentication is complete for our
 * specific scope, but we don't have this capability today.
 * We've tried doing this in the `FxaAccountStoreSync` but because our apps have a single activity model,
 * those observes experience an "Authentication" event immediately that resets the state
 * machine.
 *
 * See: FXA-13706
 */
class IPProtectionActivityAuthFlowObserver(
    private val store: Lazy<IPProtectionStore>,
    private val shouldNotify: Lazy<Boolean>,
) : AccountObserver, DefaultLifecycleObserver {

    override fun onAuthenticated(account: OAuthAccount, authType: AuthType) {
        if (shouldNotify.value) {
            store.value.dispatch(InternalAction.AccountReadyForEnrollment)
        }
    }

    override fun onDestroy(owner: LifecycleOwner) {
        if (shouldNotify.value) {
            store.value.dispatch(InternalAction.FinishingAuthFlow)
        }
    }
}

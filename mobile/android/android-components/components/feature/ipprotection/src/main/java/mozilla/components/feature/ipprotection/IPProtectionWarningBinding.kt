/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import mozilla.components.lib.state.helpers.AbstractBinding

/**
 * A binding for observing an IP Protection proxy "catastrophic" error: an error the service can not
 * recover from. The service blocks the traffic while not disabling the active proxy, so that the
 * user data is not leaked. When such error happens, we present the user with options to disable
 * the proxy and continue browsing or to close their tabs first, and then disabling the proxy.
 *
 * @param store The IP protection store to observe for state changes.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will
 * occur. Defaults to [Dispatchers.Main].
 * @param proxyUnavailable A callback for reporting that proxy has errored and should be disabled.
 */
class IPProtectionWarningBinding(
    store: IPProtectionStore,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val proxyUnavailable: () -> Unit,
) : AbstractBinding<IPProtectionState>(store, mainDispatcher) {

    override suspend fun onState(flow: Flow<IPProtectionState>) {
        flow
            .map { state -> state.proxyStatus }
            .distinctUntilChanged()
            .collect { proxyStatus ->
                if (proxyStatus == Authorized.ConnectionError) {
                    proxyUnavailable()
                }
            }
    }
}

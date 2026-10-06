/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalAndroidComponentsApi::class)

package org.mozilla.fenix.components.menu

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.ServiceState
import mozilla.components.feature.ipprotection.store.IPProtectionStore
import mozilla.components.feature.ipprotection.store.state.AccountStatus
import mozilla.components.feature.ipprotection.store.state.Authorized
import mozilla.components.feature.ipprotection.store.state.IPProtectionState
import mozilla.components.feature.ipprotection.store.state.Uninitialized
import mozilla.components.feature.ipprotection.store.state.maxDataGb
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.components.menu.store.IPProtectionMenuState
import org.mozilla.fenix.components.menu.store.IPProtectionMenuStatus

/**
 * Helper for observing [IPProtectionState] and dispatching menu state updates.
 *
 * @param ipProtectionStore The store to observe for proxy status changes.
 * @param onIPProtectionStatusUpdate Invoked when the IP protection status is updated.
 * @param mainDispatcher The [CoroutineDispatcher] for state observation.
 */
class IPProtectionMenuBinding(
    ipProtectionStore: IPProtectionStore,
    private val onIPProtectionStatusUpdate: (IPProtectionMenuState) -> Unit,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<IPProtectionState>(ipProtectionStore, mainDispatcher) {

    override suspend fun onState(flow: Flow<IPProtectionState>) {
        flow
            .map { it.toMenuState() }
            .distinctUntilChanged()
            .collect {
                onIPProtectionStatusUpdate(it)
            }
    }

    private fun IPProtectionState.toMenuState() = IPProtectionMenuState(
        status = this.toMenuStatus(),
        dataLimitGb = if (maxDataBytes > 0) maxDataGb.toInt() else -1,
    )

    private fun IPProtectionState.toMenuStatus() = when {
        serviceStatus == ServiceState.Unauthenticated -> IPProtectionMenuStatus.AuthRequired
        proxyStatus is Uninitialized || proxyStatus is Authorized.Idle -> IPProtectionMenuStatus.Disabled
        proxyStatus is Authorized.Activating -> IPProtectionMenuStatus.Activating
        proxyStatus is Authorized.Active -> IPProtectionMenuStatus.Enabled
        proxyStatus is Authorized.DataLimitReached -> IPProtectionMenuStatus.DataLimitReached
        proxyStatus is Authorized.ConnectionError -> IPProtectionMenuStatus.ConnectionError
        accountState.status == AccountStatus.NeedsAuthentication ||
            accountState.status == AccountStatus.NeedsAuthorization -> IPProtectionMenuStatus.AuthRequired
        else -> IPProtectionMenuStatus.Disabled
    }
}

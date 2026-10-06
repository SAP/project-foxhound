/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ipprotection

import androidx.annotation.OptIn
import mozilla.components.ExperimentalAndroidComponentsApi
import mozilla.components.concept.engine.ipprotection.IPProtectionDelegate
import mozilla.components.concept.engine.ipprotection.IPProtectionHandler
import mozilla.components.concept.engine.ipprotection.ServiceState
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.IPProtectionController as GeckoViewIPProtectionController

@OptIn(ExperimentalGeckoViewApi::class)
@kotlin.OptIn(ExperimentalAndroidComponentsApi::class)
internal class GeckoIPProtectionDelegate(
    private val delegate: IPProtectionDelegate,
) : GeckoViewIPProtectionController.Delegate {

    /**
     * FIXME(IPP) We are keeping a copy of state info that needs to be in-sync to reduce the delegate calls.
     *  If we notify the delegate separately. The single source of truth there will not be poisoned.
     */
    private var stateInfo = IPProtectionHandler.StateInfo()

    override fun onServiceStateChanged(state: Int) {
        stateInfo = stateInfo.copy(serviceState = state.toServiceState())
        delegate.onStateChanged(stateInfo)
    }

    override fun onProxyStateChanged(state: GeckoViewIPProtectionController.ProxyState) {
        stateInfo = stateInfo.copy(
            // FIXME(IPP) this is a footgun waiting to happen. We are relying on the int values from
            //  org.mozilla.geckoview.IPProtectionController.ProxyState to continue matching with
            //  mozilla.components.concept.engine.ipprotection.IPProtectionHandler.StateInfo.PROXY_STATE_* values.
            proxyState = state.state,
            lastError = state.errorType,
        )
        delegate.onStateChanged(stateInfo)
    }

    override fun onUsageChanged(info: GeckoViewIPProtectionController.UsageInfo) {
        stateInfo = stateInfo.copy(
            remaining = info.remaining,
            max = info.max,
            resetTime = info.resetTime,
        )
        delegate.onStateChanged(stateInfo)
    }
}

@OptIn(ExperimentalGeckoViewApi::class)
@kotlin.OptIn(ExperimentalAndroidComponentsApi::class)
internal fun Int.toServiceState(): ServiceState = when (this) {
    GeckoViewIPProtectionController.SERVICE_STATE_UNINITIALIZED ->
        ServiceState.Uninitialized
    GeckoViewIPProtectionController.SERVICE_STATE_UNAVAILABLE ->
        ServiceState.Unavailable
    GeckoViewIPProtectionController.SERVICE_STATE_UNAUTHENTICATED ->
        ServiceState.Unauthenticated
    GeckoViewIPProtectionController.SERVICE_STATE_READY ->
        ServiceState.Ready
    GeckoViewIPProtectionController.SERVICE_STATE_OPTED_OUT ->
        ServiceState.OptedOut
    else -> {
        ServiceState.Unavailable
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.ext

import mozilla.components.browser.state.state.CustomTabSessionState
import mozilla.components.browser.state.state.ExternalAppType.PROGRESSIVE_WEB_APP
import mozilla.components.browser.state.state.ExternalAppType.TRUSTED_WEB_ACTIVITY
import mozilla.components.browser.state.state.TabSessionState

/**
 * Whether this custom tab is showing a Progressive Web Application.
 */
val CustomTabSessionState?.isPWA: Boolean
    get() = this?.config?.externalAppType == PROGRESSIVE_WEB_APP

/**
 * Whether this custom tab is showing a Trusted Web Activity.
 */
val CustomTabSessionState?.isTWA: Boolean
    get() = this?.config?.externalAppType == TRUSTED_WEB_ACTIVITY

internal fun CustomTabSessionState.toTab(): TabSessionState {
    return TabSessionState(
        id = id,
        content = content,
        trackingProtection = trackingProtection,
        engineState = engineState,
        extensionState = extensionState,
        contextId = contextId,
    )
}

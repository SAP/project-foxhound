/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.reducer

import mozilla.components.browser.state.action.SystemPermissionRequestAction
import mozilla.components.browser.state.state.BrowserState

internal object SystemPermissionReducer {
    /**
     * [SystemPermissionRequestAction] Reducer function for modifying [BrowserState].
     */
    fun reduce(state: BrowserState, action: SystemPermissionRequestAction): BrowserState {
        return when (action) {
            SystemPermissionRequestAction.SystemPermissionStateRequestInProgress -> {
                state.copy(systemPermissionRequestInProgress = true)
            }
            SystemPermissionRequestAction.SystemPermissionStateRequestNotInProgress -> {
                state.copy(systemPermissionRequestInProgress = false)
            }
        }
    }
}

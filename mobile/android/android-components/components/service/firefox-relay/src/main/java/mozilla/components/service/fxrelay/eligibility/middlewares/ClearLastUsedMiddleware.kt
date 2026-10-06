/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.middlewares

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityAction.UpdateLastUsed
import mozilla.components.service.fxrelay.eligibility.RelayState

/**
 * This middleware is useful for observers on the store that want to know the [RelayState.lastUsed] at the time
 * that it was used, before it is cleared away to avoid re-triggering the same observers twice.
 */
class ClearLastUsedMiddleware : Middleware<RelayState, RelayEligibilityAction> {
    override fun invoke(
        store: Store<RelayState, RelayEligibilityAction>,
        next: (RelayEligibilityAction) -> Unit,
        action: RelayEligibilityAction,
    ) {
        when (action) {
            is UpdateLastUsed -> {
                next(action)
                if (action.emailMask != null) {
                    store.dispatch(UpdateLastUsed(null))
                }
            }
            else -> {
                next(action)
            }
        }
    }
}

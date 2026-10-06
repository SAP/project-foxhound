/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * Store for handling [RelayState] and dispatching [RelayEligibilityAction].
 */
class RelayEligibilityStore(
    initialState: RelayState = RelayState(),
    reducer: Reducer<RelayState, RelayEligibilityAction> = ::relayEligibilityReducer,
    middleware: List<Middleware<RelayState, RelayEligibilityAction>> = emptyList(),
) : Store<RelayState, RelayEligibilityAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)

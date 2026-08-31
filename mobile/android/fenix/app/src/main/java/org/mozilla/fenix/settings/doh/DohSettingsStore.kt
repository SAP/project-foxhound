/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.doh

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * A Store for handling [DohSettingsState] and dispatching [DohSettingsAction].
 *
 * @param initialState The initial state for the Store.
 * @param reducer Reducer to handle state updates based on dispatched actions.
 * @param middleware Middleware to handle side-effects in response to dispatched actions.
 */
internal class DohSettingsStore(
    initialState: DohSettingsState = DohSettingsState(),
    reducer: Reducer<DohSettingsState, DohSettingsAction> = ::dohSettingsReducer,
    middleware: List<Middleware<DohSettingsState, DohSettingsAction>> = listOf(),
) : Store<DohSettingsState, DohSettingsAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
) {
    init {
        dispatch(Init)
    }
}

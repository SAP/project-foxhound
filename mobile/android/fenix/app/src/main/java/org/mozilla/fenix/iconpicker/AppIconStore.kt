/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.iconpicker

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * A Store for handling [AppIconState] and dispatching [AppIconAction].
 *
 * @param initialState The initial state of the Store.
 * @param reducer Reducer to handle state updates based on dispatched actions.
 * @param middleware A list of Middleware to handle side-effects in response to dispatched actions.
 */
class AppIconStore(
    initialState: AppIconState,
    reducer: Reducer<AppIconState, AppIconAction> = ::appIconReducer,
    middleware: List<Middleware<AppIconState, AppIconAction>> = listOf(),
) : Store<AppIconState, AppIconAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)

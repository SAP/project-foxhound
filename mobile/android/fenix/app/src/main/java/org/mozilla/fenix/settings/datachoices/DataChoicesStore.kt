/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.datachoices

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

internal class DataChoicesStore(
    initialState: DataChoicesState,
    reducer: Reducer<DataChoicesState, DataChoicesAction> = ::dataChoicesReducer,
    middleware: List<Middleware<DataChoicesState, DataChoicesAction>> = listOf(),
) : Store<DataChoicesState, DataChoicesAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)

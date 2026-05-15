/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.startupCrash

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

internal class StartupCrashStore(
    initialState: StartupCrashState,
    reducer: Reducer<StartupCrashState, StartupCrashAction> = ::startupCrashReducer,
    middleware: List<Middleware<StartupCrashState, StartupCrashAction>> = listOf(),
) : Store<StartupCrashState, StartupCrashAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)

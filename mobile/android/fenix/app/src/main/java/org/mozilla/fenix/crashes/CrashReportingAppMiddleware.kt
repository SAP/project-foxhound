/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import mozilla.components.lib.crash.store.CrashAction
import mozilla.components.lib.crash.store.CrashMiddleware
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState

/**
 * Middleware for unwrapping [CrashAction]s from the [AppAction] and passing them to more specific middleware.
 *
 * @param crashMiddleware A middleware for handling side-effects related to [CrashAction]s.
 */
class CrashReportingAppMiddleware(
    private val crashMiddleware: CrashMiddleware,
) : Middleware<AppState, AppAction> {
    override fun invoke(
        store: Store<AppState, AppAction>,
        next: (AppAction) -> Unit,
        action: AppAction,
    ) {
        next(action)
        when (action) {
            is AppAction.CrashActionWrapper -> {
                val getState = { store.state.crashState }
                val dispatch: (CrashAction) -> Unit = {
                    store.dispatch(AppAction.CrashActionWrapper(it))
                }
                crashMiddleware.invoke(
                    middlewareContext = Pair(getState, dispatch),
                    next = { nextAction: CrashAction -> next(AppAction.CrashActionWrapper(nextAction)) },
                    action = action.inner,
                )
            }
            else -> Unit
        }
    }
}

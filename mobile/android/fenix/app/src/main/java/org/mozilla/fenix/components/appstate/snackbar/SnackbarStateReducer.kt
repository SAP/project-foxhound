/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.snackbar

import org.mozilla.fenix.components.appstate.AppAction.SnackbarAction
import org.mozilla.fenix.components.appstate.AppState

/**
 * A [SnackbarAction] reducer that updates [AppState.snackbarState].
 */
internal object SnackbarStateReducer {
    fun reduce(state: AppState, action: SnackbarAction): AppState = when (action) {
        is SnackbarAction.SnackbarDismissed -> state.copy(
            snackbarState = SnackbarState.Dismiss,
        )

        is SnackbarAction.SnackbarShown,
        is SnackbarAction.Reset,
        -> state.copy(
            snackbarState = SnackbarState.None,
        )
    }
}

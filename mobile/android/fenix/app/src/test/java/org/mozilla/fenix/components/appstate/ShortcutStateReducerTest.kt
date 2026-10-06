/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

class ShortcutStateReducerTest {

    @Test
    fun `WHEN shortcut added action is dispatched THEN state is updated`() {
        val initialState = AppState()
        assertEquals(SnackbarState.None(), initialState.snackbarState)

        val finalState =
            AppStoreReducer.reduce(initialState, AppAction.ShortcutAction.ShortcutAdded)

        assertEquals(SnackbarState.ShortcutAdded, finalState.snackbarState)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction.SnackbarAction
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.DeletingBrowserDataInProgress
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.Dismiss
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.None
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState.ShowSnackbar
import kotlin.test.assertIs

class SnackbarStateReducerTest {
    private val initialState = AppState(
        snackbarState = DeletingBrowserDataInProgress,
    )

    @Test
    fun `WHEN snackbar dismissed action is dispatched THEN state is updated`() {
        val finalState = AppStoreReducer.reduce(initialState, SnackbarAction.SnackbarDismissed)

        assertIs<Dismiss>(finalState.snackbarState)
        assertTrue(finalState.snackbarState.previous == DeletingBrowserDataInProgress)
    }

    @Test
    fun `WHEN snackbar shown action is dispatched THEN state is updated`() {
        val finalState = AppStoreReducer.reduce(initialState, SnackbarAction.SnackbarShown)

        assertIs<None>(finalState.snackbarState)
        assertTrue(finalState.snackbarState.previous == DeletingBrowserDataInProgress)
    }

    @Test
    fun `WHEN reset action is dispatched THEN state is updated`() {
        val finalState = AppStoreReducer.reduce(initialState, SnackbarAction.Reset)

        assertIs<None>(finalState.snackbarState)
        assertTrue(finalState.snackbarState.previous == DeletingBrowserDataInProgress)
    }

    @Test
    fun `WHEN show snackbar action is dispatched THEN state is updated with title`() {
        val testTitle = "Test Title"
        val finalState = AppStoreReducer.reduce(initialState, SnackbarAction.ShowSnackbar(testTitle))

        assertIs<ShowSnackbar>(finalState.snackbarState)
        assertTrue(finalState.snackbarState.title == testTitle)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction.ReaderViewAction
import org.mozilla.fenix.components.appstate.readerview.ReaderViewState

class ReaderViewStateReducerTest {
    @Test
    fun `WHEN reader view started action is dispatched THEN reader view state is updated`() {
        val initialState = AppState()
        val finalState = AppStoreReducer.reduce(initialState, ReaderViewAction.ReaderViewStarted)
        assertEquals(ReaderViewState.Active, finalState.readerViewState)
    }

    @Test
    fun `WHEN reader view dismissed action is dispatched THEN reader view state is updated`() {
        val initialState = AppState()
        val finalState = AppStoreReducer.reduce(initialState, ReaderViewAction.ReaderViewDismissed)
        assertEquals(ReaderViewState.Dismiss, finalState.readerViewState)
    }

    @Test
    fun `WHEN reader view controls shown action is dispatched THEN reader view state is updated`() {
        val initialState = AppState()
        val finalState = AppStoreReducer.reduce(initialState, ReaderViewAction.ReaderViewControlsShown)
        assertEquals(ReaderViewState.ShowControls, finalState.readerViewState)
    }

    @Test
    fun `WHEN reader view reset action is dispatched THEN reader view state is updated`() {
        val initialState = AppState()
        val finalState = AppStoreReducer.reduce(initialState, ReaderViewAction.Reset)
        assertEquals(ReaderViewState.None, finalState.readerViewState)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction.FindInPageAction

class FindInPageStateReducerTest {

    @Test
    fun `WHEN find in page started action is dispatched THEN state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, FindInPageAction.FindInPageStarted)

        assertTrue(finalState.showFindInPage)
    }

    @Test
    fun `WHEN find in page dismissed action is dispatched THEN state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, FindInPageAction.FindInPageDismissed)

        assertFalse(finalState.showFindInPage)
    }

    @Test
    fun `WHEN find in page shown action is dispatched THEN state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, FindInPageAction.FindInPageShown)

        assertFalse(finalState.showFindInPage)
    }
}

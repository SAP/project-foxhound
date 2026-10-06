/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertEquals
import org.junit.Test

class TabStripActionTest {

    @Test
    fun `WHEN the last remaining tab that was closed was private THEN state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.TabStripAction.UpdateLastTabClosed(true))

        val expected = AppState(wasLastTabClosedPrivate = true)

        assertEquals(expected, finalState)
    }

    @Test
    fun `WHEN the last remaining tab that was closed was not private THEN state should reflect that`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.TabStripAction.UpdateLastTabClosed(false))

        val expected = AppState(wasLastTabClosedPrivate = false)

        assertEquals(expected, finalState)
    }
}

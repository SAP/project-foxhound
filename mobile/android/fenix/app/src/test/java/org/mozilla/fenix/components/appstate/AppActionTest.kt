/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AppActionTest {

    @Test
    fun `WHEN UpdateInactiveExpanded is dispatched THEN update inactiveTabsExpanded`() {
        val initialState = AppState()

        assertFalse(initialState.inactiveTabsExpanded)

        val finalState =
            AppStoreReducer.reduce(initialState, AppAction.UpdateInactiveExpanded(true))

        assertTrue(finalState.inactiveTabsExpanded)
    }
}

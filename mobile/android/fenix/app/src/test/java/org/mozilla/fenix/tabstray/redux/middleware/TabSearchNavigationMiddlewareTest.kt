/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore

class TabSearchNavigationMiddlewareTest {

    @Test
    fun `WHEN SearchResultClicked THEN invoke onSearchResultSelected with clicked tab`() = runTest {
        var receivedTab: TabSessionState? = null

        val clickedTab = createTab(url = "https://mozilla.org")

        val store = TabsTrayStore(
            initialState = TabsTrayState(),
            middlewares = listOf(
                TabSearchNavigationMiddleware(
                    onSearchResultClicked = { tab ->
                        receivedTab = tab
                    },
                ),
            ),
        )

        store.dispatch(TabSearchAction.SearchResultClicked(clickedTab))

        assertEquals(clickedTab, receivedTab)
    }
}

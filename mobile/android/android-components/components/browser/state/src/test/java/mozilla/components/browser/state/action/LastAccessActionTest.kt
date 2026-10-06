/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class LastAccessActionTest {
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        val existingTab = createTab("https://www.mozilla.org")
        state = BrowserState(
            tabs = listOf(existingTab),
            selectedTabId = existingTab.id,
        )
    }

    @Test
    fun `UpdateLastAccessAction - updates the timestamp when the tab was last accessed`() {
        val timestamp = System.currentTimeMillis()

        state = BrowserStateReducer.reduce(state, LastAccessAction.UpdateLastAccessAction(state.selectedTab!!.id, timestamp))

        assertEquals(timestamp, state.selectedTab?.lastAccess)
    }
}

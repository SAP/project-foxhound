/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.CustomTabConfig
import mozilla.components.browser.state.state.SessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class CustomTabListActionTest {

    @Test
    fun `AddCustomTabAction - Adds provided tab`() {
        var state = BrowserState()

        assertEquals(0, state.tabs.size)
        assertEquals(0, state.customTabs.size)

        val config = CustomTabConfig()
        val customTab = createCustomTab(
            "https://www.mozilla.org",
            config = config,
            source = SessionState.Source.Internal.CustomTab,
        )

        state = BrowserStateReducer.reduce(state, CustomTabListAction.AddCustomTabAction(customTab))

        assertEquals(0, state.tabs.size)
        assertEquals(1, state.customTabs.size)
        assertEquals(SessionState.Source.Internal.CustomTab, state.customTabs[0].source)
        assertEquals(customTab, state.customTabs[0])
        assertSame(config, state.customTabs[0].config)
    }

    @Test
    fun `RemoveCustomTabAction - Removes tab with given id`() {
        val customTab1 = createCustomTab("https://www.mozilla.org")
        val customTab2 = createCustomTab("https://www.firefox.com")

        var state = BrowserState(customTabs = listOf(customTab1, customTab2))

        assertEquals(2, state.customTabs.size)

        state = BrowserStateReducer.reduce(state, CustomTabListAction.RemoveCustomTabAction(customTab2.id))

        assertEquals(1, state.customTabs.size)
        assertEquals(customTab1, state.customTabs[0])
    }

    @Test
    fun `RemoveCustomTabAction - Noop for unknown id`() {
        val customTab1 = createCustomTab("https://www.mozilla.org")
        val customTab2 = createCustomTab("https://www.firefox.com")

        var state = BrowserState(customTabs = listOf(customTab1, customTab2))

        assertEquals(2, state.customTabs.size)

        state = BrowserStateReducer.reduce(state, CustomTabListAction.RemoveCustomTabAction("unknown id"))

        assertEquals(2, state.customTabs.size)
        assertEquals(customTab1, state.customTabs[0])
        assertEquals(customTab2, state.customTabs[1])
    }

    @Test
    fun `RemoveAllCustomTabsAction - Removes all custom tabs (but not regular tabs)`() {
        val customTab1 = createCustomTab("https://www.mozilla.org")
        val customTab2 = createCustomTab("https://www.firefox.com")
        val regularTab = createTab(url = "https://www.mozilla.org")

        var state = BrowserState(customTabs = listOf(customTab1, customTab2), tabs = listOf(regularTab))

        assertEquals(2, state.customTabs.size)
        assertEquals(1, state.tabs.size)

        state = BrowserStateReducer.reduce(state, CustomTabListAction.RemoveAllCustomTabsAction)
        assertEquals(0, state.customTabs.size)
        assertEquals(1, state.tabs.size)
    }
}

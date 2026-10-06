/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ReaderActionTest {
    private lateinit var tab: TabSessionState
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        tab = createTab("https://www.mozilla.org")

        state = BrowserState(
            tabs = listOf(tab),
        )
    }

    private fun tabState(): TabSessionState = state.findTab(tab.id)!!
    private fun readerState() = tabState().readerState

    @Test
    fun `UpdateReaderableAction - Updates readerable flag of ReaderState`() {
        assertFalse(readerState().readerable)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderableAction(tabId = tab.id, readerable = true))

        assertTrue(readerState().readerable)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderableAction(tabId = tab.id, readerable = false))

        assertFalse(readerState().readerable)
    }

    @Test
    fun `UpdateReaderActiveAction - Updates active flag of ReaderState`() {
        assertFalse(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderActiveAction(tabId = tab.id, active = true))

        assertTrue(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderActiveAction(tabId = tab.id, active = false))

        assertFalse(readerState().active)
    }

    @Test
    fun `UpdateReaderableCheckRequiredAction - Updates check required flag of ReaderState`() {
        assertFalse(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderableCheckRequiredAction(tabId = tab.id, checkRequired = true))

        assertTrue(readerState().checkRequired)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderableCheckRequiredAction(tabId = tab.id, checkRequired = false))

        assertFalse(readerState().checkRequired)
    }

    @Test
    fun `UpdateReaderConnectRequiredAction - Updates connect required flag of ReaderState`() {
        assertFalse(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderConnectRequiredAction(tabId = tab.id, connectRequired = true))

        assertTrue(readerState().connectRequired)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderConnectRequiredAction(tabId = tab.id, connectRequired = false))

        assertFalse(readerState().connectRequired)
    }

    @Test
    fun `UpdateReaderBaseUrlAction - Updates base url of ReaderState`() {
        assertNull(readerState().baseUrl)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderBaseUrlAction(tabId = tab.id, baseUrl = "moz-extension://test"))

        assertEquals("moz-extension://test", readerState().baseUrl)
    }

    @Test
    fun `UpdateReaderActiveUrlAction - Updates active url of ReaderState`() {
        assertNull(readerState().activeUrl)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderActiveUrlAction(tabId = tab.id, activeUrl = "https://mozilla.org"))

        assertEquals("https://mozilla.org", readerState().activeUrl)
    }

    @Test
    fun `UpdateReaderScrollYAction - Updates scrollY of ReaderState when active`() {
        assertFalse(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderActiveAction(tabId = tab.id, active = true))

        assertTrue(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderScrollYAction(tabId = tab.id, scrollY = 1234))

        assertEquals(1234, readerState().scrollY)
    }

    @Test
    fun `UpdateReaderScrollYAction - Does not update scrollY of ReaderState when not active`() {
        assertFalse(readerState().active)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderScrollYAction(tabId = tab.id, scrollY = 1234))

        assertNull(readerState().scrollY)
    }

    @Test
    fun `ClearReaderActiveUrlAction - Clears active url of ReaderState`() {
        assertNull(readerState().activeUrl)

        state = BrowserStateReducer.reduce(state, ReaderAction.UpdateReaderActiveUrlAction(tabId = tab.id, activeUrl = "https://mozilla.org"))
        assertEquals("https://mozilla.org", readerState().activeUrl)

        state = BrowserStateReducer.reduce(state, ReaderAction.ClearReaderActiveUrlAction(tabId = tab.id))
        assertNull(readerState().activeUrl)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findCustomTab
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.EngineState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSessionState
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class EngineActionTest {
    private lateinit var tab: TabSessionState
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        tab = createTab("https://www.mozilla.org")

        state = BrowserState(
            tabs = listOf(tab),
        )
    }

    private fun engineState() = state.findTab(tab.id)!!.engineState

    @Test
    fun `LinkEngineSessionAction - Attaches engine session`() {
        assertNull(engineState().engineSession)

        val engineSession: EngineSession = mock()
        state = BrowserStateReducer.reduce(state, EngineAction.LinkEngineSessionAction(tab.id, engineSession, timestamp = 1234))

        assertNotNull(engineState().engineSession)
        assertEquals(engineSession, engineState().engineSession)
        assertEquals(1234L, engineState().timestamp)
    }

    @Test
    fun `UnlinkEngineSessionAction - Detaches engine session`() {
        state = BrowserStateReducer.reduce(state, EngineAction.LinkEngineSessionAction(tab.id, mock()))
        state = BrowserStateReducer.reduce(state, EngineAction.UpdateEngineSessionStateAction(tab.id, mock()))
        state = BrowserStateReducer.reduce(state, EngineAction.UpdateEngineSessionObserverAction(tab.id, mock()))
        assertNotNull(engineState().engineSession)
        assertNotNull(engineState().engineSessionState)
        assertNotNull(engineState().engineObserver)

        state = BrowserStateReducer.reduce(state, EngineAction.UnlinkEngineSessionAction(tab.id))
        assertNull(engineState().engineSession)
        assertNotNull(engineState().engineSessionState)
        assertNull(engineState().engineObserver)
    }

    @Test
    fun `UpdateEngineSessionStateAction - Updates engine session state`() {
        assertNull(engineState().engineSessionState)

        val engineSessionState: EngineSessionState = mock()
        state = BrowserStateReducer.reduce(state, EngineAction.UpdateEngineSessionStateAction(tab.id, engineSessionState))
        assertNotNull(engineState().engineSessionState)
        assertEquals(engineSessionState, engineState().engineSessionState)
    }

    @Test
    fun `UpdateEngineSessionObserverAction - Updates engine session observer`() {
        assertNull(engineState().engineObserver)

        val engineObserver: EngineSession.Observer = mock()
        state = BrowserStateReducer.reduce(state, EngineAction.UpdateEngineSessionObserverAction(tab.id, engineObserver))
        assertNotNull(engineState().engineObserver)
        assertEquals(engineObserver, engineState().engineObserver)
    }

    @Test
    fun `PurgeHistoryAction - Removes state from sessions without history`() {
        val tab1 = createTab("https://www.mozilla.org").copy(
            engineState = EngineState(engineSession = null, engineSessionState = mock()),
        )

        val tab2 = createTab("https://www.firefox.com").copy(
            engineState = EngineState(engineSession = mock(), engineSessionState = mock()),
        )

        val customTab1 = createCustomTab("http://www.theverge.com").copy(
            engineState = EngineState(engineSession = null, engineSessionState = mock()),
        )

        val customTab2 = createCustomTab("https://www.google.com").copy(
            engineState = EngineState(engineSession = mock(), engineSessionState = mock()),
        )

        var state = BrowserState(
            tabs = listOf(tab1, tab2),
            customTabs = listOf(customTab1, customTab2),
        )

        state = BrowserStateReducer.reduce(state, EngineAction.PurgeHistoryAction)

        assertNull(state.findTab(tab1.id)!!.engineState.engineSessionState)
        assertNotNull(state.findTab(tab2.id)!!.engineState.engineSessionState)

        assertNull(state.findCustomTab(customTab1.id)!!.engineState.engineSessionState)
        assertNotNull(state.findCustomTab(customTab2.id)!!.engineState.engineSessionState)
    }

    @Test
    fun `UpdateEngineSessionInitializingAction - Updates initializing flag`() {
        assertFalse(engineState().initializing)

        state = BrowserStateReducer.reduce(state, EngineAction.UpdateEngineSessionInitializingAction(tab.id, true))
        assertTrue(engineState().initializing)
    }

    @Test
    fun `OptimizedLoadUrlTriggeredAction - State is not changed`() {
        val oldState = state
        state = BrowserStateReducer.reduce(state, EngineAction.OptimizedLoadUrlTriggeredAction(tab.id, "https://mozilla.org"))
        assertSame(state, oldState)
    }
}

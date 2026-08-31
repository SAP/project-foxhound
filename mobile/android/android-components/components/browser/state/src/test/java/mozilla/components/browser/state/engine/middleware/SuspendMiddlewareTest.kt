/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.engine.middleware

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.selector.findTabOrCustomTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSessionState
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mockito.Mockito.verify

class SuspendMiddlewareTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `suspends engine session for tab`() = runTest(testDispatcher) {
        val middleware = SuspendMiddleware(this)

        val tab = createTab("https://www.mozilla.org", id = "1")
        val store = BrowserStore(
            initialState = BrowserState(tabs = listOf(tab)),
            middleware = listOf(middleware),
        )

        val engineSession: EngineSession = mock()
        store.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))

        val state: EngineSessionState = mock()
        store.dispatch(EngineAction.UpdateEngineSessionStateAction(tab.id, state))

        store.dispatch(EngineAction.SuspendEngineSessionAction(tab.id))

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.findTabOrCustomTab(tab.id)?.engineState?.engineSession)
        assertEquals(state, store.state.findTabOrCustomTab(tab.id)?.engineState?.engineSessionState)
        verify(engineSession).close()
    }

    @Test
    fun `suspends engine session for custom tab`() = runTest(testDispatcher) {
        val middleware = SuspendMiddleware(this)

        val tab = createCustomTab("https://www.mozilla.org", id = "1")
        val store = BrowserStore(
            initialState = BrowserState(customTabs = listOf(tab)),
            middleware = listOf(middleware),
        )

        val engineSession: EngineSession = mock()
        store.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))

        val state: EngineSessionState = mock()
        store.dispatch(EngineAction.UpdateEngineSessionStateAction(tab.id, state))

        store.dispatch(EngineAction.SuspendEngineSessionAction(tab.id))

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.findTabOrCustomTab(tab.id)?.engineState?.engineSession)
        assertEquals(state, store.state.findTabOrCustomTab(tab.id)?.engineState?.engineSessionState)
        verify(engineSession).close()
    }

    @Test
    fun `does nothing if tab doesn't exist`() = runTest(testDispatcher) {
        val middleware = SuspendMiddleware(this)
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

        val store = BrowserStore(
            initialState = BrowserState(tabs = listOf()),
            middleware = listOf(captureActionsMiddleware, middleware),
        )

        store.dispatch(EngineAction.SuspendEngineSessionAction("invalid"))
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(EngineAction.UnlinkEngineSessionAction::class)
    }

    @Test
    fun `does nothing if engine session doesn't exist`() = runTest(testDispatcher) {
        val middleware = SuspendMiddleware(this)
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

        val tab = createTab("https://www.mozilla.org", id = "1")
        val store = BrowserStore(
            initialState = BrowserState(tabs = listOf(tab)),
            middleware = listOf(middleware),
        )

        store.dispatch(EngineAction.SuspendEngineSessionAction("invalid"))
        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertNotDispatched(EngineAction.UnlinkEngineSessionAction::class)
    }

    @Test
    fun `SuspendEngineSessionAction and KillEngineSessionAction process state the same`() =
        runTest(testDispatcher) {
        val middleware = SuspendMiddleware(this)

        val tab = createTab("https://www.mozilla.org", id = "1")
        val suspendStore = BrowserStore(
            initialState = BrowserState(tabs = listOf(tab)),
            middleware = listOf(middleware),
        )
        val killStore = BrowserStore(
            initialState = BrowserState(tabs = listOf(tab)),
            middleware = listOf(middleware),
        )

        val engineSession: EngineSession = mock()
        suspendStore.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))
        killStore.dispatch(EngineAction.LinkEngineSessionAction(tab.id, engineSession))

        val state: EngineSessionState = mock()
        suspendStore.dispatch(EngineAction.UpdateEngineSessionStateAction(tab.id, state))
        killStore.dispatch(EngineAction.UpdateEngineSessionStateAction(tab.id, state))

        suspendStore.dispatch(EngineAction.SuspendEngineSessionAction(tab.id))
        killStore.dispatch(EngineAction.KillEngineSessionAction(tab.id))

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(suspendStore.state.findTabOrCustomTab(tab.id)?.engineState?.engineSession)
        assertEquals(state, suspendStore.state.findTabOrCustomTab(tab.id)?.engineState?.engineSessionState)

        assertNull(killStore.state.findTabOrCustomTab(tab.id)?.engineState?.engineSession)
        assertEquals(state, killStore.state.findTabOrCustomTab(tab.id)?.engineState?.engineSessionState)

        // KillEngineSessionAction adds to recentlyKilledTabs, while SuspendEngineSessionAction does not
        assertEquals(
            suspendStore.state.copy(recentlyKilledTabs = LinkedHashSet()),
            killStore.state.copy(recentlyKilledTabs = LinkedHashSet()),
        )
    }
}

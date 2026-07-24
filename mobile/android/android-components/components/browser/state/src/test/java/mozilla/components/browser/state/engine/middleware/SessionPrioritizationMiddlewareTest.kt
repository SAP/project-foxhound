/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.engine.middleware

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.AppLifecycleAction
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSession.SessionPriority.DEFAULT
import mozilla.components.concept.engine.EngineSession.SessionPriority.HIGH
import mozilla.components.support.test.any
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito.clearInvocations
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

class SessionPrioritizationMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN a linked session WHEN UnlinkEngineSessionAction THEN set the DEFAULT priority to the unlinked tab`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(middleware),
        )
        val engineSession1: EngineSession = mock()

        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        store.dispatch(EngineAction.UnlinkEngineSessionAction("1"))

        verify(engineSession1).updateSessionPriority(DEFAULT)
        assertEquals("", middleware.previousHighestPriorityTabId)
    }

    @Test
    fun `GIVEN a linked session WHEN CheckForFormDataAction THEN update the selected linked tab priority to DEFAULT if there is no form data and HIGH when there is form data`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(updatePriorityAfterMillis = 0, mainScope = this, waitScope = this)
        val capture = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(capture, middleware),
        )
        val engineSession1: EngineSession = mock()

        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        store.dispatch(ContentAction.UpdateHasFormDataAction("1", false))
        verify(engineSession1).updateSessionPriority(DEFAULT)

        store.dispatch(ContentAction.UpdateHasFormDataAction("1", true))
        verify(engineSession1).updateSessionPriority(HIGH)

        testDispatcher.scheduler.advanceUntilIdle()

        capture.assertLastAction(ContentAction.UpdatePriorityToDefaultAfterTimeoutAction::class) {}
    }

    @Test
    fun `GIVEN a linked session WHEN CheckForFormDataAction with adjustPriority = false THEN do nothing`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(middleware),
        )
        val engineSession1: EngineSession = mock()

        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))

        store.dispatch(ContentAction.UpdateHasFormDataAction("1", true, false))
        verify(engineSession1, never()).updateSessionPriority(any())
    }

    @Test
    fun `GIVEN a previous selected tab WHEN LinkEngineSessionAction THEN update the selected linked tab priority to HIGH`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(middleware),
        )
        val engineSession1: EngineSession = mock()

        store.dispatch(TabListAction.SelectTabAction("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("", middleware.previousHighestPriorityTabId)

        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("1", middleware.previousHighestPriorityTabId)
        verify(engineSession1).updateSessionPriority(HIGH)
    }

    @Test
    fun `GIVEN a previous selected tab with priority DEFAULT WHEN selecting and linking a new tab THEN update the new one to HIGH and the previous tab based on if it contains form data`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                    createTab("https://www.firefox.com", id = "2"),
                ),
            ),
            middleware = listOf(middleware),
        )
        val engineSession1: EngineSession = mock()
        val engineSession2: EngineSession = mock()

        store.dispatch(TabListAction.SelectTabAction("1"))

        assertEquals("", middleware.previousHighestPriorityTabId)

        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("1", middleware.previousHighestPriorityTabId)
        verify(engineSession1).updateSessionPriority(HIGH)

        store.dispatch(TabListAction.SelectTabAction("2"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("1", middleware.previousHighestPriorityTabId)

        store.dispatch(EngineAction.LinkEngineSessionAction("2", engineSession2))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("2", middleware.previousHighestPriorityTabId)
        verify(engineSession1).checkForFormData()
        verify(engineSession2).updateSessionPriority(HIGH)
    }

    @Test
    fun `GIVEN no linked tab WHEN SelectTabAction THEN no changes in priority show happened`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                    createTab("https://www.firefox.com", id = "2"),
                ),
            ),
            middleware = listOf(middleware),
        )

        store.dispatch(TabListAction.SelectTabAction("1"))

        assertEquals("", middleware.previousHighestPriorityTabId)
    }

    @Test
    fun `GIVEN selected tab WHEN PauseAction THEN checkForFormData should be called with adjustPriority = false`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(middleware),
        )

        val engineSession1: EngineSession = mock()

        store.dispatch(TabListAction.SelectTabAction("1"))
        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSession1).updateSessionPriority(HIGH)

        store.dispatch(AppLifecycleAction.PauseAction)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSession1).checkForFormData(adjustPriority = false)
    }

    @Test
    fun `GIVEN a linked session WHEN UnlinkEngineSessionAction THEN reset previousHighestPriorityTabId`() = runTest(testDispatcher) {
        val middleware = SessionPrioritizationMiddleware(mainScope = this, waitScope = this)
        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "1"),
                ),
            ),
            middleware = listOf(middleware),
        )

        val engineSession1: EngineSession = mock()

        store.dispatch(TabListAction.SelectTabAction("1"))
        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))

        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSession1).updateSessionPriority(HIGH)
        assertEquals("1", middleware.previousHighestPriorityTabId)

        // Previously, `UpdateHasFormDataAction` could be dispatched after `PauseAction` wrongly.
        store.dispatch(ContentAction.UpdateHasFormDataAction("1", false))
        verify(engineSession1).updateSessionPriority(DEFAULT)
        assertEquals("1", middleware.previousHighestPriorityTabId)

        clearInvocations(engineSession1)
        store.dispatch(EngineAction.UnlinkEngineSessionAction("1"))
        verify(engineSession1).updateSessionPriority(DEFAULT)
        assertEquals("", middleware.previousHighestPriorityTabId)

        // Previously, `updateSessionPriority` will never be called.
        clearInvocations(engineSession1)
        store.dispatch(EngineAction.LinkEngineSessionAction("1", engineSession1))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(engineSession1).updateSessionPriority(HIGH)
        assertEquals("1", middleware.previousHighestPriorityTabId)
    }
}

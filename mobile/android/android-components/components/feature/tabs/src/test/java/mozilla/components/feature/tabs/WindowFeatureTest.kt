/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.tabs

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.window.WindowRequest
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

class WindowFeatureTest {

    private lateinit var store: BrowserStore
    private lateinit var engineSession: EngineSession
    private lateinit var tabsUseCases: TabsUseCases
    private lateinit var addTabUseCase: TabsUseCases.AddNewTabUseCase
    private lateinit var removeTabUseCase: TabsUseCases.RemoveTabUseCase
    private val tabId = "test-tab"
    private val privateTabId = "test-tab-private"
    private val testDispatcher = StandardTestDispatcher()
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Before
    fun setup() {
        engineSession = mock()
        store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(
                    createTab(
                        id = tabId,
                        url = "https://www.mozilla.org",
                        engineSession = engineSession,
                    ),
                    createTab(id = privateTabId, url = "https://www.mozilla.org", private = true),
                ),
                selectedTabId = tabId,
            ),
            middleware = listOf(captureActionsMiddleware) + EngineMiddleware.create(
                engine = mock(),
                TestScope(testDispatcher),
            ),
        )

        addTabUseCase = mock()
        removeTabUseCase = mock()
        tabsUseCases = mock()
        whenever(tabsUseCases.addTab).thenReturn(addTabUseCase)
        whenever(tabsUseCases.removeTab).thenReturn(removeTabUseCase)
    }

    @Test
    fun `handles request to open window`() = runTest(testDispatcher) {
        val feature = WindowFeature(store, tabsUseCases, testDispatcher)
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val windowRequest: WindowRequest = mock()
        whenever(windowRequest.type).thenReturn(WindowRequest.Type.OPEN)
        whenever(windowRequest.url).thenReturn("https://www.firefox.com")

        store.dispatch(ContentAction.UpdateWindowRequestAction(tabId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(addTabUseCase).invoke(url = "about:blank", selectTab = true, parentId = tabId)
        captureActionsMiddleware.assertFirstAction(ContentAction.ConsumeWindowRequestAction::class) { action ->
            assertEquals(tabId, action.sessionId)
        }
    }

    @Test
    fun `handles request to open private window`() = runTest(testDispatcher) {
        val feature = WindowFeature(store, tabsUseCases, testDispatcher)
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val windowRequest: WindowRequest = mock()
        whenever(windowRequest.type).thenReturn(WindowRequest.Type.OPEN)
        whenever(windowRequest.url).thenReturn("https://www.firefox.com")

        store.dispatch(TabListAction.SelectTabAction(privateTabId))
        store.dispatch(ContentAction.UpdateWindowRequestAction(privateTabId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(addTabUseCase).invoke(
            url = "about:blank",
            selectTab = true,
            parentId = privateTabId,
            private = true,
        )
        captureActionsMiddleware.assertFirstAction(ContentAction.ConsumeWindowRequestAction::class) { action ->
            assertEquals(privateTabId, action.sessionId)
        }
    }

    @Test
    fun `handles request to close window`() = runTest(testDispatcher) {
        val feature = WindowFeature(store, tabsUseCases, testDispatcher)
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        val windowRequest: WindowRequest = mock()
        whenever(windowRequest.type).thenReturn(WindowRequest.Type.CLOSE)
        whenever(windowRequest.prepare()).thenReturn(engineSession)

        store.dispatch(ContentAction.UpdateWindowRequestAction(tabId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(removeTabUseCase).invoke(tabId)
        captureActionsMiddleware.assertFirstAction(ContentAction.ConsumeWindowRequestAction::class) { action ->
            assertEquals(tabId, action.sessionId)
        }
    }

    @Test
    fun `handles no requests when stopped`() = runTest(testDispatcher) {
        val feature = WindowFeature(store, tabsUseCases, testDispatcher)
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        feature.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        val windowRequest: WindowRequest = mock()
        whenever(windowRequest.type).thenReturn(WindowRequest.Type.CLOSE)

        store.dispatch(ContentAction.UpdateWindowRequestAction(tabId, windowRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(removeTabUseCase, never()).invoke(tabId)
        captureActionsMiddleware.assertNotDispatched(ContentAction.ConsumeWindowRequestAction::class)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.recentlyclosed

import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.RecentlyClosedAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.action.UndoAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.state.recover.RecoverableTab
import mozilla.components.browser.state.state.recover.TabState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.feature.session.middleware.undo.UndoMiddleware
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions

class RecentlyClosedMiddlewareTest {
    lateinit var store: BrowserStore
    lateinit var engine: Engine
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        store = BrowserStore()
        engine = mock()
    }

    // Test tab
    private val closedTab = RecoverableTab(
        engineSessionState = null,
        state = TabState(
            id = "tab-id",
            title = "Mozilla",
            url = "https://mozilla.org",
            lastAccess = 1234,
        ),
    )

    @Test
    fun `closed tab storage stores the provided tab on add tab action`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(middleware),
        )

        store.dispatch(RecentlyClosedAction.AddClosedTabsAction(listOf(closedTab)))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(storage).addTabsToCollectionWithMax(
            listOf(closedTab),
            5,
        )
    }

    @Test
    fun `closed tab storage adds normal tabs removed with TabListAction`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val tab = createTab("https://www.mozilla.org", private = false, id = "1234")
        val tab2 = createTab("https://www.firefox.com", private = false, id = "5678")

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab, tab2),
            ),
            middleware = listOf(UndoMiddleware(mainScope = this), middleware),
        )

        store.dispatch(TabListAction.RemoveTabsAction(listOf("1234", "5678")))
        store.dispatch(UndoAction.ClearRecoverableTabs(store.state.undoHistory.tag))

        testDispatcher.scheduler.advanceUntilIdle()

        val closedTabCaptor = argumentCaptor<List<RecoverableTab>>()
        verify(storage).addTabsToCollectionWithMax(
            closedTabCaptor.capture(),
            eq(5),
        )
        assertEquals(2, closedTabCaptor.value.size)
        assertEquals(tab.content.title, closedTabCaptor.value[0].state.title)
        assertEquals(tab.content.url, closedTabCaptor.value[0].state.url)
        assertEquals(tab2.content.title, closedTabCaptor.value[1].state.title)
        assertEquals(tab2.content.url, closedTabCaptor.value[1].state.url)
        assertEquals(
            tab.engineState.engineSessionState,
            closedTabCaptor.value[0].engineSessionState,
        )
        assertEquals(
            tab2.engineState.engineSessionState,
            closedTabCaptor.value[1].engineSessionState,
        )
    }

    @Test
    fun `closed tab storage adds a normal tab removed with TabListAction`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val tab = createTab("https://www.mozilla.org", private = false, id = "1234")

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
            ),
            middleware = listOf(UndoMiddleware(mainScope = this), middleware),
        )

        store.dispatch(TabListAction.RemoveTabAction("1234"))
        store.dispatch(UndoAction.ClearRecoverableTabs(store.state.undoHistory.tag))

        testDispatcher.scheduler.advanceUntilIdle()

        val closedTabCaptor = argumentCaptor<List<RecoverableTab>>()
        verify(storage).addTabsToCollectionWithMax(
            closedTabCaptor.capture(),
            eq(5),
        )
        assertEquals(1, closedTabCaptor.value.size)
        assertEquals(tab.content.title, closedTabCaptor.value[0].state.title)
        assertEquals(tab.content.url, closedTabCaptor.value[0].state.url)
        assertEquals(
            tab.engineState.engineSessionState,
            closedTabCaptor.value[0].engineSessionState,
        )
    }

    @Test
    fun `closed tab storage does not add a private tab removed with TabListAction`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val tab = createTab("https://www.mozilla.org", private = true, id = "1234")

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
            ),
            middleware = listOf(middleware),
        )

        store.dispatch(TabListAction.RemoveTabAction("1234"))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(storage).getTabs()
        verifyNoMoreInteractions(storage)
    }

    @Test
    fun `closed tab storage adds all normals tab removed with TabListAction RemoveAllNormalTabsAction`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val tab = createTab("https://www.mozilla.org", private = false, id = "1234")
        val tab2 = createTab("https://www.firefox.com", private = true, id = "3456")

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab, tab2),
            ),
            middleware = listOf(UndoMiddleware(mainScope = this), middleware),
        )

        store.dispatch(TabListAction.RemoveAllNormalTabsAction)
        store.dispatch(UndoAction.ClearRecoverableTabs(store.state.undoHistory.tag))

        testDispatcher.scheduler.advanceUntilIdle()

        val closedTabCaptor = argumentCaptor<List<RecoverableTab>>()
        verify(storage).addTabsToCollectionWithMax(
            closedTabCaptor.capture(),
            eq(5),
        )
        assertEquals(1, closedTabCaptor.value.size)
        assertEquals(tab.content.title, closedTabCaptor.value[0].state.title)
        assertEquals(tab.content.url, closedTabCaptor.value[0].state.url)
        assertEquals(
            tab.engineState.engineSessionState,
            closedTabCaptor.value[0].engineSessionState,
        )
    }

    @Test
    fun `closed tab storage adds all normal tabs and no private tabs removed with TabListAction RemoveAllTabsAction`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val tab = createTab("https://www.mozilla.org", private = false, id = "1234")
        val tab2 = createTab("https://www.firefox.com", private = true, id = "3456")

        val store = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab, tab2),
            ),
            middleware = listOf(UndoMiddleware(mainScope = this), middleware),
        )

        store.dispatch(TabListAction.RemoveAllTabsAction())
        store.dispatch(UndoAction.ClearRecoverableTabs(store.state.undoHistory.tag))

        testDispatcher.scheduler.advanceUntilIdle()

        val closedTabCaptor = argumentCaptor<List<RecoverableTab>>()
        verify(storage).addTabsToCollectionWithMax(
            closedTabCaptor.capture(),
            eq(5),
        )
        assertEquals(1, closedTabCaptor.value.size)
        assertEquals(tab.content.title, closedTabCaptor.value[0].state.title)
        assertEquals(tab.content.url, closedTabCaptor.value[0].state.url)
        assertEquals(
            tab.engineState.engineSessionState,
            closedTabCaptor.value[0].engineSessionState,
        )
    }

    @Test
    fun `closed tabs storage adds tabs closed one after the other without clear actions in between`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val store = BrowserStore(
            middleware = listOf(UndoMiddleware(mainScope = this), middleware),
        )

        store.dispatch(TabListAction.AddTabAction(createTab("https://www.mozilla.org", id = "tab1")))
        store.dispatch(TabListAction.AddTabAction(createTab("https://www.firefox.com", id = "tab2")))
        store.dispatch(TabListAction.AddTabAction(createTab("https://getpocket.com", id = "tab3")))
        store.dispatch(TabListAction.AddTabAction(createTab("https://theverge.com", id = "tab4")))
        store.dispatch(TabListAction.AddTabAction(createTab("https://www.google.com", id = "tab5")))
        assertEquals(5, store.state.tabs.size)

        store.dispatch(TabListAction.RemoveTabAction("tab2"))
        store.dispatch(TabListAction.RemoveTabAction("tab3"))
        store.dispatch(TabListAction.RemoveTabAction("tab1"))
        store.dispatch(TabListAction.RemoveTabAction("tab5"))

        store.dispatch(UndoAction.ClearRecoverableTabs(store.state.undoHistory.tag))

        assertEquals(1, store.state.tabs.size)
        assertEquals("tab4", store.state.selectedTabId)

        testDispatcher.scheduler.advanceUntilIdle()

        val closedTabCaptor = argumentCaptor<List<RecoverableTab>>()

        verify(storage, times(4)).addTabsToCollectionWithMax(
            closedTabCaptor.capture(),
            eq(5),
        )

        val tabs = closedTabCaptor.allValues
        assertEquals(4, tabs.size)

        tabs[0].also { tab ->
            assertEquals(1, tab.size)
            assertEquals("tab2", tab[0].state.id)
        }
        tabs[1].also { tab ->
            assertEquals(1, tab.size)
            assertEquals("tab3", tab[0].state.id)
        }
        tabs[2].also { tab ->
            assertEquals(1, tab.size)
            assertEquals("tab1", tab[0].state.id)
        }
        tabs[3].also { tab ->
            assertEquals(1, tab.size)
            assertEquals("tab5", tab[0].state.id)
        }
        Unit
    }

    @Test
    fun `fetch the tabs from the recently closed storage and load into browser state on initialize tab state action`() = runTest(testDispatcher) {
        val storage = mockStorage(tabs = listOf(closedTab.state))

        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)
        val store = BrowserStore(initialState = BrowserState(), middleware = listOf(middleware))

        // Now wait for Middleware to process Init action and store to process action from middleware
        testDispatcher.scheduler.advanceUntilIdle()

        verify(storage).getTabs()
        assertEquals(closedTab.state, store.state.closedTabs[0])
    }

    @Test
    fun `recently closed storage removes the provided tab on remove tab action`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)

        val store = BrowserStore(
            initialState = BrowserState(
                closedTabs = listOf(
                    closedTab.state,
                ),
            ),
            middleware = listOf(middleware),
        )

        store.dispatch(RecentlyClosedAction.RemoveClosedTabAction(closedTab.state))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(storage).removeTab(closedTab.state)
    }

    @Test
    fun `recently closed storage removes all tabs on remove all tabs action`() = runTest(testDispatcher) {
        val storage = mockStorage()
        val middleware = RecentlyClosedMiddleware(lazy { storage }, 5, this)
        val store = BrowserStore(
            initialState = BrowserState(
                closedTabs = listOf(
                    closedTab.state,
                ),
            ),
            middleware = listOf(middleware),
        )

        store.dispatch(RecentlyClosedAction.RemoveAllClosedTabAction)
        testDispatcher.scheduler.advanceUntilIdle()

        verify(storage).removeAllTabs()
    }
}

private suspend fun mockStorage(
    tabs: List<TabState> = emptyList(),
): RecentlyClosedMiddleware.Storage {
    val storage: RecentlyClosedMiddleware.Storage = mock()

    whenever(storage.getTabs()).thenReturn(
        flow {
            emit(tabs)
        },
    )

    return storage
}

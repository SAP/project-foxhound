/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session.middleware.undo

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.action.UndoAction
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UndoMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `Undo scenario - Removing single tab`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                ),
                selectedTabId = "mozilla",
            ),
        )

        assertEquals(2, store.state.tabs.size)
        assertEquals(2, store.state.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveTabAction(tabId = "mozilla"),
        )

        assertEquals(1, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(2, store.state.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.selectedTab!!.content.url)
    }

    @Test
    fun `Undo scenario - Removing list of tabs`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://firefox.com", id = "firefox"),
                ),
                selectedTabId = "mozilla",
            ),
        )

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveTabsAction(listOf("mozilla", "pocket")),
        )

        assertEquals(1, store.state.tabs.size)
        assertEquals("https://firefox.com", store.state.selectedTab!!.content.url)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.selectedTab!!.content.url)
    }

    @Test
    fun `Undo scenario - Removing all normal tabs`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://reddit.com/r/firefox", id = "reddit", private = true),
                ),
                selectedTabId = "pocket",
            ),
        )

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveAllNormalTabsAction,
        )

        assertEquals(1, store.state.tabs.size)
        assertNull(store.state.selectedTab)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)
    }

    @Test
    fun `Undo scenario - Removing all tabs`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://reddit.com/r/firefox", id = "reddit", private = true),
                ),
                selectedTabId = "pocket",
            ),
        )

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveAllTabsAction(),
        )

        assertEquals(0, store.state.tabs.size)
        assertNull(store.state.selectedTab)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)
    }

    @Test
    fun `Undo scenario - Removing all tabs non-recoverable`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://reddit.com/r/firefox", id = "reddit", private = true),
                ),
                selectedTabId = "pocket",
            ),
        )

        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveAllTabsAction(false),
        )

        assertEquals(0, store.state.tabs.size)
        assertNull(store.state.selectedTab)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(0, store.state.tabs.size)
    }

    @Test
    fun `Undo History in State is written`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, this, this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://reddit.com/r/firefox", id = "reddit", private = true),
                ),
                selectedTabId = "pocket",
            ),
        )

        assertNull(store.state.undoHistory.selectedTabId)
        assertTrue(store.state.undoHistory.tabs.isEmpty())
        assertEquals(3, store.state.tabs.size)

        store.dispatch(
            TabListAction.RemoveAllPrivateTabsAction,
        )

        assertNull(store.state.undoHistory.selectedTabId)
        assertEquals(1, store.state.undoHistory.tabs.size)
        assertEquals("https://reddit.com/r/firefox", store.state.undoHistory.tabs[0].state.url)
        assertEquals(2, store.state.tabs.size)

        store.dispatch(
            TabListAction.RemoveAllNormalTabsAction,
        )

        assertEquals("pocket", store.state.undoHistory.selectedTabId)
        assertEquals(2, store.state.undoHistory.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.undoHistory.tabs[0].state.url)
        assertEquals("https://getpocket.com", store.state.undoHistory.tabs[1].state.url)
        assertEquals(0, store.state.tabs.size)

        restoreRecoverableTabs(testDispatcher, store)

        assertNull(store.state.undoHistory.selectedTabId)
        assertTrue(store.state.undoHistory.tabs.isEmpty())
        assertEquals(0, store.state.undoHistory.tabs.size)
        assertEquals(2, store.state.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.tabs[0].content.url)
        assertEquals("https://getpocket.com", store.state.tabs[1].content.url)
    }

    @Test
    fun `Undo History gets cleared after time`() = runTest(testDispatcher) {
        val store = BrowserStore(
            middleware = listOf(
                UndoMiddleware(clearAfterMillis = 60000, waitScope = this, mainScope = this),
            ),
            initialState = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                    createTab("https://getpocket.com", id = "pocket"),
                    createTab("https://reddit.com/r/firefox", id = "reddit", private = true),
                ),
                selectedTabId = "pocket",
            ),
        )
        assertEquals(3, store.state.tabs.size)
        assertEquals("https://getpocket.com", store.state.selectedTab!!.content.url)

        store.dispatch(
            TabListAction.RemoveAllNormalTabsAction,
        )

        assertEquals(1, store.state.tabs.size)
        assertEquals("https://reddit.com/r/firefox", store.state.tabs[0].content.url)
        assertEquals("pocket", store.state.undoHistory.selectedTabId)
        assertEquals(2, store.state.undoHistory.tabs.size)
        assertEquals("https://www.mozilla.org", store.state.undoHistory.tabs[0].state.url)
        assertEquals("https://getpocket.com", store.state.undoHistory.tabs[1].state.url)

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.undoHistory.selectedTabId)
        assertTrue(store.state.undoHistory.tabs.isEmpty())
        assertEquals(1, store.state.tabs.size)
        assertEquals("https://reddit.com/r/firefox", store.state.tabs[0].content.url)

        restoreRecoverableTabs(testDispatcher, store)

        assertEquals(1, store.state.tabs.size)
        assertEquals("https://reddit.com/r/firefox", store.state.tabs[0].content.url)
    }
}

private suspend fun restoreRecoverableTabs(dispatcher: TestDispatcher, store: BrowserStore) {
    withContext(dispatcher) {
        // We need to pause the test dispatcher here to avoid it dispatching immediately.
        // Otherwise we deadlock the test here when we wait for the store to complete and
        // at the same time the middleware dispatches a coroutine on the dispatcher which will
        // also block on the store in SessionManager.restore().
        store.dispatch(UndoAction.RestoreRecoverableTabs)
    }
    dispatcher.scheduler.advanceUntilIdle()
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.browser.toolbar.store.BrowserEditToolbarAction.SearchQueryUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.EnterEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.compose.browser.toolbar.ui.BrowserToolbarQuery
import mozilla.components.lib.state.Middleware
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.browser.browsingmode.BrowsingModeManager
import org.mozilla.fenix.search.SearchFragmentAction.SearchStarted
import org.mozilla.fenix.search.fixtures.EMPTY_SEARCH_FRAGMENT_STATE
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BrowserToolbarToFenixSearchMapperMiddlewareTest {

    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)
    val toolbarStore = BrowserToolbarStore()
    private val browsingModeManager: BrowsingModeManager = mockk {
        every { mode } returns BrowsingMode.Private
    }

    @Test
    fun `WHEN entering in edit mode THEN consider it as search being started`() {
        val searchStatusMapperMiddleware = buildMiddleware()
        val captorMiddleware = CaptureActionsMiddleware<SearchFragmentState, SearchFragmentAction>()
        val searchStore = buildSearchStore(listOf(searchStatusMapperMiddleware, captorMiddleware))

        toolbarStore.dispatch(EnterEditMode(false))
        testDispatcher.scheduler.advanceUntilIdle()

        captorMiddleware.assertLastAction(SearchStarted::class) {
            assertNull(it.selectedSearchEngine)
            assertTrue(it.inPrivateMode)
        }
    }

    @Test
    fun `GIVEN search was started WHEN there's a new query in the toolbar THEN update the search state`() {
        val searchStore = buildSearchStore(listOf(buildMiddleware()))
        toolbarStore.dispatch(EnterEditMode(false))

        searchStore.dispatch(SearchStarted(mockk(), false, false, searchStartedForCurrentUrl = false))
        testDispatcher.scheduler.advanceUntilIdle()

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("t")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("t", searchStore.state.query)

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("te")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("te", searchStore.state.query)

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("tes")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("tes", searchStore.state.query)

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("test")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("test", searchStore.state.query)
    }

    @Test
    fun `GIVEN search was started for the current URL WHEN there's a new query in the toolbar THEN don't update the search state`() {
        val currentTab = createTab("https://mozilla.org")
        val browserStore = BrowserStore(
            BrowserState(
                tabs = listOf(currentTab),
                selectedTabId = currentTab.id,
            ),
        )
        val searchStore = buildSearchStore(listOf(buildMiddleware(browserStore = browserStore)))
        toolbarStore.dispatch(EnterEditMode(false))

        toolbarStore.dispatch(
            SearchQueryUpdated(BrowserToolbarQuery("https://mozilla.org"), isQueryPrefilled = true),
        )
        searchStore.dispatch(SearchStarted(mockk(), false, false, searchStartedForCurrentUrl = true))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("", searchStore.state.query)

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("t")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("t", searchStore.state.query)

        toolbarStore.dispatch(SearchQueryUpdated(BrowserToolbarQuery("https://mozilla.org")))
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals("https://mozilla.org", searchStore.state.query)
    }

    private fun buildSearchStore(
        middlewares: List<Middleware<SearchFragmentState, SearchFragmentAction>> = emptyList(),
    ) = SearchFragmentStore(
        initialState = emptySearchState,
        middleware = middlewares,
    )

    private fun buildMiddleware(
        toolbarStore: BrowserToolbarStore = this.toolbarStore,
        browsingModeManager: BrowsingModeManager = this.browsingModeManager,
        scope: CoroutineScope = testScope,
        browserStore: BrowserStore? = null,
    ) = BrowserToolbarToFenixSearchMapperMiddleware(toolbarStore, browsingModeManager, scope, browserStore)

    private val emptySearchState = EMPTY_SEARCH_FRAGMENT_STATE.copy(
        searchEngineSource = mockk(),
        defaultEngine = mockk(),
        showSearchTermHistory = true,
        showQrButton = true,
    )
}

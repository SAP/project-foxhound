/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.search.SearchRequest
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import org.junit.After
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

private const val SELECTED_TAB_ID = "1"

class SearchFeatureTest {

    private lateinit var performSearch: (SearchRequest, String) -> Unit
    private lateinit var store: BrowserStore
    private lateinit var searchFeature: SearchFeature
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun before() {
        store = BrowserStore(
            mockBrowserState(),
        )
        performSearch = mock()
        searchFeature = SearchFeature(store, null, testDispatcher, performSearch).apply {
            start()
            testDispatcher.scheduler.advanceUntilIdle()
        }
    }

    private fun mockBrowserState(): BrowserState {
        return BrowserState(
            tabs = listOf(
                createTab("https://www.duckduckgo.com", id = "0"),
                createTab("https://www.mozilla.org", id = SELECTED_TAB_ID),
                createTab("https://www.wikipedia.org", id = "2"),
            ),
            selectedTabId = SELECTED_TAB_ID,
        )
    }

    @After
    fun after() {
        searchFeature.stop()
    }

    @Test
    fun `GIVEN a tab is selected WHEN a search request is sent THEN a search should be performed`() = runTest(testDispatcher) {
        verify(performSearch, times(0)).invoke(any(), eq(SELECTED_TAB_ID))

        val normalSearchRequest = SearchRequest(isPrivate = false, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, normalSearchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(1)).invoke(any(), eq(SELECTED_TAB_ID))
        verify(performSearch, times(1)).invoke(normalSearchRequest, SELECTED_TAB_ID)

        val privateSearchRequest = SearchRequest(isPrivate = true, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, privateSearchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(2)).invoke(any(), eq(SELECTED_TAB_ID))
        verify(performSearch, times(1)).invoke(privateSearchRequest, SELECTED_TAB_ID)
    }

    @Test
    fun `GIVEN no tab is selected WHEN a search request is sent THEN no search should be performed`() = runTest(testDispatcher) {
        store.dispatch(TabListAction.RemoveTabAction(tabId = SELECTED_TAB_ID, selectParentIfExists = false))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(0)).invoke(any(), eq(SELECTED_TAB_ID))

        val normalSearchRequest = SearchRequest(isPrivate = false, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, normalSearchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(0)).invoke(any(), eq(SELECTED_TAB_ID))
        verify(performSearch, times(0)).invoke(normalSearchRequest, SELECTED_TAB_ID)

        val privateSearchRequest = SearchRequest(isPrivate = true, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, privateSearchRequest))

        verify(performSearch, times(0)).invoke(any(), eq(SELECTED_TAB_ID))
        verify(performSearch, times(0)).invoke(privateSearchRequest, SELECTED_TAB_ID)
    }

    @Test
    fun `WHEN a search request has been handled THEN that request should have been consumed`() = runTest(testDispatcher) {
        val normalSearchRequest = SearchRequest(isPrivate = false, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, normalSearchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.selectedTab!!.content.searchRequest)

        val privateSearchRequest = SearchRequest(isPrivate = true, query = "query")
        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, privateSearchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(store.state.selectedTab!!.content.searchRequest)
    }

    @Test
    fun `WHEN the same search is requested two times THEN both search requests are preformed and consumed`() = runTest(testDispatcher) {
        val searchRequest = SearchRequest(isPrivate = false, query = "query")
        verify(performSearch, times(0)).invoke(searchRequest, SELECTED_TAB_ID)

        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, searchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(1)).invoke(searchRequest, SELECTED_TAB_ID)
        assertNull(store.state.selectedTab!!.content.searchRequest)

        store.dispatch(ContentAction.UpdateSearchRequestAction(SELECTED_TAB_ID, searchRequest))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(performSearch, times(2)).invoke(searchRequest, SELECTED_TAB_ID)
        assertNull(store.state.selectedTab!!.content.searchRequest)
    }
}

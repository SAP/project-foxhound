/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.search

import io.mockk.mockk
import mozilla.components.browser.state.search.SearchEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchEnded
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchEngineSelected
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchStarted
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.AppStoreReducer
import org.mozilla.fenix.components.metrics.MetricsUtils

class SearchStateReducerTest {
    @Test
    fun `GIVEN no parameters provided WHEN the search is started THEN update the app state with default search related values`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, SearchStarted())

        assertEquals(true, finalState.searchState.isSearchActive)
        assertNull(finalState.searchState.selectedSearchEngine)
        assertNull(finalState.searchState.sourceTabId)
        assertEquals(MetricsUtils.Source.NONE, finalState.searchState.searchAccessPoint)
    }

    @Test
    fun `GIVEN search details provided WHEN the search is started THEN update the app state with the provided details`() {
        val sourceTabId = "test"
        val source = MetricsUtils.Source.SUGGESTION
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, SearchStarted(sourceTabId, source))

        assertEquals(true, finalState.searchState.isSearchActive)
        assertNull(finalState.searchState.selectedSearchEngine)
        assertEquals(sourceTabId, finalState.searchState.sourceTabId)
        assertEquals(source, finalState.searchState.searchAccessPoint)
    }

    @Test
    fun `WHEN the search is ended THEN reset the search state in the app state`() {
        val initialState = AppState(
            searchState = SearchState(
                isSearchActive = true,
                selectedSearchEngine = mockk(),
                sourceTabId = "test",
                searchAccessPoint = MetricsUtils.Source.ACTION,
            ),
        )

        val finalState = AppStoreReducer.reduce(initialState, SearchEnded)

        assertEquals(SearchState.EMPTY, finalState.searchState)
    }

    @Test
    fun `WHEN a new search engine is selected THEN add it in the app state`() {
        val searchEngine: SearchEngine = mockk()
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, SearchEngineSelected(searchEngine, true))

        assertEquals(searchEngine, finalState.searchState.selectedSearchEngine?.searchEngine)
        assertEquals(true, finalState.searchState.selectedSearchEngine?.isUserSelected)
    }
}

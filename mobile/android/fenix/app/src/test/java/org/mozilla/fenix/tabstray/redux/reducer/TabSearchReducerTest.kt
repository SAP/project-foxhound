/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.reducer

import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.redux.state.TabSearchState

class TabSearchReducerTest {

    @Test
    fun `WHEN SearchQueryChanged THEN tab search query is updated`() {
        val tabs = listOf(createTab("https://example.com"), createTab("https://mozilla.org"))

        val initialState = TabsTrayState(
            tabSearchState = TabSearchState(
                query = "old query",
                searchResults = tabs,
            ),
        )

        val resultState = TabSearchActionReducer.reduce(
            state = initialState,
            action = TabSearchAction.SearchQueryChanged("new query"),
        )

        val expectedState = initialState.copy(
            tabSearchState = initialState.tabSearchState.copy(
                query = "new query",
                searchResults = tabs,
            ),
        )

        assertEquals(expectedState.tabSearchState.query, resultState.tabSearchState.query)
    }

    @Test
    fun `WHEN SearchResultsUpdated THEN query is cleared and results are updated`() {
        val initialState = TabsTrayState(
            tabSearchState = TabSearchState(
                query = "mozilla",
                searchResults = emptyList(),
            ),
        )

        val firstTab = createTab("https://mozilla.org")
        val secondTab = createTab("https://developer.mozilla.org")
        val results = listOf(firstTab, secondTab)

        val resultState = TabSearchActionReducer.reduce(
            state = initialState,
            action = TabSearchAction.SearchResultsUpdated(results),
        )

        val expectedState = initialState.copy(
            tabSearchState = initialState.tabSearchState.copy(
                searchResults = results,
            ),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN search results are updated with empty list THEN the state reflects an empty results list`() {
        val firstTab = createTab("https://mozilla.org")
        val secondTab = createTab("https://developer.mozilla.org")
        val results = listOf(firstTab, secondTab)

        val initialState = TabsTrayState(
            tabSearchState = TabSearchState(
                query = "mozilla",
                searchResults = results,
            ),
        )

        val emptyResults = emptyList<TabSessionState>()

        val actualResults = TabSearchActionReducer.reduce(
            state = initialState,
            action = TabSearchAction.SearchResultsUpdated(emptyResults),
        ).tabSearchState.searchResults

        assertEquals(emptyResults, actualResults)
    }

    @Test
    fun `WHEN SearchResultClicked THEN state is unchanged`() {
        val tab = createTab("https://mozilla.org")
        val initialState = TabsTrayState(
            tabSearchState = TabSearchState(
                query = "mozilla",
                searchResults = listOf(tab),
            ),
        )

        val resultState = TabSearchActionReducer.reduce(
            state = initialState,
            action = TabSearchAction.SearchResultClicked(tab),
        )

        assertEquals(initialState, resultState)
    }
}

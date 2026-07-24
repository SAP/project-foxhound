/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.search.RegionState
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SearchState
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SearchActionTest {
    @Test
    fun `SetSearchEnginesAction - Set sets region search engines in state`() {
        val engine1 = SearchEngine(
            id = "id1",
            name = "search1",
            icon = mock(),
            type = SearchEngine.Type.BUNDLED,
        )
        val engine2 = SearchEngine(
            id = "id2",
            name = "search2",
            icon = mock(),
            type = SearchEngine.Type.BUNDLED,
        )

        var state = BrowserState()
        val searchEngineList = listOf(engine1, engine2)
        assertTrue(state.search.regionSearchEngines.isEmpty())

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.SetSearchEnginesAction(
                regionSearchEngines = searchEngineList,
                regionDefaultSearchEngineId = "id2",
                customSearchEngines = emptyList(),
                userSelectedSearchEngineId = null,
                userSelectedSearchEngineName = null,
                hiddenSearchEngines = emptyList(),
                disabledSearchEngineIds = emptyList(),
                additionalSearchEngines = emptyList(),
                additionalAvailableSearchEngines = emptyList(),
                regionSearchEnginesOrder = listOf("id1", "id2"),
            ),
        )

        val searchEngines = state.search.regionSearchEngines
        assertFalse(searchEngines.isEmpty())
        assertEquals(2, searchEngines.size)
        assertEquals(engine1, searchEngines[0])
        assertEquals(engine2, searchEngines[1])
    }

    @Test
    fun `ApplicationSearchEnginesLoaded - Sets the application search engines in the state`() {
        val engine1 = SearchEngine(
            id = "id1",
            name = "search1",
            icon = mock(),
            type = SearchEngine.Type.APPLICATION,
        )
        val engine2 = SearchEngine(
            id = "id2",
            name = "search2",
            icon = mock(),
            type = SearchEngine.Type.APPLICATION,
        )

        var state = BrowserState()

        val searchEngineList = listOf(engine1, engine2)
        assertTrue(state.search.applicationSearchEngines.isEmpty())

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.ApplicationSearchEnginesLoaded(searchEngineList),
        )

        val searchEngines = state.search.applicationSearchEngines
        assertEquals(2, searchEngines.size)
    }

    @Test
    fun `SetSearchEnginesAction - sets custom search engines in state`() {
        val engine1 = SearchEngine(
            id = "id1",
            name = "search1",
            icon = mock(),
            type = SearchEngine.Type.CUSTOM,
        )
        val engine2 = SearchEngine(
            id = "id2",
            name = "search2",
            icon = mock(),
            type = SearchEngine.Type.CUSTOM,
        )

        var state = BrowserState()

        val searchEngineList = listOf(engine1, engine2)
        assertTrue(state.search.customSearchEngines.isEmpty())

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.SetSearchEnginesAction(
                customSearchEngines = searchEngineList,
                regionSearchEngines = emptyList(),
                regionDefaultSearchEngineId = "default",
                userSelectedSearchEngineId = null,
                userSelectedSearchEngineName = null,
                hiddenSearchEngines = emptyList(),
                disabledSearchEngineIds = emptyList(),
                additionalSearchEngines = emptyList(),
                additionalAvailableSearchEngines = emptyList(),
                regionSearchEnginesOrder = emptyList(),
            ),
        )

        val searchEngines = state.search.customSearchEngines
        assertFalse(searchEngines.isEmpty())
        assertEquals(2, searchEngines.size)
        assertEquals(engine1, searchEngines[0])
        assertEquals(engine2, searchEngines[1])
    }

    @Test
    fun `UpdateCustomSearchEngineAction sets a new custom search engine`() {
        var state = BrowserState()

        assertTrue(state.search.customSearchEngines.isEmpty())

        val customSearchEngine = SearchEngine(
            id = "customId1",
            name = "custom_search",
            icon = mock(),
            type = SearchEngine.Type.CUSTOM,
        )

        // Add a custom search engine
        state = BrowserStateReducer.reduce(
            state,
            SearchAction.UpdateCustomSearchEngineAction(customSearchEngine),
        )

        state.search.customSearchEngines.let { searchEngines ->
            assertTrue(searchEngines.isNotEmpty())
            assertEquals(1, searchEngines.size)
            assertEquals(customSearchEngine, searchEngines[0])
        }

        val customSearchEngine2 = SearchEngine(
            id = "customId2",
            name = "custom_search_second",
            icon = mock(),
            type = SearchEngine.Type.CUSTOM,
        )

        // Add another search engine
        state = BrowserStateReducer.reduce(
            state,
            SearchAction.UpdateCustomSearchEngineAction(customSearchEngine2),
        )

        state.search.customSearchEngines.let { searchEngines ->
            assertTrue(searchEngines.isNotEmpty())
            assertEquals(2, searchEngines.size)
            assertEquals(customSearchEngine, searchEngines[0])
            assertEquals(customSearchEngine2, searchEngines[1])
        }

        // Update first search engine
        val updated = customSearchEngine.copy(
            name = "My awesome search engine",
        )
        state = BrowserStateReducer.reduce(
            state,
            SearchAction.UpdateCustomSearchEngineAction(updated),
        )

        state.search.customSearchEngines.let { searchEngines ->
            assertTrue(searchEngines.isNotEmpty())
            assertEquals(2, searchEngines.size)
            assertEquals(updated, searchEngines[0])
            assertEquals(customSearchEngine2, searchEngines[1])
        }
    }

    @Test
    fun `RemoveCustomSearchEngineAction removes a new custom search engine`() {
        val customSearchEngine = SearchEngine(
            id = "customId1",
            name = "custom_search",
            icon = mock(),
            type = SearchEngine.Type.CUSTOM,
        )

        var state =
            BrowserState(
                search = SearchState(
                    customSearchEngines = listOf(customSearchEngine),
                ),
            )

        assertEquals(1, state.search.customSearchEngines.size)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.RemoveCustomSearchEngineAction("unrecognized_id"),
        )

        assertEquals(1, state.search.customSearchEngines.size)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.RemoveCustomSearchEngineAction(customSearchEngine.id),
        )

        assertTrue(state.search.customSearchEngines.isEmpty())
    }

    @Test
    fun `SelectSearchEngineAction sets a default search engine id`() {
        val searchEngine = SearchEngine(
            id = "id1",
            name = "search1",
            icon = mock(),
            type = SearchEngine.Type.BUNDLED,
        )

        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(searchEngine),
            ),
        )

        assertNull(state.search.userSelectedSearchEngineId)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.SelectSearchEngineAction(searchEngine.id, null),
        )
        assertEquals(searchEngine.id, state.search.userSelectedSearchEngineId)

        assertEquals(searchEngine.id, state.search.userSelectedSearchEngineId)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.SelectSearchEngineAction("unrecognized_id", null),
        )

        // We allow setting an ID of a search engine that is not in the state since loading happens
        // asynchronously and the search engine may not be loaded yet.
        assertEquals("unrecognized_id", state.search.userSelectedSearchEngineId)
    }

    @Test
    fun `Setting region of user`() {
        var state = BrowserState()
        assertNull(state.search.region)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.SetRegionAction(RegionState("DE", "FR")),
        )

        assertNotNull(state.search.region)
        assertEquals("DE", state.search.region!!.home)
        assertEquals("FR", state.search.region.current)
    }

    @Test
    fun `WHEN restore hidden search engines action GIVEN there are hidden engines THEN hidden engines are added back to the bundled engine list`() {
        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(
                    SearchEngine(
                        id = "google",
                        name = "Google",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "bing",
                        name = "Bing",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                hiddenSearchEngines = listOf(
                    SearchEngine(
                        id = "duckduckgo",
                        name = "DuckDuckGo",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
            ),
        )

        assertEquals(2, state.search.regionSearchEngines.size)
        assertEquals(1, state.search.hiddenSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)
        assertEquals("duckduckgo", state.search.hiddenSearchEngines[0].id)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.RestoreHiddenSearchEnginesAction,
        )

        assertEquals(3, state.search.regionSearchEngines.size)
        assertEquals(0, state.search.hiddenSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)
        assertEquals("duckduckgo", state.search.regionSearchEngines[2].id)
    }

    @Test
    fun `WHEN restore hidden search engines action GIVEN there are no hidden engines THEN there are no changes`() {
        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(
                    SearchEngine(
                        id = "google",
                        name = "Google",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "bing",
                        name = "Bing",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "duckduckgo",
                        name = "DuckDuckGo",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                hiddenSearchEngines = listOf(),
            ),
        )

        assertEquals(3, state.search.regionSearchEngines.size)
        assertEquals(0, state.search.hiddenSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)
        assertEquals("duckduckgo", state.search.regionSearchEngines[2].id)

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.RestoreHiddenSearchEnginesAction,
        )

        assertEquals(3, state.search.regionSearchEngines.size)
        assertEquals(0, state.search.hiddenSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)
        assertEquals("duckduckgo", state.search.regionSearchEngines[2].id)
    }

    @Test
    fun `ShowSearchEngineAction - Adds hidden search engines back to region search engines`() {
        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(
                    SearchEngine(
                        id = "google",
                        name = "Google",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "bing",
                        name = "Bing",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                hiddenSearchEngines = listOf(
                    SearchEngine(
                        id = "duckduckgo",
                        name = "DuckDuckGo",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.ShowSearchEngineAction("duckduckgo"),
        )

        assertEquals(0, state.search.hiddenSearchEngines.size)
        assertEquals(3, state.search.regionSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)
        assertEquals("duckduckgo", state.search.regionSearchEngines[2].id)
    }

    @Test
    fun `HideSearchEngineAction - Adds region search engine to hidden search engines`() {
        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(
                    SearchEngine(
                        id = "google",
                        name = "Google",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "bing",
                        name = "Bing",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                hiddenSearchEngines = listOf(
                    SearchEngine(
                        id = "duckduckgo",
                        name = "DuckDuckGo",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.HideSearchEngineAction("google"),
        )

        assertEquals(2, state.search.hiddenSearchEngines.size)
        assertEquals(1, state.search.regionSearchEngines.size)

        assertEquals("bing", state.search.regionSearchEngines[0].id)

        assertEquals("duckduckgo", state.search.hiddenSearchEngines[0].id)
        assertEquals("google", state.search.hiddenSearchEngines[1].id)
    }

    @Test
    fun `ShowSearchEngineAction, HideSearchEngineAction - Does nothing for unknown or custom search engines`() {
        var state = BrowserState(
            search = SearchState(
                regionSearchEngines = listOf(
                    SearchEngine(
                        id = "google",
                        name = "Google",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                    SearchEngine(
                        id = "bing",
                        name = "Bing",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                hiddenSearchEngines = listOf(
                    SearchEngine(
                        id = "duckduckgo",
                        name = "DuckDuckGo",
                        icon = mock(),
                        type = SearchEngine.Type.BUNDLED,
                    ),
                ),
                customSearchEngines = listOf(
                    SearchEngine(
                        id = "banana",
                        name = "Banana Search",
                        icon = mock(),
                        type = SearchEngine.Type.CUSTOM,
                    ),
                ),
            ),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.ShowSearchEngineAction("banana"),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.HideSearchEngineAction("banana"),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.HideSearchEngineAction("unknown-search"),
        )

        state = BrowserStateReducer.reduce(
            state,
            SearchAction.ShowSearchEngineAction("also-unknown-search"),
        )

        assertEquals(2, state.search.regionSearchEngines.size)
        assertEquals(1, state.search.hiddenSearchEngines.size)
        assertEquals(1, state.search.customSearchEngines.size)

        assertEquals("google", state.search.regionSearchEngines[0].id)
        assertEquals("bing", state.search.regionSearchEngines[1].id)

        assertEquals("duckduckgo", state.search.hiddenSearchEngines[0].id)

        assertEquals("banana", state.search.customSearchEngines[0].id)
    }

    @Test
    fun `GIVEN the search state of the browser WHEN refreshing the list of search engines THEN do not modify the state`() {
        val initialState = BrowserState(
            search = mock(),
        )

        val state =
            BrowserStateReducer.reduce(initialState, SearchAction.RefreshSearchEnginesAction)

        assertEquals(initialState.search, state.search)
    }
}

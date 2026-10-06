/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SettingsSearchStoreTest {

    @Test
    fun `GIVEN default state WHEN SearchQueryUpdated action is dispatched THEN query in state is updated`() {
        val query = "theme"
        val store = SettingsSearchStore()

        val initialState = SettingsSearchState.Default(recentSearches = emptyList())
        assert(store.state == initialState)

        store.dispatch(SettingsSearchAction.SearchQueryUpdated(query))

        assert(store.state is SettingsSearchState.SearchInProgress)
        assert(store.state.searchQuery == query)
    }

    @Test
    fun `GIVEN search in progress state WHEN SearchQueryUpdated action is dispatched with empty query THEN default state is dispatched`() {
        val store = SettingsSearchStore(
            initialState = SettingsSearchState.SearchInProgress(
                "theme",
                emptyList(),
                emptyList(),
            ),
        )
        assert(store.state is SettingsSearchState.SearchInProgress)

        store.dispatch(SettingsSearchAction.SearchQueryUpdated(""))

        assert(store.state == SettingsSearchState.Default(emptyList()))
    }

    @Test
    fun `GIVEN SearchInProgress state with mixed results WHEN accessing groupedResults THEN results are grouped by categoryHeader`() {
        val results = listOf(
            createTestItem("Privacy Item 1", "Privacy"),
            createTestItem("General Item", "General"),
            createTestItem("Privacy Item 2", "Privacy"),
            createTestItem("Advanced Item", "Advanced"),
        )

        val state = SettingsSearchState.SearchInProgress(
            searchQuery = "test",
            searchResults = results,
            recentSearches = emptyList(),
        )

        val grouped = state.groupedResults

        assertEquals(3, grouped.keys.size)
        assertEquals(2, grouped["Privacy"]?.size)
        assertEquals(1, grouped["General"]?.size)
        assertEquals(1, grouped["Advanced"]?.size)
    }

    @Test
    fun `GIVEN SearchInProgress state WHEN accessing groupedResults THEN results are sorted alphabetically by category`() {
        val results = listOf(
            createTestItem("Item 1", "Privacy"),
            createTestItem("Item 2", "Advanced"),
            createTestItem("Item 3", "General"),
        )

        val state = SettingsSearchState.SearchInProgress(
            searchQuery = "test",
            searchResults = results,
            recentSearches = emptyList(),
        )

        val grouped = state.groupedResults
        val keys = grouped.keys.toList()

        assertEquals(listOf("Advanced", "General", "Privacy"), keys)
    }

    @Test
    fun `GIVEN SearchInProgress state with empty results WHEN accessing groupedResults THEN returns empty map`() {
        val state = SettingsSearchState.SearchInProgress(
            searchQuery = "test",
            searchResults = emptyList(),
            recentSearches = emptyList(),
        )

        val grouped = state.groupedResults

        assertTrue(grouped.isEmpty())
    }

    @Test
    fun `GIVEN Default state with recentSearches WHEN copyWith is called THEN recentSearches are preserved`() {
        val recentSearches = listOf(createTestItem("Recent", "Privacy"))
        val state = SettingsSearchState.Default(recentSearches = recentSearches)

        val newRecentSearches = listOf(createTestItem("New Recent", "General"))
        val newState = state.copyWith(recentSearches = newRecentSearches)

        assert(newState is SettingsSearchState.Default)
        assertEquals(newRecentSearches, newState.recentSearches)
    }

    @Test
    fun `GIVEN SearchInProgress state WHEN copyWith is called THEN all properties are updated`() {
        val state = SettingsSearchState.SearchInProgress(
            searchQuery = "old",
            searchResults = listOf(createTestItem("Old", "Privacy")),
            recentSearches = emptyList(),
        )

        val newResults = listOf(createTestItem("New", "General"))
        val newRecentSearches = listOf(createTestItem("Recent", "Advanced"))
        val newState = state.copyWith(
            searchQuery = "new",
            searchResults = newResults,
            recentSearches = newRecentSearches,
        )

        assert(newState is SettingsSearchState.SearchInProgress)
        assertEquals("new", newState.searchQuery)
        assertEquals(newResults, newState.searchResults)
        assertEquals(newRecentSearches, newState.recentSearches)
    }

    @Test
    fun `GIVEN NoSearchResults state WHEN copyWith is called THEN properties are updated`() {
        val state = SettingsSearchState.NoSearchResults(
            searchQuery = "old",
            recentSearches = emptyList(),
        )

        val newRecentSearches = listOf(createTestItem("Recent", "Privacy"))
        val newState = state.copyWith(
            searchQuery = "new",
            recentSearches = newRecentSearches,
        )

        assert(newState is SettingsSearchState.NoSearchResults)
        assertEquals("new", newState.searchQuery)
        assertEquals(newRecentSearches, newState.recentSearches)
    }

    @Test
    fun `GIVEN Default state WHEN RecentSearchesUpdated action is dispatched THEN recentSearches are updated`() {
        val store = SettingsSearchStore(
            initialState = SettingsSearchState.Default(recentSearches = emptyList()),
        )

        val updatedRecents = listOf(createTestItem("Recent", "Privacy"))
        store.dispatch(SettingsSearchAction.RecentSearchesUpdated(updatedRecents))

        assertEquals(updatedRecents, store.state.recentSearches)
        assert(store.state is SettingsSearchState.Default)
    }

    @Test
    fun `GIVEN SearchInProgress state WHEN RecentSearchesUpdated action is dispatched THEN recentSearches are updated and state type is preserved`() {
        val store = SettingsSearchStore(
            initialState = SettingsSearchState.SearchInProgress(
                searchQuery = "test",
                searchResults = listOf(createTestItem("Result", "Privacy")),
                recentSearches = emptyList(),
            ),
        )

        val updatedRecents = listOf(createTestItem("Recent", "General"))
        store.dispatch(SettingsSearchAction.RecentSearchesUpdated(updatedRecents))

        assertEquals(updatedRecents, store.state.recentSearches)
        assert(store.state is SettingsSearchState.SearchInProgress)
        assertEquals("test", store.state.searchQuery)
    }

    @Test
    fun `GIVEN NoSearchResults state WHEN RecentSearchesUpdated action is dispatched THEN recentSearches are updated and state type is preserved`() {
        val store = SettingsSearchStore(
            initialState = SettingsSearchState.NoSearchResults(
                searchQuery = "test",
                recentSearches = emptyList(),
            ),
        )

        val updatedRecents = listOf(createTestItem("Recent", "Privacy"))
        store.dispatch(SettingsSearchAction.RecentSearchesUpdated(updatedRecents))

        assertEquals(updatedRecents, store.state.recentSearches)
        assert(store.state is SettingsSearchState.NoSearchResults)
        assertEquals("test", store.state.searchQuery)
    }

    @Test
    fun `WHEN RecentSearchesUpdated is dispatched THEN store state is updated correctly`() {
        val store = SettingsSearchStore()
        val updatedRecents = listOf(testList.first())

        store.dispatch(SettingsSearchAction.RecentSearchesUpdated(updatedRecents))

        assert(store.state.recentSearches == updatedRecents)
    }

    private fun createTestItem(title: String, category: String): SettingsSearchItem {
        return SettingsSearchItem(
            title = title,
            summary = "Summary",
            preferenceKey = "pref_${title.replace(" ", "_").lowercase()}",
            categoryHeader = category,
            preferenceFileInformation = PreferenceFileInformation.GeneralPreferences,
        )
    }
}

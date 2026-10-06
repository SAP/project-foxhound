/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store

/**
 * Store for the settings search screen.
 *
 * @param initialState Initial state of the store.
 * @param middleware List of [Middleware] to apply to the store.
 */
class SettingsSearchStore(
    initialState: SettingsSearchState = SettingsSearchState.Default(emptyList()),
    middleware: List<Middleware<SettingsSearchState, SettingsSearchAction>> = emptyList(),
) : Store<SettingsSearchState, SettingsSearchAction>(
    initialState = initialState,
    reducer = ::reduce,
    middleware = middleware,
) {
    init {
        dispatch(SettingsSearchAction.Init)
    }
}

/**
 * Reducer for the settings search screen.
 */
private fun reduce(state: SettingsSearchState, action: SettingsSearchAction): SettingsSearchState {
    return when (action) {
        is SettingsSearchAction.SearchQueryUpdated -> {
            if (action.query.isBlank()) {
                SettingsSearchState.Default(
                    recentSearches = state.recentSearches,
                )
            } else {
                SettingsSearchState.SearchInProgress(
                    searchQuery = action.query,
                    searchResults = state.searchResults,
                    recentSearches = state.recentSearches,
                )
            }
        }
        is SettingsSearchAction.NoResultsFound -> {
            if (action.query.isBlank()) {
                SettingsSearchState.Default(
                    recentSearches = state.recentSearches,
                )
            } else {
                SettingsSearchState.NoSearchResults(
                    searchQuery = action.query,
                    recentSearches = state.recentSearches,
                )
            }
        }
        is SettingsSearchAction.SearchResultsLoaded -> {
            SettingsSearchState.SearchInProgress(
                searchQuery = action.query,
                searchResults = action.results,
                recentSearches = state.recentSearches,
            )
        }
        is SettingsSearchAction.RecentSearchesUpdated -> {
            state.copyWith(recentSearches = action.recentSearches)
        }
        is SettingsSearchAction.ClearRecentSearchesClicked,
        is SettingsSearchAction.Init,
        is SettingsSearchAction.ResultItemClicked,
        is SettingsSearchAction.EnvironmentCleared,
             -> state
    }
}

/**
 * Data class representing the state of the settings search screen.
 *
 * @property searchQuery Current search query [String].
 * @property searchResults List of [SettingsSearchItem]s that match the current search query, if any.
 * @property recentSearches List of recently searched [SettingsSearchItem]s.
 * @property groupedResults Map of category names to lists of [SettingsSearchItem]s that match the current search query.
 */
sealed class SettingsSearchState(
    open val searchQuery: String = "",
    open val searchResults: List<SettingsSearchItem> = emptyList(),
    open val recentSearches: List<SettingsSearchItem> = emptyList(),
    open val groupedResults: Map<String, List<SettingsSearchItem>> = emptyMap(),
) : State {

    /**
     * Creates a new state of the same type with updated properties.
     * This allows for clean state updates in the reducer.
     */
    abstract fun copyWith(
        searchQuery: String = this.searchQuery,
        searchResults: List<SettingsSearchItem> = this.searchResults,
        recentSearches: List<SettingsSearchItem> = this.recentSearches,
        groupedResults: Map<String, List<SettingsSearchItem>> = this.groupedResults,
    ): SettingsSearchState

    /**
     * Default state.
     * No query, no results
     *
     * @property recentSearches List of recently searched [SettingsSearchItem]s.
     */
    data class Default(
        override val recentSearches: List<SettingsSearchItem>,
    ) : SettingsSearchState(
        recentSearches = recentSearches,
    ) {
        override fun copyWith(
            searchQuery: String,
            searchResults: List<SettingsSearchItem>,
            recentSearches: List<SettingsSearchItem>,
            groupedResults: Map<String, List<SettingsSearchItem>>,
        ): SettingsSearchState {
            // A Default state can't have a query or search results, so we ignore those parameters
            // and return a new Default state, only considering the recentSearches.
            return Default(recentSearches = recentSearches)
        }
    }

    /**
     * State when there is a query.
     * Query, results.
     *
     * @property searchQuery Current search query [String].
     * @property searchResults List of [SettingsSearchItem]s that match the current search query.
     * @property recentSearches List of recently searched [SettingsSearchItem]s.
     */
    data class SearchInProgress(
        override val searchQuery: String,
        override val searchResults: List<SettingsSearchItem>,
        override val recentSearches: List<SettingsSearchItem>,
    ) : SettingsSearchState(
        searchQuery,
        searchResults,
        recentSearches,
    ) {
        override val groupedResults: Map<String, List<SettingsSearchItem>> by lazy {
            searchResults.groupBy { it.categoryHeader }.toSortedMap()
        }
        override fun copyWith(
            searchQuery: String,
            searchResults: List<SettingsSearchItem>,
            recentSearches: List<SettingsSearchItem>,
            groupedResults: Map<String, List<SettingsSearchItem>>,
        ): SettingsSearchState {
            return this.copy(
                searchQuery = searchQuery,
                searchResults = searchResults,
                recentSearches = recentSearches,
            )
        }
    }

    /**
     * State when there is a query but it yields zero search results.
     * Query, no results.
     *
     * @property searchQuery Current search query [String].
     * @property recentSearches List of recently searched [SettingsSearchItem]s.
     */
    data class NoSearchResults(
        override val searchQuery: String,
        override val recentSearches: List<SettingsSearchItem>,
    ) : SettingsSearchState(
        searchQuery,
        recentSearches = recentSearches,
    ) {
        override fun copyWith(
            searchQuery: String,
            searchResults: List<SettingsSearchItem>,
            recentSearches: List<SettingsSearchItem>,
            groupedResults: Map<String, List<SettingsSearchItem>>,
        ): SettingsSearchState {
            return this.copy(
                searchQuery = searchQuery,
                recentSearches = recentSearches,
            )
        }
    }
}

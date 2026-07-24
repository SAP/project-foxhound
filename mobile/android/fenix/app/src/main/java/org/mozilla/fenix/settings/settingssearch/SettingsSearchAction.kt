/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import mozilla.components.lib.state.Action

/**
 * Actions for the settings search screen.
 */
sealed interface SettingsSearchAction : Action {

    /**
     * User has started a search.
     */
    data object Init : SettingsSearchAction

    /**
     * Signals that the current [SettingsSearchEnvironment] has been cleared.
     */
    data object EnvironmentCleared : SettingsSearchAction

    /**
     * User has updated the search query in the search bar.
     *
     * @property query New search query [String].
     */
    data class SearchQueryUpdated(val query: String) : SettingsSearchAction

    /**
     * Current Search query yields zero results.
     *
     * @property query Current search query [String].
     */
    data class NoResultsFound(val query: String) : SettingsSearchAction

    /**
     * Search Results have been loaded.
     *
     * @property query Current search query [String].
     * @property results List of [SettingsSearchItem]s that match the current search query.
     */
    data class SearchResultsLoaded(
        val query: String,
        val results: List<SettingsSearchItem>,
    ) : SettingsSearchAction

    /**
     * User has clicked on a search result item.
     *
     * @property item [SettingsSearchItem] that was clicked.
     */
    data class ResultItemClicked(val item: SettingsSearchItem) : SettingsSearchAction

    /**
     * Recent Searches have been updated.
     *
     * @property recentSearches List of [SettingsSearchItem]s that represent the recent searches.
     */
    data class RecentSearchesUpdated(val recentSearches: List<SettingsSearchItem>) : SettingsSearchAction

    /**
     * User has clicked on the clear recent searches button.
     */
    data object ClearRecentSearchesClicked : SettingsSearchAction
}

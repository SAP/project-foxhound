/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.action

import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.state.TabSearchState

/**
 * [TabsTrayAction]'s that represent user interactions and [TabSearchState] updates for the
 * Tab Search feature.
 */
sealed interface TabSearchAction : TabsTrayAction {

    /**
     * Updates the search query.
     *
     * @property query The query of tab search the user has typed in.
     */
    data class SearchQueryChanged(val query: String) : TabSearchAction

    /**
     * When the list of matching open tabs has been computed for the current [SearchQueryChanged] action.
     *
     * @property results The complete list of open tabs that match the current query.
     */
    data class SearchResultsUpdated(
        val results: List<TabsTrayItem>,
    ) : TabSearchAction

    /**
     * Fired when the user taps on a search result for an open tab.
     *
     * @property searchResult The tab selected by the user.
     */
    data class SearchResultClicked(val searchResult: TabsTrayItem) : TabSearchAction
}

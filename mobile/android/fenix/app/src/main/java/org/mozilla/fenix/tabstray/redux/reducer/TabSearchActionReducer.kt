/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.reducer

import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayState

/**
 * Reducer for [TabSearchAction] dispatched from the Tabs Tray store.
 */
object TabSearchActionReducer {

    /**
     * Reduces [TabSearchAction] into a new [TabsTrayState].
     *
     * @param state The current [TabsTrayState].
     * @param action The [TabSearchAction] to reduce.
     */
    fun reduce(
        state: TabsTrayState,
        action: TabSearchAction,
    ): TabsTrayState {
        return when (action) {
            is TabSearchAction.SearchQueryChanged -> {
                state.copy(
                    tabSearchState = state.tabSearchState.copy(
                        query = action.query,
                        searchResults = state.tabSearchState.searchResults,
                    ),
                )
            }

            is TabSearchAction.SearchResultsUpdated -> {
                state.copy(
                    tabSearchState = state.tabSearchState.copy(
                        searchResults = action.results,
                    ),
                )
            }

            is TabSearchAction.SearchResultClicked -> {
                state
            }
        }
    }
}

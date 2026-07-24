/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import mozilla.components.browser.state.state.TabSessionState

/**
 * Value type that represents the state of the Tab Search feature.
 *
 * @property query The text in the search field.
 * @property searchResults The list of open tabs that match the current [query].
 */
data class TabSearchState(
    val query: String = "",
    val searchResults: List<TabSessionState> = emptyList(),
) {
    /**
     * Gets whether or not to show there are no search results.
     */
    val showNoResults: Boolean
        get() = query.isNotEmpty() && searchResults.isEmpty()
}

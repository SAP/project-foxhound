/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.action.TabSearchAction
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState

/**
 * [Middleware] that produces navigation side effects in response to [TabSearchAction].
 *
 * @param onSearchResultClicked Invoked with the selected [TabsTrayItem] when a search result is clicked.
 **/
class TabSearchNavigationMiddleware(
    private val onSearchResultClicked: (TabsTrayItem.Tab) -> Unit,
) : Middleware<TabsTrayState, TabsTrayAction> {

    override fun invoke(
        store: Store<TabsTrayState, TabsTrayAction>,
        next: (TabsTrayAction) -> Unit,
        action: TabsTrayAction,
    ) {
        next(action)

        when (action) {
            is TabSearchAction.SearchResultClicked -> {
                when (action.searchResult) {
                    is TabsTrayItem.Tab -> onSearchResultClicked(action.searchResult)
                    is TabsTrayItem.TabGroup -> {}
                }
            }

            else -> {} // no-op
        }
    }
}

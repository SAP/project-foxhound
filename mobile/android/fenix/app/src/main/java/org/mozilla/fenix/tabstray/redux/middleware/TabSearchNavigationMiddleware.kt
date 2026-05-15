/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState

/**
 * [Middleware] that produces navigation side effects in response to [TabSearchAction].
 *
 * @param onSearchResultClicked Invoked with the selected [TabSessionState] when a search result is clicked.
 **/
class TabSearchNavigationMiddleware(
    private val onSearchResultClicked: (TabSessionState) -> Unit,
) : Middleware<TabsTrayState, TabsTrayAction> {

    override fun invoke(
        store: Store<TabsTrayState, TabsTrayAction>,
        next: (TabsTrayAction) -> Unit,
        action: TabsTrayAction,
    ) {
        next(action)

        when (action) {
            is TabSearchAction.SearchResultClicked -> {
                onSearchResultClicked(action.tab)
            }

            else -> {} // no-op
        }
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabSearchAction
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState

/**
 * [Middleware] that reacts to [TabSearchAction.SearchQueryChanged].
 *
 * @param scope The [CoroutineScope] for running the tab filtering off of the main thread.
 * @param mainScope The [CoroutineScope] used for returning to the main thread.
 **/
class TabSearchMiddleware(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default),
    private val mainScope: CoroutineScope = CoroutineScope(Dispatchers.Main),
) : Middleware<TabsTrayState, TabsTrayAction> {

    override fun invoke(
        store: Store<TabsTrayState, TabsTrayAction>,
        next: (TabsTrayAction) -> Unit,
        action: TabsTrayAction,
    ) {
        next(action)

        when (action) {
            is TabSearchAction.SearchQueryChanged -> {
                scope.launch {
                    val tabs = when (store.state.selectedPage) {
                        Page.NormalTabs -> store.state.normalTabs + store.state.inactiveTabs
                        Page.PrivateTabs -> store.state.privateTabs
                        else -> emptyList()
                    }

                    val query = action.query.trim()

                    val filteredTabs = if (query.isBlank()) {
                        emptyList()
                    } else {
                        val (matchingHomepage, matchingNonHomepage) =
                            tabs.filter { it.contains(text = query) }
                                .sortedByDescending { it.lastAccess }
                                .partition { it.isHomepage() }

                        // If the results contain homepages, only display one homepage result
                        val homeTab = matchingHomepage.take(1)

                        homeTab + matchingNonHomepage
                    }

                    mainScope.launch {
                        store.dispatch(TabSearchAction.SearchResultsUpdated(filteredTabs))
                    }
                }
            }

            else -> {} // no-op
        }
    }

    private fun TabSessionState.contains(text: String): Boolean {
        return content.url.contains(text, ignoreCase = true) || content.title.contains(text, ignoreCase = true)
    }

    private fun TabSessionState.isHomepage(): Boolean {
        return content.url.equals(ABOUT_HOME_URL, ignoreCase = true)
    }
}

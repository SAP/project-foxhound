/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.action.TabSearchAction
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState

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
                    val state = store.state
                    val items = when (state.selectedPage) {
                        Page.NormalTabs -> {
                            state.normalTabsState.items + state.inactiveTabs.tabs
                        }
                        Page.PrivateTabs -> {
                            state.privateBrowsing.tabs
                        }
                        else -> emptyList()
                    }

                    val query = action.query.trim()

                    val filteredTabs = if (query.isBlank()) {
                        emptyList()
                    } else {
                        val allTabs = items.flatMap { item ->
                            when (item) {
                                is TabsTrayItem.Tab -> listOf(item)
                                is TabsTrayItem.TabGroup -> item.tabs
                            }
                        }

                        val (matchingHomepage, matchingNonHomepage) =
                            allTabs
                                .filter { it.contains(text = query) }
                                .sortedByDescending { it.lastAccess }
                                .partition { it.isHomepageItem }

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
}

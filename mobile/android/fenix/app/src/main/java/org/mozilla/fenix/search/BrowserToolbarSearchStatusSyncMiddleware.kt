/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.launch
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.EnterEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.ExitEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.Init
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarState
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.ext.flow
import org.mozilla.fenix.browser.browsingmode.BrowsingModeManager
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchEnded

/**
 * [Middleware] for synchronizing whether a search is active between [BrowserToolbarStore] and [AppStore].
 *
 * @param appStore [AppStore] through which the toolbar updates can be integrated with other application features.
 * @param browsingModeManager [BrowsingModeManager] for querying the current browsing mode.
 * @param scope [CoroutineScope] used for running long running operations in background.
 */
class BrowserToolbarSearchStatusSyncMiddleware(
    private val appStore: AppStore,
    private val browsingModeManager: BrowsingModeManager,
    private val scope: CoroutineScope,
) : Middleware<BrowserToolbarState, BrowserToolbarAction> {
    private var syncSearchActiveJob: Job? = null

    override fun invoke(
        store: Store<BrowserToolbarState, BrowserToolbarAction>,
        next: (BrowserToolbarAction) -> Unit,
        action: BrowserToolbarAction,
    ) {
        next(action)

        if (action is Init) {
            syncSearchActive(store)
        }

        if (action is ExitEditMode) {
            // Only support the toolbar triggering exiting search mode in the application.
            // Entering search mode in the application needs more parameters and so
            // this must happen through a specifically configured action, not through an automated one.
            appStore.dispatch(SearchEnded)
        }
    }

    private fun syncSearchActive(store: Store<BrowserToolbarState, BrowserToolbarAction>) {
        syncSearchActiveJob = scope.launch {
            appStore.flow()
                .distinctUntilChangedBy { it.searchState.isSearchActive }
                .collect {
                    if (it.searchState.isSearchActive) {
                        store.dispatch(EnterEditMode(browsingModeManager.mode.isPrivate))
                    } else {
                        store.dispatch(ExitEditMode)
                    }
                }
        }
    }
}

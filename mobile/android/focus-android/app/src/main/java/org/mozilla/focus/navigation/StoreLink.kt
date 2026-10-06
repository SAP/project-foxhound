/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.navigation

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.flow
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.AppStore

/**
 * Helper for linking the [BrowserStore] to the [AppStore].
 *
 * This class subscribes to changes in the [BrowserStore] and dispatches corresponding
 * actions to the [AppStore] to ensure the application state remains synchronized with the
 * browser state. Specifically, it handles:
 * - Updating the app state when the selected tab changes.
 * - Notifying the app state when all private tabs have been closed (NoTabs action).
 */
class StoreLink(
    private val appStore: AppStore,
    private val browserStore: BrowserStore,
) {
    /**
     * Starts observing changes in the [BrowserStore] and syncing them to the [AppStore].
     *
     * This function launches two coroutines within the provided [scope]:
     * 1. Monitors the selected tab ID.
     *  If it changes and is not null, an [AppAction.SelectionChanged] action is dispatched.
     * 2. Monitors the list of private tabs.
     *  If the list becomes empty, an [AppAction.NoTabs] action is dispatched.
     *
     * @param scope The [CoroutineScope] in which the observation flows will be launched.
     */
    fun start(scope: CoroutineScope) {
        browserStore.flow()
            .map { state -> state.selectedTabId }
            .distinctUntilChanged()
            .filterNotNull()
            .onEach { tabId ->
                appStore.dispatch(AppAction.SelectionChanged(tabId))
            }
            .launchIn(scope)

        browserStore.flow()
            .map { state -> state.privateTabs.isEmpty() }
            .distinctUntilChanged()
            .filter { isEmpty -> isEmpty }
            .onEach {
                appStore.dispatch(AppAction.NoTabs)
            }
            .launchIn(scope)
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library.history

import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.ExitEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarState
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.library.history.HistoryFragmentAction.SearchDismissed

/**
 * [BrowserToolbarStore] middleware that will synchronize history searches being ended
 * when the toolbar exits search mode.
 */
class BrowserToolbarSyncToHistoryMiddleware(
    private val historyStore: HistoryFragmentStore,
) : Middleware<BrowserToolbarState, BrowserToolbarAction> {
    override fun invoke(
        store: Store<BrowserToolbarState, BrowserToolbarAction>,
        next: (BrowserToolbarAction) -> Unit,
        action: BrowserToolbarAction,
    ) {
        next(action)

        if (action is ExitEditMode && historyStore.state.isSearching) {
            historyStore.dispatch(SearchDismissed)
        }
    }
}

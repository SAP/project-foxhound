/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session.middleware

import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.LastAccessAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * [Middleware] that handles updating the [TabSessionState.lastAccess] when a tab is selected.
 */
class LastAccessMiddleware : Middleware<BrowserState, BrowserAction> {
    override fun invoke(
        store: Store<BrowserState, BrowserAction>,
        next: (BrowserAction) -> Unit,
        action: BrowserAction,
    ) {
        // Since tab removal can affect tab selection we save the
        // selected tab ID before removal to determine if it changed.
        val selectionBeforeRemoval = when (action) {
            is TabListAction.RemoveTabAction,
            is TabListAction.RemoveTabsAction,
            // NB: RemoveAllNormalTabsAction and RemoveAllPrivateTabsAction never update tab selection
            -> {
                store.state.selectedTabId
            }
            else -> null
        }

        next(action)

        when (action) {
            is TabListAction.RemoveTabAction,
            is TabListAction.RemoveTabsAction,
            // NB: RemoveAllNormalTabsAction and RemoveAllPrivateTabsAction never updates tab selection
            -> {
                // If the selected tab changed during removal we make sure to update
                // the lastAccess state of the newly selected tab.
                val newSelection = store.state.selectedTabId
                if (newSelection != null && newSelection != selectionBeforeRemoval) {
                    store.dispatchUpdateActionForId(newSelection)
                }
            }
            is TabListAction.SelectTabAction -> {
                store.dispatchUpdateActionForId(action.tabId)
            }
            is TabListAction.AddTabAction -> {
                if (action.select) {
                    store.dispatchUpdateActionForId(action.tab.id)
                }
            }
            is TabListAction.RestoreAction -> {
                action.selectedTabId?.let {
                    store.dispatchUpdateActionForId(it)
                }
            }
            is ContentAction.UpdateUrlAction -> {
                if (action.sessionId == store.state.selectedTabId) {
                    store.dispatchUpdateActionForId(action.sessionId)
                }
            }
            else -> {
                // no-op
            }
        }
    }

    private fun Store<BrowserState, BrowserAction>.dispatchUpdateActionForId(id: String) {
        dispatch(LastAccessAction.UpdateLastAccessAction(id, System.currentTimeMillis()))
    }
}

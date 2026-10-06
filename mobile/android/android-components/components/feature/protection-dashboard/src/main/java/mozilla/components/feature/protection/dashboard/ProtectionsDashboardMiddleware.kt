/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard

import androidx.core.net.toUri
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.TrackingProtectionAction
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * A [Middleware] that records tracker blocking events to [ProtectionsStorage].
 *
 * @param protectionsStorage The storage to record tracker events to.
 * @param isPrivateMode A function that returns whether the given tab is in private mode.
 * @param scope The coroutine scope to use for database operations.
 */
class ProtectionsDashboardMiddleware(
    private val protectionsStorage: ProtectionsStorage,
    private val isPrivateMode: (tabId: String, state: BrowserState) -> Boolean = { tabId, state ->
        state.findTab(tabId)?.content?.private == true
    },
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
) : Middleware<BrowserState, BrowserAction> {

    override fun invoke(
        store: Store<BrowserState, BrowserAction>,
        next: (BrowserAction) -> Unit,
        action: BrowserAction,
    ) {
        next(action)

        when (action) {
            is TrackingProtectionAction.TrackerBlockedAction -> {
                if (!isPrivateMode(action.tabId, store.state)) {
                    recordTrackerBlocked(action, store.state)
                }
            }
            else -> {
                // no-op
            }
        }
    }

    private fun recordTrackerBlocked(
        action: TrackingProtectionAction.TrackerBlockedAction,
        state: BrowserState,
    ) {
        val tab = state.findTab(action.tabId) ?: return
        val host = tab.content.url.toUri().host ?: return
        val categories = action.tracker.trackingCategories

        if (categories.isEmpty()) {
            return
        }

        scope.launch {
            protectionsStorage.recordTrackerBlocked(host, categories)
        }
    }
}

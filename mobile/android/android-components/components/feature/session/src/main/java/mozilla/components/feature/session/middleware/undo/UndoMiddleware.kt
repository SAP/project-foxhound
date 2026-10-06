/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.session.middleware.undo

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.action.UndoAction
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.selector.normalTabs
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SessionState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.recover.RecoverableTab
import mozilla.components.browser.state.state.recover.toRecoverableTab
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.support.base.log.logger.Logger
import java.util.UUID
import mozilla.components.support.base.coroutines.Dispatchers as MozillaDispatchers

/**
 * [Middleware] implementation that adds removed tabs to [BrowserState.undoHistory] for a short
 * amount of time ([clearAfterMillis]). Dispatching [UndoAction.RestoreRecoverableTabs] will restore
 * the tabs from [BrowserState.undoHistory].
 */
class UndoMiddleware(
    private val clearAfterMillis: Long = 5000, // For comparison: a LENGTH_LONG Snackbar takes 2750.
    private val mainScope: CoroutineScope = CoroutineScope(Dispatchers.Main),
    private val waitScope: CoroutineScope = CoroutineScope(MozillaDispatchers.Cached),
) : Middleware<BrowserState, BrowserAction> {
    private val logger = Logger("UndoMiddleware")
    private var clearJob: Job? = null

    override fun invoke(
        store: Store<BrowserState, BrowserAction>,
        next: (BrowserAction) -> Unit,
        action: BrowserAction,
    ) {
        val state = store.state

        when (action) {
            // Remember removed tabs
            is TabListAction.RemoveAllNormalTabsAction -> onTabsRemoved(
                store,
                state.normalTabs,
                state.selectedTabId,
            )
            is TabListAction.RemoveAllPrivateTabsAction -> onTabsRemoved(
                store,
                state.privateTabs,
                state.selectedTabId,
            )
            is TabListAction.RemoveAllTabsAction -> {
                if (action.recoverable) {
                    onTabsRemoved(store, state.tabs, state.selectedTabId)
                }
            }
            is TabListAction.RemoveTabAction -> state.findTab(action.tabId)?.let {
                onTabsRemoved(store, listOf(it), state.selectedTabId)
            }
            is TabListAction.RemoveTabsAction -> {
                action.tabIds.mapNotNull { state.findTab(it) }.let {
                    onTabsRemoved(store, it, state.selectedTabId)
                }
            }

            // Restore
            is UndoAction.RestoreRecoverableTabs -> restore(store, store.state)

            // Do nothing when an action different from above is passed in.
            else -> { }
        }

        next(action)
    }

    private fun onTabsRemoved(
        store: Store<BrowserState, BrowserAction>,
        tabs: List<SessionState>,
        selectedTabId: String?,
    ) {
        clearJob?.cancel()

        val recoverableTabs = mutableListOf<RecoverableTab>()
        tabs.forEach { tab ->
            if (tab is TabSessionState) {
                val index = store.state.tabs.indexOfFirst { it.id == tab.id }
                recoverableTabs.add(tab.toRecoverableTab(index))
            }
        }

        if (recoverableTabs.isEmpty()) {
            logger.debug("No recoverable tabs to add to undo history.")
            return
        }

        val tag = UUID.randomUUID().toString()

        val selectionToRestore = selectedTabId?.let {
            recoverableTabs.find { it.state.id == selectedTabId }?.state?.id
        }

        store.dispatch(
            UndoAction.AddRecoverableTabs(tag, recoverableTabs, selectionToRestore),
        )

        clearJob = waitScope.launch {
            delay(clearAfterMillis)
            store.dispatch(UndoAction.ClearRecoverableTabs(tag))
        }
    }

    private fun restore(
        store: Store<BrowserState, BrowserAction>,
        state: BrowserState,
    ) = mainScope.launch {
        clearJob?.cancel()

        // Since we have to restore into SessionManager (until we can nuke it from orbit and only use BrowserStore),
        // this is a bit crude. For example we do not restore into the previous position. The goal is to make this
        // nice once we can restore directly into BrowserState.

        val undoHistory = state.undoHistory
        val tabs = undoHistory.tabs
        val tabPartitions = undoHistory.tabPartitions
        if (tabs.isEmpty() && tabPartitions.isEmpty()) {
            logger.debug("No recoverable tabs or tab partitions for undo.")
            return@launch
        }

        store.dispatch(
            TabListAction.RestoreAction(
                tabs = tabs,
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.AT_INDEX,
                tabPartitions = tabPartitions,
            ),
        )

        // Restore the previous selection if needed.
        undoHistory.selectedTabId?.let { tabId ->
            store.dispatch(TabListAction.SelectTabAction(tabId))
        }
    }
}

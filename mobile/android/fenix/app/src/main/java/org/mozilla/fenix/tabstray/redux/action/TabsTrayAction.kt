/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.action

import mozilla.components.lib.state.Action
import org.mozilla.fenix.tabstray.data.TabStorageUpdate
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem

/**
 * [Action]s dispatched to change the state of [TabsTrayState] or otherwise perform side effects
 * via [TabsTrayStore].
 */
sealed interface TabsTrayAction : Action {

    /**
     * [TabsTrayAction]s which trigger storage side effects.
     */
    sealed interface TabsStorageAction

    /**
     * Dispatched when the Store has initialized.
     */
    object InitAction : TabsTrayAction, TabsStorageAction

    /**
     * Dispatched when a tab data update has been received.
     */
    data class TabDataUpdateReceived(val tabStorageUpdate: TabStorageUpdate) : TabsTrayAction

    /**
     * Entered multi-select mode.
     */
    object EnterSelectMode : TabsTrayAction

    /**
     * Dispatched when the user requests to select all tabs in the current tray.
     */
    object SelectAllNormalTabs : TabsTrayAction

    /**
     * Exited multi-select mode.
     */
    object ExitSelectMode : TabsTrayAction

    /**
     * Added a new [TabsTrayItem.Tab] to the selection set.
     */
    data class AddSelectTab(val tab: TabsTrayItem.Tab) : TabsTrayAction

    /**
     * Removed a [TabsTrayItem.Tab] from the selection set.
     */
    data class RemoveSelectTab(val tab: TabsTrayItem.Tab) : TabsTrayAction

    /**
     * The active page in the tray that is now in focus.
     */
    data class PageSelected(val page: Page) : TabsTrayAction

    /**
     * A request to perform a "sync" action.
     */
    object SyncNow : TabsTrayAction

    /**
     * When a "sync" action has completed; this can be triggered immediately after [SyncNow] if
     * no sync action was able to be performed.
     */
    object SyncCompleted : TabsTrayAction

    /**
     * Updates the [org.mozilla.fenix.tabstray.redux.state.TabsTrayState.inactiveTabsExpanded] boolean
     *
     * @property expanded The updated boolean to [org.mozilla.fenix.tabstray.redux.state.TabsTrayState.inactiveTabsExpanded]
     */
    data class UpdateInactiveExpanded(val expanded: Boolean) : TabsTrayAction

    /**
     * Updates the list of synced tabs in [org.mozilla.fenix.tabstray.redux.state.TabsTrayState.syncedTabs].
     */
    data class UpdateSyncedTabs(val tabs: List<SyncedTabsListItem>) : TabsTrayAction

    /**
     * Updates the selected tab id.
     *
     * @property tabId The ID of the tab that is currently selected.
     */
    data class UpdateSelectedTabId(val tabId: String?) : TabsTrayAction

    /**
     * Expands or collapses the header on the synced tabs page.
     *
     * @property index The index of the header.
     */
    data class SyncedTabsHeaderToggled(val index: Int) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the tab auto close dialog is shown.
     */
    object TabAutoCloseDialogShown : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to share all of their normal tabs.
     */
    object ShareAllNormalTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to share all of their private tabs.
     */
    object ShareAllPrivateTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to close all normal tabs.
     */
    object CloseAllNormalTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to close all private tabs.
     */
    object CloseAllPrivateTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the three-dot menu is displayed to the user.
     */
    object ThreeDotMenuShown : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to bookmark selected tabs.
     */
    data class BookmarkSelectedTabs(val tabCount: Int) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user clicks on the Tab Search icon.
     */
    object TabSearchClicked : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user clicks on the back button or swipes to navigate back.
     */
    object NavigateBackInvoked : TabsTrayAction

    /**
     * Updates the private browsing lock status.
     *
     * @property isLocked Whether the private browsing mode is currently locked by biometrics/passcode.
     */
    data class UpdatePbmLockStatus(val isLocked: Boolean) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user dismisses the Inactive Tabs CFR.
     */
    object DismissInactiveTabsCFR : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user dismisses the inactive tabs auto-close dialog.
     */
    object DismissInactiveTabsAutoCloseDialog : TabsTrayAction

    /**
     * [TabsTrayAction] Fired when a reorder is requested from a TabsTray gesture.
     *
     * @property sourceId The id of the item being reordered
     * @property destinationId The id of the reorder target
     * @property placeAfter Whether to place the item before or after the target
     */
    data class ReorderTabsTrayItem(
        val sourceId: String,
        val destinationId: String?,
        val placeAfter: Boolean,
    ) : TabsTrayAction, TabsStorageAction

    /**
     * [TabsTrayAction] fired when a tab drag is started from the tabs tray.
     *
     * @property sourceId The id of the item being dragged.
     * @property preserveSelectMode Whether select mode should be preserved on a drag.
     */
    data class TabDragStart(
        val sourceId: String,
        val preserveSelectMode: Boolean,
    ) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when a tab drag is cancelled from the tabs tray.
     */
    object TabDragCancel : TabsTrayAction

    /**
     * Long pressed a [TabsTrayItem] in the TabsTray.
     */
    data class TabItemLongClicked(val item: TabsTrayItem) : TabsTrayAction
}

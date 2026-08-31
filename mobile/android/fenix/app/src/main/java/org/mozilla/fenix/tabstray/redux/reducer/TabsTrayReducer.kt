/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.reducer

import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.navigation.TabManagerNavDestination
import org.mozilla.fenix.tabstray.redux.action.TabGroupAction
import org.mozilla.fenix.tabstray.redux.action.TabSearchAction
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.TabSearchState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore

/**
 * The default state of the synced tabs expanded state, which is true.
 */
internal const val DEFAULT_SYNCED_TABS_EXPANDED_STATE = true

/**
 * Primary Reducer for [TabsTrayStore].
 */
internal object TabsTrayReducer {
    fun reduce(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        val newState = when (action) {
            is TabsTrayAction.InitAction -> state

            // Selection Mode Actions
            is TabsTrayAction.EnterSelectMode,
            is TabsTrayAction.SelectAllNormalTabs,
            is TabsTrayAction.ExitSelectMode,
            is TabsTrayAction.AddSelectTab,
            is TabsTrayAction.TabItemLongClicked,
            is TabsTrayAction.RemoveSelectTab,
                -> handleSelectionModeActions(state, action)

            // Tab Update Actions
            is TabsTrayAction.UpdateSelectedTabId,
            is TabsTrayAction.TabDataUpdateReceived,
                -> handleTabUpdates(state, action)

            // Inactive Tabs Actions
            is TabsTrayAction.UpdateInactiveExpanded,
            is TabsTrayAction.DismissInactiveTabsCFR,
            is TabsTrayAction.DismissInactiveTabsAutoCloseDialog,
                -> handleInactiveTabsActions(state, action)

            // Sync Actions
            is TabsTrayAction.SyncNow -> state.copy(sync = state.sync.copy(isSyncing = true))
            is TabsTrayAction.SyncCompleted -> state.copy(sync = state.sync.copy(isSyncing = false))
            is TabsTrayAction.UpdateSyncedTabs -> handleSyncedTabUpdate(state, action)
            is TabsTrayAction.SyncedTabsHeaderToggled -> handleSyncedTabHeaderToggle(state, action)

            // Navigation Actions
            is TabsTrayAction.TabSearchClicked -> {
                state.copy(backStack = state.backStack + TabManagerNavDestination.TabSearch)
            }

            is TabsTrayAction.NavigateBackInvoked -> handleNavigateBack(state)
            is TabsTrayAction.PageSelected -> state.copy(selectedPage = action.page)

            // Delegated Actions
            is TabSearchAction -> TabSearchActionReducer.reduce(state, action)
            is TabGroupAction -> TabGroupActionReducer.reduce(state, action)

            // UI State / No-op Actions
            is TabsTrayAction.UpdatePbmLockStatus ->
                state.copy(privateBrowsing = state.privateBrowsing.copy(isLocked = action.isLocked))

            // Drag actions
            is TabsTrayAction.TabDragStart,
            is TabsTrayAction.TabDragCancel,
                -> handleTabDragActions(state = state, action = action)

            is TabsTrayAction.TabAutoCloseDialogShown,
            is TabsTrayAction.ShareAllNormalTabs,
            is TabsTrayAction.ShareAllPrivateTabs,
            is TabsTrayAction.CloseAllNormalTabs,
            is TabsTrayAction.CloseAllPrivateTabs,
            is TabsTrayAction.BookmarkSelectedTabs,
            is TabsTrayAction.ThreeDotMenuShown,
            is TabsTrayAction.ReorderTabsTrayItem,
                -> state
        }

        require(newState.backStack.isNotEmpty()) {
            "Tabs Tray backstack cannot be empty"
        }

        return newState
    }

    private fun handleTabDragActions(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        return when (action) {
            is TabsTrayAction.TabDragStart ->
                state.copy(
                    normalTabsState = state.normalTabsState.copy(
                        itemFocusIndicatorEnabled = false,
                    ),
                    mode = if (state.mode is TabsTrayState.Mode.Select && !action.preserveSelectMode) {
                        TabsTrayState.Mode.Normal
                    } else {
                        state.mode
                    },
                )

            is TabsTrayAction.TabDragCancel ->
                state.copy(
                    normalTabsState = state.normalTabsState.copy(
                        itemFocusIndicatorEnabled = true,
                    ),
                )

            else -> state
        }
    }

    private fun handleSelectionModeActions(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        return when (action) {
            is TabsTrayAction.EnterSelectMode ->
                state.copy(
                    mode = TabsTrayState.Mode.Select(
                        selectedTabs = emptySet(),
                        selectedTabGroups = emptySet(),
                    ),
                )

            is TabsTrayAction.SelectAllNormalTabs -> {
                val selectedTabGroups = HashSet<TabsTrayItem.TabGroup>()
                val selectedTabs = HashSet<TabsTrayItem.Tab>()

                state.normalTabsState.items.forEach { item ->
                    when (item) {
                        is TabsTrayItem.Tab -> selectedTabs.add(item)
                        is TabsTrayItem.TabGroup -> {
                            selectedTabGroups.add(item)
                            selectedTabs.addAll(item.tabs)
                        }
                    }
                }

                state.copy(
                    mode = TabsTrayState.Mode.Select(
                        selectedTabs = selectedTabs,
                        selectedTabGroups = selectedTabGroups,
                    ),
                )
            }

            is TabsTrayAction.ExitSelectMode ->
                state.copy(mode = TabsTrayState.Mode.Normal)

            is TabsTrayAction.AddSelectTab -> addTabSelection(
                state = state,
                tab = action.tab,
            )

            is TabsTrayAction.TabItemLongClicked -> {
                handleTabItemLongClicked(
                    state = state,
                    action = action,
                )
            }

            is TabsTrayAction.RemoveSelectTab -> {
                val selectedTabs = state.mode.selectedTabs - action.tab
                state.copy(
                    mode = if (selectedTabs.isEmpty() && state.mode.selectedTabGroups.isEmpty()) {
                        TabsTrayState.Mode.Normal
                    } else {
                        TabsTrayState.Mode.Select(
                            selectedTabs = selectedTabs,
                            selectedTabGroups = state.mode.selectedTabGroups,
                        )
                    },
                )
            }

            else -> state
        }
    }

    private fun handleTabItemLongClicked(
        state: TabsTrayState,
        action: TabsTrayAction.TabItemLongClicked,
    ): TabsTrayState {
        // Note that the selected tab check is also executed in TabsTrayTelemetryMiddleware
        // and should be updated if this business logic ever changes.
        if (state.mode.selectedTabs.isNotEmpty()) {
            return state
        }
        return when (action.item) {
            is TabsTrayItem.TabGroup -> {
                addTabGroupSelection(
                    state = state,
                    group = action.item,
                )
            }

            is TabsTrayItem.Tab -> {
                val tabItem = action.item
                // Private tabs cannot be multi-selected
                if (!tabItem.private) {
                    addTabSelection(
                        state = state,
                        tab = action.item,
                    )
                } else {
                    state
                }
            }
        }
    }

    private fun addTabSelection(state: TabsTrayState, tab: TabsTrayItem.Tab): TabsTrayState {
        return state.copy(
            mode = TabsTrayState.Mode.Select(
                selectedTabs = state.mode.selectedTabs + tab,
                selectedTabGroups = state.mode.selectedTabGroups,
            ),
        )
    }

    private fun addTabGroupSelection(state: TabsTrayState, group: TabsTrayItem.TabGroup): TabsTrayState {
        return state.copy(
            mode = TabsTrayState.Mode.Select(
                selectedTabs = state.mode.selectedTabs + group.tabs,
                selectedTabGroups = state.mode.selectedTabGroups + group,
            ),
        )
    }

    private fun handleTabUpdates(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        return when (action) {
            is TabsTrayAction.UpdateSelectedTabId -> state.copy(selectedTabId = action.tabId)
            is TabsTrayAction.TabDataUpdateReceived -> state.copy(
                selectedTabId = action.tabStorageUpdate.selectedTabId,
                normalTabsState = state.normalTabsState.copy(
                    items = action.tabStorageUpdate.normalItems,
                    selectedItemIndex = action.tabStorageUpdate.selectedNormalItemIndex,
                    tabCount = action.tabStorageUpdate.normalTabCount,
                ),
                inactiveTabs = state.inactiveTabs.copy(tabs = action.tabStorageUpdate.inactiveTabs),
                privateBrowsing = state.privateBrowsing.copy(
                    tabs = action.tabStorageUpdate.privateTabs,
                    selectedItemIndex = action.tabStorageUpdate.selectedPrivateItemIndex,
                ),
                tabGroupState = state.tabGroupState.copy(
                    groups = action.tabStorageUpdate.tabGroups,
                ),
                hasTabDataLoaded = true,
            )

            else -> state
        }
    }

    private fun handleInactiveTabsActions(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        return when (action) {
            is TabsTrayAction.UpdateInactiveExpanded ->
                state.copy(inactiveTabs = state.inactiveTabs.copy(isExpanded = action.expanded))

            is TabsTrayAction.DismissInactiveTabsCFR ->
                state.copy(inactiveTabs = state.inactiveTabs.copy(showCFR = false))

            is TabsTrayAction.DismissInactiveTabsAutoCloseDialog ->
                state.copy(inactiveTabs = state.inactiveTabs.copy(showAutoCloseDialog = false))

            else -> state
        }
    }

    private fun handleNavigateBack(state: TabsTrayState): TabsTrayState {
        val lastBackStackEntry = state.backStack.lastOrNull()

        return when {
            // Navigate away from the below destinations to maintain selection mode
            lastBackStackEntry in setOf(
                TabManagerNavDestination.EditTabGroup,
                TabManagerNavDestination.AddToTabGroup,
            ) -> state.copy(
                mode = if (state.mode is TabsTrayState.Mode.DragAndDrop) TabsTrayState.Mode.Normal else state.mode,
                backStack = state.popBackStack(),
            )

            state.mode is TabsTrayState.Mode.Select -> state.copy(mode = TabsTrayState.Mode.Normal)

            lastBackStackEntry == TabManagerNavDestination.TabSearch -> state.copy(
                tabSearchState = TabSearchState(query = "", searchResults = emptyList()),
                backStack = state.popBackStack(),
            )

            else -> state.copy(backStack = state.popBackStack())
        }
    }

    /**
     * Updates the synced tabs list.  Also updates the expansion state of the tabs.
     * If items are identical in an existing list, their selection state will be preserved
     * (pressing sync tab on an already synced tab will not reset your expansion selections).
     * If the tab list is updated or no tabs existed previously, selections will be the default value.
     *
     * @param state the existing state object
     * @param action the action containing updated tabs.
     */
    private fun handleSyncedTabUpdate(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs): TabsTrayState {
        val currentSync = state.sync
        val tabs = action.tabs
        return when {
            syncStateExists(state, action) && syncedDevicesUnchanged(state, action) -> {
                state.copy(
                    sync = currentSync.copy(
                        syncedTabs = tabs,
                        expandedSyncedTabs = tabs.mapIndexed { index, item ->
                            if (currentSync.syncedTabs[index] == item && index < currentSync.expandedSyncedTabs.size) {
                                currentSync.expandedSyncedTabs[index]
                            } else {
                                DEFAULT_SYNCED_TABS_EXPANDED_STATE
                            }
                        },
                    ),
                )
            }

            tabs.isNotEmpty() -> {
                state.copy(
                    sync = currentSync.copy(
                        syncedTabs = tabs,
                        expandedSyncedTabs = tabs.map { DEFAULT_SYNCED_TABS_EXPANDED_STATE },
                    ),
                )
            }

            else -> {
                state.copy(
                    sync = currentSync.copy(
                        syncedTabs = tabs,
                        expandedSyncedTabs = emptyList(),
                    ),
                )
            }
        }
    }

    // Does previous state exist for the SyncedTabs we might want to preserve?
    private fun syncStateExists(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs) =
        state.sync.syncedTabs.isNotEmpty() && action.tabs.isNotEmpty()

    // Has the list of devices synced in SyncedTabs list changed?
    private fun syncedDevicesUnchanged(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs) =
        state.sync.syncedTabs.size == action.tabs.size

    /**
     * When a synced tab header's expansion is toggled, that item should be expanded or collapsed.
     * The rest of the list should be unchanged.
     *
     * @param state the existing state object
     * @param action the action containing the index of the toggled header.
     */
    private fun handleSyncedTabHeaderToggle(
        state: TabsTrayState,
        action: TabsTrayAction.SyncedTabsHeaderToggled,
    ): TabsTrayState {
        return state.copy(
            sync = state.sync.copy(
                expandedSyncedTabs = state.sync.expandedSyncedTabs.mapIndexed { index, isExpanded ->
                    if (index == action.index) !isExpanded else isExpanded
                },
            ),
        )
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.reducer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.tabstray.data.TabStorageUpdate
import org.mozilla.fenix.tabstray.data.createTab
import org.mozilla.fenix.tabstray.data.createTabGroup
import org.mozilla.fenix.tabstray.navigation.TabManagerNavDestination
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.TabSearchState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState.Mode
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.tabstray.syncedtabs.generateFakeTab
import org.mozilla.fenix.tabstray.syncedtabs.getFakeSyncedTabList
import kotlin.test.assertEquals

class TabsTrayStoreReducerTest {

    @Test
    fun `WHEN UpdateSyncedTabs THEN synced tabs are added`() {
        val syncedTabs = getFakeSyncedTabList()
        val initialState = TabsTrayState()
        val expectedState = initialState.copy(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = syncedTabs.map { true },
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(syncedTabs),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `GIVEN no synced tabs WHEN UpdateSyncedTabs is called with tabs THEN the expanded state is initialized to true`() {
        val initialState = TabsTrayState()
        val syncedTabs = getFakeSyncedTabList()

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(syncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `WHEN UpdateSyncedTabs is called with an empty list THEN the expanded state is set to an empty list`() {
        val initialState = TabsTrayState()

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(emptyList()),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.isEmpty())
    }

    @Test
    fun `GIVEN synced tabs WHEN UpdateSyncedTabs is called with the same tabs THEN the expanded state is retained`() {
        val expectedExpansionList = listOf(true, true, false, false)
        val syncedTabs = getFakeSyncedTabList()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = expectedExpansionList,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(syncedTabs),
        )

        assertEquals(expectedExpansionList, resultState.sync.expandedSyncedTabs)
    }

    @Test
    fun `GIVEN synced tabs WHEN UpdateSyncedTabs is called with different tabs THEN the expanded state is reset`() {
        val expectedExpansionList = listOf(true, true, false, false)
        val syncedTabs = getFakeSyncedTabList()
        val newSyncedTabs = syncedTabs.reversed()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = expectedExpansionList,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(newSyncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `GIVEN synced tabs WHEN UpdateSyncedTabs is called with smaller device list THEN the expanded states are reset`() {
        val expectedExpansionList = listOf(true, true, false, false)
        val syncedTabs = getFakeSyncedTabList()
        val newSyncedTabs = listOf(
            SyncedTabsListItem.DeviceSection(
                displayName = "Device 1",
                tabs = listOf(
                    generateFakeTab("Mozilla", "www.mozilla.org"),
                    generateFakeTab("Google", "www.google.com"),
                    generateFakeTab("", "www.google.com"),
                ),
            ),
        )
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = expectedExpansionList,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(newSyncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `GIVEN synced tabs WHEN UpdateSyncedTabs is called with a larger device list THEN the expanded states are reset`() {
        val expectedExpansionList = listOf(true, true, false, false)
        val syncedTabs = listOf(
            SyncedTabsListItem.DeviceSection(
                displayName = "Device 1",
                tabs = listOf(
                    generateFakeTab("Mozilla", "www.mozilla.org"),
                    generateFakeTab("Google", "www.google.com"),
                    generateFakeTab("", "www.google.com"),
                ),
            ),
        )
        val newSyncedTabs = getFakeSyncedTabList()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = expectedExpansionList,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(newSyncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `GIVEN synced tabs state larger than expanded synced tabs WHEN UpdateSyncedTabs is called THEN it is handled gracefully`() {
        val syncedTabs = getFakeSyncedTabList()
        val newSyncedTabs = getFakeSyncedTabList().reversed()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = emptyList(),
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(newSyncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `GIVEN synced tabs state smaller than expanded synced tabs WHEN UpdateSyncedTabs is called THEN it is handled gracefully`() {
        val syncedTabs = getFakeSyncedTabList()
        val newSyncedTabs = getFakeSyncedTabList().reversed()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = listOf(
                    true,
                    true,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                    false,
                ),
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdateSyncedTabs(newSyncedTabs),
        )

        assertTrue(resultState.sync.expandedSyncedTabs.all { DEFAULT_SYNCED_TABS_EXPANDED_STATE })
    }

    @Test
    fun `WHEN the tab search button is pressed THEN the tab search destination is added to the back stack`() {
        val initialState = TabsTrayState()
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabSearchClicked,
        )

        assertTrue(initialState.backStack.none { it == TabManagerNavDestination.TabSearch })
        assertTrue(resultState.backStack.last() == TabManagerNavDestination.TabSearch)
    }

    @Test
    fun `GIVEN the synced tab header is expanded WHEN the synced tabs header is toggled THEN the synced tabs header is collapsed`() {
        val syncedTabs = getFakeSyncedTabList()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = syncedTabs.map { true },
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.SyncedTabsHeaderToggled(0),
        )

        assertFalse(resultState.sync.expandedSyncedTabs[0])
    }

    @Test
    fun `GIVEN the synced tab header is collapsed WHEN the synced tabs header is toggled THEN the synced tabs header is expanded`() {
        val syncedTabs = getFakeSyncedTabList()
        val initialState = TabsTrayState(
            sync = TabsTrayState.SyncState(
                syncedTabs = syncedTabs,
                expandedSyncedTabs = syncedTabs.map { false },
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.SyncedTabsHeaderToggled(0),
        )

        assertTrue(resultState.sync.expandedSyncedTabs[0])
    }

    @Test
    fun `WHEN the user leaves search THEN tab search state is reset to defaults`() {
        val initialState = TabsTrayState(
            tabSearchState = TabSearchState(
                query = "mozilla",
                searchResults = listOf(createTab("https://mozilla.org")),
            ),
        )

        val inSearchState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabSearchClicked,
        )

        val resultState = TabsTrayReducer.reduce(
            state = inSearchState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = inSearchState.copy(
            tabSearchState = TabSearchState(),
            backStack = listOf(TabManagerNavDestination.Root),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN navigating back from create tab group in multiselect mode THEN only the sheet is dismissed`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.Select(selectedTabs = setOf(createTab("https://mozilla.org"))),
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.AddToTabGroup,
                TabManagerNavDestination.EditTabGroup,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = initialState.copy(
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.AddToTabGroup,
            ),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN navigating back from add to tab group in drag and drop mode then mode is set to normal`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.DragAndDrop(
                sourceId = "123",
                destinationId = "321",
            ),
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.AddToTabGroup,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = initialState.copy(
            mode = TabsTrayState.Mode.Normal,
            backStack = listOf(TabManagerNavDestination.Root),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN navigating back from edit tab group in drag and drop mode then mode is set to normal`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.DragAndDrop(
                sourceId = "123",
                destinationId = "321",
            ),
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.EditTabGroup,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = initialState.copy(
            mode = TabsTrayState.Mode.Normal,
            backStack = listOf(TabManagerNavDestination.Root),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN navigating back from add to tab group in multiselect mode THEN only the sheet is dismissed`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.Select(selectedTabs = setOf(createTab("https://mozilla.org"))),
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.AddToTabGroup,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = initialState.copy(
            backStack = listOf(TabManagerNavDestination.Root),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN navigating back from expanded tab group THEN only the sheet is dismissed`() {
        val group = createTabGroup()
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.Normal,
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.ExpandedTabGroup(group),
                TabManagerNavDestination.EditTabGroup,
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.NavigateBackInvoked,
        )

        val expectedState = initialState.copy(
            backStack = listOf(
                TabManagerNavDestination.Root,
                TabManagerNavDestination.ExpandedTabGroup(group),
            ),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN UpdatePbmLockStatus THEN isPbmLocked is updated`() {
        val initialState = TabsTrayState(
            privateBrowsing = TabsTrayState.PrivateBrowsingState(
                isLocked = false,
            ),
        )

        val lockedState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.UpdatePbmLockStatus(isLocked = true),
        )
        assertTrue(lockedState.privateBrowsing.isLocked)

        val unlockedState = TabsTrayReducer.reduce(
            lockedState,
            TabsTrayAction.UpdatePbmLockStatus(isLocked = false),
        )
        assertFalse(unlockedState.privateBrowsing.isLocked)
    }

    @Test
    fun `WHEN DismissInactiveTabsCFR THEN showInactiveTabsCFR is set to false`() {
        val initialState =
            TabsTrayState(inactiveTabs = TabsTrayState.InactiveTabsState(showCFR = true))

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.DismissInactiveTabsCFR,
        )

        assertFalse(resultState.inactiveTabs.showCFR)
    }

    @Test
    fun `WHEN DismissInactiveTabsAutoCloseDialog THEN showInactiveTabsAutoCloseDialog is set to false`() {
        val initialState =
            TabsTrayState(inactiveTabs = TabsTrayState.InactiveTabsState(showAutoCloseDialog = true))

        val resultState = TabsTrayReducer.reduce(
            initialState,
            TabsTrayAction.DismissInactiveTabsAutoCloseDialog,
        )

        assertFalse(resultState.inactiveTabs.showAutoCloseDialog)
    }

    @Test
    fun `WHEN a tab data from storage has updated THEN the state receives the fresh data and marks the data as loaded`() {
        val initialState = TabsTrayState()
        val expectedId = "12345"
        val tabGroup = createTabGroup()
        val expectedNormalItems = listOf(createTab(url = "normal url"), tabGroup)
        val expectedInactiveTabs = listOf(createTab(url = "inactive url"))
        val expectedPrivateTabs = listOf(createTab(url = "private url"))
        val expectedTabGroups = listOf(tabGroup)
        val expectedSelectedNormalTabIndex = 5
        val expectedSelectedPrivateTabIndex = 7
        val expectedTabCount = 2
        val action = TabsTrayAction.TabDataUpdateReceived(
            tabStorageUpdate = TabStorageUpdate(
                selectedTabId = expectedId,
                normalItems = expectedNormalItems,
                normalTabCount = expectedTabCount,
                selectedNormalItemIndex = expectedSelectedNormalTabIndex,
                inactiveTabs = expectedInactiveTabs,
                privateTabs = expectedPrivateTabs,
                selectedPrivateItemIndex = expectedSelectedPrivateTabIndex,
                tabGroups = expectedTabGroups,
            ),
        )
        val expectedState = TabsTrayState(
            selectedTabId = expectedId,
            normalTabsState = TabsTrayState.NormalTabsState(
                items = expectedNormalItems,
                selectedItemIndex = expectedSelectedNormalTabIndex,
                tabCount = expectedTabCount,
            ),
            inactiveTabs = TabsTrayState.InactiveTabsState(tabs = expectedInactiveTabs),
            privateBrowsing = TabsTrayState.PrivateBrowsingState(
                tabs = expectedPrivateTabs,
                selectedItemIndex = expectedSelectedPrivateTabIndex,
            ),
            tabGroupState = TabsTrayState.TabGroupState(groups = expectedTabGroups),
            hasTabDataLoaded = true,
        )
        val resultState = TabsTrayReducer.reduce(state = initialState, action = action)

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN selecting a tab for multiselection THEN the selected tab groups are preserved`() {
        val selectedTab = createTab(url = "")
        val initialState = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = emptySet(),
                selectedTabGroups = setOf(createTabGroup()),
            ),
        )
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.AddSelectTab(tab = selectedTab),
        )
        val expectedState = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = setOf(selectedTab),
                selectedTabGroups = initialState.mode.selectedTabGroups,
            ),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN removing a tab from multiselection THEN the selected tab groups are preserved`() {
        val selectedTab = createTab(url = "")
        val initialState = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = setOf(selectedTab),
                selectedTabGroups = setOf(createTabGroup()),
            ),
        )
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.RemoveSelectTab(tab = selectedTab),
        )
        val expectedState = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = setOf(),
                selectedTabGroups = initialState.mode.selectedTabGroups,
            ),
        )

        assertEquals(expectedState, resultState)
    }

    @Test
    fun `WHEN SelectAllTabs THEN all tabs and tab groups (including tabs within groups) are selected`() {
        val tab1 = createTab(url = "https://mozilla.org/1", id = "tab-1")
        val tab2 = createTab(url = "https://mozilla.org/2", id = "tab-2")
        val tabInGroup1 = createTab(url = "https://mozilla.org/group1-1", id = "tab-g1-1")
        val tabInGroup2 = createTab(url = "https://mozilla.org/group1-2", id = "tab-g1-2")
        val group = createTabGroup(id = "group-1", tabs = mutableListOf(tabInGroup1, tabInGroup2))

        val initialState = TabsTrayState(
            normalTabsState = TabsTrayState.NormalTabsState(
                items = listOf(tab1, group, tab2),
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.SelectAllNormalTabs,
        )

        val expectedMode = Mode.Select(
            selectedTabs = setOf(tab1, tab2, tabInGroup1, tabInGroup2),
            selectedTabGroups = setOf(group),
        )

        assertEquals(expectedMode, resultState.mode)
    }

    @Test
    fun `WHEN SelectAllTabs with no groups THEN all individual tabs are selected`() {
        val tab1 = createTab(url = "https://mozilla.org/1", id = "tab-1")
        val tab2 = createTab(url = "https://mozilla.org/2", id = "tab-2")

        val initialState = TabsTrayState(
            normalTabsState = TabsTrayState.NormalTabsState(
                items = listOf(tab1, tab2),
            ),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.SelectAllNormalTabs,
        )

        val expectedMode = Mode.Select(
            selectedTabs = setOf(tab1, tab2),
            selectedTabGroups = emptySet(),
        )

        assertEquals(expectedMode, resultState.mode)
    }

    @Test
    fun `WHEN SelectAllTabs with empty tray THEN selection is empty`() {
        val initialState = TabsTrayState(
            normalTabsState = TabsTrayState.NormalTabsState(items = emptyList()),
        )

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.SelectAllNormalTabs,
        )

        val expectedMode = Mode.Select(
            selectedTabs = emptySet(),
            selectedTabGroups = emptySet(),
        )

        assertEquals(expectedMode, resultState.mode)
    }

    @Test
    fun `WHEN ReorderTabsTrayItem is invoked THEN the state is not updated`() {
        val initialState = TabsTrayState()
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.ReorderTabsTrayItem(
                sourceId = "123",
                destinationId = "321",
                placeAfter = true,
            ),
        )
        assertEquals(TabsTrayState(), resultState)
    }

    @Test
    fun `WHEN tab drag is started THEN the focus state is disabled for normal tabs`() {
        val initialState = TabsTrayState()
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragStart(
                sourceId = "123",
                preserveSelectMode = true,
            ),
        )
        assertFalse(resultState.normalTabsState.itemFocusIndicatorEnabled)
    }

    @Test
    fun `WHEN tab drag is cancelled THEN the focus state is re-enabled for normal tabs`() {
        val initialState = TabsTrayState(
            normalTabsState = TabsTrayState.NormalTabsState(itemFocusIndicatorEnabled = false),
        )
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragCancel,
        )
        assertTrue(resultState.normalTabsState.itemFocusIndicatorEnabled)
    }

    @Test
    fun `WHEN tab drag is started GIVEN preserveSelectMode is false GIVEN mode is Select THEN the mode is set to Normal`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.Select(
                selectedTabs = setOf(
                    createTab("www.mozilla.org"),
                    createTab("www.example.com"),
                ),
            ),
        )
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragStart(
                sourceId = "123",
                preserveSelectMode = false,
            ),
        )
        assertEquals(resultState.mode, TabsTrayState.Mode.Normal)
    }

    @Test
    fun `WHEN tab drag is started GIVEN preserveSelectMode is true GIVEN mode is Select THEN the mode is unchanged`() {
        val initialState = TabsTrayState(
            mode = TabsTrayState.Mode.Select(
                selectedTabs = setOf(
                    createTab("www.mozilla.org"),
                    createTab("www.example.com"),
                ),
            ),
        )
        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragStart(
                sourceId = "123",
                preserveSelectMode = true,
            ),
        )
        assertEquals(resultState.mode, initialState.mode)
    }

    @Test
    fun `WHEN tab drag is started GIVEN preserveSelectMode is true GIVEN mode is Normal THEN the mode is unchanged`() {
        val initialState = TabsTrayState(mode = Mode.Normal)

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragStart(
                sourceId = "123",
                preserveSelectMode = true,
            ),
        )

        assertEquals(initialState.mode, resultState.mode)
    }

    @Test
    fun `WHEN tab drag is started GIVEN preserveSelectMode is false GIVEN mode is Normal THEN the mode is unchanged`() {
        val initialState = TabsTrayState(mode = Mode.Normal)

        val resultState = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabDragStart(
                sourceId = "123",
                preserveSelectMode = false,
            ),
        )

        assertEquals(initialState.mode, resultState.mode)
    }

    //region Tab

    @Test
    fun `GIVEN normal mode, WHEN TabItemLongClicked invoked with TabGroup, THEN select mode is entered`() {
        val initialState = TabsTrayState(mode = Mode.Normal)
        val tabGroup = createTabGroup(title = "TestGroup", tabs = mutableListOf(createTab(url = "example.com")))

        val result = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabItemLongClicked(tabGroup),
        )

        assertEquals(
            expected = Mode.Select(
                selectedTabs = tabGroup.tabs.toSet(),
                selectedTabGroups = setOf(tabGroup),
            ),
            actual = result.mode,
        )
    }

    @Test
    fun `GIVEN normal mode, WHEN TabItemLongClicked invoked with normal tab, THEN select mode is entered`() {
        val tab = createTab(url = "mozilla.org", title = "TestTab", private = false)
        val initialState = TabsTrayState(mode = Mode.Normal)

        val result = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabItemLongClicked(tab),
        )

        assertEquals(
            expected = Mode.Select(
                selectedTabs = setOf(tab),
                selectedTabGroups = emptySet(),
            ),
            actual = result.mode,
        )
    }

    @Test
    fun `GIVEN select mode with selected tabs, WHEN TabItemLongClicked invoked with tab, THEN select mode is retained`() {
        val tab = createTab(title = "Test Tab", url = "mozilla.org")
        val initialState = TabsTrayState(mode = Mode.Select(selectedTabs = setOf(tab)))

        val result = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabItemLongClicked(tab),
        )

        assertEquals(
            expected = initialState.mode,
            actual = result.mode,
        )
    }

    @Test
    fun `GIVEN select mode with selected tabs, WHEN TabItemLongClicked invoked with TabGroup, THEN select mode is retained`() {
        val tabGroup = createTabGroup(title = "TestGroup", tabs = mutableListOf(createTab(url = "example.com")))
        val tab = createTab(title = "Test Tab", url = "mozilla.org")
        val initialState = TabsTrayState(mode = Mode.Select(selectedTabs = setOf(tab)))

        val result = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabItemLongClicked(tabGroup),
        )

        assertEquals(
            expected = initialState.mode,
            actual = result.mode,
        )
    }

    @Test
    fun `GIVEN normal mode, WHEN TabItemLongClicked invoked with private tab, THEN select mode is not entered`() {
        val privateTab = createTab(url = "mozilla.org", title = "TestTab", private = true)
        val initialState = TabsTrayState(mode = Mode.Normal)

        val result = TabsTrayReducer.reduce(
            state = initialState,
            action = TabsTrayAction.TabItemLongClicked(privateTab),
        )

        assertEquals(
            expected = initialState.mode,
            actual = result.mode,
        )
    }
}

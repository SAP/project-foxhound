/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import kotlin.test.assertIs

class TabsTrayStoreTest {

    @Test
    fun `WHEN entering select mode THEN selected tabs are empty`() {
        val store = TabsTrayStore()

        store.dispatch(TabsTrayAction.EnterSelectMode)

        assertTrue(store.state.mode.selectedTabs.isEmpty())
        assertIs<TabsTrayState.Mode.Select>(store.state.mode)

        store.dispatch(TabsTrayAction.AddSelectTab(TabsTrayItem.Tab(tab = createTab(url = "url"))))

        store.dispatch(TabsTrayAction.ExitSelectMode)
        store.dispatch(TabsTrayAction.EnterSelectMode)

        assertTrue(store.state.mode.selectedTabs.isEmpty())
        assertIs<TabsTrayState.Mode.Select>(store.state.mode)
    }

    @Test
    fun `WHEN exiting select mode THEN the mode in the state updates`() {
        val store = TabsTrayStore()

        store.dispatch(TabsTrayAction.EnterSelectMode)

        assertIs<TabsTrayState.Mode.Select>(store.state.mode)

        store.dispatch(TabsTrayAction.ExitSelectMode)

        assertIs<TabsTrayState.Mode.Normal>(store.state.mode)
    }

    @Test
    fun `WHEN adding a tab to selection THEN it is added to the selectedTabs`() {
        val store = TabsTrayStore()

        store.dispatch(TabsTrayAction.AddSelectTab(TabsTrayItem.Tab(tab = createTab(url = "url", id = "tab1"))))

        assertEquals("tab1", store.state.mode.selectedTabs.take(1).first().id)
    }

    @Test
    fun `WHEN removing a tab THEN it is removed from the selectedTabs`() {
        val store = TabsTrayStore()
        val tabForRemoval = TabsTrayItem.Tab(tab = createTab(url = "url", id = "tab1"))

        store.dispatch(TabsTrayAction.AddSelectTab(tabForRemoval))
        store.dispatch(TabsTrayAction.AddSelectTab(TabsTrayItem.Tab(tab = createTab(url = "url", id = "tab2"))))

        assertEquals(2, store.state.mode.selectedTabs.size)

        store.dispatch(TabsTrayAction.RemoveSelectTab(tabForRemoval))

        assertEquals(1, store.state.mode.selectedTabs.size)
        assertEquals("tab2", store.state.mode.selectedTabs.take(1).first().id)
    }

    @Test
    fun `WHEN store is initialized THEN the default page selected in normal tabs`() {
        val store = TabsTrayStore()

        assertEquals(Page.NormalTabs, store.state.selectedPage)
    }

    @Test
    fun `WHEN page changes THEN the selectedPage is updated`() {
        val store = TabsTrayStore()

        assertEquals(Page.NormalTabs, store.state.selectedPage)

        store.dispatch(TabsTrayAction.PageSelected(Page.SyncedTabs))

        assertEquals(Page.SyncedTabs, store.state.selectedPage)
    }

    @Test
    fun `WHEN position is converted to page THEN page is correct`() {
        assert(Page.positionToPage(position = 0) == Page.PrivateTabs)
        assert(Page.positionToPage(position = 1) == Page.NormalTabs)
        assert(Page.positionToPage(position = 2) == Page.SyncedTabs)
        assert(Page.positionToPage(position = -1) == Page.SyncedTabs)
    }

    @Test
    fun `WHEN Page is converted to an index THEN the index is correct`() {
        assert(Page.pageToPosition(page = Page.PrivateTabs) == 0)
        assert(Page.pageToPosition(page = Page.NormalTabs) == 1)
        assert(Page.pageToPosition(page = Page.SyncedTabs) == 2)
    }

    @Test
    fun `WHEN position is converted to page and tab groups should be shown THEN page is correct`() {
        assert(Page.positionToPage(position = 0, shouldShowTabGroupsPage = true) == Page.PrivateTabs)
        assert(Page.positionToPage(position = 1, shouldShowTabGroupsPage = true) == Page.NormalTabs)
        assert(Page.positionToPage(position = 2, shouldShowTabGroupsPage = true) == Page.TabGroups)
        assert(Page.positionToPage(position = 3, shouldShowTabGroupsPage = true) == Page.SyncedTabs)
        assert(Page.positionToPage(position = -1, shouldShowTabGroupsPage = true) == Page.SyncedTabs)
    }

    @Test
    fun `WHEN Page is converted to an index and tab groups should be shown THEN the index is correct`() {
        assert(Page.pageToPosition(page = Page.PrivateTabs, shouldShowTabGroupsPage = true) == 0)
        assert(Page.pageToPosition(page = Page.NormalTabs, shouldShowTabGroupsPage = true) == 1)
        assert(Page.pageToPosition(page = Page.TabGroups, shouldShowTabGroupsPage = true) == 2)
        assert(Page.pageToPosition(page = Page.SyncedTabs, shouldShowTabGroupsPage = true) == 3)
    }

    @Test
    fun `WHEN sync now action is triggered THEN update the sync now boolean`() {
        val store = TabsTrayStore()

        assertFalse(store.state.sync.isSyncing)

        store.dispatch(TabsTrayAction.SyncNow)

        assertTrue(store.state.sync.isSyncing)
    }

    @Test
    fun `WHEN sync is complete THEN the syncing boolean is updated`() {
        val store = TabsTrayStore(initialState = TabsTrayState(sync = TabsTrayState.SyncState(isSyncing = true)))

        assertTrue(store.state.sync.isSyncing)

        store.dispatch(TabsTrayAction.SyncCompleted)

        assertFalse(store.state.sync.isSyncing)
    }

    @Test
    fun `WHEN the selected tab has changed THEN the selected tab Id should be updated`() {
        val expected = "New tab ID"
        val store = TabsTrayStore(initialState = TabsTrayState(selectedTabId = null))

        store.dispatch(TabsTrayAction.UpdateSelectedTabId(tabId = expected))

        assertEquals(expected, store.state.selectedTabId)
    }

    @Test
    fun `WHEN UpdateInactiveExpanded is dispatched THEN update inactiveTabsExpanded`() {
        val tabsTrayStore = TabsTrayStore(
            initialState = TabsTrayState(
                inactiveTabs = TabsTrayState.InactiveTabsState(isExpanded = false),
            ),
        )

        assertFalse(tabsTrayStore.state.inactiveTabs.isExpanded)

        tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveExpanded(true))

        assertTrue(tabsTrayStore.state.inactiveTabs.isExpanded)
    }
}

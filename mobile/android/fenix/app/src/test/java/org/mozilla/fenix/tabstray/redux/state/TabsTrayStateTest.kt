/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.state

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.data.createTab
import org.mozilla.fenix.tabstray.data.createTabGroup
import org.mozilla.fenix.tabstray.navigation.TabManagerNavDestination
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState.Mode
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.tabstray.ui.fab.TabManagerFloatingToolbar
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@RunWith(AndroidJUnit4::class)
class TabsTrayStateTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `GIVEN tabs are selected WHEN fetching the selected tab IDs from State THEN the IDs of the selected tabs are returned`() {
        val tabs = List(size = 10) { createTab(url = "") }
        val state = TabsTrayState(mode = Mode.Select(selectedTabs = tabs.toSet()))

        assertEquals(tabs.map { it.id }, state.mode.selectedTabIds)
    }

    @Test
    fun `GIVEN tab groups are selected WHEN fetching the selected tab group IDs from State THEN the IDs of the selected groups are returned`() {
        val tabGroups = List(size = 10) { createTabGroup() }
        val state = TabsTrayState(mode = Mode.Select(selectedTabGroups = tabGroups.toSet()))

        assertEquals(tabGroups.map { it.id }, state.mode.selectedTabGroupIds)
    }

    @Test
    fun `GIVEN there are selected tab items WHEN checking whether a selected tab is selected THEN return true`() {
        val tab = createTab(url = "")
        val tabs = List(size = 10) { createTab(url = "") } + tab
        val state = TabsTrayState(mode = Mode.Select(selectedTabs = tabs.toSet()))

        assertTrue(state.mode.contains(item = tab))
    }

    @Test
    fun `GIVEN there are selected tab items WHEN checking whether an unselected tab is selected THEN return false`() {
        val tab = createTab(url = "")
        val tabs = List(size = 10) { createTab(url = "") }
        val state = TabsTrayState(mode = Mode.Select(selectedTabs = tabs.toSet()))

        assertFalse(state.mode.contains(item = tab))
    }

    @Test
    fun `GIVEN there are selected tab items WHEN checking whether a selected group is selected THEN return true`() {
        val tabGroup = createTabGroup()
        val tabs = List(size = 10) { createTab(url = "") }
        val state = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = tabs.toSet(),
                selectedTabGroups = setOf(tabGroup),
            ),
        )

        assertTrue(state.mode.contains(item = tabGroup))
    }

    @Test
    fun `GIVEN there are selected tab items WHEN checking whether an unselected group is selected THEN return false`() {
        val tabGroup = createTabGroup()
        val tabs = List(size = 10) { createTab(url = "") }
        val tabGroups = List(size = 10) { createTabGroup() }
        val state = TabsTrayState(
            mode = Mode.Select(
                selectedTabs = tabs.toSet(),
                selectedTabGroups = tabGroups.toSet(),
            ),
        )

        assertFalse(state.mode.contains(item = tabGroup))
    }

    @Test
    fun `GIVEN the user is on the Normal tabs page without tabs WHEN in the Tab Manager THEN the search icon is disabled`() {
        val state = TabsTrayState(
            selectedPage = Page.NormalTabs,
            normalTabsState = TabsTrayState.NormalTabsState(items = emptyList()),
        )
        assertFalse(state.searchIconEnabled)
    }

    @Test
    fun `GIVEN the user is on the Normal tabs page with tabs WHEN in the Tab Manager THEN the search icon is enabled`() {
        val state = TabsTrayState(
            selectedPage = Page.NormalTabs,
            normalTabsState = TabsTrayState.NormalTabsState(items = listOf(createTab(url = ""))),
        )
        assertTrue(state.searchIconEnabled)
    }

    @Test
    fun `GIVEN the user is on the Private tabs page without private tabs WHEN in the Tab Manager THEN the search icon is disabled`() {
        val state = TabsTrayState(
            selectedPage = Page.PrivateTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(tabs = emptyList()),
        )
        assertFalse(state.searchIconEnabled)
    }

    @Test
    fun `GIVEN the user is on the Private tabs page with private tabs WHEN in the Tab Manager THEN the search icon is enabled`() {
        val state = TabsTrayState(
            selectedPage = Page.PrivateTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(tabs = listOf(createTab(url = ""))),
        )
        assertTrue(state.searchIconEnabled)
    }

    @Test
    fun `GIVEN there are multiple destinations on the back stack WHEN popping the backstack THEN the top destination is popped`() {
        val initialBackStack = listOf(
            TabManagerNavDestination.Root,
            TabManagerNavDestination.TabSearch,
            TabManagerNavDestination.AddToTabGroup,
        )
        val actualBackStack = TabsTrayState(backStack = initialBackStack).popBackStack()
        val expectedBackStack = initialBackStack.dropLast(1)

        assertEquals(expectedBackStack, actualBackStack)
    }

    @Test
    fun `GIVEN there is one destination on the back stack WHEN popping the backstack THEN the top destination is not popped`() {
        val initialBackStack = listOf(TabManagerNavDestination.Root)
        val actualBackStack = TabsTrayState(backStack = initialBackStack).popBackStack()
        val expectedBackStack = initialBackStack

        assertEquals(expectedBackStack, actualBackStack)
    }

    @Test
    fun `WHEN tabs tray is initialized focus state is enabled by default for normal tabs`() {
        val initialState = TabsTrayState()
        assertTrue(initialState.normalTabsState.itemFocusIndicatorEnabled)
    }

    @Test
    fun `WHEN all onboarding conditions are met THEN shouldShowTabGroupOnboarding returns true`() {
        val state = onboardingEligibleState()
        assertTrue(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `WHEN the onboarding flag is off THEN shouldShowTabGroupOnboarding returns false`() {
        val state = onboardingEligibleState().copy(
            config = TabsTrayState.TabsTrayConfig(
                tabGroupsDragAndDropEnabled = true,
                tabGroupsOnboardingEnabled = false,
            ),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `WHEN drag and drop is disabled THEN shouldShowTabGroupOnboarding returns false`() {
        val state = onboardingEligibleState().copy(
            config = TabsTrayState.TabsTrayConfig(
                tabGroupsDragAndDropEnabled = false,
                tabGroupsOnboardingEnabled = true,
            ),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `WHEN the selected item index is out of range THEN shouldShowTabGroupOnboarding returns false`() {
        val state = onboardingEligibleState().copy(
            normalTabsState = TabsTrayState.NormalTabsState(
                items = listOf(createTab(url = ""), createTab(url = "")),
                selectedItemIndex = -1,
            ),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `WHEN the user already has tab groups THEN shouldShowTabGroupOnboarding returns false`() {
        val state = onboardingEligibleState().copy(
            tabGroupState = TabsTrayState.TabGroupState(groups = listOf(createTabGroup())),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `WHEN fewer than two standalone tabs THEN shouldShowTabGroupOnboarding returns false`() {
        val state = onboardingEligibleState().copy(
            normalTabsState = TabsTrayState.NormalTabsState(
                items = listOf(createTab(url = "")),
                selectedItemIndex = 0,
            ),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `GIVEN a tab group is in the tab list WHEN evaluating shouldShowTabGroupOnboarding THEN groups do not count toward the minimum tab count`() {
        val state = onboardingEligibleState().copy(
            normalTabsState = TabsTrayState.NormalTabsState(
                items = listOf(createTab(url = ""), createTabGroup()),
                selectedItemIndex = 0,
            ),
        )
        assertFalse(state.shouldShowTabGroupOnboarding)
    }

    @Test
    fun `GIVEN mode is Normal and PBM is not locked WHEN on Normal tabs THEN toolbar visibility is true`() {
        val state = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.NormalTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = false),
        )
        assert(state.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN mode is Select WHEN on Normal tabs THEN toolbar visibility is false`() {
        val state = TabsTrayState(
            mode = Mode.Select(),
            selectedPage = Page.NormalTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = false),
        )
        assert(!state.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN PBM is locked WHEN on Private tabs THEN toolbar visibility is false`() {
        val state = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.PrivateTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = true),
        )
        assert(!state.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN PBM is not locked WHEN on Private tabs THEN toolbar visibility is true`() {
        val state = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.PrivateTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = false),
        )
        assert(state.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN Tab Groups is enabled and selected WHEN in Normal mode THEN toolbar visibility is false`() {
        val state = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.TabGroups,
            config = TabsTrayState.TabsTrayConfig(tabGroupsEnabled = true),
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = false),
        )
        assert(!state.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN mode is Normal WHEN on Synced tabs THEN toolbar visibility is true`() {
        val state1 = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.SyncedTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = false),
        )
        assert(state1.isFloatingToolbarVisible)

        val state2 = TabsTrayState(
            mode = Mode.Normal,
            selectedPage = Page.SyncedTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(isLocked = true),
        )
        assert(state2.isFloatingToolbarVisible)
    }

    @Test
    fun `GIVEN mode is Select WHEN toolbar is rendered THEN it is hidden`() {
        val initialState = TabsTrayState(
            mode = Mode.Select(),
            selectedPage = Page.NormalTabs,
        )
        val tabsTrayStore = TabsTrayStore(initialState = initialState)

        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = tabsTrayStore,
                    isSignedIn = true,
                    onOpenNewNormalTabClicked = {},
                    onOpenNewPrivateTabClicked = {},
                    onSyncedTabsFabClicked = {},
                    onTabSettingsClick = {},
                    onAccountSettingsClick = {},
                    onDeleteAllTabsClick = {},
                    onRecentlyClosedClick = {},
                )
            }
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.FAB).assertDoesNotExist()
    }

    private fun onboardingEligibleState(): TabsTrayState = TabsTrayState(
        normalTabsState = TabsTrayState.NormalTabsState(
            items = listOf(createTab(url = ""), createTab(url = "")),
            selectedItemIndex = 0,
        ),
        tabGroupState = TabsTrayState.TabGroupState(groups = emptyList()),
        config = TabsTrayState.TabsTrayConfig(
            tabGroupsDragAndDropEnabled = true,
            tabGroupsOnboardingEnabled = true,
        ),
    )
}

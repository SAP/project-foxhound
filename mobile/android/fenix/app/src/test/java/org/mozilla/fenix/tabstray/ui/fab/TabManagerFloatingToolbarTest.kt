/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.tabstray.ui.fab

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.state.createTab
import mozilla.components.compose.base.theme.acornDarkColorScheme
import mozilla.components.compose.base.theme.acornLightColorScheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.TabsTrayTestTag.CLOSE_ALL_TABS
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class TabManagerFloatingToolbarTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    private val testTabs = listOf(
        TabsTrayItem.Tab(tab = createTab(url = "https://www.google.com", id = "a")),
        TabsTrayItem.Tab(tab = createTab(url = "https://www.duckduckgo.com", id = "b")),
    )

    @Test
    fun `Close all tabs menu item in light theme uses Error color`() {
        val initialState = TabsTrayState(normalTabsState = TabsTrayState.NormalTabsState(items = testTabs))
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    modifier = Modifier
                        .background(color = MaterialTheme.colorScheme.surface)
                        .padding(all = 16.dp),
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
        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(CLOSE_ALL_TABS)
            .assertExists()
            .assert(hasTextColor(acornLightColorScheme().error))
    }

    @Test
    fun `Close all tabs menu item in private theme uses Error color`() {
        val initialState = TabsTrayState(normalTabsState = TabsTrayState.NormalTabsState(items = testTabs))
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Private) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    modifier = Modifier
                        .background(color = MaterialTheme.colorScheme.surface)
                        .padding(all = 16.dp),
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
        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(CLOSE_ALL_TABS)
            .assertExists()
            .assert(hasTextColor(acornPrivateColorScheme().error))
    }

    @Test
    fun `Close all tabs menu item in dark theme uses Error color`() {
        val initialState = TabsTrayState(normalTabsState = TabsTrayState.NormalTabsState(items = testTabs))
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Dark) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    modifier = Modifier
                        .background(color = MaterialTheme.colorScheme.surface)
                        .padding(all = 16.dp),
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
        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(CLOSE_ALL_TABS)
            .assertExists()
            .assert(hasTextColor(acornDarkColorScheme().error))
    }

    @Test
    fun `Clicking Select all tabs menu item selects all normal tabs`() {
        val initialState = TabsTrayState(
            normalTabsState = TabsTrayState.NormalTabsState(items = testTabs),
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

        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(TabsTrayTestTag.SELECT_ALL_TABS)
            .assertExists()
            .performClick()

        val state = tabsTrayStore.state
        assert(state.mode is TabsTrayState.Mode.Select)
        assert(state.mode.selectedTabs == testTabs.toSet())
    }

    @Test
    fun `Select all tabs menu item is not displayed on private tabs page`() {
        val initialState = TabsTrayState(
            selectedPage = Page.PrivateTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(tabs = testTabs),
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

        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(TabsTrayTestTag.SELECT_ALL_TABS).assertDoesNotExist()
    }

    @Test
    fun `Select all tabs menu item is not displayed on synced tabs page`() {
        val initialState = TabsTrayState(
            selectedPage = Page.SyncedTabs,
            privateBrowsing = TabsTrayState.PrivateBrowsingState(tabs = testTabs),
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

        composeTestRule.onNodeWithTag(TabsTrayTestTag.THREE_DOT_BUTTON).performClick()
        composeTestRule.onNodeWithTag(TabsTrayTestTag.SELECT_ALL_TABS).assertDoesNotExist()
    }

    @Test
    fun `GIVEN user is not signed in WHEN on synced tabs page THEN clicking FAB does not trigger sync`() {
        var clicked = false
        val state = TabsTrayState(
            selectedPage = Page.SyncedTabs,
        )

        composeTestRule.setContent {
            FloatingToolbarFAB(
                state = state,
                isSignedIn = false,
                onOpenNewNormalTabClicked = {},
                onOpenNewPrivateTabClicked = {},
                onSyncedTabsFabClicked = { clicked = true },
            )
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.FAB).performClick()

        assert(!clicked)
    }

    @Test
    fun `GIVEN reauth error exists WHEN on synced tabs page THEN clicking FAB does not trigger sync`() {
        val reauthErrorString = testContext.getString(R.string.synced_tabs_reauth)

        var clicked = false
        val state = TabsTrayState(
            selectedPage = Page.SyncedTabs,
            sync = TabsTrayState.SyncState(
                syncedTabs = listOf(
                    SyncedTabsListItem.Error(errorText = reauthErrorString),
                ),
            ),
        )

        composeTestRule.setContent {
            FloatingToolbarFAB(
                state = state,
                isSignedIn = true,
                onOpenNewNormalTabClicked = {},
                onOpenNewPrivateTabClicked = {},
                onSyncedTabsFabClicked = { clicked = true },
            )
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.FAB).performClick()

        assert(!clicked)
    }

    @Test
    fun `GIVEN user is signed in and no errors WHEN on synced tabs page THEN clicking FAB triggers sync`() {
        var clicked = false
        val state = TabsTrayState(
            selectedPage = Page.SyncedTabs,
            sync = TabsTrayState.SyncState(syncedTabs = emptyList()),
        )

        composeTestRule.setContent {
            FloatingToolbarFAB(
                state = state,
                isSignedIn = true,
                onOpenNewNormalTabClicked = {},
                onOpenNewPrivateTabClicked = {},
                onSyncedTabsFabClicked = { clicked = true },
            )
        }

        composeTestRule.onNodeWithTag(TabsTrayTestTag.FAB)
            .assertIsDisplayed()
            .performClick()

        assert(clicked)
    }

    private fun hasTextColor(color: androidx.compose.ui.graphics.Color) =
        SemanticsMatcher("Has text color matching $color") { node ->
            val textLayoutResults = mutableListOf<TextLayoutResult>()
            node.config.getOrNull(SemanticsActions.GetTextLayoutResult)?.action?.invoke(textLayoutResults)
            return@SemanticsMatcher if (textLayoutResults.isEmpty()) {
                false
            } else {
                textLayoutResults.first().layoutInput.style.color == color
            }
        }
}

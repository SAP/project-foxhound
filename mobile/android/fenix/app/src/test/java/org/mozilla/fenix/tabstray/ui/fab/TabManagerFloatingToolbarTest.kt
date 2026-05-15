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
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.state.createTab
import mozilla.components.compose.base.theme.acornDarkColorScheme
import mozilla.components.compose.base.theme.acornLightColorScheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.TabsTrayTestTag.CLOSE_ALL_TABS
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class TabManagerFloatingToolbarTest {
    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `Close all tabs menu item in light theme uses Error color`() {
        val initialState = TabsTrayState(
            normalTabs = listOf(
                createTab(url = "https://www.google.com", id = "a"),
                createTab(url = "https://www.duckduckgo.com", id = "b"),
            ),
        )
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Light) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    expanded = false,
                    pbmLocked = false,
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
        val initialState = TabsTrayState(
            normalTabs = listOf(
                createTab(url = "https://www.google.com", id = "a"),
                createTab(url = "https://www.duckduckgo.com", id = "b"),
            ),
            )
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Private) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    expanded = false,
                    pbmLocked = false,
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
        val initialState = TabsTrayState(
            normalTabs = listOf(
                createTab(url = "https://www.google.com", id = "a"),
                createTab(url = "https://www.duckduckgo.com", id = "b"),
            ),
            )
        composeTestRule.setContent {
            FirefoxTheme(theme = Theme.Dark) {
                TabManagerFloatingToolbar(
                    tabsTrayStore = remember { TabsTrayStore(initialState = initialState) },
                    isSignedIn = true,
                    expanded = false,
                    pbmLocked = false,
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

    private fun hasTextColor(color: androidx.compose.ui.graphics.Color) = SemanticsMatcher("Has text color matching $color") { node ->
        val textLayoutResults = mutableListOf<TextLayoutResult>()
        node.config.getOrNull(SemanticsActions.GetTextLayoutResult)?.action?.invoke(textLayoutResults)
        return@SemanticsMatcher if (textLayoutResults.isEmpty()) {
            false
        } else {
            textLayoutResults.first().layoutInput.style.color == color
        }
    }
}

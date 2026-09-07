/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.tabstray.ui

import androidx.compose.ui.test.DarkMode
import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.ui.theme.TabManagerThemeProvider
import org.mozilla.fenix.theme.DefaultThemeProvider
import org.mozilla.fenix.theme.Theme

@RunWith(AndroidJUnit4::class)
class TabManagerThemeProviderTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun whenOnPrivateTabsPageTabManagerThemeProviderReturnsPrivateTheme() {
        val tabManagerThemeProvider = TabManagerThemeProvider(selectedPage = Page.PrivateTabs)

        composeTestRule.setContent {
            assertEquals(Theme.Private, tabManagerThemeProvider.provideTheme())
        }
    }

    @Test
    fun whenOnNormalTabsPageTabManagerThemeProviderFallsBackToDefault_light() {
        val tabManagerThemeProvider = TabManagerThemeProvider(selectedPage = Page.NormalTabs)

        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = false),
            ) {
                assertEquals(DefaultThemeProvider.provideTheme(), tabManagerThemeProvider.provideTheme())
                assertEquals(Theme.Light, tabManagerThemeProvider.provideTheme())
            }
        }
    }

    @Test
    fun whenOnNormalTabsPageTabManagerThemeProviderFallsBackToDefault_dark() {
        val tabManagerThemeProvider = TabManagerThemeProvider(selectedPage = Page.NormalTabs)

        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = true),
            ) {
                assertEquals(DefaultThemeProvider.provideTheme(), tabManagerThemeProvider.provideTheme())
                assertEquals(Theme.Dark, tabManagerThemeProvider.provideTheme())
            }
        }
    }

    @Test
    fun whenOnSyncedTabsPageTabManagerThemeProviderFallsBackToDefault_light() {
        val tabManagerThemeProvider = TabManagerThemeProvider(selectedPage = Page.SyncedTabs)

        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = false),
            ) {
                assertEquals(DefaultThemeProvider.provideTheme(), tabManagerThemeProvider.provideTheme())
                assertEquals(Theme.Light, tabManagerThemeProvider.provideTheme())
            }
        }
    }

    @Test
    fun whenOnSyncedTabsPageTabManagerThemeProviderFallsBackToDefault_dark() {
        val tabManagerThemeProvider = TabManagerThemeProvider(selectedPage = Page.SyncedTabs)

        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = true),
            ) {
                assertEquals(DefaultThemeProvider.provideTheme(), tabManagerThemeProvider.provideTheme())
                assertEquals(Theme.Dark, tabManagerThemeProvider.provideTheme())
            }
        }
    }
}

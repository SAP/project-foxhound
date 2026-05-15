/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.theme

import androidx.compose.ui.test.DarkMode
import androidx.compose.ui.test.DeviceConfigurationOverride
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ThemeProviderTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun defaultThemeProviderProvidesDarkDarkWhenInDarkMode() {
        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = true),
            ) {
                assertEquals(Theme.Dark, DefaultThemeProvider.provideTheme())
            }
        }
    }

    @Test
    fun defaultThemeProviderProvidesLightThemeWhenInLightMode() {
        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = false),
            ) {
                assertEquals(Theme.Light, DefaultThemeProvider.provideTheme())
            }
        }
    }

    @Test
    fun getThemeProviderFallsBackToDefaultThemeProvider_dark() {
        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = true),
            ) {
                assertEquals(Theme.Dark, getThemeProvider().provideTheme())
                assertEquals(DefaultThemeProvider.provideTheme(), getThemeProvider().provideTheme())
            }
        }
    }

    @Test
    fun getThemeProviderFallsBackToDefaultThemeProvider_light() {
        composeTestRule.setContent {
            DeviceConfigurationOverride(
                DeviceConfigurationOverride.DarkMode(isDarkMode = false),
            ) {
                assertEquals(Theme.Light, getThemeProvider().provideTheme())
                assertEquals(DefaultThemeProvider.provideTheme(), getThemeProvider().provideTheme())
            }
        }
    }
}

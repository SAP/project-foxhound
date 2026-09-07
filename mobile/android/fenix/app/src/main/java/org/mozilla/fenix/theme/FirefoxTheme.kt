/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import mozilla.components.compose.base.theme.AcornColors
import mozilla.components.compose.base.theme.AcornGradientScheme
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.AcornTypography
import mozilla.components.compose.base.theme.acornDarkColorScheme
import mozilla.components.compose.base.theme.acornLightColorScheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.darkAcornGradientScheme
import mozilla.components.compose.base.theme.darkColorPalette
import mozilla.components.compose.base.theme.layout.AcornLayout
import mozilla.components.compose.base.theme.layout.AcornWindowSize
import mozilla.components.compose.base.theme.lightAcornGradientScheme
import mozilla.components.compose.base.theme.lightColorPalette
import mozilla.components.compose.base.theme.privateAcornGradientScheme
import mozilla.components.compose.base.theme.privateColorPalette

/**
 * The theme for Mozilla Firefox for Android (Fenix).
 *
 * @param theme The current [Theme] that is displayed.
 * @param content The children composables to be laid out.
 */
@Composable
fun FirefoxTheme(
    theme: Theme = getThemeProvider().provideTheme(),
    content: @Composable () -> Unit,
) {
    val colors: AcornColors = when (theme) {
        Theme.Light -> lightColorPalette
        Theme.Dark -> darkColorPalette
        Theme.Private -> privateColorPalette
    }

    val colorScheme: ColorScheme = when (theme) {
        Theme.Light -> acornLightColorScheme()
        Theme.Dark -> acornDarkColorScheme()
        Theme.Private -> acornPrivateColorScheme()
    }

    val gradients: AcornGradientScheme = when (theme) {
        Theme.Light -> lightAcornGradientScheme
        Theme.Dark -> darkAcornGradientScheme
        Theme.Private -> privateAcornGradientScheme
    }

    val tabGroupColors: TabGroupColorPalette = when (theme) {
        Theme.Light -> TabGroupColorPalette.lightPalette
        Theme.Dark -> TabGroupColorPalette.darkPalette
        Theme.Private -> TabGroupColorPalette.privatePalette
    }

    ProvideFirefoxTokens(tabGroupColors = tabGroupColors) {
        AcornTheme(
            colors = colors,
            colorScheme = colorScheme,
            gradients = gradients,
            content = content,
        )
    }
}

@Composable
private fun ProvideFirefoxTokens(
    tabGroupColors: TabGroupColorPalette,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        localTabGroupColors provides tabGroupColors,
        content = content,
    )
}

/**
 * Provides access to the Firefox design system tokens.
 */
object FirefoxTheme {
    val colors: AcornColors
        @Composable
        @ReadOnlyComposable
        get() = AcornTheme.colors

    val typography: AcornTypography
        get() = AcornTheme.typography

    val layout: AcornLayout
        @Composable
        @ReadOnlyComposable
        get() = AcornTheme.layout

    val windowSize: AcornWindowSize
        @Composable
        @ReadOnlyComposable
        get() = AcornTheme.windowSize

    val gradients: AcornGradientScheme
        @Composable
        @ReadOnlyComposable
        get() = AcornTheme.gradients

    val tabGroupColors: TabGroupColorPalette
        @Composable
        @ReadOnlyComposable
        get() = localTabGroupColors.current
}

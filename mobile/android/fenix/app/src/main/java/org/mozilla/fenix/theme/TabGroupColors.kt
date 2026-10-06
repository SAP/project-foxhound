/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.ContainerColorStack
import mozilla.components.ui.colors.NovaColors

/**
 * Represents the complete palette of colors available for tab groups.
 */
data class TabGroupColorPalette(
    val yellow: TabGroupColors,
    val orange: TabGroupColors,
    val red: TabGroupColors,
    val pink: TabGroupColors,
    val purple: TabGroupColors,
    val blue: TabGroupColors,
    val cyan: TabGroupColors,
    val green: TabGroupColors,
    val grey: TabGroupColors,
) {
    companion object {
        val lightPalette = TabGroupColorPalette(
            yellow = TabGroupColors(primary = NovaColors.Yellow50, onPrimary = NovaColors.White),
            orange = TabGroupColors(primary = NovaColors.Orange50, onPrimary = NovaColors.White),
            red = TabGroupColors(primary = NovaColors.Red50, onPrimary = NovaColors.White),
            pink = TabGroupColors(primary = NovaColors.Pink50, onPrimary = NovaColors.White),
            purple = TabGroupColors(primary = NovaColors.Violet50, onPrimary = NovaColors.White),
            blue = TabGroupColors(primary = NovaColors.Blue50, onPrimary = NovaColors.White),
            cyan = TabGroupColors(primary = NovaColors.Cyan50, onPrimary = NovaColors.White),
            green = TabGroupColors(primary = NovaColors.Green50, onPrimary = NovaColors.White),
            grey = TabGroupColors(primary = NovaColors.Gray50, onPrimary = NovaColors.White),
        )

        val darkPalette = TabGroupColorPalette(
            yellow = TabGroupColors(primary = NovaColors.Yellow10, onPrimary = NovaColors.Yellow60),
            orange = TabGroupColors(primary = NovaColors.Orange10, onPrimary = NovaColors.Orange60),
            red = TabGroupColors(primary = NovaColors.Red10, onPrimary = NovaColors.Red60),
            pink = TabGroupColors(primary = NovaColors.Pink10, onPrimary = NovaColors.Pink60),
            purple = TabGroupColors(primary = NovaColors.Violet10, onPrimary = NovaColors.Violet60),
            blue = TabGroupColors(primary = NovaColors.Blue10, onPrimary = NovaColors.Blue60),
            cyan = TabGroupColors(primary = NovaColors.Cyan10, onPrimary = NovaColors.Cyan60),
            green = TabGroupColors(primary = NovaColors.Green10, onPrimary = NovaColors.Green60),
            grey = TabGroupColors(primary = NovaColors.Gray20, onPrimary = NovaColors.Gray55),
        )

        val privatePalette = darkPalette
    }
}

/**
 * Represents a single color pairing for a tab group.
 *
 * @property primary The main background color for the tab group indicator.
 * @property onPrimary The color used for elements drawn on top of the primary color.
 */
data class TabGroupColors(
    val primary: Color,
    val onPrimary: Color,
)

internal val localTabGroupColors = staticCompositionLocalOf {
    TabGroupColorPalette.lightPalette
}

/**
 * Preview showcasing the tab group colors across all supported themes.
 */
@Preview(widthDp = 1050, showBackground = true)
@Composable
private fun TabGroupColorsPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    TabGroupColorsGrid(theme = theme)
}

/**
 * Shared helper to render the color grid so we don't repeat the layout code for every theme preview.
 */
@Composable
private fun TabGroupColorsGrid(theme: Theme) {
    FirefoxTheme(theme = theme) {
        val tabColors = FirefoxTheme.tabGroupColors

        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
        ) {
            Text(
                text = "Tab Group Colors",
                style = MaterialTheme.typography.displayMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )

            Spacer(Modifier.height(24.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                ContainerColorStack(
                    color1 = tabColors.yellow.primary,
                    color2 = tabColors.yellow.onPrimary,
                    color3 = tabColors.orange.primary,
                    color4 = tabColors.orange.onPrimary,
                    color1Name = "Yellow",
                    color2Name = "onYellow",
                    color3Name = "Orange",
                    color4Name = "onOrange",
                )

                ContainerColorStack(
                    color1 = tabColors.red.primary,
                    color2 = tabColors.red.onPrimary,
                    color3 = tabColors.pink.primary,
                    color4 = tabColors.pink.onPrimary,
                    color1Name = "Red",
                    color2Name = "onRed",
                    color3Name = "Pink",
                    color4Name = "onPink",
                )

                ContainerColorStack(
                    color1 = tabColors.purple.primary,
                    color2 = tabColors.purple.onPrimary,
                    color3 = tabColors.blue.primary,
                    color4 = tabColors.blue.onPrimary,
                    color1Name = "Purple",
                    color2Name = "onPurple",
                    color3Name = "Blue",
                    color4Name = "onBlue",
                )

                ContainerColorStack(
                    color1 = tabColors.cyan.primary,
                    color2 = tabColors.cyan.onPrimary,
                    color3 = tabColors.green.primary,
                    color4 = tabColors.green.onPrimary,
                    color1Name = "Cyan",
                    color2Name = "onCyan",
                    color3Name = "Green",
                    color4Name = "onGreen",
                )

                ContainerColorStack(
                    color1 = tabColors.grey.primary,
                    color2 = tabColors.grey.onPrimary,
                    color3 = Color.Transparent,
                    color4 = Color.Transparent,
                    color1Name = "Grey",
                    color2Name = "onGrey",
                    color3Name = "",
                    color4Name = "",
                )
            }
        }
    }
}

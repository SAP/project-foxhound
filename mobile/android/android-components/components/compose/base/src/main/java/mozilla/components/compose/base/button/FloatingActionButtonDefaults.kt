/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.button

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color

/**
 * Contains the default values used by Acorn FloatingActionButtons.
 */
object FloatingActionButtonDefaults {

    /**
     * Returns the colors for a Primary FAB.
     */
    @Composable
    @ReadOnlyComposable
    fun colorsPrimary(
        containerColor: Color = MaterialTheme.colorScheme.primaryFixed,
        contentColor: Color = MaterialTheme.colorScheme.onPrimaryFixed,
    ) = FloatingActionButtonColors(
        containerColor = containerColor,
        contentColor = contentColor,
    )

    /**
     * Returns the colors for a Surface FAB.
     */
    @Composable
    @ReadOnlyComposable
    fun colorsSurface(
        containerColor: Color = MaterialTheme.colorScheme.surfaceContainerHigh,
        contentColor: Color = MaterialTheme.colorScheme.inverseSurface,
    ) = FloatingActionButtonColors(
        containerColor = containerColor,
        contentColor = contentColor,
    )

    /**
     * Returns the colors for a FAB that is disabled.
     */
    @Composable
    @ReadOnlyComposable
    fun colorsDisabled(
        containerColor: Color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
        contentColor: Color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.38f),
    ) = FloatingActionButtonColors(
        containerColor = containerColor,
        contentColor = contentColor,
    )
}

/**
 * The palette of colors for a FAB.
 *
 * @param containerColor The [Color] of the FAB's background.
 * @param contentColor The [Color] of the content within the FAB, such as its icon or text.
 */
data class FloatingActionButtonColors(
    val containerColor: Color,
    val contentColor: Color,
)

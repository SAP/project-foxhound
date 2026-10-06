/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Corner radius values for the Acorn Design System.
 *
 * An example usage of these values would be to construct [RoundedCornerShape]s.
 *
 * @property none No corner radius (0dp). Use for edge to edge components such as app bars, tabs,
 * and toolbar, etc.
 * @property extraSmall Extra small corner radius (4dp). Use for menus, snackbars, text fields, etc.
 * @property small Small corner radius (8dp).
 * @property medium Medium corner radius (12dp). Use for banners, CFRs, etc.
 * @property large Large corner radius (16dp). Use for cards, FABs, etc.
 * @property extraLarge Extra large corner radius (28dp). Use for larger components such as dialogs
 * or sheets, etc.
 * @property full Full corner radius (1000dp). Use for buttons, badges, chips, etc.
 */
object AcornCorners {
    val none: Dp = 0.dp
    val extraSmall: Dp = 4.dp
    val small: Dp = 8.dp
    val medium: Dp = 12.dp
    val large: Dp = 16.dp
    val extraLarge: Dp = 28.dp
    val full: Dp = 1000.dp
}

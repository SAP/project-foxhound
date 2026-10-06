/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.utils

import androidx.annotation.FloatRange
import androidx.compose.ui.graphics.Color as ComposeColor

/**
 * The position of a [ColorStop] along a gradient. The percentage is represented as a float.
 *
 * @property position The color stop position as a fraction of the gradient's length.
 */
@JvmInline
value class Position(
    @param:FloatRange(from = 0.0, to = 1.0) val position: Float,
)

/**
 * A color stop in a gradient.
 *
 * @property colorStop A color stop position mapping to the color pair.
 */
@JvmInline
value class ColorStop(private val colorStop: Pair<Position, ComposeColor>) {
    constructor(position: Float, color: ComposeColor) : this(Position(position) to color)

    val position: Float
        get() = this.colorStop.first.position

    val color: ComposeColor
        get() = this.colorStop.second
}

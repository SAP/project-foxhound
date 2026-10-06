/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.unit.dp

/**
 * Draw an alternating brick pattern like this:
 *
 * _________
 *   |   |
 * _________
 * |   |   |
 * _________
 *
 */
internal fun DrawScope.brickPattern() {
    val brickWidth = 30.dp.toPx()
    val brickHeight = 10.dp.toPx()
    val mortarWidth = 2.dp.toPx()
    val halfBrickWidth: Float = brickWidth / 2
    drawRect(color = LongFoxColors.mortarColor)

    // draw bricks
    var y = 0f
    var row = 0
    while (y < size.height) {
        var x = if (row % 2 == 0) 0f else -halfBrickWidth
        while (x < size.width) {
            drawRect(
                color = LongFoxColors.brickColor,
                topLeft = Offset(x, y),
                size = Size(brickWidth, brickHeight)
            )
            x += brickWidth + mortarWidth
        }
        y += brickHeight + mortarWidth
        row++
    }
}

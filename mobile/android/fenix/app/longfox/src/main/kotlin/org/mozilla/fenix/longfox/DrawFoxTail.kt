/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate

/**
 * Draw the tail of the fox at the position given by the current game state.
 * The tail is rotated to match the direction that part of the fox is moving.
 * So it does a little swoosh as it turns :)
 *
 * @receiver the draw scope for the game canvas
 * @param state the current game state
 * @param kitTailBitmap the fox tail bitmap
 */
fun DrawScope.drawTail(state: GameState, kitTailBitmap: ImageBitmap?) {
    if (kitTailBitmap == null) return
    val tail = state.fox.last()
    val rotateAngle = when (state.tailDirection) {
        Direction.UP -> 0F
        Direction.DOWN -> 180F
        Direction.LEFT -> 270F
        Direction.RIGHT -> 90F
    }
    val topLeft = Offset(tail.x * state.cellSize, tail.y * state.cellSize)
    val pivotPoint = Offset(topLeft.x + state.cellSize / 2, topLeft.y + state.cellSize / 2)
    rotate(rotateAngle, pivotPoint) {
        drawImage(
            image = kitTailBitmap,
            topLeft = topLeft,
        )
    }
}

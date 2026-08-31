/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope

/**
 * Draw the head of the fox at the position given by the current game state.
 *
 * @receiver the draw scope for the game canvas
 * @param state the current game state
 * @param kitHeadBitmap the fox head bitmap
 */
fun DrawScope.drawHead(state: GameState, kitHeadBitmap: ImageBitmap?) {
    if (kitHeadBitmap == null) return
    val head = state.fox.first()
    drawImage(
        image = kitHeadBitmap,
        topLeft = Offset(head.x * state.cellSize, head.y * state.cellSize),
    )
}

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
 * Draw the food onto the canvas at the current food grid point.
 *
 * @receiver the draw scope for the game canvas
 * @param state the current game state
 * @param food the food bitmap
 */
fun DrawScope.drawFood(state: GameState, food: ImageBitmap?) {
    if (food == null || state.food == null) return
    drawImage(
        image = food,
        topLeft = Offset(state.food.x * state.cellSize, state.food.y * state.cellSize),
    )
}

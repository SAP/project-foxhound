/*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package org.mozilla.fenix.longfox

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import org.mozilla.fenix.longfox.GameState.Companion.CELL_SIZE_DP

/**
 * A canvas that draws the fox game.
 * The canvas is sized to fit the container, with a fixed cell size.
 * It gets all the required drawables and resizes them to square bitmaps that match the cell size.
 * Then it passes the assets into the separately defined drawscope functions for the fox's
 * body, head, tail and food.
 *
 * @param state the current game state
 */
@Composable
fun GameCanvas(state: GameState) {
    val context = LocalContext.current
    val cellSize = state.cellSize.toInt()

    val kitHead = remember(cellSize) {
        if (cellSize > 0) {
            ContextCompat.getDrawable(context, R.drawable.kit_head)
                ?.toBitmap(cellSize, cellSize)
                ?.asImageBitmap()
        } else {
            null
        }
    }

    val kitTail = remember(cellSize) {
        if (cellSize > 0) {
            ContextCompat.getDrawable(context, R.drawable.kit_tail)
                ?.toBitmap(cellSize, cellSize)
                ?.asImageBitmap()
        } else {
            null
        }
    }

    val cookie = remember(cellSize) {
        if (cellSize > 0) {
            ContextCompat.getDrawable(context, R.drawable.cookie)
                ?.toBitmap(cellSize, cellSize)
                ?.asImageBitmap()
        } else {
            null
        }
    }

    val foxBrush = remember { Brush.linearGradient(listOf(Color.Red, Color.Yellow)) }
    val bodyPath = remember { Path() }
    val bodyCells = remember(state.fox) {
        val foxBody = state.fox.drop(1).dropLast(1)
        val bodySet = foxBody.toHashSet()
        foxBody.map { cell ->
            val hasLeft = GridPoint(cell.x - 1, cell.y) in bodySet
            val hasRight = GridPoint(cell.x + 1, cell.y) in bodySet
            val hasUp = GridPoint(cell.x, cell.y - 1) in bodySet
            val hasDown = GridPoint(cell.x, cell.y + 1) in bodySet
            BodyCellDrawData(
                left = cell.x * state.cellSize,
                top = cell.y * state.cellSize,
                roundTopLeft = !hasLeft && !hasUp,
                roundTopRight = !hasRight && !hasUp,
                roundBottomRight = !hasRight && !hasDown,
                roundBottomLeft = !hasLeft && !hasDown,
            )
        }
    }

    Canvas(
        modifier = Modifier
            .background(color = LongFoxColors.backgroundColor)
            .border(1.dp, LongFoxColors.mortarColor)
            .size((CELL_SIZE_DP * state.numCells).dp),
    ) {
        drawHead(state, kitHead)
        drawBody(bodyCells, state.cellSize, foxBrush, bodyPath)
        drawTail(state, kitTail)
        drawFood(state, cookie)
    }
}

@Preview
@Composable
fun GameCanvasPreview() {
    MaterialTheme {
        GameCanvas(GameState(size = Size(600f, 1000f)))
    }
}

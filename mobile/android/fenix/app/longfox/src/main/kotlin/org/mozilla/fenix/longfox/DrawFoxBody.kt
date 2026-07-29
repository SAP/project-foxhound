/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope

/**
 * Draw the body of the fox as a single filled path with rounded outer corners.
 * Each outer corner (where both orthogonal neighbours are absent from the body) is rounded;
 * inner corners and shared edges remain sharp so adjacent cells merge seamlessly.
 *
 * The caller is responsible for pre-computing [cells] once per tick and providing a
 * reusable [path] object; this function resets and refills it on every call.
 *
 * @receiver the draw scope for the game canvas
 * @param cells pre-computed per-cell draw data
 * @param cellSize size of one grid cell in pixels
 * @param brush the brush to fill the body with
 * @param path reusable [Path] object — reset and rebuilt each call
 */
internal fun DrawScope.drawBody(cells: List<BodyCellDrawData>, cellSize: Float, brush: Brush, path: Path) {
    if (cells.isEmpty()) return
    path.reset()
    val cornerRadius = cellSize / 2
    cells.forEach { cell ->
        addRoundedCell(
            path = path,
            left = cell.left,
            top = cell.top,
            cellSize = cellSize,
            cornerRadius = cornerRadius,
            roundTopLeft = cell.roundTopLeft,
            roundTopRight = cell.roundTopRight,
            roundBottomRight = cell.roundBottomRight,
            roundBottomLeft = cell.roundBottomLeft,
        )
    }
    drawPath(path, brush)
}

/**
 * Adds a rectangle to [path] with optional rounded corners.
 * Pass `true` for any corner to replace the sharp 90° angle with a quarter-circle arc of radius [cornerRadius].
 */
private fun addRoundedCell(
    path: Path,
    left: Float,
    top: Float,
    cellSize: Float,
    cornerRadius: Float,
    roundTopLeft: Boolean,
    roundTopRight: Boolean,
    roundBottomRight: Boolean,
    roundBottomLeft: Boolean,
) {
    val right = left + cellSize
    val bottom = top + cellSize

    path.moveTo(left + if (roundTopLeft) cornerRadius else 0f, top)

    if (roundTopRight) {
        path.lineTo(right - cornerRadius, top)
        path.arcTo(Rect(right - 2 * cornerRadius, top, right, top + (2 * cornerRadius)), -90f, 90f, false)
    } else {
        path.lineTo(right, top)
    }

    if (roundBottomRight) {
        path.lineTo(right, bottom - cornerRadius)
        path.arcTo(Rect(right - 2 * cornerRadius, bottom - (2 * cornerRadius), right, bottom), 0f, 90f, false)
    } else {
        path.lineTo(right, bottom)
    }

    if (roundBottomLeft) {
        path.lineTo(left + cornerRadius, bottom)
        path.arcTo(Rect(left, bottom - 2 * cornerRadius, left + (2 * cornerRadius), bottom), 90f, 90f, false)
    } else {
        path.lineTo(left, bottom)
    }

    if (roundTopLeft) {
        path.lineTo(left, top + cornerRadius)
        path.arcTo(Rect(left, top, left + 2 * cornerRadius, top + (2 * cornerRadius)), 180f, 90f, false)
    } else {
        path.lineTo(left, top)
    }

    path.close()
}

/**
 * Pre-computed draw data for a single body cell.
 * Calculated once per game tick in [GameCanvas] and reused across draw frames.
 *
 * @param left pixel x of the cell's left edge
 * @param top pixel y of the cell's top edge
 */
internal data class BodyCellDrawData(
    val left: Float,
    val top: Float,
    val roundTopLeft: Boolean,
    val roundTopRight: Boolean,
    val roundBottomRight: Boolean,
    val roundBottomLeft: Boolean,
)

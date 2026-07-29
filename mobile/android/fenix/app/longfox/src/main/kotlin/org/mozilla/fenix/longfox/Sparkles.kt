/*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

package org.mozilla.fenix.longfox

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.star
import androidx.graphics.shapes.toPath
import org.mozilla.fenix.longfox.GameState.Companion.CELL_SIZE_DP
import org.mozilla.fenix.longfox.SparkleConstants.MAX_SPARKLE_SIZE_PX
import kotlin.random.Random

internal object SparkleConstants {
    const val MAX_SPARKLE_SIZE_PX = 100f
}

/**
 * Show a sparkle effect around the fox's head
 *
 * @param headCentre centre of the fox's head in canvas pixels
 * @param numCells number of cells in the game grid, used to size the overlay canvas
 * @param active whether sparkles should be animating
 */
@Composable
fun Sparkles(headCentre: Offset, numCells: Int, active: Boolean) {
    val progress by animateFloatAsState(
        targetValue = if (active) 1f else 0f,
        animationSpec = tween(durationMillis = 1000),
        label = "sparkles",
    )

    val stars = remember { mutableStateListOf<Star>() }

    LaunchedEffect(active) {
        if (active) {
            repeat(5) { stars.add(makeStar(headCentre.x, headCentre.y)) }
        } else {
            stars.clear()
        }
    }

    Canvas(modifier = Modifier.size((CELL_SIZE_DP * numCells).dp)) {
        stars.forEach { drawStar(it, progress) }
    }
}

data class Star(
    val startCentreX: Float,
    val startCentreY: Float,
    val endCentreX: Float,
    val endCentreY: Float,
)

private fun makeStar(baseCentreX: Float, baseCentreY: Float): Star {
    val startCentreX = baseCentreX + ((Random.nextFloat() * 2 - 1) * MAX_SPARKLE_SIZE_PX)
    val startCentreY = baseCentreY + ((Random.nextFloat() * 2 - 1) * MAX_SPARKLE_SIZE_PX)
    val endCentreX = startCentreX + ((Random.nextFloat() * 2 - 1) * MAX_SPARKLE_SIZE_PX)
    val endCentreY = startCentreY + ((Random.nextFloat() * 2 - 1) * MAX_SPARKLE_SIZE_PX)
    return Star(
        startCentreX = startCentreX,
        startCentreY = startCentreY,
        endCentreX = endCentreX,
        endCentreY = endCentreY,
    )
}

private fun DrawScope.drawStar(star: Star, progress: Float) {
    val radius = MAX_SPARKLE_SIZE_PX / 2 * (0.2f + (0.8f * progress))
    val alpha = (1f - progress).coerceIn(0f, 1f)
    val centreX = star.startCentreX + progress * (star.endCentreX - star.startCentreX)
    val centreY = star.startCentreY + progress * (star.endCentreY - star.startCentreY)
    val starPolygon = RoundedPolygon.star(
        numVerticesPerRadius = 5,
        innerRadius = 1f,
        radius = radius,
        innerRounding = CornerRounding(radius),
        centerX = centreX,
        centerY = centreY,
    )
    val starPath = starPolygon.toPath().asComposePath()
    drawPath(starPath, color = Color.Yellow, alpha = alpha)
}

@Preview
@Composable
fun SparklesPreview() {
    MaterialTheme {
        val stars = remember { mutableStateListOf<Star>() }
        Canvas(modifier = Modifier.size((CELL_SIZE_DP * 20).dp)) {
            repeat(5) { stars.add(makeStar(size.width / 2, size.height / 2)) }
            stars.forEach { drawStar(it, 0.5f) }
        }
    }
}

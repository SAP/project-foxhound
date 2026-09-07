/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Slider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.tooling.preview.Preview
import org.mozilla.fenix.longfox.HappyFaceConstants.FACE_COUNT
import org.mozilla.fenix.longfox.HappyFaceConstants.MAX_FACE_SIZE_PX
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

internal object HappyFaceConstants {
    const val MAX_FACE_SIZE_PX = 400f
    const val FACE_COUNT = 20
}

internal fun DrawScope.scoreCelebration(centrePoint: Offset, progress: Float, angles: FloatArray) {
    if (progress <= 0f) return
    val travelDistance = maxOf(size.width, size.height) * 0.6f
    angles.forEach { angle ->
        val face = HappyFace(
            startCentreX = centrePoint.x,
            startCentreY = centrePoint.y,
            endCentreX = centrePoint.x + cos(angle) * travelDistance,
            endCentreY = centrePoint.y + sin(angle) * travelDistance,
        )
        drawHappyFace(face, progress)
    }
}

private fun DrawScope.drawHappyFace(happyFace: HappyFace, progress: Float) {
    val radius = MAX_FACE_SIZE_PX / 2 * (0.1f + (0.9f * progress))
    val alpha = ((1f - progress) / 0.5f).coerceIn(0f, 1f)
    val centreX = happyFace.startCentreX + progress * (happyFace.endCentreX - happyFace.startCentreX)
    val centreY = happyFace.startCentreY + progress * (happyFace.endCentreY - happyFace.startCentreY)
    val eyeRadius: Float = radius / 6
    val eyeSpacing: Float = 2 * eyeRadius
    val smileRadius: Float = radius / 2
    val smileSize: Float = smileRadius * 2
    drawCircle(
        color = Color.Yellow,
        radius = radius,
        center = Offset(centreX, centreY),
        alpha = alpha,
    )
    drawCircle(
        color = Color.Black,
        radius = eyeRadius,
        center = Offset(centreX - eyeSpacing, centreY - eyeRadius),
        alpha = alpha,
    )
    drawCircle(
        color = Color.Black,
        radius = eyeRadius,
        center = Offset(centreX + eyeSpacing, centreY - eyeRadius),
        alpha = alpha,
    )
    drawArc(
        color = Color.Black,
        topLeft = Offset(centreX - smileRadius, centreY - smileRadius / 2),
        size = Size(smileSize, smileSize),
        useCenter = false,
        startAngle = 0f,
        sweepAngle = 180f,
        alpha = alpha,
    )
}

data class HappyFace(
    val startCentreX: Float,
    val startCentreY: Float,
    val endCentreX: Float,
    val endCentreY: Float,
)

@Preview
@Composable
fun ScoreCelebrationPreview() {
    var progress by remember { mutableFloatStateOf(0.5f) }
    val angles = remember {
        val random = Random(42)
        FloatArray(FACE_COUNT) { random.nextFloat() * 2f * PI.toFloat() }
    }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .drawBehind {
                scoreCelebration(
                    centrePoint = Offset(size.width / 2, size.height / 2),
                    progress = progress,
                    angles = angles,
                )
            }
    ) {
        Slider(value = progress, onValueChange = { progress = it})
    }
}

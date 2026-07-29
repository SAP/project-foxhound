/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.animation.core.EaseOutCirc
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.BoxWithConstraintsScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import org.mozilla.fenix.longfox.HappyFaceConstants.FACE_COUNT
import kotlin.math.PI
import kotlin.random.Random

/**
 * Background for the game screen: draws the brick pattern and animates the score celebration.
 * @param shouldCelebrate whether a score celebration is active
 * @param celebrationSeed seed for the celebration's random face directions, fixed per celebration
 * @param content the game content, laid out inside a [androidx.compose.foundation.layout.BoxWithConstraints]
 */
@Composable
fun GameBackground(
    shouldCelebrate: Boolean,
    celebrationSeed: Int,
    content: @Composable BoxWithConstraintsScope.() -> Unit,
) {
    val celebrationProgress = animateFloatAsState(
        targetValue = if (shouldCelebrate) 1f else 0f,
        animationSpec = if (shouldCelebrate) tween(
            durationMillis = 1000,
            easing = EaseOutCirc
        ) else snap(),
        label = "celebration",
    )
    val celebrationAngles = remember(celebrationSeed) {
        val random = Random(celebrationSeed)
        FloatArray(FACE_COUNT) { random.nextFloat() * 2f * PI.toFloat() }
    }
    BoxWithConstraints(
        modifier = Modifier.Companion
            .fillMaxSize()
            .drawBehind {
                brickPattern()
                scoreCelebration(
                    centrePoint = Offset(size.width / 2, size.height / 2),
                    progress = celebrationProgress.value,
                    angles = celebrationAngles,
                )
            },
        content = content,
    )
}

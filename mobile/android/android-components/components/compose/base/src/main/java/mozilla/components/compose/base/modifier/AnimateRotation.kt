/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.modifier

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import mozilla.components.compose.base.theme.AcornTheme
import kotlin.math.ceil
import mozilla.components.ui.icons.R as iconsR

/**
 * Default animation duration in milliseconds.
 * If it is set to a low number, the speed of the rotation will be higher.
 */
private const val DEFAULT_ANIMATION_DURATION_MS = 2000

private const val NO_ROTATION = 0f
private const val FULL_ROTATION = 360f
private const val HALF_ROTATION = 180f

/**
 * Adds a rotation animation to a composable, which can be toggled on and off.
 *
 * @param animate When true, the rotation animation is active. When it becomes false, the rotation
 * smoothly animates to the nearest 180-degree angle.
 * @param durationMillis Duration of one full rotation in milliseconds. Default is [DEFAULT_ANIMATION_DURATION_MS].
 */
fun Modifier.animateRotation(
    animate: Boolean = true,
    durationMillis: Int = DEFAULT_ANIMATION_DURATION_MS,
) = composed {
    val rotation = remember { Animatable(NO_ROTATION) }

    LaunchedEffect(animate) {
        if (animate) {
            rotation.animateTo(
                targetValue = rotation.value + FULL_ROTATION,
                animationSpec = infiniteRepeatable(
                    animation = tween(durationMillis, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart,
                ),
            )
        } else {
            // When stopping the animation, we want to smoothly animate to the nearest 180-degree angle.
            val currentRotation = rotation.value
            val targetRotation = ceil(currentRotation / HALF_ROTATION) * HALF_ROTATION
            val leftover = targetRotation - currentRotation

            if (leftover > 0f) {
                val remainingTime = leftover * durationMillis / FULL_ROTATION
                rotation.animateTo(
                    targetValue = targetRotation,
                    animationSpec = tween(
                        durationMillis = remainingTime.toInt(),
                        easing = LinearEasing,
                    ),
                )
            }
        }
    }

    Modifier.rotate(rotation.value)
}

@Preview
@Composable
private fun AnimateRotationPreview() {
    var syncing by remember { mutableStateOf(false) }
    AcornTheme {
        Button(onClick = { syncing = !syncing }) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_sync_24),
                contentDescription = null,
                modifier = Modifier.animateRotation(
                    animate = syncing,
                ),
            )
        }
    }
}

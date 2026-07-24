/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.button

import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.material3.FloatingActionButtonElevation
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.theme.AcornTheme
import androidx.compose.material3.FloatingActionButton as M3FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults as M3FloatingActionButtonDefaults
import mozilla.components.ui.icons.R as iconsR

/**
 * Extended FAB
 *
 * A FAB with the ability to collapse and expand based on [expanded]. When [expanded] is updated,
 * the [label] and the size of the FAB will be animated.
 *
 * https://m3.material.io/components/extended-fab/overview
 * https://www.figma.com/design/MjufE1X5fvkxZ0YneX4kRd/Android-Library--2025-?node-id=63872-4518
 *
 * @param label The label displayed inside this FAB.
 * @param icon The icon displayed inside this FAB.
 * @param contentDescription The text used by accessibility services to describe what this FAB's icon
 * represents.
 * @param onClick Invoked when this FAB is clicked.
 * @param modifier the [Modifier] to be applied to this FAB.
 * @param expanded Controls the expansion state of this FAB. In an expanded state, the FAB will
 * show both the icon and text. In a collapsed state, the FAB will show only the icon.
 * @param colors The [FloatingActionButtonColors] used to color this FAB.
 * @param elevation  [FloatingActionButtonElevation] used to resolve the elevation for this FAB in
 * different states. This controls the size of the shadow below the FAB.
 */
@Composable
fun ExtendedFloatingActionButton(
    label: String,
    @DrawableRes icon: Int,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    expanded: Boolean = true,
    colors: FloatingActionButtonColors = FloatingActionButtonDefaults.colorsPrimary(),
    elevation: FloatingActionButtonElevation = M3FloatingActionButtonDefaults.elevation(),
) = ExtendedFloatingActionButton(
    label = label,
    onClick = onClick,
    modifier = modifier,
    expanded = expanded,
    colors = colors,
    elevation = elevation,
) {
    Icon(
        painter = painterResource(id = icon),
        contentDescription = contentDescription,
    )
}

/**
 * Extended FAB
 *
 * A FAB with the ability to collapse and expand based on [expanded]. When [expanded] is updated,
 * the [label] and the size of the FAB will be animated.
 *
 * https://m3.material.io/components/extended-fab/overview
 * https://www.figma.com/design/MjufE1X5fvkxZ0YneX4kRd/Android-Library--2025-?node-id=63872-4518
 *
 * @param label The label displayed inside this FAB.
 * @param icon The icon displayed inside this FAB.
 * @param onClick Invoked when this FAB is clicked.
 * @param modifier the [Modifier] to be applied to this FAB.
 * @param expanded Controls the expansion state of this FAB. In an expanded state, the FAB will
 * show both the icon and text. In a collapsed state, the FAB will show only the icon.
 * @param colors The [FloatingActionButtonColors] used to color this FAB.
 * @param elevation  [FloatingActionButtonElevation] used to resolve the elevation for this FAB in
 * different states. This controls the size of the shadow below the FAB.
 */
@Composable
fun ExtendedFloatingActionButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    expanded: Boolean = true,
    colors: FloatingActionButtonColors = FloatingActionButtonDefaults.colorsPrimary(),
    elevation: FloatingActionButtonElevation = M3FloatingActionButtonDefaults.elevation(),
    icon: @Composable () -> Unit,
) {
    M3FloatingActionButton(
        onClick = onClick,
        modifier = modifier,
        containerColor = colors.containerColor,
        contentColor = colors.contentColor,
        elevation = elevation,
    ) {
        Row(
            modifier = Modifier
                .thenConditional(Modifier.sizeIn(minWidth = ExtendedFabMinimumWidth)) { expanded }
                .padding(AcornTheme.layout.space.static200),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = if (expanded) Arrangement.Start else Arrangement.Center,
        ) {
            icon()

            AnimatedVisibility(
                visible = expanded,
                enter = ExtendedFabExpandAnimation,
                exit = ExtendedFabCollapseAnimation,
            ) {
                Row(Modifier.clearAndSetSemantics {}) {
                    Spacer(Modifier.width(AcornTheme.layout.space.static150))

                    Text(
                        text = label,
                        modifier = Modifier
                            .animateContentSize()
                            .padding(end = AcornTheme.layout.space.static100),
                        style = AcornTheme.typography.button,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Preview
@Composable
private fun ExtendedFloatingActionButtonPreview() {
    var expanded by remember { mutableStateOf(true) }

    AcornTheme {
        ExtendedFloatingActionButton(
            label = "Primary",
            icon = iconsR.drawable.mozac_ic_plus_24,
            contentDescription = "content description",
            onClick = { expanded = !expanded },
            expanded = expanded,
        )
    }
}

@Preview
@Composable
private fun CollapsedFloatingActionButtonPreview() {
    var expanded by remember { mutableStateOf(false) }

    AcornTheme {
        ExtendedFloatingActionButton(
            label = "Primary",
            icon = iconsR.drawable.mozac_ic_plus_24,
            contentDescription = "content description",
            onClick = { expanded = !expanded },
            expanded = expanded,
        )
    }
}

@Preview
@Composable
private fun SurfaceExtendedFloatingActionButtonPreview() {
    var expanded by remember { mutableStateOf(true) }

    AcornTheme {
        ExtendedFloatingActionButton(
            label = "Surface",
            icon = iconsR.drawable.mozac_ic_plus_24,
            contentDescription = "content description",
            onClick = { expanded = !expanded },
            expanded = expanded,
            colors = FloatingActionButtonDefaults.colorsSurface(),
        )
    }
}

@Preview
@Composable
private fun CustomExtendedFloatingActionButtonPreview() {
    var expanded by remember { mutableStateOf(true) }

    AcornTheme {
        ExtendedFloatingActionButton(
            label = "Surface",
            icon = iconsR.drawable.mozac_ic_plus_24,
            contentDescription = "content description",
            onClick = { expanded = !expanded },
            expanded = expanded,
            colors = FloatingActionButtonColors(
                containerColor = MaterialTheme.colorScheme.secondary,
                contentColor = MaterialTheme.colorScheme.onSecondary,
            ),
        )
    }
}

/**
 * This is lifted from [androidx.compose.material3.ExtendedFloatingActionButton].
 * In order to have the padding values customizable, we needed to reimplement the animation spec.
 *
 * The values were obtained from an internal Material palette of animation tokens, MotionTokens.
 */
private val ExtendedFabMinimumWidth = 80.dp
private val EasingEmphasizedCubicBezier = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)
private val EasingLinearCubicBezier = CubicBezierEasing(0.0f, 0.0f, 1.0f, 1.0f)

private val ExtendedFabCollapseAnimation =
    fadeOut(
        animationSpec =
            tween(
                durationMillis = 100,
                easing = EasingLinearCubicBezier,
            ),
    ) +
        shrinkHorizontally(
            animationSpec =
                tween(
                    durationMillis = 500,
                    easing = EasingEmphasizedCubicBezier,
                ),
            shrinkTowards = Alignment.Start,
        )

private val ExtendedFabExpandAnimation =
    fadeIn(
        animationSpec =
            tween(
                durationMillis = 200,
                delayMillis = 100,
                easing = EasingLinearCubicBezier,
            ),
    ) +
        expandHorizontally(
            animationSpec =
                tween(
                    durationMillis = 500,
                    easing = EasingEmphasizedCubicBezier,
                ),
            expandFrom = Alignment.Start,
        )

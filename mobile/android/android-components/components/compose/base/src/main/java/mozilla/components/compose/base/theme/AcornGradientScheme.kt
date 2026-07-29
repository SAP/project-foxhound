/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.utils.ColorStop
import mozilla.components.compose.base.utils.LinearGradientBrush
import mozilla.components.ui.colors.NovaColors

private const val CFR_GRADIENT_ANGLE = 135f
private const val ACCENT_GRADIENT_ANGLE = 96f

/**
 * The types of gradients that are provided in the Acorn design system.
 */
@Immutable
sealed interface AcornGradientType {

    /**
     * A linear gradient with a specified [angleInDegrees].
     *
     * @property angleInDegrees Angle of the gradient axis.
     */
    data class Linear(val angleInDegrees: Float) : AcornGradientType
}

/**
 * A gradient token.
 *
 * @property type The gradient type.
 * @property colorStops The [ColorStop]s that make up the gradient.
 */
@Immutable
data class AcornGradient(
    val type: AcornGradientType,
    val colorStops: List<ColorStop>,
) {
    /**
     * A [Brush] that paints the current gradient.
     */
    val brush: Brush = when (type) {
        is AcornGradientType.Linear -> LinearGradientBrush(
            colorStops = colorStops,
            angleInDegrees = type.angleInDegrees,
        )
    }
}

/**
 * Gradient tokens from the Acorn design system.
 *
 * @param cfr CFR background.
 * @param accent More prominent gradient color against surface, for bold brand accents.
 * @param accentSubtle Less prominent gradient color against surface, for subtle brand accents.
 * @param tabOutline Border around active tabs.
 */
@Immutable
data class AcornGradientScheme(
    val cfr: AcornGradient,
    val accent: AcornGradient,
    val accentSubtle: AcornGradient,
    val tabOutline: AcornGradient,
)

private val cfr = AcornGradient(
    type = AcornGradientType.Linear(angleInDegrees = CFR_GRADIENT_ANGLE),
    colorStops = listOf(
        ColorStop(0f, NovaColors.Violet60),
        ColorStop(1f, NovaColors.Violet50),
    ),
)

private val darkAccent = AcornGradient(
    type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
    colorStops = listOf(
        ColorStop(0f, NovaColors.Violet30),
        ColorStop(0.71f, NovaColors.Violet50),
    ),
)

private val tabOutline = AcornGradient(
    type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
    colorStops = listOf(
        ColorStop(0f, NovaColors.Violet30),
        ColorStop(0.71f, NovaColors.Violet50),
    ),
)

val lightAcornGradientScheme = AcornGradientScheme(
    cfr = cfr,
    accent = AcornGradient(
        type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
        colorStops = listOf(
            ColorStop(0f, NovaColors.Violet30),
            ColorStop(0.71f, NovaColors.Orange30),
        ),
    ),
    accentSubtle = AcornGradient(
        type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
        colorStops = listOf(
            ColorStop(0.4f, NovaColors.Violet10A50),
            ColorStop(1f, NovaColors.Orange10A50),
        ),
    ),
    tabOutline = tabOutline,
)

val darkAcornGradientScheme = AcornGradientScheme(
    cfr = cfr,
    accent = darkAccent,
    accentSubtle = AcornGradient(
        type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
        colorStops = listOf(
            ColorStop(0.4f, NovaColors.VioletDesaturated90A50),
            ColorStop(1f, NovaColors.Orange70A50),
        ),
    ),
    tabOutline = tabOutline,
)

val privateAcornGradientScheme = AcornGradientScheme(
    cfr = cfr,
    accent = darkAccent,
    accentSubtle = AcornGradient(
        type = AcornGradientType.Linear(angleInDegrees = ACCENT_GRADIENT_ANGLE),
        colorStops = listOf(
            ColorStop(0.4f, NovaColors.VioletDesaturated90),
            ColorStop(1f, NovaColors.VioletDesaturated90),
        ),
    ),
    tabOutline = tabOutline,
)

internal val localAcornGradients = staticCompositionLocalOf {
    lightAcornGradientScheme
}

@Composable
private fun GradientSwatch(gradient: AcornGradient) {
    Surface {
        Box(
            modifier = Modifier
                .padding(AcornTheme.layout.space.static200)
                .size(80.dp)
                .background(
                    brush = gradient.brush,
                    shape = MaterialTheme.shapes.large,
                ),
        )
    }
}

@PreviewLightDark
@Composable
private fun CfrGradientPreview() {
    AcornTheme {
        GradientSwatch(gradient = AcornTheme.gradients.cfr)
    }
}

@PreviewLightDark
@Composable
private fun AccentGradientPreview() {
    AcornTheme {
        GradientSwatch(gradient = AcornTheme.gradients.accent)
    }
}

@PreviewLightDark
@Composable
private fun AccentSubtleGradientPreview() {
    AcornTheme {
        GradientSwatch(gradient = AcornTheme.gradients.accentSubtle)
    }
}

@PreviewLightDark
@Composable
private fun TabOutlineGradientPreview() {
    AcornTheme {
        GradientSwatch(gradient = AcornTheme.gradients.tabOutline)
    }
}

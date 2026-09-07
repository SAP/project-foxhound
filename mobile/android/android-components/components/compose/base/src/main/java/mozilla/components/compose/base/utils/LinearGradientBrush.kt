/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.utils

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.LinearGradientShader
import androidx.compose.ui.graphics.Shader
import androidx.compose.ui.graphics.ShaderBrush
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/**
 * A [ShaderBrush] that renders a linear gradient at a specified angle.
 *
 * @param colorStops The list [ColorStop]s that make up the gradient containing the color stop
 * position in percentage represented as a float and the color.
 * @param angleInDegrees Angle of the gradient axis.
 */
class LinearGradientBrush(
    private val colorStops: List<ColorStop>,
    private val angleInDegrees: Float,
) : ShaderBrush() {
    override fun createShader(size: Size): Shader {
        // The Acorn gradient token specs are provided as CSS linear-gradient() where the angle
        // starts at 0° = top and increases clockwise. We use the CSS linear-gradient algorithm
        // provided by https://www.w3.org/TR/css-images-3/#linear-gradients to get the "from" and
        // "to" offsets.
        val radians = Math.toRadians(angleInDegrees.toDouble())
        val sinA = sin(radians).toFloat()
        val cosA = cos(radians).toFloat()

        // The length of the gradient line formula provided by the spec linked above.
        val length = (abs(size.width * sinA) + abs(size.height * cosA))
        val halfLength = length / 2f

        // dx and dy represents how much of the gradient direction is horizontal and vertical
        // respectively. Android y-axis runs vertically downward so we need to negate for dy.
        val dx = sinA
        val dy = -cosA

        // The gradient line is centered at centerX and centerY.
        val centerX = size.width / 2f
        val centerY = size.height / 2f

        // Calculate the start "from" and end "to" offset from the center of the gradient based on
        // the x and y direction vectors multiplied by the halfLength from the center of the box.
        val from = Offset(centerX - dx * halfLength, centerY - dy * halfLength)
        val to = Offset(centerX + dx * halfLength, centerY + dy * halfLength)

        return LinearGradientShader(
            from = from,
            to = to,
            colors = colorStops.map { it.color },
            colorStops = colorStops.map { it.position },
        )
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard

import android.content.res.TypedArray
import androidx.annotation.StyleableRes
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext

/**
 * Colors used to theme [TrackerProtectionDashboard].
 *
 * @param background The background color of the card.
 * @param textPrimary The primary text color.
 * @param textSecondary The secondary text color for subtitles.
 * @param textAccent The accent text color for the tracker count.
 * @param chipBackground The background color of the data saved chip.
 * @param chipText The text color of the data saved chip.
 * @param progressBar The color of the progress bar in the tracker breakdown.
 * @param gradientStart The start color of the header gradient.
 * @param gradientEnd The end color of the header gradient.
 */
internal data class ProtectionsDashboardColors(
    val chipBackground: Color,
    val chipText: Color,
    val progressBar: Color,
    val gradientStart: Color,
    val gradientEnd: Color,
)

@Composable
internal fun rememberProtectionsDashboardColors(): ProtectionsDashboardColors {
    val context = LocalContext.current
    val uiMode = LocalConfiguration.current.uiMode

    return remember(context, uiMode) {
        context.obtainStyledAttributes(R.styleable.ProtectionsDashboard).let { attrs ->
            try {
                ProtectionsDashboardColors(
                    chipBackground = attrs.getRequiredColor(
                        R.styleable.ProtectionsDashboard_mozacProtectionsDashboardChipBackground,
                        "mozacProtectionsDashboardChipBackground",
                    ),
                    chipText = attrs.getRequiredColor(
                        R.styleable.ProtectionsDashboard_mozacProtectionsDashboardChipText,
                        "mozacProtectionsDashboardChipText",
                    ),
                    progressBar = attrs.getRequiredColor(
                        R.styleable.ProtectionsDashboard_mozacProtectionsDashboardProgressBar,
                        "mozacProtectionsDashboardProgressBar",
                    ),
                    gradientStart = attrs.getRequiredColor(
                        R.styleable.ProtectionsDashboard_mozacProtectionsDashboardGradientStart,
                        "mozacProtectionsDashboardGradientStart",
                    ),
                    gradientEnd = attrs.getRequiredColor(
                        R.styleable.ProtectionsDashboard_mozacProtectionsDashboardGradientEnd,
                        "mozacProtectionsDashboardGradientEnd",
                    ),
                )
            } finally {
                attrs.recycle()
            }
        }
    }
}

private fun TypedArray.getRequiredColor(
    @StyleableRes index: Int,
    attrName: String,
): Color {
    check(hasValue(index)) {
        "Missing required ProtectionsDashboard theme attribute: $attrName"
    }

    return Color(getColor(index, Color.Unspecified.toArgb()))
}

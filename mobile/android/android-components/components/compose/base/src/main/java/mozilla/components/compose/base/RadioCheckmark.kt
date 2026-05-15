/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.ui.icons.R as iconsR

private val borderWidthDp = 1.5.dp

/**
 * UI for a radio checkmark. Also known as an option button.
 *
 * @param isSelected Whether the radio checkmark is selected or not.
 * @param modifier [Modifier] to be applied to the radio checkmark.
 * @param colors [RadioCheckmarkColors] to use for styling the radio checkmark.
 */
@Composable
fun RadioCheckmark(
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    colors: RadioCheckmarkColors = RadioCheckmarkColors.default(),
) {
    val boxBorderModifier = if (isSelected) {
        modifier
            .clip(CircleShape)
            .background(colors.backgroundColor)
    } else {
        modifier.border(
            width = borderWidthDp,
            color = colors.borderColor,
            shape = CircleShape,
        )
    }

    Box(
        modifier = boxBorderModifier.size(size = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (isSelected) {
            Icon(
                painter = painterResource(iconsR.drawable.mozac_ic_checkmark_16),
                contentDescription = null,
                tint = colors.checkmarkColor,
            )
        }
    }
}

/**
 * [Color]s to use for styling [RadioCheckmark].
 *
 * @property backgroundColor The color for the background.
 * @property checkmarkColor The color for the checkmark.
 * @property borderColor The color for the border.
 */
data class RadioCheckmarkColors(
    val backgroundColor: Color,
    val checkmarkColor: Color,
    val borderColor: Color,
) {

    /**
     * @see [RadioCheckmarkColors].
     */
    companion object {

        /**
         * The default colors for [RadioCheckmark].
         */
        @ReadOnlyComposable
        @Composable
        fun default(
            backgroundColor: Color = MaterialTheme.colorScheme.primary,
            checkmarkColor: Color = MaterialTheme.colorScheme.onPrimary,
            borderColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
        ) = RadioCheckmarkColors(
            backgroundColor = backgroundColor,
            checkmarkColor = checkmarkColor,
            borderColor = borderColor,
        )
    }
}

@Composable
@PreviewLightDark
private fun SelectedRadioCheckmarkPreview() {
    RadioCheckmark(isSelected = true)
}

@Composable
@PreviewLightDark
private fun UnselectedRadioCheckmarkPreview() {
    RadioCheckmark(isSelected = false)
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.badge

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.ui.icons.R as iconsR

private val CheckmarkBadgeSize = 20.dp

/**
 * A checkmark badge.
 *
 * @param contentDescription Content Description of the composable.
 * @param modifier [Modifier] to be applied to the badge.
 * @param colors [CheckmarkBadgeColors] to use for styling the badge.
 */
@Composable
fun CheckmarkBadge(
    contentDescription: String?,
    modifier: Modifier = Modifier,
    colors: CheckmarkBadgeColors = CheckmarkBadgeColors.default(),
) {
    Box(
        modifier = modifier
            .size(CheckmarkBadgeSize)
            .clip(CircleShape)
            .background(colors.containerColor),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painter = painterResource(iconsR.drawable.mozac_ic_checkmark_16),
            contentDescription = contentDescription,
            tint = colors.checkmarkColor,
        )
    }
}

/**
 * [Color]s to use for styling [CheckmarkBadge].
 *
 * @property containerColor Background [Color] of the badge.
 * @property checkmarkColor Tint [Color] applied to the checkmark icon.
 */
data class CheckmarkBadgeColors(
    val containerColor: Color,
    val checkmarkColor: Color,
) {

    companion object {

        /**
         * Default colors for [CheckmarkBadge].
         */
        @ReadOnlyComposable
        @Composable
        fun default(
            containerColor: Color = MaterialTheme.colorScheme.primary,
            checkmarkColor: Color = MaterialTheme.colorScheme.onPrimary,
        ) = CheckmarkBadgeColors(
            containerColor = containerColor,
            checkmarkColor = checkmarkColor,
        )
    }
}

@Composable
@PreviewLightDark
private fun CheckmarkBadgePreview() {
    AcornTheme {
        Surface {
            CheckmarkBadge(
                contentDescription = null,
                modifier = Modifier.padding(8.dp),
            )
        }
    }
}

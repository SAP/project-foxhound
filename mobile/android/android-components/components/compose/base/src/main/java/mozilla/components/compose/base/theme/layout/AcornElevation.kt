/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.theme.layout

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme

/**
 * A palette of tokens defining the elevation of visual elements styled by the Acorn Design System.
 */
object AcornElevation {

    /**
     * Use when distinct tonal values create surface separation or in conjunction with a scrim
     */
    val level0: Dp = 0.dp

    /**
     * Lowest resting level elevation for cards, etc.
     */
    val level1: Dp = 1.dp

    /**
     * Mid-level resting elevation for tooltips, menus, etc.
     */
    val level2: Dp = 3.dp

    /**
     * Highest resting level elevation for sheets, FABs, etc.
     */
    val level3: Dp = 6.dp

    /**
     * (not assigned as resting level)
     */
    val level4: Dp = 8.dp

    /**
     * (not assigned as resting level)
     */
    val level5: Dp = 12.dp
}

@Composable
private fun ElevationSample(
    tokenName: String,
    elevation: Dp,
) {
    Row(
        modifier = Modifier.padding(all = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(space = 16.dp),
    ) {
        Text(
            text = tokenName,
            style = AcornTheme.typography.headline5,
            modifier = Modifier
                .background(
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    shape = RoundedCornerShape(size = 16.dp),
                )
                .padding(horizontal = 16.dp, vertical = 4.dp),
        )

        Card(
            modifier = Modifier
                .size(80.dp),
            shape = RoundedCornerShape(size = 28.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = elevation),
            colors = CardDefaults.cardColors().copy(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            content = { },
        )
    }
}

@PreviewLightDark
@Composable
private fun ElevationPreview() = AcornTheme {
    Surface {
        Column {
            ElevationSample(tokenName = "Level 0", elevation = AcornElevation.level0)

            ElevationSample(tokenName = "Level 1", elevation = AcornElevation.level1)

            ElevationSample(tokenName = "Level 2", elevation = AcornElevation.level2)

            ElevationSample(tokenName = "Level 3", elevation = AcornElevation.level3)

            ElevationSample(tokenName = "Level 4", elevation = AcornElevation.level4)

            ElevationSample(tokenName = "Level 5", elevation = AcornElevation.level5)
        }
    }
}

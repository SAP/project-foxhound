/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

@Composable
internal fun FlagContainer(
    @DrawableRes flagResId: Int?,
    modifier: Modifier = Modifier,
) {
    val shape = MaterialTheme.shapes.extraSmall
    val containerModifier = modifier
        .border(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant,
            shape = shape,
        )
        .clip(shape)

    // Guard against an unknown country code (resolves to 0) so painterResource doesn't crash,
    // and an empty box is displayed instead.
    if (flagResId == 0 || flagResId == null) {
        Image(
            painter = painterResource(R.drawable.fox_hand_over_eyes),
            contentDescription = null,
            modifier = containerModifier.background(color = PhotonColors.LightGrey40),
        )
        return
    }

    Image(
        painter = painterResource(flagResId),
        contentDescription = null,
        modifier = containerModifier,
    )
}

@PreviewLightDark
@Composable
private fun FlagContainerPreview() {
    FirefoxTheme {
        Surface {
            Row(
                modifier = Modifier.padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                FlagContainer(
                    flagResId = R.drawable.flag_ca,
                    modifier = Modifier.size(width = 60.dp, height = 40.dp),
                )

                FlagContainer(
                    flagResId = R.drawable.flag_us,
                    modifier = Modifier.size(width = 30.dp, height = 20.dp),
                )
                FlagContainer(
                    flagResId = null,
                    modifier = Modifier.size(width = 30.dp, height = 20.dp),
                )
            }
        }
    }
}

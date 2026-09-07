/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

/**
 * A pill-shaped button with a left-pointing chevron on the leading edge.
 *
 * @param onClick Callback invoked when the button is clicked.
 * @param modifier [Modifier] to be applied to the button.
 * @param border Optional [BorderStroke] drawn around the button.
 * @param content The content displayed to the right of the chevron.
 */
@Composable
internal fun LeftChevronPillButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    border: BorderStroke? = null,
    content: @Composable () -> Unit,
) {
    PillButton(
        onClick = onClick,
        modifier = modifier,
        border = border,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(FirefoxTheme.layout.space.static50),
        ) {
            LeftChevronIcon()
            content()
        }
    }
}

/**
 * A pill-shaped button with a right-pointing chevron on the trailing edge.
 *
 * @param onClick Callback invoked when the button is clicked.
 * @param modifier [Modifier] to be applied to the button.
 * @param border Optional [BorderStroke] drawn around the button.
 * @param content The content displayed to the left of the chevron.
 */
@Composable
internal fun RightChevronPillButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    border: BorderStroke? = null,
    content: @Composable () -> Unit,
) {
    PillButton(
        onClick = onClick,
        modifier = modifier,
        border = border,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(FirefoxTheme.layout.space.static50),
        ) {
            content()
            RightChevronIcon()
        }
    }
}

@Composable
private fun PillButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    border: BorderStroke? = null,
    content: @Composable RowScope.() -> Unit,
) {
    Button(
        modifier = modifier,
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.surfaceBright,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
        border = border,
        contentPadding = PaddingValues(all = 4.dp),
        content = content,
    )
}

@Composable
private fun LeftChevronIcon() {
    Icon(
        painter = painterResource(iconsR.drawable.mozac_ic_chevron_right_16),
        tint = MaterialTheme.colorScheme.onSurfaceVariant,
        contentDescription = null,
        modifier = Modifier.graphicsLayer(scaleX = -1f),
    )
}

@Composable
private fun RightChevronIcon() {
    Icon(
        painter = painterResource(iconsR.drawable.mozac_ic_chevron_right_16),
        tint = MaterialTheme.colorScheme.onSurfaceVariant,
        contentDescription = null,
    )
}

@Composable
@FlexibleWindowLightDarkPreview
private fun StoriesScreenPreviews() {
    FirefoxTheme {
        Row(modifier = Modifier.padding(16.dp)) {
            LeftChevronPillButton(onClick = {}) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_reading_list_24),
                    contentDescription = stringResource(R.string.content_description_normal_browsing),
                )
            }
            Spacer(modifier = Modifier.weight(1f))
            RightChevronPillButton(onClick = {}) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_private_mode_24),
                    contentDescription = stringResource(R.string.content_description_normal_browsing),
                )
            }
        }
    }
}

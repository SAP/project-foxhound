/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.modifier.animateRotation
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Animation duration in milliseconds.
 * If it is set to a low number, the speed of the rotation will be higher.
 */
private const val ANIMATION_DURATION_MS = 2000

/**
 * Icon for Download indicator.
 *
 * @param icon [Painter] used to be displayed.
 * @param modifier [Modifier] to be applied to the icon layout.
 * @param tint Tint [Color] to be applied to the icon.
 * @param contentDescription Optional content description for the icon.
 */
@Composable
fun DownloadIconIndicator(
    icon: Painter,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    contentDescription: String? = null,
) {
    Icon(
        painter = icon,
        modifier = modifier.then(
            Modifier
                .animateRotation(animate = true, durationMillis = ANIMATION_DURATION_MS),
        ),
        contentDescription = contentDescription,
        tint = tint,
    )
}

/**
 * Icon for Download In Progress indicator.
 *
 * @param modifier [Modifier] to be applied to the icon layout.
 * @param icon [Painter] used to be displayed.
 * @param tint Tint [Color] to be applied to the icon.
 * @param contentDescription Optional content description for the icon.
 */
@Composable
fun DownloadInProgressIndicator(
    modifier: Modifier = Modifier,
    icon: Painter = painterResource(id = iconsR.drawable.mozac_ic_stop_8),
    tint: Color = MaterialTheme.colorScheme.onSurfaceVariant,
    contentDescription: String? = null,
) {
    Box(
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            modifier = modifier.size(8.dp),
            painter = icon,
            contentDescription = contentDescription,
            tint = tint,
        )
        CircularProgressIndicator(
            modifier = modifier.size(30.dp),
            strokeWidth = 2.dp,
            trackColor = MaterialTheme.colorScheme.secondaryContainer,
            strokeCap = StrokeCap.Butt,
        )
    }
}

/**
 * Download indicator for translations screens.
 * It indicates that the download of the language file is in progress.
 *
 * @param text The button text to be displayed.
 * @param modifier [Modifier] to be applied to the layout.
 * @param contentDescription Content description to be applied to the button.
 * @param icon Optional [Painter] used to display an [Icon] before the button text.
 */
@Composable
fun DownloadIndicator(
    text: String,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    icon: Painter? = null,
) {
    FilledButton(
        text = text,
        modifier = modifier.then(
            Modifier
                .clearAndSetSemantics {
                    role = Role.Button
                    contentDescription?.let { this.contentDescription = contentDescription }
                }
                .wrapContentSize(),
        ),
        icon = icon,
        iconModifier = Modifier
            .animateRotation(animate = true, durationMillis = ANIMATION_DURATION_MS)
            .size(ButtonDefaults.IconSize),
        onClick = {},
    )
}

@Preview
@Composable
private fun DownloadIconIndicatorPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Surface {
            DownloadIconIndicator(
                icon = painterResource(id = iconsR.drawable.mozac_ic_sync_24),
                contentDescription = stringResource(
                    id = R.string.translations_bottom_sheet_translating_in_progress,
                ),
            )
        }
    }
}

@Preview
@Composable
private fun DownloadInProgressIndicatorPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Surface {
            DownloadInProgressIndicator(
                contentDescription = stringResource(
                    id = R.string.translations_bottom_sheet_translating_in_progress,
                ),
            )
        }
    }
}

@Preview
@Composable
private fun DownloadIndicatorPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Surface {
            DownloadIndicator(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                text = stringResource(id = R.string.translations_bottom_sheet_translating_in_progress),
                contentDescription = stringResource(
                    id = R.string.translations_bottom_sheet_translating_in_progress_content_description,
                ),
                icon = painterResource(id = iconsR.drawable.mozac_ic_sync_24),
            )
        }
    }
}

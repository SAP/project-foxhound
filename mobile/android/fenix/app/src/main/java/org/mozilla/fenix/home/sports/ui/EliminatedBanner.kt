/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.Banner
import mozilla.components.compose.base.BannerColors
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.TextButton
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * A banner shown when the user's followed team has been eliminated.
 *
 * @param onRemove Callback invoked when the "Remove" button is tapped.
 * @param onFollowAnotherTeam Callback invoked when the "Follow another team" button is tapped.
 * @param onDismiss Callback invoked when the banner’s close button is clicked.
 * @param modifier The [Modifier] to be applied to the banner container.
 */
@Composable
fun EliminatedBanner(
    onRemove: () -> Unit,
    onFollowAnotherTeam: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Banner(
        modifier = modifier,
        colors = BannerColors.bannerColors(
            backgroundColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            titleTextColor = MaterialTheme.colorScheme.onSurface,
            messageTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
        ),
        title = {
            Text(text = stringResource(R.string.sports_widget_still_want_to_follow))
        },
        message = {
            Text(text = stringResource(R.string.sports_widget_choose_another_team))
        },
        actions = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = FirefoxTheme.layout.size.static150),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(
                    text = stringResource(R.string.sports_widget_skip),
                    onClick = onRemove,
                )

                Spacer(Modifier.width(FirefoxTheme.layout.size.static100))

                FilledButton(
                    text = stringResource(R.string.sports_widget_follow_another_team),
                    onClick = onFollowAnotherTeam,
                )
            }
        },
        onCloseButtonClick = onDismiss,
    )
}

@PreviewLightDark
@Composable
private fun EliminatedBannerPreview() {
    FirefoxTheme {
        Surface {
            EliminatedBanner(
                onRemove = {},
                onFollowAnotherTeam = {},
                onDismiss = {},
                modifier = Modifier.padding(16.dp),
            )
        }
    }
}

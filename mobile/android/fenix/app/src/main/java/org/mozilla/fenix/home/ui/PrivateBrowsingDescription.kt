/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.ui.colors.PhotonColors
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.home.ui.HomepageTestTag.HOMEPAGE_PRIVATE_BROWSING_LEARN_MORE_LINK
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Private Browsing Mode description.
 *
 * @param onLearnMoreClick Invoked when the user clicks on the learn more link.
 */
@Composable
fun PrivateBrowsingDescription(
    onLearnMoreClick: () -> Unit,
) {
    Surface {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_private_mode_72),
                contentDescription = null,
                tint = PhotonColors.White.copy(alpha = 0.3f),
            )

            Text(
                text = stringResource(id = R.string.felt_privacy_desc_card_title),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.headline5,
            )

            Text(
                text = stringResource(
                    id = R.string.felt_privacy_info_card_subtitle_3,
                    stringResource(id = R.string.app_name),
                ),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.subtitle1,
            )

            Box(
                modifier = Modifier.semantics {
                    testTagsAsResourceId = true
                    testTag = HOMEPAGE_PRIVATE_BROWSING_LEARN_MORE_LINK
                },
            ) {
                LinkText(
                    text = stringResource(id = R.string.felt_privacy_info_card_subtitle_link_text),
                    linkTextStates = listOf(
                        LinkTextState(
                            text = stringResource(id = R.string.felt_privacy_info_card_subtitle_link_text),
                            url = "",
                            onClick = { onLearnMoreClick() },
                        ),
                    ),
                    style = FirefoxTheme.typography.subtitle1,
                    linkTextColor = MaterialTheme.colorScheme.onSurface,
                    linkTextDecoration = TextDecoration.Underline,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
@Preview
private fun PrivacyBrowsingDescriptionPreview() {
    FirefoxTheme(theme = Theme.Private) {
        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.surface)
                .fillMaxSize(),
        ) {
            PrivateBrowsingDescription(
                onLearnMoreClick = {},
            )
        }
    }
}

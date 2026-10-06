/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.PromoCard
import mozilla.components.compose.base.PromoCardColors
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.CountrySelectorSource
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Card prompting the user to follow the World Cup.
 *
 * @param onFollowTeam Callback invoked when the "Follow your team" button is tapped.
 * @param modifier The [Modifier] to be applied to the card.
 * @param pageNumber 1-based page position when shown inside a pager; appended to the title for
 * assistive technology.
 * @param pageCount Total page count when inside a pager. Ignored if `pageNumber` is null.
 */
@Composable
fun FollowTeamPromoCard(
    onFollowTeam: (CountrySelectorSource) -> Unit,
    modifier: Modifier = Modifier,
    pageNumber: Int? = null,
    pageCount: Int? = null,
) {
    val sportPainter = painterResource(R.drawable.firefox_sport)
    val titleText = stringResource(R.string.sports_widget_card_title)
    val titleContentDescription = pagerHeadingContentDescription(
        baseText = titleText,
        pageNumber = pageNumber,
        pageCount = pageCount,
    )
    val messagePadding = 80.dp
    val actionPadding = 90.dp
    Box(
        modifier = modifier.background(
            color = MaterialTheme.colorScheme.surfaceContainerLowest,
            shape = MaterialTheme.shapes.large,
        ),
    ) {
        PromoCard(
            closeButtonContentDescription = null,
            modifier = Modifier
                .clip(MaterialTheme.shapes.large)
                .drawBehind {
                    val targetWidth = 120.dp.toPx()
                    val imgSize = sportPainter.intrinsicSize
                    val scaledSize = imgSize * (targetWidth / imgSize.width)
                    val leftOffset = if (layoutDirection == LayoutDirection.Rtl) 0f else size.width - scaledSize.width
                    translate(
                        left = leftOffset,
                        top = size.height - scaledSize.height,
                    ) {
                        with(sportPainter) { draw(scaledSize) }
                    }
                },
            title = {
                Text(
                    text = titleText,
                    modifier = Modifier
                        .padding(end = FirefoxTheme.layout.space.static500)
                        .semantics { contentDescription = titleContentDescription },
                )

                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static50))
            },
            message = {
                Text(
                    text = stringResource(R.string.sports_widget_card_description),
                    modifier = Modifier.padding(end = messagePadding),
                )
            },
            actions = {
                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static150))

                FilledButton(
                    text = stringResource(R.string.sports_widget_country_selector_title),
                    onClick = { onFollowTeam(CountrySelectorSource.KEEP_TABS_CARD_FOLLOW_TEAM_BUTTON) },
                    modifier = Modifier.padding(end = actionPadding),
                )
            },
            contentSpacing = 0.dp,
            colors = PromoCardColors.promoCardColors(backgroundColor = Color.Transparent),
        )
    }
}

@PreviewLightDark
@Composable
private fun FollowTeamPromoCardPreview() {
    FirefoxTheme {
        Surface {
            FollowTeamPromoCard(
                onFollowTeam = {},
                modifier = Modifier.padding(16.dp),
            )
        }
    }
}

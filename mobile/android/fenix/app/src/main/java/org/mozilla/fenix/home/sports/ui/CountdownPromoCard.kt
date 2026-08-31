/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
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
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * Card counting down to kickoff and prompting the user to pick a team to follow.
 *
 * @param dateInUtc ISO 8601 UTC date string (e.g. "2025-06-28T14:00:00Z") remaining until kickoff.
 * @param actionButtonLabelResId The string resource displayed on the action button.
 * @param onClick Callback invoked when the action button is tapped.
 * @param onDismiss Callback invoked when the close button is tapped. When it's null, no close button is displayed.
 * @param modifier The [Modifier] to be applied to the card.
 * @param pageNumber 1-based page position when shown inside a pager; appended to the title for
 * assistive technology (e.g. "Countdown to World Cup, page 1 of 2").
 * @param pageCount Total page count when inside a pager. Ignored if `pageNumber` is null.
 */
@Composable
fun CountdownPromoCard(
    dateInUtc: String,
    @StringRes actionButtonLabelResId: Int,
    onClick: () -> Unit,
    onDismiss: (() -> Unit)?,
    modifier: Modifier = Modifier,
    pageNumber: Int? = null,
    pageCount: Int? = null,
) {
    val closeButtonContentDescription = stringResource(R.string.sports_widget_close_content_description)
    val sportPainter = painterResource(R.drawable.firefox_sport)
    val titleText = stringResource(R.string.sports_widget_countdown_to_world_cup)
    val titleContentDescription = pagerHeadingContentDescription(
        baseText = titleText,
        pageNumber = pageNumber,
        pageCount = pageCount,
    )

    Box(
        modifier = modifier.background(
            color = MaterialTheme.colorScheme.surfaceContainerLowest,
            shape = MaterialTheme.shapes.large,
        ),
    ) {
        PromoCard(
            closeButtonContentDescription = closeButtonContentDescription,
            onDismiss = onDismiss,
            modifier = Modifier
                .clip(MaterialTheme.shapes.large)
                .drawBehind {
                    val targetWidth = 150.dp.toPx()
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
                    style = FirefoxTheme.typography.headline7,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .padding(end = FirefoxTheme.layout.space.static500)
                        .semantics { contentDescription = titleContentDescription },
                )
            },
            message = {
                CountdownPill(dateInUtc = dateInUtc)
            },
            actions = {
                FilledButton(
                    text = stringResource(actionButtonLabelResId),
                    onClick = onClick,
                )
            },
            contentSpacing = FirefoxTheme.layout.space.static200,
            colors = PromoCardColors.promoCardColors(
                backgroundColor = Color.Transparent,
            ),
        )
    }
}

@PreviewLightDark
@Composable
private fun CountdownViewSchedulePromoCardPreview() {
    FirefoxTheme {
        Surface {
            CountdownPromoCard(
                dateInUtc = "2026-06-11T19:00:00Z",
                actionButtonLabelResId = R.string.sports_widget_view_schedule,
                onClick = {},
                onDismiss = {},
                modifier = Modifier.padding(16.dp),
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun CountdownFollowTeamPromoCardPreview() {
    FirefoxTheme {
        Surface {
            CountdownPromoCard(
                dateInUtc = "2026-06-11T19:00:00Z",
                actionButtonLabelResId = R.string.sports_widget_country_selector_title,
                onClick = {},
                onDismiss = null,
                modifier = Modifier.padding(16.dp),
            )
        }
    }
}

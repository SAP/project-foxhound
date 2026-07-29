/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.InfoCard
import mozilla.components.compose.base.PromoCard
import mozilla.components.compose.base.PromoCardColors
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.OutlinedButton
import org.mozilla.fenix.R
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.messageResId
import org.mozilla.fenix.home.sports.titleResId
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

/**
 * A warning [InfoCard] shown inside the sports widget when match data cannot be displayed.
 *
 * @param error The [SportCardErrorState] message to display.
 * @param onRefresh Callback invoked when the user taps the "Refresh" link.
 * @param modifier Modifier applied to the card.
 */
@Composable
fun SportsWidgetErrorCard(
    error: SportCardErrorState,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val errorPainter = painterResource(R.drawable.fox_expressive_face_tail)
    Box(
        modifier = modifier.background(
            color = MaterialTheme.colorScheme.primaryContainer,
            shape = MaterialTheme.shapes.large,
        ),
    ) {
        PromoCard(
            modifier = Modifier
                .clip(MaterialTheme.shapes.large)
                .drawBehind {
                    val targetWidth = 120.dp.toPx()
                    val endPadding = 16.dp.toPx()
                    val imgSize = errorPainter.intrinsicSize
                    val scaledSize = imgSize * (targetWidth / imgSize.width)
                    val leftOffset = if (layoutDirection == LayoutDirection.Rtl) {
                        endPadding
                    } else {
                        size.width - scaledSize.width - endPadding
                    }
                    translate(
                        left = leftOffset,
                        top = size.height - scaledSize.height,
                    ) {
                        with(errorPainter) { draw(scaledSize) }
                    }
                },
            title = {
                Text(text = stringResource(error.titleResId))

                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static50))
            },
            message = {
                val paddingEnd = 80.dp
                Text(
                    text = stringResource(error.messageResId),
                    modifier = Modifier.padding(end = paddingEnd),
                )
            },
            actions = {
                Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.static150))

                OutlinedButton(
                    text = stringResource(R.string.sports_widget_error_refresh),
                    icon = painterResource(iconsR.drawable.mozac_ic_arrow_clockwise_24),
                    onClick = onRefresh,
                )
            },
            contentSpacing = 0.dp,
            colors = PromoCardColors.promoCardColors(backgroundColor = Color.Transparent),
        )
    }
}

private class SportsWidgetErrorPreviewProvider :
    PreviewParameterProvider<SportCardErrorState> {
    override val values = SportCardErrorState.entries.asSequence()
}

@FlexibleWindowLightDarkPreview
@Composable
private fun SportsWidgetErrorCardPreview(
    @PreviewParameter(SportsWidgetErrorPreviewProvider::class) error: SportCardErrorState,
) {
    FirefoxTheme {
        Surface {
            SportsWidgetErrorCard(
                error = error,
                onRefresh = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
            )
        }
    }
}

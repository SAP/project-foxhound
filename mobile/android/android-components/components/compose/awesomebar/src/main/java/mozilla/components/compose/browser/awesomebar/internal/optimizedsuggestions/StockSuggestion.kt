/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.optimizedsuggestions

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.privateColorPalette
import mozilla.components.compose.base.theme.success
import mozilla.components.compose.browser.awesomebar.R
import mozilla.components.compose.browser.awesomebar.internal.utils.StockSuggestionDataProvider
import mozilla.components.compose.browser.awesomebar.internal.utils.StockSuggestionPreviewModel
import mozilla.components.concept.awesomebar.AwesomeBar.ChangePercent
import mozilla.components.ui.icons.R as iconsR

@Composable
internal fun StockSuggestion(
    ticker: String,
    name: String,
    index: String,
    lastPrice: String,
    changePercent: ChangePercent,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .background(color = MaterialTheme.colorScheme.surface)
            .clickable(enabled = true, onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(
                horizontal = AcornTheme.layout.space.static200,
                vertical = AcornTheme.layout.space.static300,
            ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val changePercentColor = getChangePercentColor(changePercent)
            val changeDescription = getChangeDescription(changePercent)
            val changePercentText = "${changePercent.value}%"

            StocksSuggestionIcon(
                changePercent = changePercent,
                changePercentColor = changePercentColor,
            )

            Column(
                modifier = Modifier
                    .padding(start = 8.dp)
                    .clearAndSetSemantics {
                        this.contentDescription = "$ticker. $changeDescription. $name. $index. $lastPrice"
                    },
            ) {
                Row {
                    Text(
                        text = buildAnnotatedString {
                            val baseStyle = AcornTheme.typography.headline7.toSpanStyle()
                            withStyle(baseStyle.copy(color = MaterialTheme.colorScheme.onSurface)) {
                                append("$ticker · ")
                            }

                            withStyle(baseStyle.copy(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                append(name)
                            }
                        },
                        overflow = TextOverflow.Ellipsis,
                        maxLines = 1,
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 16.dp),
                    )

                    Text(
                        text = lastPrice,
                        style = AcornTheme.typography.headline7,
                        maxLines = 1,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }

                Row {
                    Text(
                        text = index,
                        style = AcornTheme.typography.body2,
                        overflow = TextOverflow.Ellipsis,
                        maxLines = 1,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier
                            .weight(1f)
                            .padding(end = 16.dp),
                    )

                    Text(
                        text = changePercentText,
                        style = AcornTheme.typography.headline7,
                        maxLines = 1,
                        color = changePercentColor,
                    )
                }
            }
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
    }
}

@Composable
private fun StocksSuggestionIcon(
    changePercent: ChangePercent,
    changePercentColor: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(color = changePercentColor),
        contentAlignment = Alignment.Center,
    ) {
        if (changePercent != ChangePercent.Neutral) {
            Icon(
                painter = when (changePercent) {
                    is ChangePercent.Positive -> painterResource(iconsR.drawable.mozac_ic_arrow_trending_up_24)
                    is ChangePercent.Negative -> painterResource(iconsR.drawable.mozac_ic_arrow_trending_down_24)
                },
                tint = MaterialTheme.colorScheme.onPrimary,
                contentDescription = null,
            )
        } else {
            HorizontalDivider(
                thickness = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.width(20.dp),
            )
        }
    }
}

@Composable
private fun getChangePercentColor(changePercent: ChangePercent): Color = when (changePercent) {
    is ChangePercent.Positive -> MaterialTheme.colorScheme.success
    is ChangePercent.Negative -> MaterialTheme.colorScheme.error
    is ChangePercent.Neutral -> MaterialTheme.colorScheme.onSurfaceVariant
}

@Composable
private fun getChangeDescription(changePercent: ChangePercent): String = when (changePercent) {
    is ChangePercent.Positive -> stringResource(
        R.string.mozac_browser_awesomebar_stock_suggestion_increase,
        changePercent.value.drop(1),
    )

    is ChangePercent.Negative -> stringResource(
        R.string.mozac_browser_awesomebar_stock_suggestion_decrease,
        changePercent.value.drop(1),
    )

    is ChangePercent.Neutral -> stringResource(R.string.mozac_browser_awesomebar_stock_suggestion_no_change)
}

@PreviewLightDark
@Composable
private fun StockSuggestionPreview(
    @PreviewParameter(StockSuggestionDataProvider::class) config: StockSuggestionPreviewModel,
) {
    AcornTheme {
        Surface {
            StockSuggestion(
                ticker = config.ticker,
                name = config.name,
                index = config.index,
                lastPrice = config.lastPrice,
                changePercent = config.changePercent,
                onClick = config.onClick,
            )
        }
    }
}

@Preview
@Composable
private fun StockSuggestionPreviewPrivate(
    @PreviewParameter(StockSuggestionDataProvider::class) config: StockSuggestionPreviewModel,
) {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Surface {
            StockSuggestion(
                ticker = config.ticker,
                name = config.name,
                index = config.index,
                lastPrice = config.lastPrice,
                changePercent = config.changePercent,
                onClick = config.onClick,
            )
        }
    }
}

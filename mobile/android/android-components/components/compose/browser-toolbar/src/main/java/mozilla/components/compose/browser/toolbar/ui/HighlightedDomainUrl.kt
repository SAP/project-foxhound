/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.ui

import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.content.res.Configuration.UI_MODE_TYPE_NORMAL
import androidx.annotation.VisibleForTesting
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.theme.AcornTheme

/**
 * Base alpha value for the fading gradient.
 * Not being fully opaque can help smooth out the edges of the gradient.
 */
private const val FADE_EFFECT_LAYER_ALPHA = 0.99f

/**
 * Width of the horizontal fade effect in pixels.
 */
private const val FADE_LENGTH_PX = 20

/**
 * How many other characters to try showing to the end of the scrolled to domain
 */
@VisibleForTesting
internal const val END_SCROLL_OFFSET = 1

/**
 * The LTR mark character which will force all other characters following it to be rendered from left to right.
 * See bug 1973915 and related for the context of why we need this.
 */
private const val LTR_MARK = "\u200E"

/**
 * Character count of [LTR_MARK].
 */
private const val LTR_MARK_OFFSET = 1

/**
 * Composable for rendering in URL and highlighting the domain name it contains.
 *
 * @param url The URL to show. It can have any syntax and not necessarily contain a domain name.
 * @param registrableDomainIndexRange The index range of the domain name in [url].
 * @param fadedTextStyle The [TextStyle] for the faded part of the URL - other than the domain.
 * @param boldedTextStyle The [TextStyle] for the bolded part of the URL - the domain.
 * @param modifier [Modifier] to apply to this composable for further customisation.
 * @param fadeLength The [Dp] length of how much of the view to fade to the sides if the url overflows.
 */
@Composable
fun HighlightedDomainUrl(
    url: String,
    registrableDomainIndexRange: Pair<Int, Int>?,
    fadedTextStyle: TextStyle,
    boldedTextStyle: TextStyle,
    modifier: Modifier = Modifier,
    fadeLength: Dp = FADE_LENGTH_PX.dp,
) {
    val registrableDomainIndexRange = registrableDomainIndexRange?.let {
        it.first + LTR_MARK_OFFSET to it.second + LTR_MARK_OFFSET
    }

    val annotatedUrl = remember(url, registrableDomainIndexRange, fadedTextStyle, boldedTextStyle) {
        buildAnnotatedString {
            if (registrableDomainIndexRange != null) {
                withStyle(style = fadedTextStyle.toSpanStyle()) {
                    append(LTR_MARK + url)
                }

                addStyle(
                    style = boldedTextStyle.toSpanStyle(),
                    start = registrableDomainIndexRange.first,
                    end = registrableDomainIndexRange.second,
                )
            } else {
                withStyle(style = boldedTextStyle.toSpanStyle()) {
                    append(LTR_MARK + url)
                }
            }
        }
    }

    Text(
        text = annotatedUrl,
        softWrap = false,
        maxLines = 1,
        modifier = modifier
            .focusTextIndexRange(
                annotatedUrl.text,
                fadedTextStyle,
                registrableDomainIndexRange,
                fadeLength,
            ),
    )
}

@Suppress("LongMethod")
private fun Modifier.focusTextIndexRange(
    text: String,
    textStyle: TextStyle,
    highlightRange: Pair<Int, Int>?,
    fadeLength: Dp = FADE_LENGTH_PX.dp,
) = composed(
    factory = {
        val density = LocalDensity.current
        val textMeasurer = rememberTextMeasurer()
        val scrollState = rememberScrollState()
        var textLayoutState: TextLayoutResult? by remember { mutableStateOf(null) }
        var fadeFraction = remember { 0f }

        LaunchedEffect(textLayoutState, scrollState.maxValue) {
            val layout = textLayoutState ?: return@LaunchedEffect
            val endScrollValue = computeDomainEndScrollValue(text, highlightRange, scrollState, layout)

            scrollState.scrollTo(endScrollValue)
        }

        onSizeChanged {
            val currentWidth = with(density) { it.width.toDp() }
            fadeFraction = (fadeLength / currentWidth).coerceIn(0f, 1f)

            textLayoutState = textMeasurer.measure(
                text = text,
                maxLines = 1,
                style = textStyle,
                softWrap = false,
                constraints = Constraints(maxWidth = it.width),
            )
        }
            .thenConditional(
                Modifier
                    .graphicsLayer { alpha = FADE_EFFECT_LAYER_ALPHA }
                    .drawWithContent {
                        drawContent()

                        val brush = createUrlFadeBrush(
                            scrolledPixels = scrollState.value,
                            maxScrollPixels = scrollState.maxValue,
                            viewportSize = scrollState.viewportSize,
                            fadeFraction = fadeFraction,
                        )

                        drawRect(
                            brush = brush,
                            blendMode = BlendMode.DstIn,
                        )
                    },
            ) {
                textLayoutState?.didOverflowWidth == true
            }
            .thenConditional(
                Modifier.horizontalScroll(
                    state = scrollState,
                    enabled = false,
                    reverseScrolling = LocalLayoutDirection.current == LayoutDirection.Rtl,
                ),
            ) {
                textLayoutState?.didOverflowWidth == true
            }
    },
    inspectorInfo = {
        name = "highlight text"
        properties["text"] = text
        properties["indexRange"] = highlightRange
        properties["fadeLengthDp"] = fadeLength.value
    },
)

@VisibleForTesting
internal fun computeDomainEndScrollValue(
    text: String,
    highlightRange: Pair<Int, Int>?,
    scrollState: ScrollState,
    textLayoutResult: TextLayoutResult,
): Int = when (highlightRange?.second == text.length) {
    true -> scrollState.maxValue
    else -> {
        val startIndex = highlightRange?.first ?: 0

        val endIndex = (highlightRange?.second?.plus(END_SCROLL_OFFSET) ?: 0)
            .coerceAtMost(text.length)

        // Compute the exact visual boundaries of the domain.
        val path = textLayoutResult.getPathForRange(startIndex, endIndex)
        val maxRightEdge = path.getBounds().right

        // Ensure the furthest visual right edge is shown in the viewport.
        (maxRightEdge - scrollState.viewportSize).toInt().coerceIn(0, scrollState.maxValue)
    }
}

@VisibleForTesting
internal fun createUrlFadeBrush(
    scrolledPixels: Int,
    maxScrollPixels: Int,
    viewportSize: Int,
    fadeFraction: Float,
): Brush {
    val fadeWidthPixels = viewportSize * fadeFraction
    val needsLeftFade = scrolledPixels > 0
    val remainingScroll = maxScrollPixels - scrolledPixels
    val needsRightFade = remainingScroll > fadeWidthPixels

    return when {
        !needsLeftFade && !needsRightFade -> SolidColor(Color.Black)

        !needsLeftFade && needsRightFade -> Brush.horizontalGradient(
            (1f - fadeFraction) to Color.Black,
            1f to Color.Transparent,
        )

        needsLeftFade && !needsRightFade -> Brush.horizontalGradient(
            0f to Color.Transparent,
            fadeFraction to Color.Black,
        )

        else -> Brush.horizontalGradient(
            colorStops = arrayOf(
                0f to Color.Transparent,
                fadeFraction to Color.Black,
                (1f - fadeFraction) to Color.Black,
                1f to Color.Transparent,
            ),
        )
    }
}

@Composable
@Preview(uiMode = UI_MODE_NIGHT_YES or UI_MODE_TYPE_NORMAL)
private fun HighlightedDomainUrlPreview(
    @PreviewParameter(HighlightedUrlDomainDataProvider::class) config: HighlightedUrlDomainPreviewModel,
) {
    AcornTheme {
        Surface {
            HighlightedDomainUrl(
                url = config.url,
                registrableDomainIndexRange = config.registrableDomainIndexRange,
                fadedTextStyle = LocalTextStyle.current.merge(
                    TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant),
                ),
                boldedTextStyle = LocalTextStyle.current.merge(
                    TextStyle(color = MaterialTheme.colorScheme.onSurface),
                ),
                modifier = Modifier.width(200.dp),
            )
        }
    }
}

@Composable
@Preview(locale = "ar", uiMode = UI_MODE_NIGHT_YES or UI_MODE_TYPE_NORMAL)
private fun RTLHighlightedDomainUrlPreview(
    @PreviewParameter(HighlightedUrlDomainDataProvider::class) config: HighlightedUrlDomainPreviewModel,
) {
    AcornTheme {
        Surface {
            HighlightedDomainUrl(
                url = config.url,
                registrableDomainIndexRange = config.registrableDomainIndexRange,
                fadedTextStyle = LocalTextStyle.current.merge(
                    TextStyle(color = MaterialTheme.colorScheme.onSurfaceVariant),
                ),
                boldedTextStyle = LocalTextStyle.current.merge(
                    TextStyle(color = MaterialTheme.colorScheme.onSurface),
                ),
                modifier = Modifier.width(200.dp),
            )
        }
    }
}

private data class HighlightedUrlDomainPreviewModel(
    val url: String,
    val registrableDomainIndexRange: Pair<Int, Int>?,
)

private class HighlightedUrlDomainDataProvider : PreviewParameterProvider<HighlightedUrlDomainPreviewModel> {
    override val values = sequenceOf(
        HighlightedUrlDomainPreviewModel(
            url = "https://www.mozilla.org/firefox",
            registrableDomainIndexRange = 12 to 23,
        ),
        HighlightedUrlDomainPreviewModel(
            url = "mozilla.org/firefox",
            registrableDomainIndexRange = 0 to 11,
        ),
        HighlightedUrlDomainPreviewModel(
            url = "this_is_a_very_looooooooooooooooooooooong_subdomain.test.com",
            registrableDomainIndexRange = 53 to 60,
        ),
        HighlightedUrlDomainPreviewModel(
            url = "this_is_a_very_looooooooooooooooooooooong_subdomain.test.com/page",
            registrableDomainIndexRange = 53 to 60,
        ),
        HighlightedUrlDomainPreviewModel(
            url = "test.com/very_looooooooooooooooooooooong_page",
            registrableDomainIndexRange = 0 to 8,
        ),
        HighlightedUrlDomainPreviewModel(
            url = "127.0.0.1",
            registrableDomainIndexRange = null,
        ),
    )
}

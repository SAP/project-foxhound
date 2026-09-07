/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.optimizedsuggestions

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.theme.privateColorPalette
import mozilla.components.compose.base.theme.success
import mozilla.components.compose.browser.awesomebar.R
import mozilla.components.compose.browser.awesomebar.internal.utils.FlightSuggestionDataProvider
import mozilla.components.compose.browser.awesomebar.internal.utils.FlightSuggestionPreviewModel
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightData
import mozilla.components.concept.awesomebar.optimizedsuggestions.FlightSuggestionStatus
import kotlin.math.roundToInt
import mozilla.components.ui.icons.R as iconsR

@Composable
internal fun FlightSuggestion(
    flightNumber: String,
    airlineName: String?,
    flightStatus: FlightSuggestionStatus,
    progress: Float,
    departureFlightData: FlightData,
    arrivalFlightData: FlightData,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(color = MaterialTheme.colorScheme.surface)
            .clickable(enabled = true, onClick = onClick),
    ) {
        Column(
            modifier = Modifier
                .padding(
                    start = AcornTheme.layout.space.static200,
                    end = AcornTheme.layout.space.static200,
                    top = AcornTheme.layout.space.static200,
                    bottom = AcornTheme.layout.space.static300,
                ),
        ) {
            FlightSuggestionHeader(
                flightNumber = flightNumber,
                airlineName = airlineName,
                flightStatus = flightStatus,
            )

            Box(
                modifier = Modifier.padding(
                    bottom = 4.dp,
                    top = if (airlineName == null) 8.dp else 4.dp,
                ),
            ) {
                if (flightStatus == FlightSuggestionStatus.CANCELLED) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                } else {
                    FlightPath(progress = progress)
                }
            }

            FlightSuggestionFooter(
                departureFlightData = departureFlightData,
                arrivalFlightData = arrivalFlightData,
                flightStatus = flightStatus,
                progress = progress,
            )
        }

        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
    }
}

@Composable
private fun FlightSuggestionHeader(
    flightNumber: String,
    airlineName: String?,
    flightStatus: FlightSuggestionStatus,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(end = 16.dp),
        ) {
            Text(
                text = flightNumber,
                overflow = TextOverflow.Ellipsis,
                maxLines = 1,
                style = AcornTheme.typography.headline7,
                color = MaterialTheme.colorScheme.onSurface,
            )

            airlineName?.let {
                Text(
                    text = airlineName,
                    overflow = TextOverflow.Ellipsis,
                    maxLines = 1,
                    style = AcornTheme.typography.body2,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        FlightStatusBadge(flightStatus)
    }
}

@Composable
private fun FlightSuggestionFooter(
    departureFlightData: FlightData,
    arrivalFlightData: FlightData,
    flightStatus: FlightSuggestionStatus,
    progress: Float,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        FlightInfo(
            flightData = departureFlightData,
            flightStatus = flightStatus,
            dateColor = when (flightStatus) {
                FlightSuggestionStatus.CANCELLED -> MaterialTheme.colorScheme.onSurfaceVariant
                FlightSuggestionStatus.DELAYED if progress == 0f -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.onSurface
            },
            horizontalAlignment = Alignment.Start,
            modifier = Modifier.weight(1f),
        )
        FlightInfo(
            flightData = arrivalFlightData,
            flightStatus = flightStatus,
            dateColor = when (flightStatus) {
                FlightSuggestionStatus.CANCELLED -> MaterialTheme.colorScheme.onSurfaceVariant
                FlightSuggestionStatus.DELAYED if progress > 0f -> MaterialTheme.colorScheme.error
                else -> MaterialTheme.colorScheme.onSurface
            },
            horizontalAlignment = Alignment.End,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun FlightPath(progress: Float, modifier: Modifier = Modifier) {
    val airplaneIconPainter = painterResource(iconsR.drawable.mozac_ic_airplane)
    val errorColor = MaterialTheme.colorScheme.error
    val onSurfaceVariantColor = MaterialTheme.colorScheme.onSurfaceVariant
    val isFlightEnRoute = progress > 0f && progress < 1f
    val progressPercent = (progress * 100).roundToInt()
    val flightPathContentDescription = stringResource(
        R.string.mozac_browser_awesomebar_flight_suggestion_progress,
        progressPercent,
    )
    val isRtl = LocalLayoutDirection.current == LayoutDirection.Rtl

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(20.dp)
            .scale(scaleX = if (isRtl) -1f else 1f, scaleY = 1f)
            .thenConditional(
                Modifier.clearAndSetSemantics {
                    contentDescription = flightPathContentDescription
                },
            ) { isFlightEnRoute },
    ) {
        val iconIntrinsicSize = airplaneIconPainter.intrinsicSize
        val iconStartPosition = when (progress) {
            0f -> 0f
            else -> (size.width * progress) - iconIntrinsicSize.width
        }

        if (progress > 0f) {
            drawFlightProgressPath(color = errorColor, iconStartPosition = iconStartPosition)
        }

        drawAirplaneIcon(
            iconPainter = airplaneIconPainter,
            iconColor = if (progress == 0f) onSurfaceVariantColor else errorColor,
            iconStartPosition = iconStartPosition,
        )

        if (progress < 1f) {
            drawRemainingPath(
                color = onSurfaceVariantColor,
                iconEndPosition = iconStartPosition + iconIntrinsicSize.width,
            )
        }
    }
}

private fun DrawScope.drawFlightProgressPath(color: Color, iconStartPosition: Float) {
    val strokeWidthPx = 4.dp.toPx()
    val lineEndPaddingPx = 4.dp.toPx()
    val lineStartX = strokeWidthPx / 2
    val lineEndX = iconStartPosition - lineEndPaddingPx
    drawLine(
        color = color,
        start = Offset(lineStartX, center.y),
        end = Offset(lineEndX, center.y),
        strokeWidth = strokeWidthPx,
        cap = StrokeCap.Round,
    )
}

private fun DrawScope.drawAirplaneIcon(
    iconPainter: Painter,
    iconColor: Color,
    iconStartPosition: Float,
) {
    translate(left = iconStartPosition) {
        with(iconPainter) {
            draw(
                size = intrinsicSize,
                colorFilter = ColorFilter.tint(iconColor),
            )
        }
    }
}

private fun DrawScope.drawRemainingPath(color: Color, iconEndPosition: Float) {
    val strokeWidthPx = 1.dp.toPx()
    val dashWidthPx = 6.dp.toPx()
    val gapSizePx = 4.dp.toPx()
    val startPaddingPx = 4.dp.toPx()
    val lineStartX = iconEndPosition + startPaddingPx
    drawLine(
        color = color,
        start = Offset(lineStartX, center.y),
        end = Offset(size.width, center.y),
        strokeWidth = strokeWidthPx,
        pathEffect = PathEffect.dashPathEffect(
            intervals = floatArrayOf(dashWidthPx, gapSizePx),
            phase = 0f,
        ),
    )
}

@Composable
private fun FlightInfo(
    flightData: FlightData,
    flightStatus: FlightSuggestionStatus,
    dateColor: Color,
    horizontalAlignment: Alignment.Horizontal,
    modifier: Modifier = Modifier,
) {
    val flightSchedule = "${flightData.time} · ${flightData.date}"
    val cancelledScheduleContentDescription = stringResource(
        R.string.mozac_browser_awesomebar_flight_suggestion_canceled_schedule,
        flightData.time,
        flightData.date,
    )
    Column(modifier = modifier, horizontalAlignment = horizontalAlignment) {
        Text(
            text = flightData.airportCity,
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            style = AcornTheme.typography.headline7,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = flightData.airportCode,
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            style = AcornTheme.typography.body1,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
            Text(
                text = flightSchedule,
                overflow = TextOverflow.Ellipsis,
                maxLines = 2,
                style = AcornTheme.typography.subtitle2,
                color = dateColor,
                textDecoration = if (flightStatus == FlightSuggestionStatus.CANCELLED) {
                    TextDecoration.LineThrough
                } else {
                    null
                },
                modifier = Modifier.clearAndSetSemantics {
                    contentDescription = if (flightStatus == FlightSuggestionStatus.CANCELLED) {
                        cancelledScheduleContentDescription
                    } else {
                        flightSchedule
                    }
                },
            )
        }
    }
}

@Composable
private fun FlightStatusBadge(flightStatus: FlightSuggestionStatus, modifier: Modifier = Modifier) {
    val (text, color) = getFlightStatusInfo(status = flightStatus)
    Box(
        modifier = modifier
            .background(
                color = color,
                shape = MaterialTheme.shapes.small,
            )
            .clip(MaterialTheme.shapes.small)
            .padding(horizontal = 8.dp),
    ) {
        Text(
            text = text,
            style = AcornTheme.typography.subtitle2,
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
            color = MaterialTheme.colorScheme.onPrimary,
        )
    }
}

@Composable
private fun getFlightStatusInfo(status: FlightSuggestionStatus): Pair<String, Color> =
    when (status) {
        FlightSuggestionStatus.DELAYED ->
            stringResource(R.string.mozac_browser_awesomebar_flight_suggestion_delayed) to
                MaterialTheme.colorScheme.error

        FlightSuggestionStatus.CANCELLED ->
            stringResource(R.string.mozac_browser_awesomebar_flight_suggestion_canceled) to
                MaterialTheme.colorScheme.error

        FlightSuggestionStatus.ON_TIME ->
            stringResource(R.string.mozac_browser_awesomebar_flight_suggestion_on_time) to
                MaterialTheme.colorScheme.success

        FlightSuggestionStatus.ARRIVED ->
            stringResource(R.string.mozac_browser_awesomebar_flight_suggestion_arrived) to
                MaterialTheme.colorScheme.success

        FlightSuggestionStatus.IN_FLIGHT ->
            stringResource(R.string.mozac_browser_awesomebar_flight_suggestion_in_flight) to
                MaterialTheme.colorScheme.information
    }

@PreviewLightDark
@Composable
private fun FlightSuggestionPreview(
    @PreviewParameter(FlightSuggestionDataProvider::class) config: FlightSuggestionPreviewModel,
) {
    AcornTheme {
        Surface {
            FlightSuggestion(
                flightNumber = config.flightNumber,
                airlineName = config.airlineName,
                flightStatus = config.flightStatus,
                progress = config.progress,
                departureFlightData = config.departureFlightData,
                arrivalFlightData = config.arrivalFlightData,
                onClick = {},
            )
        }
    }
}

@Preview
@Composable
private fun FlightSuggestionPreviewPrivate(
    @PreviewParameter(FlightSuggestionDataProvider::class) config: FlightSuggestionPreviewModel,
) {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Surface {
            FlightSuggestion(
                flightNumber = config.flightNumber,
                airlineName = config.airlineName,
                flightStatus = config.flightStatus,
                progress = config.progress,
                departureFlightData = config.departureFlightData,
                arrivalFlightData = config.arrivalFlightData,
                onClick = {},
            )
        }
    }
}

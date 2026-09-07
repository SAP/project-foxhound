/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.badge

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.information
import mozilla.components.compose.base.theme.onInformation
import mozilla.components.compose.base.theme.onSuccess
import mozilla.components.compose.base.theme.success

/**
 * A badge component used to communicate status
 *
 * @param containerColor The container color of the status badge.
 * @param modifier [Modifier] to be applied to the component.
 * @param shape The shape of the badge.
 * @param contentColor The color applied to the status badge content
 * @param status The status content
 */
@Composable
fun StatusBadge(
    containerColor: Color,
    modifier: Modifier = Modifier,
    shape: Shape = MaterialTheme.shapes.small,
    contentColor: Color = MaterialTheme.colorScheme.onPrimary,
    status: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .background(color = containerColor, shape = shape)
            .padding(horizontal = AcornTheme.layout.space.static100),
        contentAlignment = Alignment.Center,
    ) {
        ProvideTextStyle(AcornTheme.typography.subtitle2.merge(color = contentColor)) {
            status()
        }
    }
}

/**
 * A badge component used to communicate status.
 *
 * This is an opinionated component that applies the following styling. The text is:
 * - displayed uppercase,
 * - single-line, and
 * - ellipsized if needed.
 *
 * For more flexibility, use the overloaded [StatusBadge] component.
 *
 * @param status The text to display inside the status badge.
 * @param containerColor The container color of the status badge.
 * @param modifier [Modifier] to be applied to the component.
 * @param contentColor The color applied to the label text.
 * @param shape The shape of the badge.
 */
@Composable
fun StatusBadge(
    status: String,
    containerColor: Color,
    modifier: Modifier = Modifier,
    contentColor: Color = MaterialTheme.colorScheme.onPrimary,
    shape: Shape = MaterialTheme.shapes.small,
) {
    StatusBadge(
        modifier = modifier,
        containerColor = containerColor,
        contentColor = contentColor,
        shape = shape,
    ) {
        Text(
            text = status.uppercase(),
            overflow = TextOverflow.Ellipsis,
            maxLines = 1,
        )
    }
}

@PreviewLightDark
@Composable
private fun StatusBadgePreview() {
    AcornTheme {
        Column(
            modifier = Modifier
                .background(MaterialTheme.colorScheme.background)
                .padding(AcornTheme.layout.space.static200),
            verticalArrangement = Arrangement.spacedBy(AcornTheme.layout.space.static100),
        ) {
            StatusPreviewParameter.values().forEach { param ->
                StatusBadge(
                    containerColor = param.containerColor,
                    contentColor = param.contentColor,
                    status = param.status,
                )
            }
        }
    }
}

@Preview
@Composable
private fun StatusBadgePrivatePreview() {
    AcornTheme(colorScheme = acornPrivateColorScheme()) {
        Surface {
            Column(
                modifier = Modifier.padding(AcornTheme.layout.space.static200),
                verticalArrangement = Arrangement.spacedBy(AcornTheme.layout.space.static100),
            ) {
                StatusPreviewParameter.values().forEach { param ->
                    StatusBadge(
                        containerColor = param.containerColor,
                        contentColor = param.contentColor,
                        status = param.status,
                    )
                }
            }
        }
    }
}

@PreviewLightDark
@Composable
private fun StatusBadgeWithCustomizationsPreview() {
    AcornTheme {
        Surface {
            Column(
                modifier = Modifier.padding(AcornTheme.layout.space.static200),
                verticalArrangement = Arrangement.spacedBy(AcornTheme.layout.space.static100),
            ) {
                StatusPreviewParameter.values().forEach { param ->
                    StatusBadge(
                        containerColor = param.containerColor,
                        contentColor = param.contentColor,
                        shape = MaterialTheme.shapes.small,
                    ) {
                        Text(text = param.status)
                    }
                }
            }
        }
    }
}

private data class StatusPreviewParameter(
    val status: String,
    val containerColor: Color,
    val contentColor: Color,
) {
    companion object {
        @Composable
        fun values(): List<StatusPreviewParameter> {
            return listOf(
                StatusPreviewParameter(
                    status = "New",
                    containerColor = MaterialTheme.colorScheme.information,
                    contentColor = MaterialTheme.colorScheme.onInformation,
                ),
                StatusPreviewParameter(
                    status = "In flight",
                    containerColor = MaterialTheme.colorScheme.information,
                    contentColor = MaterialTheme.colorScheme.onInformation,
                ),
                StatusPreviewParameter(
                    status = "Arrived",
                    containerColor = MaterialTheme.colorScheme.success,
                    contentColor = MaterialTheme.colorScheme.onSuccess,
                ),
                StatusPreviewParameter(
                    status = "On time",
                    containerColor = MaterialTheme.colorScheme.success,
                    contentColor = MaterialTheme.colorScheme.onSuccess,
                ),
                StatusPreviewParameter(
                    status = "Delayed",
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError,
                ),
                StatusPreviewParameter(
                    status = "Cancelled",
                    containerColor = MaterialTheme.colorScheme.error,
                    contentColor = MaterialTheme.colorScheme.onError,
                ),
            )
        }
    }
}

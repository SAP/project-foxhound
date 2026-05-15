/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.compose

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.FilledButton
import org.mozilla.fenix.shopping.ui.ext.headingResource
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.ThemedValue
import org.mozilla.fenix.theme.ThemedValueProvider
import mozilla.components.ui.icons.R as iconsR

/**
 * Card for presenting informational messages or errors.
 *
 * @param modifier Modifier to be applied to the card.
 * @param title The primary text of the info message.
 * @param type The [InfoType] of message to display.
 * @param verticalRowAlignment An optional adjustment of how the row of text aligns.
 * @param description The optional secondary piece of text.
 * @param footer An optional piece of text with a clickable link.
 * @param buttonText The text to show in the optional button.
 */
@Suppress("LongMethod")
@Composable
fun InfoCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    type: InfoType,
    verticalRowAlignment: Alignment.Vertical = Alignment.Top,
    description: String? = null,
    footer: Pair<String, LinkTextState>? = null,
    buttonText: InfoCardButtonText? = null,
) {
    InfoCardContainer(
        modifier = modifier,
        backgroundColor = type.cardBackgroundColor,
        contentPadding = PaddingValues(
            horizontal = 12.dp,
            vertical = 8.dp,
        ),
        elevation = 0.dp,
    ) {
        val titleContentDescription = title?.let { headingResource(it) }

        Row(
            verticalAlignment = verticalRowAlignment,
        ) {
            when (type) {
                InfoType.Warning -> {
                    InfoCardIcon(iconId = iconsR.drawable.mozac_ic_warning_fill_24)
                }

                InfoType.Error -> {
                    InfoCardIcon(iconId = iconsR.drawable.mozac_ic_critical_fill_24)
                }

                InfoType.Info -> {
                    InfoCardIcon(iconId = iconsR.drawable.mozac_ic_information_fill_24)
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                title?.let {
                    Text(
                        text = it,
                        style = FirefoxTheme.typography.headline8,
                        modifier = Modifier.semantics {
                            heading()
                            if (titleContentDescription != null) {
                                contentDescription = titleContentDescription
                            }
                        },
                    )
                }

                description?.let {
                    title?.let { Spacer(modifier = Modifier.height(4.dp)) }

                    Text(
                        text = remember(description) { parseHtml(description) },
                        style = FirefoxTheme.typography.body2,
                    )
                }

                footer?.let {
                    Spacer(modifier = Modifier.height(4.dp))

                    LinkText(
                        text = it.first,
                        linkTextStates = listOf(it.second),
                        style = FirefoxTheme.typography.body2.copy(
                            color = MaterialTheme.colorScheme.onSurface,
                        ),
                        linkTextColor = MaterialTheme.colorScheme.onSurface,
                        linkTextDecoration = TextDecoration.Underline,
                    )
                }
            }
        }

        buttonText?.let {
            Spacer(modifier = Modifier.height(8.dp))

            FilledButton(
                text = it.text,
                modifier = Modifier.fillMaxWidth(),
                contentColor = type.buttonTextColor,
                containerColor = type.buttonBackgroundColor,
                onClick = it.onClick,
            )
        }
    }
}

@Composable
private fun InfoCardIcon(
    iconId: Int,
    modifier: Modifier = Modifier,
) {
    Icon(
        painter = painterResource(id = iconId),
        contentDescription = null,
        modifier = modifier,
    )
}

/**
 * The possible types of a [InfoCard].
 */
enum class InfoType {
    /**
     * Stylizes the card to indicate a non-permanent or minor issue has occurred.
     */
    Warning,

    /**
     * Stylizes the card to indicate a serious error has occurred.
     */
    Error,

    /**
     * Stylizes the card for informative messages in colorful tones.
     */
    Info,

    ;

    val cardBackgroundColor: Color
        @Composable
        @ReadOnlyComposable
        get() = when (this) {
            Warning -> FirefoxTheme.colors.layerWarning
            Error -> FirefoxTheme.colors.layerCritical
            Info -> FirefoxTheme.colors.layerInformation
        }

    val buttonBackgroundColor: Color
        @Composable
        @ReadOnlyComposable
        get() = when (this) {
            Warning -> FirefoxTheme.colors.actionWarning
            Error -> FirefoxTheme.colors.actionCritical
            Info -> FirefoxTheme.colors.actionInformation
        }

    val buttonTextColor: Color
        @Composable
        @ReadOnlyComposable
        get() = when {
            this == Info && !isSystemInDarkTheme() -> FirefoxTheme.colors.textOnColorPrimary
            else -> MaterialTheme.colorScheme.onSurface
        }
}

/**
 * Model for the optional button in a [InfoCard].
 *
 * @property text The text to show in the button.
 * @property onClick The callback to invoke when the button is clicked.
 */
data class InfoCardButtonText(
    val text: String,
    val onClick: () -> Unit,
)

private class PreviewModelParameterProvider : ThemedValueProvider<InfoType>(
    enumValues<InfoType>().asSequence(),
)

@Composable
private fun InfoCardPreviewContent(type: InfoType) {
    Surface {
        InfoCard(
            title = "Title text",
            type = type,
            modifier = Modifier
                .fillMaxWidth()
                .padding(all = 16.dp),
            description = "Description text",
            footer = "Primary link text with an underlined hyperlink." to LinkTextState(
                text = "underlined hyperlink",
                url = "https://www.mozilla.org",
                onClick = {},
            ),
            buttonText = InfoCardButtonText(
                text = "Button text",
                onClick = {},
            ),
        )
    }
}

@Preview
@Composable
private fun InfoCardPreview(
    @PreviewParameter(PreviewModelParameterProvider::class) state: ThemedValue<InfoType>,
) {
    FirefoxTheme(state.theme) {
        InfoCardPreviewContent(type = state.value)
    }
}

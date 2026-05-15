/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.privateColorPalette
import mozilla.components.compose.base.theme.surfaceDimVariant
import mozilla.components.ui.icons.R as iconsR

/**
 * A banner component that displays text-based content, including an optional title
 * and optional positive/negative action buttons.
 *
 * This overload is intended for simple use cases where the banner content consists
 * only of strings rather than full composable slots. It provides a lightweight API
 * for common notification, error, or confirmation patterns.
 *
 * Only the provided elements are shown. If a title is omitted, only the message
 * is displayed. Action buttons are shown only if their corresponding text values
 * (and optionally their click callbacks) are provided.
 *
 * @param messageText The main message text displayed in the banner. This is required.
 * @param modifier The [Modifier] to be applied to the banner container.
 * @param titleText Title displayed above the message. Use this for short,
 * attention-grabbing headings.
 * @param colors Defines the color styling for the banner, including background
 * and content color. Defaults to [BannerColors.bannerColors].
 * @param border [BorderStroke] drawn around the banner container.
 * @param closeButtonContentDescription The content description for the close button.
 * @param positiveButtonText Label for a positive/confirm action button
 * (e.g., “OK”, “Retry”, “Allow”). If `null`, the button is not shown.
 * @param negativeButtonText Label for a negative/cancel action button
 * (e.g., “Dismiss”, “Cancel”). If `null`, the button is not shown.
 * @param positiveOnClick Callback invoked when the positive button is clicked.
 * @param negativeOnClick Callback invoked when the negative button is clicked.
 * @param onCloseButtonClick Callback invoked when the banner’s close button
 * is clicked.
 */
@Composable
fun Banner(
    messageText: String,
    modifier: Modifier = Modifier,
    titleText: String? = null,
    colors: BannerColors = BannerColors.bannerColors(),
    border: BorderStroke? = null,
    closeButtonContentDescription: String = stringResource(
        R.string.mozac_compose_base_close_button_content_description,
    ),
    positiveButtonText: String? = null,
    negativeButtonText: String? = null,
    positiveOnClick: () -> Unit = {},
    negativeOnClick: () -> Unit = {},
    onCloseButtonClick: () -> Unit = {},
) {
    Banner(
        modifier = modifier,
        titleText = titleText,
        message = {
            Text(
                text = messageText,
            )
        },
        positiveButtonText = positiveButtonText,
        negativeButtonText = negativeButtonText,
        colors = colors,
        positiveOnClick = positiveOnClick,
        negativeOnClick = negativeOnClick,
        border = border,
        closeButtonContentDescription = closeButtonContentDescription,
        onCloseButtonClick = onCloseButtonClick,
    )
}

/**
 * A banner component that displays an optional title and action buttons, with a flexible
 * composable slot for the message area.
 *
 * This overload is designed for cases where you want a simple text-based title and button
 * labels, but need additional flexibility for the message—such as rendering annotated text,
 * inline styles, clickable spans, or other custom composables.
 *
 * Only provided elements will be shown. If the title is omitted, only the message content
 * is displayed. Each action button appears only when its text (and optionally its click
 * handler) is supplied.
 *
 * @param modifier The [Modifier] to be applied to the banner container.
 * @param titleText Title displayed above the message. Use this for short,
 * high-level headings or contextual labels.
 * @param message Composable slot representing the main message content.
 * Allows rich text, annotated strings, or any custom layout needed.
 * If `null`, only the title (if provided) and buttons are shown.
 * @param colors Defines the color styling for the banner, including background and
 * content color. Defaults to [BannerColors.bannerColors].
 * @param border [BorderStroke] drawn around the banner container.
 * @param closeButtonContentDescription The content description for the close button.
 * @param positiveButtonText Label for the positive/confirm action button
 * (e.g., “OK”, “Allow”). The button is only shown if this text is non-null.
 * @param negativeButtonText Label for the negative/cancel action button
 * (e.g., “Dismiss”, “Cancel”). The button is only shown if this text is non-null.
 * @param positiveOnClick Callback invoked when the positive button is clicked.
 * @param negativeOnClick Callback invoked when the negative button is clicked.
 * @param onCloseButtonClick Callback invoked when the banner’s close button is clicked.
 */
@Composable
fun Banner(
    modifier: Modifier = Modifier,
    titleText: String? = null,
    message: (@Composable () -> Unit)? = null,
    colors: BannerColors = BannerColors.bannerColors(),
    border: BorderStroke? = null,
    closeButtonContentDescription: String = stringResource(
        R.string.mozac_compose_base_close_button_content_description,
    ),
    positiveButtonText: String? = null,
    negativeButtonText: String? = null,
    positiveOnClick: () -> Unit = {},
    negativeOnClick: () -> Unit = {},
    onCloseButtonClick: () -> Unit = {},
) {
    val titleSlot = if (!titleText.isNullOrBlank()) {
        @Composable {
            Text(
                text = titleText,
            )
        }
    } else {
        null
    }

    val actionsSlot = if (!positiveButtonText.isNullOrBlank() || !negativeButtonText.isNullOrBlank()) {
        @Composable {
            BannerActions(
                positiveButtonText = positiveButtonText,
                negativeButtonText = negativeButtonText,
                positiveOnClick = positiveOnClick,
                negativeOnClick = negativeOnClick,
            )
        }
    } else {
        null
    }

    Banner(
        modifier = modifier,
        title = titleSlot,
        message = message,
        actions = actionsSlot,
        border = border,
        colors = colors,
        closeButtonContentDescription = closeButtonContentDescription,
        onCloseButtonClick = onCloseButtonClick,
    )
}

@Composable
private fun BannerActions(
    positiveButtonText: String? = null,
    negativeButtonText: String? = null,
    positiveOnClick: () -> Unit = {},
    negativeOnClick: () -> Unit = {},
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = AcornTheme.layout.size.static100),
        horizontalArrangement = Arrangement.End,
    ) {
        if (!negativeButtonText.isNullOrBlank()) {
            TextButton(
                text = negativeButtonText,
                onClick = negativeOnClick,
            )
        }

        if (!positiveButtonText.isNullOrBlank() && !negativeButtonText.isNullOrBlank()) {
            Spacer(Modifier.width(AcornTheme.layout.size.static100))
        }

        if (!positiveButtonText.isNullOrBlank()) {
            TextButton(
                text = positiveButtonText,
                onClick = positiveOnClick,
            )
        }
    }
}

/**
 * A flexible banner component that displays an optional title, message, and action area.
 *
 * This composable provides a structured layout commonly used for inline notifications,
 * warnings, promotions, or informational messages. Each section (title, message, actions)
 * is optional and will only be shown if provided.
 *
 * @param modifier The [Modifier] to be applied to the banner container.
 * @param title Composable slot displayed at the top of the banner.
 * Use this for short, prominent text such as a heading.
 * @param message Composable slot displayed below the title.
 * Intended for descriptive or supporting content.
 * @param actions Composable slot displayed at the bottom or end of the banner.
 * Commonly used for buttons (e.g., “Learn More”, “Retry”, “Dismiss”).
 * @param border [BorderStroke] for drawing a border around the banner.
 * @param colors Defines the visual color properties for the banner, such as background
 * and content color. Defaults to [BannerColors.bannerColors].
 * @param closeButtonContentDescription The content description for the close button.
 * @param onCloseButtonClick Callback invoked when the banner’s close button is clicked.
 */
@Composable
fun Banner(
    modifier: Modifier = Modifier,
    title: (@Composable () -> Unit)? = null,
    message: (@Composable () -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
    border: BorderStroke? = null,
    colors: BannerColors = BannerColors.bannerColors(),
    closeButtonContentDescription: String = stringResource(
        R.string.mozac_compose_base_close_button_content_description,
    ),
    onCloseButtonClick: () -> Unit = {},
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        border = border,
        colors = CardDefaults.cardColors(containerColor = colors.backgroundColor),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    bottom = AcornTheme.layout.size.static100,
                ),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        start = AcornTheme.layout.size.static200,
                    ),
            ) {
                Column(
                    modifier = Modifier
                        .padding(top = AcornTheme.layout.size.static150)
                        .weight(1f),
                ) {
                    CompositionLocalProvider(
                        LocalTextStyle provides AcornTheme.typography.headline8.copy(
                            color = colors.titleTextColor,
                        ),
                    ) {
                        title?.invoke()
                    }

                    if (title != null && message != null) {
                        Spacer(Modifier.height(AcornTheme.layout.size.static50))
                    }

                    CompositionLocalProvider(
                        LocalTextStyle provides AcornTheme.typography.body2.copy(
                            color = colors.messageTextColor,
                        ),
                    ) {
                        message?.invoke()
                    }
                }

                BannerIconButton(
                    color = colors.iconColor,
                    contentDescription = closeButtonContentDescription,
                    onCloseButtonClick = onCloseButtonClick,
                )
            }

            if (actions != null) {
                Spacer(Modifier.height(AcornTheme.layout.size.static100))
            }

            CompositionLocalProvider(
                LocalTextStyle provides AcornTheme.typography.button.copy(
                    color = colors.buttonTextColor,
                ),
            ) {
                actions?.invoke()
            }
        }
    }
}

/**
 * IconButton within a Banner.
 *
 * @param color The color tint of the icon.
 * @param contentDescription The content description for the [IconButton].
 * @param onCloseButtonClick Invoked when user clicks on close button to remove message.
 */
@Composable
private fun BannerIconButton(
    color: Color,
    contentDescription: String,
    onCloseButtonClick: () -> Unit,
) {
    IconButton(
        modifier = Modifier
            .size(44.dp)
            .padding(2.dp),
        contentDescription = contentDescription,
        onClick = onCloseButtonClick,
    ) {
        Icon(
            modifier = Modifier.size(20.dp),
            painter = painterResource(iconsR.drawable.mozac_ic_cross_20),
            contentDescription = null,
            tint = color,
        )
    }
}

/**
 * Wrapper for the color parameters of [Banner].
 *
 * @property backgroundColor The background [Color] of the message.
 * @property titleTextColor [Color] to apply to the message's title.
 * @property messageTextColor [Color] to apply to the message's body text.
 * @property iconColor [Color] to apply to the message's icon.
 * @property buttonTextColor [Color] to apply to the button text.
 */
data class BannerColors(
    val backgroundColor: Color,
    val titleTextColor: Color,
    val messageTextColor: Color,
    val iconColor: Color,
    val buttonTextColor: Color,
) {
    companion object {

        /**
         * Builder function used to construct an instance of [BannerColors].
         */
        @Composable
        fun bannerColors(
            backgroundColor: Color = MaterialTheme.colorScheme.surfaceDimVariant,
            titleTextColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
            messageTextColor: Color = MaterialTheme.colorScheme.onSurfaceVariant,
            iconColor: Color = MaterialTheme.colorScheme.onSurface,
            buttonTextColor: Color = ButtonDefaults.textButtonColors().contentColor,
        ): BannerColors {
            return BannerColors(
                backgroundColor = backgroundColor,
                titleTextColor = titleTextColor,
                messageTextColor = messageTextColor,
                iconColor = iconColor,
                buttonTextColor = buttonTextColor,
            )
        }
    }
}

@Composable
@PreviewLightDark
private fun SimpleBannerPreview() {
    AcornTheme {
        Banner(
            messageText = "Supporting line text lorem ipsum dolor sit amet consectetur.",
            titleText = "Title",
            positiveButtonText = "Action",
            negativeButtonText = "Cancel",
            onCloseButtonClick = {},
        )
    }
}

@Composable
@Preview
private fun SimpleBannerPrivatePreview() {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Banner(
            messageText = "Supporting line text lorem ipsum dolor sit amet consectetur.",
            titleText = "Title",
            positiveButtonText = "Action",
            negativeButtonText = "Cancel",
            onCloseButtonClick = {},
        )
    }
}

@Composable
@PreviewLightDark
private fun BannerWithSlottedMessagePreview() {
    AcornTheme {
        Banner(
            message = {
                Text(
                    buildAnnotatedString {
                        append("You must accept the ")

                        withStyle(
                            style = SpanStyle(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.W500,
                            ),
                        ) {
                            append("Terms of Use")
                        }

                        append(" and the ")

                        withStyle(
                            style = SpanStyle(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.W500,
                            ),
                        ) {
                            append("Privacy Notice")
                        }

                        append(" to continue.")
                    },
                )
            },
            titleText = "Title",
            positiveButtonText = "Accept",
            negativeButtonText = "Cancel",
            onCloseButtonClick = {},
        )
    }
}

@Composable
@Preview
private fun BannerWithSlottedMessagePrivatePreview() {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Banner(
            message = {
                Text(
                    buildAnnotatedString {
                        append("You must accept the ")

                        withStyle(
                            style = SpanStyle(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.W500,
                            ),
                        ) {
                            append("Terms of Use")
                        }

                        append(" and the ")

                        withStyle(
                            style = SpanStyle(
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.W500,
                            ),
                        ) {
                            append("Privacy Notice")
                        }

                        append(" to continue.")
                    },
                )
            },
            titleText = "Title",
            positiveButtonText = "Accept",
            negativeButtonText = "Cancel",
            onCloseButtonClick = {},
        )
    }
}

@Composable
@PreviewLightDark
private fun BannerWithSlottedTitleAndMessagePreview() {
    AcornTheme {
        Banner(
            title = {
                Text("Title")
            },
            message = {
                Text("Supporting line text lorem ipsum dolor sit amet consectetur.")
            },
        )
    }
}

@Composable
@Preview
private fun BannerWithSlottedTitleAndMessagePrivatePreview() {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        Banner(
            title = {
                Text("Title")
            },
            message = {
                Text("Supporting line text lorem ipsum dolor sit amet consectetur.")
            },
        )
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.support.base.log.logger.Logger

/**
 * The tag used for links in the text for annotated strings.
 */
private const val URL_TAG = "URL_TAG"

private val logger = Logger("LinkText")

/**
 * Model containing link text, url and action.
 *
 * @property text Substring of the text passed to [LinkText] to be displayed as clickable link.
 * @property url Url the link should point to.
 * @property onClick Callback to be invoked when link is clicked.
 */
data class LinkTextState(
    val text: String,
    val url: String,
    val onClick: (String) -> Unit,
)

/**
 * A composable for displaying text that contains a clickable link text.
 *
 * @param text The complete text.
 * @param linkTextStates The clickable part of the text. The order of the states added in the list
 * should be the same as the links shown in the text.
 * @param modifier The [Modifier] to be applied to the underlying [Text].
 * @param style [TextStyle] applied to the text.
 * @param linkTextColor [Color] applied to the clickable part of the text.
 * @param linkTextDecoration [TextDecoration] applied to the clickable part of the text.
 * @param textAlign The alignment of the text within the lines of the paragraph. See [TextStyle.textAlign].
 * @param contentDescription Optional accessibility content description. When provided, overrides
 * the default description that is derived from the text content. Used for when more custom context is needed.
 * @param shouldApplyAccessibleSize determines whether a minimum interactive size should be applied
 * to improve accessibility touch targets.
 */
@Composable
fun LinkText(
    text: String,
    linkTextStates: List<LinkTextState>,
    modifier: Modifier = Modifier,
    style: TextStyle = AcornTheme.typography.body2.copy(
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    ),
    linkTextColor: Color = MaterialTheme.colorScheme.tertiary,
    linkTextDecoration: TextDecoration = TextDecoration.None,
    textAlign: TextAlign? = null,
    contentDescription: String? = null,
    shouldApplyAccessibleSize: Boolean = false,
) {
    val annotatedString = buildUrlAnnotatedString(
        text,
        linkTextStates,
        linkTextColor,
        linkTextDecoration,
    )

    val showDialog = remember { mutableStateOf(false) }
    val linksAvailable = stringResource(id = R.string.mozac_compose_base_link_text_links_available)

    if (showDialog.value) {
        LinksDialog(linkTextStates) { showDialog.value = false }
    }

    Text(
        text = annotatedString,
        style = style,
        modifier = modifier
            .then(
                if (shouldApplyAccessibleSize) {
                    Modifier.minimumInteractiveComponentSize()
                } else {
                    Modifier
                },
            )
            .clearAndSetSemantics {
                onClick {
                    if (linkTextStates.size > 1) {
                        showDialog.value = true
                    } else {
                        linkTextStates.firstOrNull()?.let {
                            it.onClick(it.url)
                        }
                    }
                    return@onClick true
                }
                this.contentDescription = contentDescription ?: "$annotatedString $linksAvailable"
            },
        textAlign = textAlign,
    )
}

@Composable
private fun LinksDialog(
    linkTextStates: List<LinkTextState>,
    onDismissRequest: () -> Unit,
) {
    Dialog(onDismissRequest = { onDismissRequest() }) {
        Column(
            modifier = Modifier
                .background(
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    shape = MaterialTheme.shapes.extraLarge,
                )
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(id = R.string.mozac_compose_base_link_text_links_title),
                color = MaterialTheme.colorScheme.onSurface,
                style = AcornTheme.typography.headline5,
            )

            linkTextStates.forEach { linkText ->
                TextButton(
                    text = linkText.text,
                    onClick = { linkText.onClick(linkText.url) },
                    modifier = Modifier.align(Alignment.Start),
                )
            }

            TextButton(
                text = stringResource(id = R.string.mozac_compose_base_link_text_dismiss),
                onClick = onDismissRequest,
                modifier = Modifier.align(Alignment.End),
            )
        }
    }
}

/**
 * @throws IllegalArgumentException if any of the given [linkTextStates] text are not found in [fullText].
 */
private fun buildUrlAnnotatedString(
    fullText: String,
    linkTextStates: List<LinkTextState>,
    color: Color,
    decoration: TextDecoration,
) = buildAnnotatedString {
    append(fullText)

    var previousWordEndIndex = 0

    linkTextStates.forEach { linkTextState ->

        if (linkTextState.text.isBlank()) {
            logger.error("Link text was blank")
        }

        val startIndex = fullText.indexOf(linkTextState.text, previousWordEndIndex)
        if (startIndex < 0) {
            logger.error("LinkText: \"${linkTextState.text}\" not found in \"$fullText\"")
        }

        val endIndex = startIndex + linkTextState.text.length

        val link = LinkAnnotation.Clickable(
            tag = URL_TAG,
            styles = TextLinkStyles(
                SpanStyle(
                    color = color,
                    textDecoration = decoration,
                ),
            ),
            linkInteractionListener = {
                linkTextState.onClick(linkTextState.url)
            },
        )
        addLink(link, startIndex, endIndex)

        previousWordEndIndex = endIndex
    }
}

@Preview
@Composable
private fun LinkTextEndPreview() {
    val state = LinkTextState(
        text = "click here",
        url = "www.mozilla.com",
        onClick = {},
    )

    AcornTheme {
        Surface {
            LinkText(text = "This is normal text, click here", linkTextStates = listOf(state))
        }
    }
}

@Preview
@Composable
private fun LinkTextMiddlePreview() {
    val state = LinkTextState(
        text = "clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )

    AcornTheme {
        Surface {
            LinkText(text = "This is clickable text, followed by normal text", linkTextStates = listOf(state))
        }
    }
}

@Preview
@Composable
private fun LinkTextStyledPreview() {
    val state = LinkTextState(
        text = "clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )

    AcornTheme {
        Surface {
            LinkText(
                text = "This is clickable text, in a different style",
                linkTextStates = listOf(state),
                style = AcornTheme.typography.headline5,
            )
        }
    }
}

@Preview
@Composable
private fun LinkTextClickStyledPreview() {
    val state = LinkTextState(
        text = "clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )

    AcornTheme {
        Surface {
            LinkText(
                text = "This is clickable text, with underlined text",
                linkTextStates = listOf(state),
                style = AcornTheme.typography.headline5,
                linkTextColor = Color.Red,
                linkTextDecoration = TextDecoration.Underline,
            )
        }
    }
}

@Preview
@Composable
private fun MultipleLinksPreview() {
    val state1 = LinkTextState(
        text = "clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )
    val state2 = LinkTextState(
        text = "another clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )

    AcornTheme {
        Surface {
            LinkText(
                text = "This is clickable text, followed by normal text, followed by another clickable text",
                linkTextStates = listOf(state1, state2),
            )
        }
    }
}

@Preview
@Composable
private fun LinksDialogPreview() {
    val state1 = LinkTextState(
        text = "clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )
    val state2 = LinkTextState(
        text = "another clickable text",
        url = "www.mozilla.com",
        onClick = {},
    )
    val linkTextStateList = listOf(state1, state2)

    AcornTheme {
        LinksDialog(
            linkTextStates = linkTextStateList,
            onDismissRequest = {},
        )
    }
}

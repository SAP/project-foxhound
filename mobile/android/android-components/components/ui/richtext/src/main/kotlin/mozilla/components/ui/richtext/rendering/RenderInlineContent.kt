/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext.rendering

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.LinkAnnotation.Url
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import mozilla.components.ui.richtext.ir.InlineContent

/**
 * Converts [InlineContent] to [AnnotatedString]
 *
 * @param linkStyle The style to use for links.
 * @param codeStyle The style to use for code.
 */
internal fun List<InlineContent>.asAnnotatedString(
    linkStyle: SpanStyle,
    codeStyle: SpanStyle,
): AnnotatedString =
    buildAnnotatedString {
        fun build(content: InlineContent) {
            when (content) {
                is InlineContent.Code -> {
                    withStyle(codeStyle) {
                        append(content.value)
                    }
                }

                is InlineContent.Emphasis -> {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                        content.children.forEach(::build)
                    }
                }

                is InlineContent.Link -> {
                    withLink(
                        link = Url(
                            url = content.url,
                            styles = TextLinkStyles(style = linkStyle),
                        ),
                    ) {
                        content.children.forEach(::build)
                    }
                }

                is InlineContent.Plain -> {
                    append(content.value)
                }

                is InlineContent.Strong -> {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                        content.children.forEach(::build)
                    }
                }

                InlineContent.LineBreak -> {
                    appendLine()
                }
            }
        }
        forEach { inlineContent ->
            build(inlineContent)
        }
    }

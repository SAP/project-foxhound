/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext.parsing

import mozilla.components.ui.richtext.ir.InlineContent
import org.intellij.markdown.MarkdownElementTypes
import org.intellij.markdown.MarkdownTokenTypes
import org.intellij.markdown.ast.ASTNode

internal fun ASTNode.toInlineContent(source: String): List<InlineContent> {
    return when (type) {
        MarkdownElementTypes.STRONG -> listOf(
            InlineContent.Strong(children = children.flatMap { it.toInlineContent(source) }),
        )

        MarkdownElementTypes.EMPH -> listOf(
            InlineContent.Emphasis(children = children.flatMap { it.toInlineContent(source) }),
        )

        MarkdownElementTypes.CODE_SPAN -> listOf(
            InlineContent.Code(value = this.extractCodeSpanText(source)),
        )

        MarkdownElementTypes.INLINE_LINK -> {
            listOf(
                InlineContent.Link(
                    url = children.filter { it.type == MarkdownElementTypes.LINK_DESTINATION }
                        .map {
                            source.substring(it.startOffset, it.endOffset)
                        }.joinToString { it },
                    children = children.filter { it.type == MarkdownElementTypes.LINK_TEXT }
                        .flatMap { it.toInlineContent(source) },
                ),
            )
        }

        // tokens
        MarkdownTokenTypes.TEXT,
        MarkdownTokenTypes.WHITE_SPACE,
        MarkdownTokenTypes.COLON,
        MarkdownTokenTypes.SINGLE_QUOTE,
        MarkdownTokenTypes.DOUBLE_QUOTE,
            -> listOf(InlineContent.Plain(value = source.substring(startOffset, endOffset)))

        MarkdownTokenTypes.EOL -> listOf(InlineContent.LineBreak)
        else -> if (children.isEmpty()) {
            emptyList()
        } else {
            children.flatMap { it.toInlineContent(source) }
        }
    }
}

private fun ASTNode.extractCodeSpanText(source: String): String {
    val codeSpan = StringBuilder()

    fun build(node: ASTNode) {
        when (node.type) {
            MarkdownTokenTypes.BACKTICK -> Unit
            else -> codeSpan.append(source.substring(node.startOffset, node.endOffset))
        }
    }

    children.forEach(::build)

    return codeSpan.toString()
}

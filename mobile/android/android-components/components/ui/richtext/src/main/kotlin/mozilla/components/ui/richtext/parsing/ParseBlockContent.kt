/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext.parsing

import mozilla.components.ui.richtext.ir.BlockContent
import mozilla.components.ui.richtext.ir.HeadingLevel
import mozilla.components.ui.richtext.ir.InlineContent
import org.intellij.markdown.MarkdownElementTypes
import org.intellij.markdown.ast.ASTNode

/**
 * Converts an [ASTNode] into an intermediate representation list of [BlockContent].
 */
internal fun ASTNode.toBlocks(source: String): List<BlockContent> =
    when (type) {
        MarkdownElementTypes.PARAGRAPH -> createParagraphBlock(source)

        MarkdownElementTypes.ATX_1,
        MarkdownElementTypes.ATX_2,
        MarkdownElementTypes.ATX_3,
        MarkdownElementTypes.ATX_4,
        MarkdownElementTypes.ATX_5,
        MarkdownElementTypes.ATX_6,
            -> createHeadingBlock(source)

        MarkdownElementTypes.UNORDERED_LIST,
        MarkdownElementTypes.ORDERED_LIST,
            -> {
            createListBlock(source)
        }

        MarkdownElementTypes.BLOCK_QUOTE -> createBlockQuote(source)

        else -> if (children.isEmpty()) {
            emptyList()
        } else {
            children.flatMap { it.toBlocks(source) }
        }
    }

private fun ASTNode.createListBlock(source: String): List<BlockContent.ListBlock> = listOf(
    BlockContent.ListBlock(
        ordered = this.isOrderedList,
        items = children.mapNotNull { child ->
            val blocks = child.toBlocks(source)
            if (blocks.isEmpty()) {
                null
            } else {
                BlockContent.ListBlock.ListItem(content = blocks)
            }
        },
    ),
)

private fun ASTNode.createBlockQuote(source: String): List<BlockContent.BlockQuote> = listOf(
    BlockContent.BlockQuote(
        content = children.flatMap { it.toBlocks(source) },
    ),
)

private fun ASTNode.createParagraphBlock(source: String): List<BlockContent.Paragraph> = listOf(
    BlockContent.Paragraph(
        content = children.flatMap { it.toInlineContent(source) }
            .compressAdjacentPlainContents(),
    ),
)

private fun ASTNode.createHeadingBlock(source: String): List<BlockContent.Heading> {
    val level = when (type) {
        MarkdownElementTypes.ATX_1 -> HeadingLevel.H1
        MarkdownElementTypes.ATX_2 -> HeadingLevel.H2
        MarkdownElementTypes.ATX_3 -> HeadingLevel.H3
        MarkdownElementTypes.ATX_4 -> HeadingLevel.H4
        MarkdownElementTypes.ATX_5 -> HeadingLevel.H5
        else -> HeadingLevel.H6
    }
    val content = children.flatMap { it.toInlineContent(source) }
        .mapIndexedNotNull { index, content ->
            if (content is InlineContent.Plain && index == 0 && content.value.trim()
                    .isEmpty()
            ) {
                null
            } else {
                content
            }
        }
        .compressAdjacentPlainContents()
    return listOf(
        BlockContent.Heading(
            level = level,
            content = content,
        ),
    )
}

private val ASTNode.isOrderedList
    get() = this.type == MarkdownElementTypes.ORDERED_LIST

/**
 * This is a small optimization attempt to compress adjacent plain content.
 *
 * The JetBrains Markdown produces each inline plain content as a separate object.
 *
 * E.g: `a line of text` is broken down into: `a`, `<space>` `line` `<space>` `of` `<space>` `text`
 * (7 distinct) objects, so we want to compress those into one single plain content item.
 */
private fun List<InlineContent>.compressAdjacentPlainContents(): List<InlineContent> {
    if (isEmpty()) return emptyList()

    val result = mutableListOf<InlineContent>()
    val buffer = StringBuilder()

    fun flush() {
        if (buffer.isNotEmpty()) {
            result.add(InlineContent.Plain(value = buffer.toString()))
            buffer.clear()
        }
    }

    forEach { content ->
        if (content is InlineContent.Plain) {
            buffer.append(content.value)
        } else {
            flush()
            result.add(content)
        }
    }

    flush()

    return result
}

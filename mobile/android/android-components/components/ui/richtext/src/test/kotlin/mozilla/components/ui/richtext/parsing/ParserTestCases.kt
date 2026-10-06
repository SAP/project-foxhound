/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext.parsing

import mozilla.components.ui.richtext.ir.BlockContent
import mozilla.components.ui.richtext.ir.BlockContent.BlockQuote
import mozilla.components.ui.richtext.ir.BlockContent.Heading
import mozilla.components.ui.richtext.ir.BlockContent.ListBlock
import mozilla.components.ui.richtext.ir.BlockContent.ListBlock.ListItem
import mozilla.components.ui.richtext.ir.BlockContent.Paragraph
import mozilla.components.ui.richtext.ir.InlineContent
import mozilla.components.ui.richtext.ir.InlineContent.Emphasis
import mozilla.components.ui.richtext.ir.InlineContent.LineBreak
import mozilla.components.ui.richtext.ir.InlineContent.Plain
import mozilla.components.ui.richtext.ir.InlineContent.Strong
import mozilla.components.ui.richtext.ir.RichDocument

/**
 * Test case for [Parser]
 */
internal data class ParserTestCase(
    val description: String,
    val source: String,
    val expectedDocument: RichDocument,
)

private fun singleParagraph(content: List<InlineContent>): RichDocument {
    return RichDocument(
        blocks = listOf(
            Paragraph(content = content),
        ),
    )
}

private fun document(blocks: List<BlockContent>): RichDocument {
    return RichDocument(
        blocks = blocks,
    )
}

private val StandaloneStrongContent = ParserTestCase(
    description = "paragraph with standalone strong content is created",
    source = """
        standalone **strong** content
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("standalone "),
            Strong(listOf(Plain("strong"))),
            Plain(" content"),
        ),
    ),
)

private val StandaloneEmphasisContent = ParserTestCase(
    description = "paragraph with standalone emphasis content is created",
    source = """
        standalone content with *italics*
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("standalone content with "),
            Emphasis(listOf(Plain("italics"))),
        ),
    ),
)

private val StandaloneEmphasisUsingUnderscore = ParserTestCase(
    description = "paragraph with standalone emphasis using underscore is created",
    source = """
        standalone content with _italics_
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("standalone content with "),
            Emphasis(listOf(Plain("italics"))),
        ),
    ),
)

private val EmphasisSurroundedByStrong = ParserTestCase(
    description = "emphasis surrounded by strong",
    source = """
        emphasis **_surrounded_**
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("emphasis "),
            Strong(
                children = listOf(
                    element = Emphasis(
                        children = listOf(Plain("surrounded")),
                    ),
                ),
            ),
        ),
    ),
)

private val SingleParagraphWithLineBreaks = ParserTestCase(
    description = "single paragraph with line breaks",
    source = """
        paragraph one
        paragraph two
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Paragraph(
                content = listOf(
                    Plain("paragraph one"),
                    LineBreak,
                    Plain("paragraph two"),
                ),
            ),
        ),
    ),
)

private val StrongSurroundedByEmphasis = ParserTestCase(
    description = "strong surrounded by emphasis",
    source = """
        strong *__surrounded__*
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("strong "),
            Emphasis(
                children = listOf(
                    Strong(
                        children = listOf(Plain("surrounded")),
                    ),
                ),
            ),
        ),
    ),
)

private val InlineCodeContent = ParserTestCase(
    description = "paragraph with inline code",
    source = """
        text with `inline code` content
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("text with "),
            InlineContent.Code("inline code"),
            Plain(" content"),
        ),
    ),
)

private val LinkContent = ParserTestCase(
    description = "paragraph with link",
    source = """
        check out [this link](https://example.com) here
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("check out "),
            InlineContent.Link(
                url = "https://example.com",
                children = listOf(Plain("this link")),
            ),
            Plain(" here"),
        ),
    ),
)

private val LinkWithFormatting = ParserTestCase(
    description = "link with formatted text",
    source = """
        [**bold link**](https://example.com)
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            InlineContent.Link(
                url = "https://example.com",
                children = listOf(
                    Strong(listOf(Plain("bold link"))),
                ),
            ),
        ),
    ),
)

private val CombinedInlineFormatting = ParserTestCase(
    description = "paragraph with multiple inline formats",
    source = """
        text with **bold** and *italic* and `code`
    """.trimIndent(),
    expectedDocument = singleParagraph(
        content = listOf(
            Plain("text with "),
            Strong(listOf(Plain("bold"))),
            Plain(" and "),
            Emphasis(listOf(Plain("italic"))),
            Plain(" and "),
            InlineContent.Code("code"),
        ),
    ),
)

private val MultipleParagraphs = ParserTestCase(
    description = "multiple paragraphs separated by blank line",
    source = """
        first paragraph

        second paragraph
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Paragraph(content = listOf(Plain("first paragraph"))),
            Paragraph(content = listOf(Plain("second paragraph"))),
        ),
    ),
)

private val HeadingLevel1 = ParserTestCase(
    description = "heading level 1",
    source = """
        # Heading One
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Heading(
                level = mozilla.components.ui.richtext.ir.HeadingLevel.H1,
                content = listOf(Plain("Heading One")),
            ),
        ),
    ),
)

private val HeadingLevel2 = ParserTestCase(
    description = "heading level 2",
    source = """
        ## Heading Two
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Heading(
                level = mozilla.components.ui.richtext.ir.HeadingLevel.H2,
                content = listOf(Plain("Heading Two")),
            ),
        ),
    ),
)

private val HeadingLevel3 = ParserTestCase(
    description = "heading level 3",
    source = """
        ### Heading Three
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Heading(
                level = mozilla.components.ui.richtext.ir.HeadingLevel.H3,
                content = listOf(Plain("Heading Three")),
            ),
        ),
    ),
)

private val HeadingWithFormatting = ParserTestCase(
    description = "heading with inline formatting",
    source = """
        # Heading with **bold** text
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Heading(
                level = mozilla.components.ui.richtext.ir.HeadingLevel.H1,
                content = listOf(
                    Plain("Heading with "),
                    Strong(listOf(Plain("bold"))),
                    Plain(" text"),
                ),
            ),
        ),
    ),
)

private val UnorderedList = ParserTestCase(
    description = "simple unordered list",
    source = """
        - First item
        - Second item
        - Third item
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            ListBlock(
                ordered = false,
                items = listOf(
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("First item")))),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Second item")))),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Third item")))),
                    ),
                ),
            ),
        ),
    ),
)

private val OrderedList = ParserTestCase(
    description = "simple ordered list",
    source = """
        1. First item
        2. Second item
        3. Third item
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            ListBlock(
                ordered = true,
                items = listOf(
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("First item")))),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Second item")))),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Third item")))),
                    ),
                ),
            ),
        ),
    ),
)

private val ListWithFormatting = ParserTestCase(
    description = "list with inline formatting",
    source = """
        - Item with **bold**
        - Item with *italic*
        - Item with `code`
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            ListBlock(
                ordered = false,
                items = listOf(
                    ListItem(
                        content = listOf(
                            Paragraph(
                                content = listOf(
                                    Plain("Item with "),
                                    Strong(listOf(Plain("bold"))),
                                ),
                            ),
                        ),
                    ),
                    ListItem(
                        content = listOf(
                            Paragraph(
                                content = listOf(
                                    Plain("Item with "),
                                    Emphasis(listOf(Plain("italic"))),
                                ),
                            ),
                        ),
                    ),
                    ListItem(
                        content = listOf(
                            Paragraph(
                                content = listOf(
                                    Plain("Item with "),
                                    InlineContent.Code("code"),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),
)

private val NestedUnorderedList = ParserTestCase(
    description = "nested unordered list",
    source = """
        - Parent item
          - Nested item 1
          - Nested item 2
        - Another parent
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            ListBlock(
                ordered = false,
                items = listOf(
                    ListItem(
                        content = listOf(
                            Paragraph(content = listOf(Plain("Parent item"))),
                            ListBlock(
                                ordered = false,
                                items = listOf(
                                    ListItem(
                                        content = listOf(Paragraph(content = listOf(Plain("Nested item 1")))),
                                    ),
                                    ListItem(
                                        content = listOf(Paragraph(content = listOf(Plain("Nested item 2")))),
                                    ),
                                ),
                            ),
                        ),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Another parent")))),
                    ),
                ),
            ),
        ),
    ),
)

private val NestedOrderedList = ParserTestCase(
    description = "nested ordered list",
    source = """
        1. First item
           1. Nested first
           2. Nested second
        2. Second item
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            ListBlock(
                ordered = true,
                items = listOf(
                    ListItem(
                        content = listOf(
                            Paragraph(content = listOf(Plain("First item"))),
                            ListBlock(
                                ordered = true,
                                items = listOf(
                                    ListItem(
                                        content = listOf(Paragraph(content = listOf(Plain("Nested first")))),
                                    ),
                                    ListItem(
                                        content = listOf(Paragraph(content = listOf(Plain("Nested second")))),
                                    ),
                                ),
                            ),
                        ),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("Second item")))),
                    ),
                ),
            ),
        ),
    ),
)

private val MixedContent = ParserTestCase(
    description = "document with mixed block types",
    source = """
        # Title

        This is a paragraph with **bold** and *italic* text.

        - List item one
        - List item two

        Another paragraph here.
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            Heading(
                level = mozilla.components.ui.richtext.ir.HeadingLevel.H1,
                content = listOf(Plain("Title")),
            ),
            Paragraph(
                content = listOf(
                    Plain("This is a paragraph with "),
                    Strong(listOf(Plain("bold"))),
                    Plain(" and "),
                    Emphasis(listOf(Plain("italic"))),
                    Plain(" text."),
                ),
            ),
            ListBlock(
                ordered = false,
                items = listOf(
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("List item one")))),
                    ),
                    ListItem(
                        content = listOf(Paragraph(content = listOf(Plain("List item two")))),
                    ),
                ),
            ),
            Paragraph(content = listOf(Plain("Another paragraph here."))),
        ),
    ),
)

private val SimpleBlockQuote = ParserTestCase(
    description = "simple block quote",
    source = """
        > This is a quote
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            BlockQuote(
                content = listOf(
                    Paragraph(content = listOf(Plain("This is a quote"))),
                ),
            ),
        ),
    ),
)

private val BlockQuoteWithMultipleParagraphs = ParserTestCase(
    description = "block quote with multiple paragraphs",
    source = """
        > First paragraph
        >
        > Second paragraph
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            BlockQuote(
                content = listOf(
                    Paragraph(content = listOf(Plain("First paragraph"))),
                    Paragraph(content = listOf(Plain("Second paragraph"))),
                ),
            ),
        ),
    ),
)

private val BlockQuoteWithFormatting = ParserTestCase(
    description = "block quote with inline formatting",
    source = """
        > Quote with **bold** and *italic* text
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            BlockQuote(
                content = listOf(
                    Paragraph(
                        content = listOf(
                            Plain("Quote with "),
                            Strong(listOf(Plain("bold"))),
                            Plain(" and "),
                            Emphasis(listOf(Plain("italic"))),
                            Plain(" text"),
                        ),
                    ),
                ),
            ),
        ),
    ),
)

private val NestedBlockQuote = ParserTestCase(
    description = "nested block quote",
    source = """
        > Outer quote
        >> Inner quote
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            BlockQuote(
                content = listOf(
                    Paragraph(content = listOf(Plain("Outer quote"))),
                    BlockQuote(
                        content = listOf(
                            Paragraph(content = listOf(Plain("Inner quote"))),
                        ),
                    ),
                ),
            ),
        ),
    ),
)

private val BlockQuoteWithList = ParserTestCase(
    description = "block quote containing a list",
    source = """
        > Quote with list:
        > - Item one
        > - Item two
    """.trimIndent(),
    expectedDocument = document(
        blocks = listOf(
            BlockQuote(
                content = listOf(
                    Paragraph(content = listOf(Plain("Quote with list:"))),
                    ListBlock(
                        ordered = false,
                        items = listOf(
                            ListItem(
                                content = listOf(Paragraph(content = listOf(Plain("Item one")))),
                            ),
                            ListItem(
                                content = listOf(Paragraph(content = listOf(Plain("Item two")))),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),
)

/**
 * List of test cases to use in [ParserTest]
 */
internal val ParserTestCases: List<ParserTestCase> = listOf(
    StandaloneStrongContent,
    StandaloneEmphasisContent,
    StandaloneEmphasisUsingUnderscore,
    EmphasisSurroundedByStrong,
    StrongSurroundedByEmphasis,
    SingleParagraphWithLineBreaks,
    InlineCodeContent,
    LinkContent,
    LinkWithFormatting,
    CombinedInlineFormatting,
    MultipleParagraphs,
    HeadingLevel1,
    HeadingLevel2,
    HeadingLevel3,
    HeadingWithFormatting,
    UnorderedList,
    OrderedList,
    ListWithFormatting,
    NestedUnorderedList,
    NestedOrderedList,
    MixedContent,
    SimpleBlockQuote,
    BlockQuoteWithMultipleParagraphs,
    BlockQuoteWithFormatting,
    NestedBlockQuote,
    BlockQuoteWithList,
)

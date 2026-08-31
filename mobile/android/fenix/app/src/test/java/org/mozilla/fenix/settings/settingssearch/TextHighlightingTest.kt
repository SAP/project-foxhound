package org.mozilla.fenix.settings.settingssearch

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import org.junit.Assert.assertEquals
import org.junit.Test

class TextHighlightingTest {
    private val highlightStyle = SpanStyle(color = Color.Red, fontWeight = FontWeight.Bold)

    @Test
    fun `GIVEN a query and a text with matching text THEN it highlights the query`() {
        val text = "Set your search engine"
        val query = "search"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(9, spanStyles.first().start)
        assertEquals(15, spanStyles.first().end)
        assertEquals(highlightStyle, spanStyles.first().item)
    }

    @Test
    fun `GIVEN a query and a text with matching text with mismatching capitalization THEN it highlights the query`() {
        val text = "Set Your Search Engine"
        val query = "search"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(9, spanStyles.first().start)
        assertEquals(15, spanStyles.first().end)
    }

    @Test
    fun `GIVEN a query with leading and trailing whitespace THEN it handles the whitespace`() {
        val text = "Set your search engine"
        val query = "  search  "
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(9, spanStyles.first().start)
        assertEquals(15, spanStyles.first().end)
    }

    @Test
    fun `GIVEN a query WHEN there are multiple matches THEN it highlights the first match`() {
        val text = "datadata"
        val query = "data"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(0, spanStyles.first().start)
        assertEquals(4, spanStyles.first().end)
        assertEquals(highlightStyle, spanStyles.first().item)
    }

    @Test
    fun `GIVEN a query WHEN there are no matches THEN it returns an unstyled AnnotatedString`() {
        val text = "Set your search engine"
        val query = "firefox"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        assertEquals(text, annotatedString.text)
        assertEquals(true, annotatedString.spanStyles.isEmpty())
    }

    @Test
    fun `GIVEN an empty query THEN it returns an unstyled AnnotatedString`() {
        val text = "Set your search engine"
        val query = ""
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        assertEquals(text, annotatedString.text)
        assertEquals(true, annotatedString.spanStyles.isEmpty())
    }

    @Test
    fun `GIVEN an empty text THEN it returns an empty AnnotatedString`() {
        val text = ""
        val query = "search"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        assertEquals(true, annotatedString.text.isEmpty())
        assertEquals(true, annotatedString.spanStyles.isEmpty())
    }

    @Test
    fun `GIVEN a partial word query THEN it highlights the matching partial word`() {
        val text = "Enable data privacy features"
        val query = "priv"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(12, spanStyles.first().start)
        assertEquals(16, spanStyles.first().end)
    }

    @Test
    fun `GIVEN a multi-word query THEN it highlights all words in the query`() {
        val text = "Enable data privacy features"
        val query = "data privacy"
        val annotatedString = highlightQueryMatchingText(text, query, highlightStyle)

        val spanStyles = annotatedString.spanStyles
        assertEquals(1, spanStyles.size)
        assertEquals(7, spanStyles.first().start)
        assertEquals(19, spanStyles.first().end)
        assertEquals("data privacy", annotatedString.substring(7, 19))
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.ui

import androidx.compose.foundation.ScrollState
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextLayoutResult
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.doReturn

/**
 * Tests for the logic of highlighting the domain name in an URL.
 *
 * Assumptions:
 * - each character shown has 50px width.
 * - text box available width is 1000px - space to shown 20 characters.
 * If needing to show more than 20 characters they would be shown offscreen with the text being scrollable.
 */
@RunWith(AndroidJUnit4::class)
class HighlightedDomainUrlTest {
    private val charWidth = 50f
    private val viewPortWidth = 1000f
    private val maxVisibleCharCount = (viewPortWidth / charWidth).toInt()

    private val textLayoutResult: TextLayoutResult = mock()
    private val scrollState: ScrollState = mock()

    @Before
    fun setup() {
        textLayoutResult.stubBoundingBoxForText()
    }

    @Test
    fun `GIVEN the domain can be fully shown WHEN computing the scroll value THEN get 0`() {
        val url = "https://test.com"
        scrollState.stubScrollInfo(url)
        val highlightRange = computeHighlightRange(url, "test.com")

        val result = computeDomainEndScrollValue(url, highlightRange)

        assertEquals(0, result)
    }

    @Test
    fun `GIVEN that the domain fits the screen but the subpage does not WHEN computing the scroll value THEN get 0`() {
        val url = "https://test.com/abcdefgh"
        scrollState.stubScrollInfo(url)
        val highlightRange = computeHighlightRange(url, "test.com")

        val result = computeDomainEndScrollValue(url, highlightRange)

        assertEquals(0, result)
    }

    @Test
    fun `GIVEN the domain would be shown offscreen WHEN computing the scroll value THEN get the offscreen pixels`() {
        val url = "https://www.example.com"
        scrollState.stubScrollInfo(url)
        val highlightRange = computeHighlightRange(url, "example.com")
        val offscreenCharacters = computeOffscreenCharactersWidth(url, highlightRange)

        val result = computeDomainEndScrollValue(url, highlightRange)

        assertEquals(offscreenCharacters, result)
    }

    @Test
    fun `GIVEN a long domain that does not fit the screen WHEN computing the scroll value THEN get half of the offscreen pixels`() {
        val url = "a".repeat(30)
        scrollState.stubScrollInfo(url)
        // 10 characters would be shown offscreen
        val highlightRange = 5 to 25
        // 5 domain characters offscreen to each side + extra offset characters
        val expectedResult = ((5 + END_SCROLL_OFFSET) * charWidth).toInt()

        val result = computeDomainEndScrollValue(url, highlightRange)

        assertEquals(expectedResult, result)
    }

    @Test
    fun `GIVEN the displayed URL does not overflow the available space WHEN creating the fading brush THEN set no fading`() {
        val expected = SolidColor(Color.Black)

        val result = createUrlFadeBrush(
            scrolledPixels = 0,
            maxScrollPixels = 0,
            viewportSize = viewPortWidth.toInt(),
            fadeFraction = 0.5f,
        )

        assertEquals(expected, result)
    }

    @Test
    fun `GIVEN the displayed URL only overflows to the right WHEN creating the fading brush THEN fade the right edge`() {
        val expected = Brush.horizontalGradient(
            0.5f to Color.Black,
            1f to Color.Transparent,
        )

        val result = createUrlFadeBrush(
            scrolledPixels = 0,
            maxScrollPixels = 600,
            viewportSize = viewPortWidth.toInt(),
            fadeFraction = 0.5f,
        )

        assertEquals(expected, result)
    }

    @Test
    fun `GIVEN the displayed URL only overflows to the left WHEN creating the fading brush THEN fade the left edge`() {
        val expected = Brush.horizontalGradient(
            0f to Color.Transparent,
            0.5f to Color.Black,
        )

        val result = createUrlFadeBrush(
            scrolledPixels = 600,
            maxScrollPixels = 600,
            viewportSize = viewPortWidth.toInt(),
            fadeFraction = 0.5f,
        )

        assertEquals(expected, result)
    }

    @Test
    fun `GIVEN the displayed URL overflows on both sides WHEN creating the fading brush THEN fade both edges`() {
        val expected = Brush.horizontalGradient(
            colorStops = arrayOf(
                0f to Color.Transparent,
                0.5f to Color.Black,
                0.5f to Color.Black,
                1f to Color.Transparent,
            ),
        )

        val result = createUrlFadeBrush(
            scrolledPixels = 100,
            maxScrollPixels = 1200,
            viewportSize = viewPortWidth.toInt(),
            fadeFraction = 0.5f,
        )

        assertEquals(expected, result)
    }

    private fun computeDomainEndScrollValue(text: String, highlightRange: Pair<Int, Int>?) =
        computeDomainEndScrollValue(text, highlightRange, scrollState, textLayoutResult)

    /**
     * Configure the visual bounds for a range of characters shown on the screen.
     */
    private fun TextLayoutResult.stubBoundingBoxForText() {
        doAnswer { invocation ->
            val start = invocation.getArgument<Int>(0)
            val end = invocation.getArgument<Int>(1)
            val leftCoord = start * charWidth
            val rightCoord = end * charWidth

            val textDrawingPath: Path = mock()
            doReturn(Rect(left = leftCoord, top = 0f, right = rightCoord, bottom = 100f))
                .`when`(textDrawingPath).getBounds()

            textDrawingPath
        }.`when`(this).getPathForRange(anyInt(), anyInt())
    }

    /**
     * Automatically compute and configure how much we can scroll to show the indicated [text].
     */
    private fun ScrollState.stubScrollInfo(text: String) {
        doReturn(viewPortWidth.toInt()).`when`(this).viewportSize

        val overflownTextWidth = (text.length * charWidth - viewPortWidth).coerceAtLeast(0f)
        doReturn(overflownTextWidth.toInt()).`when`(this).maxValue
    }

    private fun computeHighlightRange(text: String, highlightText: String): Pair<Int, Int> {
        val highlightStart = text.indexOf(highlightText)

        return highlightStart to highlightStart + highlightText.length
    }

    private fun computeOffscreenCharactersWidth(text: String, highlightRange: Pair<Int, Int>): Int {
        return when (text.length == highlightRange.second) {
            true -> scrollState.maxValue
            else -> {
                val lastVisibleCharIndex = (highlightRange.second.plus(END_SCROLL_OFFSET))
                    .coerceAtMost(text.lastIndex)
                (lastVisibleCharIndex - maxVisibleCharCount).coerceAtLeast(0)
            }
        }
    }
}

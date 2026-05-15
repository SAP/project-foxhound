/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.processor

import android.graphics.Bitmap
import android.graphics.Color
import mozilla.components.browser.icons.Icon
import mozilla.components.browser.icons.IconRequest
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.mockito.Mockito.anyInt
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.spy

class ColorProcessorTest {

    private val mockRequest = mock<IconRequest>().apply {
        doReturn(null).`when`(this).color
    }

    @Test
    fun `test extracting color`() {
        val icon = Icon(mockRedBitmap(1), source = Icon.Source.DISK)

        val colorProcessor = spy(ColorProcessor())
        doReturn(Color.BLUE).`when`(colorProcessor).extractDominantColorFromBitmap(any())

        val processed = colorProcessor.process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon.bitmap, processed.bitmap)
        assertNotNull(processed.color)
        assertEquals(Color.BLUE, processed.color)
    }

    @Test
    fun `test extracting color from larger bitmap`() {
        val icon = Icon(mockRedBitmap(3), source = Icon.Source.DISK)

        val colorProcessor = spy(ColorProcessor())
        doReturn(Color.RED).`when`(colorProcessor).extractDominantColorFromBitmap(any())

        val processed = colorProcessor.process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon.bitmap, processed.bitmap)
        assertNotNull(processed.color)
        assertEquals(Color.RED, processed.color)
    }

    @Test
    fun `GIVEN an icon that already has a color, WHEN processing THEN return initial icon`() {
        val icon = Icon(bitmap = mock(), color = 0, source = Icon.Source.DISK)
        val processed = ColorProcessor().process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon, processed)
    }

    @Test
    fun `GIVEN a request that has a color, WHEN processing THEN return initial icon with request color`() {
        val request = mock<IconRequest>().apply {
            doReturn(Color.BLUE).`when`(this).color
        }
        val icon = Icon(bitmap = mock(), source = Icon.Source.DISK)
        val processed = ColorProcessor().process(mock(), request, mock(), icon, mock())

        assertEquals(icon.bitmap, processed.bitmap)
        assertEquals(request.color, processed.color)
    }

    @Test
    fun `GIVEN a recycled bitmap and an icon request with no color, WHEN processing THEN return initial icon`() {
        val icon = Icon(mockRecycledBitmap(), source = Icon.Source.DISK)
        val processed = ColorProcessor().process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon, processed)
    }

    @Test
    fun `GIVEN an invalid width bitmap and an icon request with no color, WHEN processing THEN return initial icon`() {
        val icon = Icon(mockZeroWidthBitmap(), source = Icon.Source.DISK)
        val processed = ColorProcessor().process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon, processed)
    }

    @Test
    fun `GIVEN an invalid height bitmap and an icon request with no color, WHEN processing THEN return initial icon`() {
        val icon = Icon(mockZeroHeightBitmap(), source = Icon.Source.DISK)
        val processed = ColorProcessor().process(mock(), mockRequest, mock(), icon, mock())

        assertEquals(icon, processed)
    }

    private fun mockRedBitmap(size: Int): Bitmap {
        val bitmap: Bitmap = mock()
        doReturn(size).`when`(bitmap).height
        doReturn(size).`when`(bitmap).width

        doAnswer {
            val pixels: IntArray = it.getArgument(0)
            for (i in 0 until pixels.size) {
                pixels[i] = Color.RED
            }
            null
        }.`when`(bitmap).getPixels(any(), anyInt(), anyInt(), anyInt(), anyInt(), anyInt(), anyInt())

        return bitmap
    }

    private fun mockRecycledBitmap(): Bitmap {
        val bitmap: Bitmap = mock()

        doReturn(true).`when`(bitmap).isRecycled

        return bitmap
    }

    private fun mockZeroHeightBitmap(): Bitmap {
        val bitmap: Bitmap = mock()

        doReturn(0).`when`(bitmap).height
        doReturn(1).`when`(bitmap).width
        doReturn(false).`when`(bitmap).isRecycled

        return bitmap
    }

    private fun mockZeroWidthBitmap(): Bitmap {
        val bitmap: Bitmap = mock()

        doReturn(1).`when`(bitmap).height
        doReturn(0).`when`(bitmap).width
        doReturn(false).`when`(bitmap).isRecycled

        return bitmap
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.qr

import android.graphics.Bitmap
import android.graphics.Color
import android.media.Image
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.zxing.BarcodeFormat
import com.google.zxing.common.BitMatrix
import com.google.zxing.qrcode.QRCodeWriter
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.`when`
import java.nio.ByteBuffer

@RunWith(AndroidJUnit4::class)
class QrAnalyzerTest {

    @Test
    fun `WHEN reset is called THEN state returns to STATE_FIND_QRCODE`() {
        val analyzer = QrAnalyzer()
        analyzer.state = QrAnalyzer.STATE_QRCODE_EXIST

        analyzer.reset()

        assertEquals(QrAnalyzer.STATE_FIND_QRCODE, analyzer.state)
    }

    @Test
    fun `GIVEN state is STATE_QRCODE_EXIST WHEN analyze is called THEN it returns null without decoding`() {
        val analyzer = QrAnalyzer()
        analyzer.state = QrAnalyzer.STATE_QRCODE_EXIST

        // No image plane is needed because we should bail before reading.
        val image: Image = mock()
        val result = analyzer.analyze(image)

        assertNull(result)
        assertEquals(QrAnalyzer.STATE_QRCODE_EXIST, analyzer.state)
    }

    @Test
    fun `GIVEN state is STATE_DECODE_PROGRESS WHEN analyze is called THEN it returns null without decoding`() {
        val analyzer = QrAnalyzer()
        analyzer.state = QrAnalyzer.STATE_DECODE_PROGRESS

        val image: Image = mock()
        val result = analyzer.analyze(image)

        assertNull(result)
    }

    @Test
    fun `GIVEN garbage YUV data WHEN analyze is called THEN it returns null and resets to STATE_FIND_QRCODE`() {
        val analyzer = QrAnalyzer()
        val image = mockYuvImage(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 0))

        val result = analyzer.analyze(image)

        assertNull(result)
        assertEquals(QrAnalyzer.STATE_FIND_QRCODE, analyzer.state)
    }

    @Test
    fun `WHEN readImageSource is called THEN it returns a PlanarYUVLuminanceSource with image dimensions`() {
        val data = byteArrayOf(1, 2, 3, 4, 5, 6, 7, 8)
        val image = mockYuvImage(data, width = 4, height = 2)

        val source = QrAnalyzer.readImageSource(image)

        assertEquals(4, source.width)
        assertEquals(2, source.height)
    }

    @Test
    fun `GIVEN a bitmap containing a QR code WHEN analyze is called THEN it returns the payload and leaves state untouched`() {
        val analyzer = QrAnalyzer()
        val payload = "https://example.com/qr"

        val result = analyzer.analyze(qrBitmap(payload))

        assertEquals(payload, result)
        assertEquals(QrAnalyzer.STATE_FIND_QRCODE, analyzer.state)
    }

    @Test
    fun `GIVEN a bitmap with no QR code WHEN analyze is called THEN it returns null and leaves state untouched`() {
        val analyzer = QrAnalyzer()
        val bitmap = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888).apply { eraseColor(Color.WHITE) }

        val result = analyzer.analyze(bitmap)

        assertNull(result)
        assertEquals(QrAnalyzer.STATE_FIND_QRCODE, analyzer.state)
    }

    @Test
    fun `GIVEN a color-inverted QR bitmap WHEN analyze is called THEN it decodes via the inverted retry`() {
        val analyzer = QrAnalyzer()
        val payload = "inverted-qr-payload"

        val result = analyzer.analyze(qrBitmap(payload, foreground = Color.WHITE, background = Color.BLACK))

        assertEquals(payload, result)
    }

    @Test
    fun `GIVEN state is STATE_QRCODE_EXIST WHEN analyze(bitmap) is called THEN it still decodes and does not touch state`() {
        val analyzer = QrAnalyzer()
        analyzer.state = QrAnalyzer.STATE_QRCODE_EXIST
        val payload = "https://example.com/state-independent"

        val result = analyzer.analyze(qrBitmap(payload))

        assertEquals(payload, result)
        assertEquals(QrAnalyzer.STATE_QRCODE_EXIST, analyzer.state)
    }

    private fun qrBitmap(
        payload: String,
        size: Int = 200,
        foreground: Int = Color.BLACK,
        background: Int = Color.WHITE,
    ): Bitmap {
        val matrix: BitMatrix = QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, size, size)
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(x, y, if (matrix[x, y]) foreground else background)
            }
        }
        return bitmap
    }

    private fun mockYuvImage(
        data: ByteArray,
        width: Int = 4,
        height: Int = 2,
        rowStride: Int = width,
        pixelStride: Int = 1,
    ): Image {
        val plane: Image.Plane = mock()
        `when`(plane.buffer).thenReturn(ByteBuffer.wrap(data))
        `when`(plane.rowStride).thenReturn(rowStride)
        `when`(plane.pixelStride).thenReturn(pixelStride)
        val image: Image = mock()
        `when`(image.planes).thenReturn(arrayOf(plane))
        `when`(image.width).thenReturn(width)
        `when`(image.height).thenReturn(height)
        return image
    }
}

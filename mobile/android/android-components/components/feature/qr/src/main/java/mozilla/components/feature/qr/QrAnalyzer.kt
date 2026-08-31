/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.qr

import android.graphics.Bitmap
import android.media.Image
import androidx.annotation.VisibleForTesting
import com.google.zxing.BinaryBitmap
import com.google.zxing.LuminanceSource
import com.google.zxing.MultiFormatReader
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.common.HybridBinarizer

/**
 * Stateful ZXing-backed QR detector that callers can plug into a Camera2
 * YUV [android.media.ImageReader] pipeline.
 * Mirrors the find/decoding state machine used by [QrFragment].
 * Not thread-safe — invoke [analyze] from a single background thread.
 */
class QrAnalyzer {
    private val reader = MultiFormatReader()

    @Volatile
    @VisibleForTesting
    internal var state: Int = STATE_FIND_QRCODE

    /**
     * Resets the analyzer so [analyze] will resume decoding after a successful
     * detection. Call when entering QR mode or recovering from a stale result.
     */
    fun reset() {
        state = STATE_FIND_QRCODE
    }

    /**
     * Decodes a single YUV [Image]. Returns the QR string on success, or null
     * if no QR is present or a previous call already returned a result that
     * has not been [reset].
     */
    fun analyze(image: Image): String? {
        if (state != STATE_FIND_QRCODE) return null
        state = STATE_DECODE_PROGRESS
        val source = readImageSource(image)
        return decode(source) ?: decode(source.invert())
    }

    /**
     * Decodes a still [Bitmap] (e.g. picked from the system photo picker). Returns the
     * QR string on success, or null if no QR is present.
     *
     * The bitmap must be software-backed and readable via [Bitmap.getPixels] — hardware
     * bitmaps from [android.graphics.ImageDecoder] must be configured with a software
     * allocator before being passed in.
     *
     * Still-image decoding is one-shot and does not participate in the streaming state
     * machine used by [analyze]: the [state] field is neither read nor written here. The
     * shared [reader] is reset after each call, but because [QrAnalyzer] is not thread-safe,
     * callers feeding the YUV camera pipeline should still allocate a separate
     * [QrAnalyzer] for bitmap decoding rather than reusing their camera instance.
     */
    fun analyze(bitmap: Bitmap): String? {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        val source = RGBLuminanceSource(width, height, pixels)
        return decodeStateless(source) ?: decodeStateless(source.invert())
    }

    @Suppress("TooGenericExceptionCaught")
    private fun decode(source: LuminanceSource): String? {
        return try {
            val raw = reader.decodeWithState(BinaryBitmap(HybridBinarizer(source)))
            if (raw != null) {
                state = STATE_QRCODE_EXIST
                raw.toString()
            } else {
                state = STATE_FIND_QRCODE
                null
            }
        } catch (e: Exception) {
            state = STATE_FIND_QRCODE
            null
        } finally {
            reader.reset()
        }
    }

    @Suppress("TooGenericExceptionCaught")
    private fun decodeStateless(source: LuminanceSource): String? {
        return try {
            reader.decodeWithState(BinaryBitmap(HybridBinarizer(source)))?.toString()
        } catch (e: Exception) {
            null
        } finally {
            reader.reset()
        }
    }

    companion object {
        // Square YUV size chosen to match [QrFragment]'s historical preview buffer. Camera2
        // implementations are not required to expose this exact size in StreamConfigurationMap;
        // when the requested resolution isn't supported the platform substitutes a nearby one,
        // which is why [readImageSource] reads image.width/height + rowStride at decode time
        // rather than assuming YUV_WIDTH/YUV_HEIGHT.
        const val YUV_WIDTH = 786
        const val YUV_HEIGHT = 786
        const val YUV_MAX_IMAGES = 2

        internal const val STATE_FIND_QRCODE = 0
        internal const val STATE_DECODE_PROGRESS = 1
        internal const val STATE_QRCODE_EXIST = 2

        @VisibleForTesting
        internal fun readImageSource(image: Image): PlanarYUVLuminanceSource {
            val plane = image.planes[0]
            val buffer = plane.buffer
            val data = ByteArray(buffer.remaining()).also { buffer.get(it) }

            val height = image.height
            val width = image.width
            val dataWidth = width + ((plane.rowStride - plane.pixelStride * width) / plane.pixelStride)
            return PlanarYUVLuminanceSource(data, dataWidth, height, 0, 0, width, height, false)
        }
    }
}

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.images.decoder

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Size
import androidx.annotation.VisibleForTesting
import androidx.annotation.VisibleForTesting.Companion.PRIVATE
import androidx.core.graphics.scale
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.images.DesiredSize
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val MAX_TRIES = 10

/**
 * An interface for scaling a [Bitmap]
 */
fun interface BitmapScaler {

    /**
     * Produces a scaled bitmap
     *
     * @param bitamp the source [Bitmap] to be scaled.
     * @param width the width for the new bitmap.
     * @param height the height for the new bitmap.
     */
    fun scale(bitmap: Bitmap, width: Int, height: Int): Bitmap
}

/**
 * [ImageDecoder] that will use Android's [BitmapFactory] in order to decode the byte data.
 *
 * @param scaler a [BitmapScaler] used to scale down the produced bitmap
 */
class AndroidImageDecoder(
    private val scaler: BitmapScaler = BitmapScaler { b, w, h -> b.scale(w, h) },
) : ImageDecoder {
    private val logger = Logger("AndroidImageDecoder")

    override fun decode(data: ByteArray, desiredSize: DesiredSize): Bitmap? {
        return try {
            val bounds = decodeBitmapBounds(data)
            if (!isGoodSize(bounds, desiredSize)) {
                return null
            }

            val bitmap = decodeBitmap(data, bounds.computeSampleSize(desiredSize)) ?: return null

            if (bitmap.isTargetSize(desiredSize)) {
                bitmap
            } else {
                val scaledSize = bounds.scaledSize(desiredSize)
                scaler.scale(bitmap, scaledSize.width, scaledSize.height)
            }
        } catch (_: OutOfMemoryError) {
            logger.error("Failed to decode the byte data due to OutOfMemoryError")
            null
        }
    }

    private fun isGoodSize(bounds: Size, desiredSize: DesiredSize): Boolean {
        val (_, minSize, maxSize, maxScaleFactor) = desiredSize
        return when {
            min(bounds.width, bounds.height) <= 0 -> {
                logger.debug("BitmapFactory returned too small bitmap with width or height <= 0")
                false
            }
            min(bounds.width, bounds.height) * maxScaleFactor < minSize -> {
                logger.debug("BitmapFactory returned too small bitmap")
                false
            }
            max(bounds.width, bounds.height) * (1f / maxScaleFactor) > maxSize -> {
                logger.debug("BitmapFactory returned way too large image")
                false
            }
            else -> true
        }
    }

    /**
     * Decodes the width and height of a bitmap without loading it into memory.
     */
    @VisibleForTesting(otherwise = PRIVATE)
    internal fun decodeBitmapBounds(data: ByteArray): Size {
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeByteArray(data, 0, data.size, options)
        return Size(options.outWidth, options.outHeight)
    }

    /**
     * Decodes a bitmap image.
     *
     * @param data Image bytes to decode.
     * @param sampleSize Scale factor for the image.
     */
    @VisibleForTesting(otherwise = PRIVATE)
    internal fun decodeBitmap(data: ByteArray, sampleSize: Int): Bitmap? {
        val options = BitmapFactory.Options().apply {
            inSampleSize = sampleSize.coerceAtLeast(1)
        }
        return BitmapFactory.decodeByteArray(data, 0, data.size, options)
    }

    private fun Bitmap.isTargetSize(desiredSize: DesiredSize): Boolean {
        val maxBoundLength = max(width, height)
        return maxBoundLength == desiredSize.targetSize
    }

    private fun Size.scaledSize(desiredSize: DesiredSize): Size {
        val maxBoundLength = max(width, height)
        val scale = min(desiredSize.targetSize / maxBoundLength.toFloat(), desiredSize.maxScaleFactor)
        return Size((width * scale).roundToInt(), (height * scale).roundToInt())
    }

    private fun Size.computeSampleSize(desiredSize: DesiredSize): Int {
        val maxBoundLength = max(width, height)

        if (maxBoundLength < desiredSize.targetSize) {
            return 1
        }

        val sample = generateSequence(1) { it * 2 }
            // Keep only those sample sizes where scaling down still leaves
            // the longest side >= the desired target size.
            // We will use bitmap scaling to go the rest of the way.
            .takeWhile { (maxBoundLength / it) >= desiredSize.targetSize }
            .take(MAX_TRIES)
            .last()

        return sample
    }
}

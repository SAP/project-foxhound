/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.processor

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import androidx.annotation.VisibleForTesting
import androidx.palette.graphics.Palette
import mozilla.components.browser.icons.Icon
import mozilla.components.browser.icons.IconRequest
import mozilla.components.support.images.DesiredSize

/**
 * [IconProcessor] implementation to extract the dominant color from the icon.
 */
class ColorProcessor : IconProcessor {

    override fun process(
        context: Context,
        request: IconRequest,
        resource: IconRequest.Resource?,
        icon: Icon,
        desiredSize: DesiredSize,
    ): Icon {
        // If the icon already has a color set, just return
        if (icon.color != null) return icon
        // If the request already has a color set, then return.
        // Some PWAs just set the background color to white (such as Twitter, Starbucks)
        // but the icons would work better if we fill the background using the Palette API.
        // If a PWA really want a white background a maskable icon can be used.
        if (request.color != null && request.color != Color.WHITE) return icon.copy(color = request.color)

        val dominantColor = extractDominantColorFromBitmap(icon.bitmap)
        return dominantColor?.let { icon.copy(color = it) } ?: icon
    }

    /**
     * Extracts the dominant color from a [Bitmap] using the Palette API.
     *
     * @param bitmap The [Bitmap] to extract the dominant color from.
     * @return The dominant color as an [Int], or null if the bitmap is invalid or no dominant color could be found.
     */
    @VisibleForTesting
    internal fun extractDominantColorFromBitmap(bitmap: Bitmap): Int? {
        // Guard against invalid bitmap for Palette generation
        if (bitmap.isRecycled || bitmap.width == 0 || bitmap.height == 0) {
            return null
        }
        return Palette.from(bitmap).generate().dominantSwatch?.rgb
    }
}
